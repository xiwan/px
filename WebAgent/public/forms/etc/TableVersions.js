function onReday() {
	var name = '';

	$('#uploadExcel').change(function(){
		uploadReq($(this), function(err, data){
			console.log(data)
		});
	});

	$('#fileSave').click(clickFileSave);

	//$(document).on('click', '#fileSave', clickFileSave);

	function uploadReq(obj, cb) {
		var data = new FormData();
		data.append('iFile', obj[0].files[0]);

		$.ajax({
			url : get_server_url(3900) + '/ApiFileUploadReq',
			data : data,
	        processData : false,
	        contentType : false,
	        type : 'POST',
	        success : function(data){
	        	if (data.result !== 'success') {

	        	}else {
	        		name = data.name;
	        		convertToJson(data.name, null);
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

	function convertToJson(file, label) {
		SendHttpRequest(get_server_url(3900), 'ApiConvertToJson', { file: file }, function  (err, data) {
	        if  (data.result === 'success') {
	            var info = 'Please check table information.\n';
	            for  (var item in data.tables) {
	                info += '[' + item + '] row count : ' + data.tables[item] + '\n';
	            }
	            alert(info);
	        }			
		});
	}

	function clickFileSave() {
		var result = name;
		var num = 1;
		var tableType = $("#selectExcelType option:selected").val();
		
		if (confirm('Do you want to apply data at version ?')) {
			checkExcelSheets(function() {
				var protocol = {
		            service: 'UD',
		            num: num,
		            excel: '',
		            language: '',
		            event: ''
		        };
		        protocol[tableType] = result;
		        console.log(protocol)
		        var inc = document.getElementById('incomming');
		        SendHttpRequest(get_server_url(3900), 'ApiApplyTables', protocol, function (err, data) {
		            if (err) { alert(err); return; }

		            if (!data.jobId) {
		                inc.innerHTML = 'There is no changing sheet';
		                return;
		            }
		            var timeId = setInterval(function () {
		                getAsyncJobData(data.jobId, function (err, data) {
		                    if (err || data.result != 'success') {
		                        clearInterval(timeId);
		                    }

		                    var iMsg = [];
		                    for (var key in data.status) {
		                        var item = data.status[key];
		                        iMsg.push(key + ' version(' + item.version + ') : ' + item.message + '(' + item.progress + '/' + item.total + ')');
		                    }
		                    inc.innerHTML = iMsg.join('<br \>');
		                    if (data.state === 3) {
		                        clearInterval(timeId);
		                    }
		                });
		            }, 1000);
		        });
			});
		}

	}


	function checkExcelSheets(cb) {
		var result = name;
		var num = 1;
		var tableType = $("#selectExcelType option:selected").val();
        var protocol = {
	            service: 'UD',
	            num: num,
	            excel: '',
	            language: '',
	            event: ''
        };
        protocol[tableType] = result;
		//check excel file
		SendHttpRequest(get_server_url(3900), 'ApiCheckExcelSheets', protocol, function (err, data) {
			if (err) { alert(err); return; }
			if (data.result != 'success') {
				var sameSheet = '';
				if (data.same && data.same.length > 0) {
					for(var i = 0; i < data.same.length; ++i) {
						var item = data.same[i];
						if (!item) continue;
						sameSheet = sameSheet + ('table['+item.excel + "] : sheet[" + item.sheet + ']\n');
					}
					sameSheet = sameSheet+ '已存在， 是否覆盖';
					if (!confirm(sameSheet)) return;
				}
			}
			cb();
		});
	}
}

