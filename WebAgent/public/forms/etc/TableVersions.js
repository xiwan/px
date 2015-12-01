var nameList = new Array;
nameList.push("");
var nowSelectIndex = 0;
var jobs = [];
var timeId = 0;
var msg = '';
var rmList = {};
var iMsg = [];
var LastMsg = [];
var index = 0;
var jobIndex = 0;
var MsgsObj = {};
var updateFilesSize = 0;
var fileStatus = 0;

function onReday() {
	var Html = new Array;
	for (var i = 0; i < nameList.length; ++i) {
		Html.push('<button id="btnDel" value="'+ i +'" onclick="clickFileDel(this)">删除本行</button>');
		Html.push('<select id="selectExcelType'+ i +'">');
		Html.push('<option value="excel">Excel</option>');
		Html.push('<option value="language">Language</option>');
		Html.push('<option value="event">Event</option>');
		Html.push('</select>');
		Html.push('<input id="uploadExcel" type="file" index="'+ i +'" name="iFile" style="display:none">');
		Html.push('<button id="btnSelect" value="'+ i +'" onclick="clickFileSelect(this)">选取文件</button>');
		var text = '未选择文件';
		if (nameList[i] != "") {
			text = nameList[i];
		}
		Html.push('<span id="textFile'+ i +'">'+ text +'</span>');
		Html.push('<br />');
	}
	Html.push('<button id="btnAdd">追加一行</button>');
	$('.fileTable').html(Html.join(''));

}

// $('#fileSave').click(clickFileSave);
// $('#btnadd').click(clickfileAdd);

$(document).on('click', '#fileSave', clickFileSave);
$(document).on('click', '#btnAdd', clickFileAdd);
// $(document).on('click', '#btnDel', clickFileDel);
// $(document).on('click', '#btnSelect', clickFileSelect);
$(document).on('change', '#uploadExcel', function(){
	uploadReq($(this), function(err, data){
		if (err) {
			return alert(err);
		}
		if (data) {
			fileStatus = 0;
			$('#textFile'+nowSelectIndex).html(data);
		}
	});
});

function uploadReq(obj, cb) {
	//check same file
	var check = 0;
	for (var i = 0; i < nameList.length; ++i) {
		var name = nameList[i];
		if (name == obj[0].files[0].name && i != nowSelectIndex) {
			check = 1;
		}
	}
	if (1 == check) {
		cb(null, null);
		return;
	}
	var data = new FormData();
	data.append('iFile', obj[0].files[0]);
	fileStatus = 1;
	$.ajax({
		url : get_server_url(3900) + '/ApiFileUploadReq',
		data : data,
        processData : false,
        contentType : false,
        type : 'POST',
        success : function(data){
        	if (data.result !== 'success') {

        	}else {
        		nameList[nowSelectIndex] = data.name;
        		convertToJson(data.name, null, function(err, data) {
        			cb(null, data);
        		});
        	}
        	console.log(data.result);
        },
        error : function(xhr, ajaxOptions, thrownError) {
            cb({
                status: xhr.status,
                message: thrownError
            }, null);		        	
        }
	});
}

function convertToJson(file, label, cb) {
	SendHttpRequest(get_server_url(3900), 'ApiConvertToJson', { file: file }, function  (err, data) {
        if  (data.result === 'success') {
            var info = 'Please check table information.\n';
            for  (var item in data.tables) {
                info += '[' + item + '] row count : ' + data.tables[item] + '\n';
            }
            alert(info);
            cb(null, file);
        }			
	});
}

function clickFileSelect(obj) {
	if (0 != timeId || 0 != fileStatus) {
		alert('正在操作中');
		return;
	}
	nowSelectIndex = obj.value;
	$('#uploadExcel').click();
}

function clickFileAdd() {
	if (0 != timeId || 0 != fileStatus) {
		alert('正在操作中');
		return;
	}
	nameList.push("");
	onReday();
}

function clickFileDel(obj) {
	if (0 != timeId || 0 != fileStatus)) {
		alert('正在操作中');
		return;
	}
	nowSelectIndex = obj.value;
	nameList.splice(nowSelectIndex, 1);
	onReday();
}

function clickFileSave() {
	var num = 1;
	msg = "";
	rmList = {};
	iMsg = [];
	jobs = [];
	index = 0;
	LastMsg = [];
	MsgsObj = {};
	updateFilesSize = 0;

	if (0 != timeId || 0 != fileStatus)) {
		alert('正在操作中');
		return;
	}
	getJobData();
	timeId = setInterval(function() {
		getJobData();
	}, 1000);

	if (confirm('Do you want to apply data at version ?')) {
		for (var i in nameList) {
			var name = nameList[i];
			if (name) {
				updateFilesSize++;
			}
		}

		var funcArray = [];

		for (var i = 0; i < nameList.length; ++i) {
			funcArray.push(function(callback) {
				if (nameList[index] == "") return callback(null, {msg:'empty'});
				var tableType = $("#selectExcelType"+index+" option:selected").val();
				var protocol = {
		            service: 'UD',
		            num: num,
		            excel: '',
		            language: '',
	         	   event: ''
	       		};
				protocol[tableType] = nameList[index];
		        checkExcelSheets(protocol, callback);
			});

			funcArray.push(function(message, callback) {
				if (message && (message.msg == 'cancel' || message.msg == 'empty')) {
					++index;
					return callback(null, message, 0);
				}
				var tableType = $("#selectExcelType"+index+" option:selected").val();
				var protocol = {
		            service: 'UD',
		            num: num,
		            excel: '',
		            language: '',
		            event: ''
		        };
				protocol[tableType] = nameList[index];
				++index;
				SendHttpRequest(get_server_url(3900), 'ApiApplyTables', protocol, callback);
			});

			funcArray.push(function(data, time, callback) {
				
				if (!data) {
					return callback(null);
				}
				if (data.msg == 'cancel' || data.msg == 'empty') {
					return callback(null);
				}
	            if (!data.jobId) {
	            	msg += '\n----------------------['+data.file+']------------------------\nThere is no changing to ' + data.file;
	            } else {
	            	var check = 0;
	            	for (var i = 0; i < jobs.length; ++i) {
	            		if (jobs[i] == data.jobId) {
	            			check = 1;
	            			break;
	            		}
	            	}
	            	if (check == 0) {
	            		jobs.push(data.jobId);
	            	}
	            }
	            callback(null);
			});
		}

		async.waterfall(funcArray, function(err) {
			if (err) alert(err);
		});
	}

}

function getProtocol(protocol) {
	return function() {
		var proto = protocol;
		return proto;
	}
}

function getJobData() {
	// alert('getJobData  timeId:'+timeId+", jobs:"+JSON.stringify(jobs));
	// if (timeId != 0 && jobs.length == 0) {
	// 	clearInterval(timeId);
	// 	timeId = 0;
	// 	return;
	// }
	var syncArr = [];
	jobIndex = 0;

	if (0 == jobs.length) {
		return;
	}

	var jobList = jobs.join(',');
	getAsyncJobData(jobList, function(err, datas){
		if (err) {
			alert(err);
			clearInterval(timeId);
			timeId = 0;
			return;
		}
		for (var i = 0; i < datas.length; ++i) {
			var data = datas[i];
			if(data.result != 'success') {
				rmList[data.id] = 1;
				jobIndex++;
			} else {
				var m = "";
				m += '\n----------------------['+data.file+']------------------------';

	            // iMsg.push('\n----------------------'+data.file+'------------------------');

	            for (var key in data.status) {
	                var item = data.status[key];
	                // iMsg.push(key + ' version(' + item.version + ') : ' + item.message + '(' + item.progress + '/' + item.total + ')');
	                m += '\n' + key + ' version(' + item.version + ') : ' + item.message + '(' + item.progress + '/' + item.total + ')';
	            }

	            MsgsObj[data.id] = m;
	            if (data.state === 3) {
	            	rmList[data.id] = 1;
	            }
	            jobIndex++;
			}
		}

		var n = 0;
		iMsg = [];

		for (key in MsgsObj) {
			var m = MsgsObj[key];
			if (m) {
				iMsg.push(m);
			}
		}
		iMsg.push(msg);

		var inc = document.getElementById('incomming');
		inc.innerHTML = iMsg.join('<br \>');
		// LastMsg = iMsg;
		for (key in rmList) {
			if (rmList[key]) {
				++n;
			}
		}
		if (updateFilesSize == n) {
			jobs = [];
			clearInterval(timeId);
			alert('finish.');
			timeId = 0;
		}

	});

}

function checkExcelSheets(protocol, cb) {
	//check excel file
	SendHttpRequest(get_server_url(3900), 'ApiCheckExcelSheets', protocol, function (err, data) {
		if (err) { alert(err); return cb(err); }
		if (data.result == 'same') {
			var sameSheet = '';
			if (data.same && data.same.length > 0) {
				for(var i = 0; i < data.same.length; ++i) {
					var item = data.same[i];
					if (!item) continue;
					sameSheet = sameSheet + ('table:['+item.excel + "] 的 sheet:[" + item.sheet + ']\n');
				}
				sameSheet = sameSheet+ '以上sheet已存在， 是否覆盖';
				if (!confirm(sameSheet)) {
					updateFilesSize--;
					return cb(null, {msg : 'cancel'});
				}
			}
		}
		if (data.result == 'same' || data.result == 'success') {
			cb(null, {});
		} else {
			cb(new Error('checkExcelSheets error'));
		}
	});
}

