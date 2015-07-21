'use strict';

var async      = require('async');
var mysql      = require('mysql');
var util       = require('util');
var __         = require('underscore');

var DirtyFlag = function(){};
DirtyFlag.eNone = 0;
DirtyFlag.eCreate = 1;
DirtyFlag.eUpdate = 2;
DirtyFlag.eDelete = 3;

var Table = function(mgr) {
	var self = this;
	self._mgr = mgr;
	self._jobList = [];
	self._eventList = [];
};

// cache the results for one domain tables
Table.prototype.init = function(key, tables, results) {
	var self = this;
	results.forEach(function(rows, idx){
		self.addNode(rows, self._mgr.tables, idx);
	});

	if (!self._backup) {
		var item = self._mgr.tables[0];
		self._item = item;
		self._where = {name : self._item.key, value : key};
		self[self._item.key] = key;
		self.getNodeChild(self, item);
	}
};

Table.prototype.addNode = function(rows, tables, idx) {
	var self = this;

	var item = self._mgr.tables[idx];
	item.idx = idx;
	rows.forEach(function(row){
		// 1. identify targert by name attribute of item;
		var target = item.name === 'base' ? self : {};

		// 2. backup data, and set up the where condition for update/delete query
		target._dirtyFlag = DirtyFlag.eNone;
		target._backup = row;
		for (var key in row) {
			target[key] = row[key];
			if (key === item.key) {
				target._key = row[key];
				target._where = {name: item.key, value: target._key};
			}
		}
		// 3. get sub nodes till leaves
		if (item.name === 'base') {
			target._item = item;
			self.getNodeChild(target, item);  
		}else {
			// 4.1 find parent till root
			var hierarchy = [];
			var now = item.parent;
			for (var i=idx-1; i>=0; i--) {
				var ref = tables[i];
				if (ref.name === now) {
					hierarchy.splice(0, 0, {name: ref.name, key: ref.key});
					now = ref.parent;
				}
			}
			// 4.2 remove the first node
			hierarchy.splice(0, 1);
			// 4.3
			var cursor = self;
			for (var x = 0, xLen=hierarchy.length; x<xLen; x++) {
				var data = hierarchy[x];
				var iAry = cursor[data.name];
				var pos = iAry.find(row[data.key]);
                if (pos < 0) {
                    global.warn('Table.addNode.noParent. name:%s, key:%s', item.name, target._key);
                    console.dir(row);
                    return ;
                }
                cursor = iAry[pos];
			}

			// 4.4
			var container = cursor[item.name];
			if (container) {
				var iLen = container.length;
				target._array = container;
				self.getNodeChild(target, item);
				container[iLen] = target;
			}
		}
	});
};

Table.prototype.getNodeChild = function(node, item) {
    var self = this;
    self._mgr.tables.forEach(function(table) {
        if (table.parent !== item.name)
            return;
        node[table.name] = self.getNodeArray(table, node);
    });
};

Table.prototype.getNodeArray = function(item, parent) {
	var self = this;
	var ary = [];
	ary._item = item;
	ary._parent = parent;
	ary._keys = [];
	ary._events = {
        onUpsert : null,        // { func : function() {...}, self : caller }
        onDelete : null        // { func : function() {...}, self : caller }
	};

	var node = parent;
	while(node) {
		if (node._where) {
			ary._keys.push(node._where);
		}
		if (node._array) {
			node = node._array._parent;
		}else {
			node = node._parent;
		}
	}

    ary.new = function(key) {
        var iAry = this;
        var item = {
            _dirtyFlag : DirtyFlag.eCreate,
            _array : iAry
        };

        item._where = { name : iAry._item.key, value : key };
        item[iAry._item.key] = key;

        self._mgr.tables.forEach(function(table) {
            if (table.parent !== iAry._item.name)
                return;
            item[table.name] = self.getNodeArray(table, item);
        });

        return item;
    };

    ary.push = function() {
        var item = arguments[0];
        var dirtyFlag = true;

        if (arguments.length > 1 && arguments[1] === false ) {
            dirtyFlag = false;
        }

        var iAry = this;
        item._dirtyFlag = dirtyFlag ? DirtyFlag.eCreate : DirtyFlag.eNone;
        item._array = iAry;

        var key = item[this._item.key];
        if (this.find(key) >= 0)
            throw new Error(util.format('invalid_table_key([%s]-[%s])', iAry._item.table, key));

        item._where = { name : iAry._item.key, value : key };
        item[iAry._item.key] = key;

        if (dirtyFlag) self._jobList.push({ container : this, dirtyFlag : DirtyFlag.eCreate, pos : this.length});
        else {
            item._backup = {};
            self.copyRow(item, item._backup, iAry._item.cols);
        }

        ary._events.onUpsert && self._eventList.push({ event : ary._events.onUpsert, item : item });
        return Array.prototype.push.call(this, item);
    };

    ary.set = function(pos) {
        if (this[pos]._dirtyFlag === DirtyFlag.eNone) {
            this[pos]._dirtyFlag = DirtyFlag.eUpdate;
            self._jobList.push({ container : this, dirtyFlag : DirtyFlag.eUpdate, pos : pos });
            ary._events.onUpsert && self._eventList.push({ event : ary._events.onUpsert, item : this[pos] });
        }
    };

    ary.delete = function(pos) {
        this[pos]._dirtyFlag = DirtyFlag.eDelete;
        self._jobList.push({ container : this, dirtyFlag : DirtyFlag.eDelete, pos : pos });
        ary._events.onDelete && self._eventList.push({ event : ary._events.onDelete, item : this[pos] });
    };

    ary.find = function(key) {
        var iLen = this.length;
        for(var i=0; i<iLen; i++) {
            var item = this[i];
            if (item._dirtyFlag === DirtyFlag.eDelete)
                continue;
            if (item[this._item.key] === key)
                return i;
        }
        return -1;
    };

    ary.get = function(key, err) {
        err || (err = '__not_existed_data');
        var pos = this.find(key);
        if (pos < 0)
            throw new Error(err);
        var obj = this[pos];
        obj._pos = pos;
        return obj;
    };

    ary.count = function() {
        var iLen = this.length, count = 0;
        for(var i=0; i<iLen; i++) {
            var item = this[i];
            if (item._dirtyFlag === DirtyFlag.eDelete)
                continue;
            count++;
        }
        return count;
    };

    ary.toObject = function(except) {
        except || (except = []);
        var iAry = this;
        var out = [];
        var iLen = this.length;
        for(var i=0; i<iLen; i++) {
            var item = this[i];
            if (item._dirtyFlag === DirtyFlag.eDelete)
                continue;
            var obj = {};
            var cols = __.difference(iAry._item.cols, except);
            cols.forEach(function(col) {
                obj[col] = item[col];
            });
            out.push(obj);
        }
        return out;
    };

    return ary;

};

Table.prototype.isEqual = function(node, container) {
    var iAry = container ? container : node;

    var iLen = iAry._item.cols.length;
    for(var i=0; i<iLen; i++) {
        var col = iAry._item.cols[i];
        var dataType = typeof(node[col]);
        if (dataType === 'undefined')
            continue;

        if (!node._backup || node[col] !== node._backup[col])
            return false;
    }

    return true;
};

Table.prototype.isEmpty = function() {
    var self = this;
    return self._backup ? false : true;
};

Table.prototype.getQryList = function() {
    var self = this;
    var qryList = [];
    if ( !self.isEqual(self) ) {
        if (self.isEmpty()) {
            qryList.push(self.insertQry(self, null));
            //console.dir(self._where);
        } else {
            qryList.push(self.updateQry(self, null));
        }
    }
    self._jobList.forEach(function(job) {
        var node = job.container[job.pos];
        switch(job.dirtyFlag) {
            case DirtyFlag.eCreate : qryList.push(self.insertQry(node, job.container)); break;
            case DirtyFlag.eUpdate :
                if (!self.isEqual(node, job.container))
                    qryList.push(self.updateQry(node, job.container));
                else
                    console.log('update query but... same...');
                break;
            case DirtyFlag.eDelete : qryList.push(self.deleteQry(node, job.container)); break;
        }
    });
    qryList = qryList.concat(self.etcAdvQry);
    self.etcAdvQry = [];

    return __.without(qryList, null);
};

Table.prototype.save = function(cb) {
    var self = this;
    try {
        var qryList = self.getQryList();

        self._mgr.executeAdvTrans(qryList, function(err) {
            if (err) self.rollback();
            else self.commit();
            cb(err);
        });
    } catch (ex) {
        global.warn(ex.stack);
        cb(ex);
    }
};

Table.prototype.commit = function() {
    var self = this;
    if ( !self.isEqual(self) ) {
        self._backup || (self._backup = {});
        self.copyRow(self, self._backup, self._item.cols);
    }

    if (self._jobList.length < 1)
        return;

    self._jobList.sort(function(x, y) { return y.pos - x.pos} );
    self._jobList.forEach(function(job) {
        var node = job.container[job.pos];
        if(job.dirtyFlag !== DirtyFlag.eDelete) {
            node._backup || (node._backup = {});
            self.copyRow(node, node._backup, job.container._item.cols);
            node._dirtyFlag = DirtyFlag.eNone;
        }
    });
    self._jobList.forEach(function(job) {
        var node = job.container[job.pos];
        if(job.dirtyFlag === DirtyFlag.eDelete) {
            job.container.splice(job.pos, 1);
            node._dirtyFlag = DirtyFlag.eNone;
        }
    });
    self._jobList = [];
    self._eventList.forEach(function(event) {
        try {
            event.func.call(event.self, event.item);
        } catch (ex) {
            global.warn(ex.message);
        }
    });
    self._eventList = [];
};

Table.prototype.rollback = function() {
    var self = this;
    try {
        if ( !self.isEqual(self, null) ) {
            self.copyRow(self._backup, self, self._item.cols);
        }
        self._jobList.sort(function(x, y) { return y.pos - x.pos} );
        self._jobList.forEach(function(job) {
            var node = job.container[job.pos];
            switch(job.dirtyFlag) {
                case DirtyFlag.eCreate : job.container.splice(job.pos, 1); break;
                case DirtyFlag.eUpdate :
                case DirtyFlag.eDelete :
                    self.copyRow(node._backup, node, job.container._item.cols);
                    node._dirtyFlag = DirtyFlag.eNone;
                    break;
            }
        });
        self._jobList = [];
        self._eventList = [];
    } catch (ex) {
        global.error('Table.rollback. error:%s', ex.message);
        if (global.base && global.base.action) {
            global.base.sendErrorHistory(ex, [], 'Table.rollback');
        }
    }
};

Table.prototype.copyRow = function(src, dest, cols) {
    cols.forEach(function(col) {
        var value = null;
        src && (value = src[col]);
        dest[col] = value;
    });
};

Table.prototype.insertQry = function(node, container) {
    var row = {}, cols = [];
    container || ( container = node );              
    container._item.cols.forEach(function(col) {
        var dataType = typeof(node[col]);
        if (dataType !== 'undefined') {
            cols.push(col);
            row[col] = node[col];
        }
    });
    container._keys && container._keys.forEach(function(col) {
        if (__.indexOf(cols, col.name) < 0) {
            row[col.name] = col.value;
        }
    });
    return { sql : util.format('INSERT INTO %s SET ? ', container._item.table), data : row };
};

Table.prototype.updateQry = function(node, container) {
    var vals = {}, conds = [];
    var iAry = container ? container : node;

    iAry._item.cols.forEach(function(col) {
        var dataType = typeof(node[col]);
        if (dataType === 'undefined')
            return;

        if (node[col] === node._backup[col])
            return;

        vals[col] = node[col];
    });

    if (vals.length == 0) {
        return;
    }

    container && container._keys.forEach(function(col) {
        conds.push(util.format('`%s` = "%s"', col.name, col.value));
    });

    conds.push(util.format('`%s` = "%s"', node._where.name, node._where.value));
    return { sql : util.format('UPDATE %s SET ? WHERE %s', iAry._item.table, conds.join(' AND ')), data : vals };
};

Table.prototype.deleteQry = function(node, container) {
    var conds = [];
    container && container._keys.forEach(function(col) {
        conds.push(util.format('`%s` = "%s"', col.name, col.value));
    });

    conds.push(util.format('`%s` = "%s"', node._where.name, node._where.value));
    return {sql : util.format('DELETE FROM %s WHERE %s', container._item.table, conds.join(' AND ')), data : {}};
};

module.exports.Table = Table;