'use strict';

var crypto = require('crypto');
var util = require('util');
var __ = require('underscore');

module.exports = {

    pad2 : function(number) {
        return (number < 10 ? '0' : '') + number;
    },

    toDateTime : function(t) {
        var self = this;
        t || ( t = new Date() );
        typeof(t) === 'string' && (t = new Date(t));
        return t.getFullYear()+'-'+ self.pad2(t.getMonth()+1)+'-'+ self.pad2(t.getDate())+' '+
            self.pad2(t.getHours())+':'+ self.pad2(t.getMinutes())+':'+self.pad2(t.getSeconds());
    },

    toDate : function(t) {
        var self = this;
        t || ( t = new Date() );
        typeof(t) === 'string' && (t = new Date(t));
        return t.getFullYear()+'-'+ self.pad2(t.getMonth()+1)+'-'+ self.pad2(t.getDate() + ' 00:00:00');
    },


    toDateFmt : function(format, date) {
        var self = this;
        typeof(date) === 'string' && (date = new Date(date));
        var vDay = self.pad2(date.getDate());
        var vMonth = self.pad2(date.getMonth()+1);
        var vYearLong = self.pad2(date.getFullYear());
        var vYearShort = self.pad2(date.getFullYear().toString().substring(2,4));
        var vYear = (format.indexOf('YYYY') > -1 ? vYearLong : vYearShort);
        var vHour  = self.pad2(date.getHours());
        var vMinute = self.pad2(date.getMinutes());
        var vSecond = self.pad2(date.getSeconds());
        //var vMillisecond = padWithZeros(date.getMilliseconds(), 3);
        //var vTimeZone = offset(date);
        return format
            .replace(/DD/g, vDay)
            .replace(/MM/g, vMonth)
            .replace(/Y{1,4}/g, vYear)
            .replace(/HH/g, vHour)
            .replace(/MI/g, vMinute)
            .replace(/SS/g, vSecond);
        //.replace(/SSS/g, vMillisecond)
    }, 

    toObject : function(target) {
        if (!target) {
            return {};
        }
        var cols = null;
        if (target._item) cols = target._item.cols;
        else if (target._array) cols = target._array._item.cols;
        if (!cols) return target;
        else {
            var obj = {};
            cols.forEach(function(col) {
                obj[col] = target[col];
            });
            return obj;
        }
    },

    toAryObject : function(iAry, key) {
        var objs = {};
        iAry.forEach(function(target) {
            var item = null;
            if (target._item) item = target._item;
            else if (target._array) item = target._array._item;

            if (!item) objs[target[key]] = target;
            else {
                var obj = {};
                item.cols.forEach(function(name) {
                    obj[name] = target[name];
                });
                objs[target[key]] = obj;
            }
        });

        return objs;
    },

    getArrayIndex : function(ary, key, val) {
        var iLen = ary.length;
        for (var i=0; i<iLen; i++) {
            var item = ary[i];
            if (!item) continue;
            if (item[key] === val)
                return i;
        }
        return -1;
    },

    clone : function(target) {
        return JSON.parse(JSON.stringify(target));
    },

    getWeekDay : function(date, weekday) {
        try {
            if (date.getDay() !== weekday) {
                var dayNum = date.getDay() < weekday ? 7-(weekday-date.getDay()) : date.getDay()-weekday;
                date.setDate(date.getDate() - dayNum);
            }
            date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            return date;
        } catch (ex) {
            global.warn('Constructor.getWeekDay. error:%s', ex.message);
        }
        return null;
    },

    toIntAry : function(str) {
        if (!str)
            return [];

        var iAry = str.split(',');
        var out = [];
        iAry.forEach(function(val) {
            try {
                if (val === '') out.push(0);
                else out.push(parseInt(val));
            } catch (ex) {
                out.push(0);
            }
        });
        return out;
    },

    getStdDate : function() {
        var self = this;
        var now = new Date();
        if (self.days === now.getDay() && !self.dayOfBegin) {
            return self.dayOfBegin;
        }

        var date = self.toDateFmt('YYYYMMDD', now);
        self.dayOfBegin = parseInt(date);
        self.days = now.getDay();

        return self.dayOfBegin;
    },


    isEqualDate : function(date, now) {
        now || (now = new Date());

        return (date.getYear() === now.getYear() &&
            date.getMonth() === now.getMonth() &&
            date.getDate() === now.getDate());
    },

    getAddDateTime : function(type, value) {
        var now = new Date();
        switch(type) {
            case 'YYYY':
                now.setFullYear(now.getFullYear() + value);
                break;
            case 'MM':
                now.setMonth(now.getMonth() + value);
                break;
            case 'DD':
                now.setDate(now.getDate() + value);
                break;
            case 'HH':
                now.setHours(now.getHours() + value);
                break;
            case 'MI':
                now.setMinutes(now.getMinutes() + value);
                break;
            case 'SS':
                now.setSeconds(now.getSeconds() + value);
                break;
        }
        return now;
    },

    /**
     * @mehtod encrypt
     * @param text
     * @param key
     * @returns {*}
     */
    encrypt : function(text,key) {
        var cipher = crypto.createCipher('aes-256-cbc',key);
        var encipheredContent = cipher.update(text,'utf8','hex');
        encipheredContent += cipher.final('hex');

        return encipheredContent;
    },


    /**
     * @method decrypt
     * @param text
     * @param key
     * @returns {*}
     */
    decrypt : function(text, key) {
        var decipher = crypto.createDecipher('aes-256-cbc',key);
        var decipheredPlaintext = decipher.update(text,'hex','utf8');
        decipheredPlaintext += decipher.final('utf8');

        return decipheredPlaintext;
    },    
    
    /**
     * addMethod - By John Resig (MIT Licensed)
     * @param object
     * @param name
     * @param fn
     */
    addMethod : function(object, name, fn) {
        var old = object[name];
        object[name] = function () {
            if (fn.length == arguments.length)
                return fn.apply(this, arguments);
            else if (typeof old == 'function')
                return old.apply(this, arguments);
        }
    },

    convertStringToDate : function(stringDate) {
        var x = util.format('%s', stringDate);
        return new Date(
            x.substr(0, 4),
            parseInt(x.substr(4, 2)-1),
            x.substr(6, 2),
            x.substr(8, 2),
            x.substr(10, 2)
        );
    },

    getRemainSeconds : function(now) {
        var next = new Date(now);
        next.setDate(next.getDate() + 1);
        next = new Date(util.format('%s-%s-%s 00:00:00', next.getFullYear(), next.getMonth()+1, next.getDate()));
        return parseInt((next - now) / 1000);
    },

    /** private ip address */
    getIPAddress : function () {
        var interfaces = require('os').networkInterfaces();
        var iList = [], keys, i, alias, ipAddr, prefix;

        keys = Object.keys(interfaces);
        keys.forEach(function(devName) {
            var iface = interfaces[devName];
            for (i = 0; i < iface.length; i++) {
                alias = iface[i];
                if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
                    iList.push(alias.address);
            }
        });

        if (iList.length > 0) {
            for(i=0; i<iList.length; i++) {
                ipAddr = iList[i].split('.');
                prefix = parseInt(ipAddr[0]);
                if (prefix === 10 || prefix === 192 || prefix === 172)
                    return iList[i];
            }
            return iList[0];
        }

        throw new Error('__not_existed_ipv4');
    },

    getGenKey : function(idx) {
        return new GenMsgKey(idx);
    },

    getRandom : function(iMax) {
        return new Random(iMax);
    },

    getFuncParamNames : function (func) {
        var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
        var ARGUMENT_NAMES = /([^\s,]+)/g;

        var fnStr = func.toString().replace(STRIP_COMMENTS, '');
        var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES)
        if(result === null)
            result = [];
        return result
    },



};


{
    var GenMsgKey = function(idx) {
        this.lastTime = -1;
        this.base = idx;
        this.seq = 1000;
        this.baseFmt = '';

        this.get = function() {
            var self = this;
            var now = new Date();
            var iTime = Math.floor(now.getTime() / 1000);
            if (iTime != self.lastTime) {
                self.seq = 1000;
                self.lastTime = iTime;
                self.baseFmt = util.format('p%s%s%s%s%s%s%s%s',
                    global.utils.pad2(now.getFullYear()%100),
                    global.utils.pad2(now.getMonth()+1),
                    global.utils.pad2(now.getDate()),
                    global.utils.pad2(now.getHours()),
                    global.utils.pad2(now.getMinutes()),
                    global.utils.pad2(now.getSeconds()),
                    self.base
                );
            }
            return util.format(self.baseFmt, ++self.seq);
        };
    };


    var Random = function(iMax) {
        this.iAry = [];
        this.iMax = iMax;
    };

    Random.prototype.init = function() {
        var self = this;
        for(var i=1; i<=self.iMax; i++) {
            self.iAry.push(i);
        }
        self.iAry = __.shuffle(__.shuffle(self.iAry));
    };

    Random.prototype.get = function() {
        var self = this;
        if (self.iAry.length === 0) {
            self.init();
        }
        return self.iAry.splice(0, 1)[0];
    };
};
