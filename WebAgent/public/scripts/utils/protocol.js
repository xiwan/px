/*  */
function get_server_url(portNo) {

    var domain = location.href.split('/');
    if (domain[2] === 'localhost:56008') {
        var u = 'http://192.168.0.10:' + portNo;
        //var u = 'http://14.63.185.218:' + portNo;
        //var u = 'http://14.63.215.69:' + portNo;
        //var u = 'http://183.110.255.135:' + portNo;
        return u;
    }

    var hosts = window.location.host.split(':');
    var u = window.location.protocol + '//' + hosts[0] + ':' + portNo;
  

    return u;
}

/* SendHttpRequest */
function SendHttpRequest(url, protocol, iMsg, callback) {
    var startTime = new Date();
    var iURL = url + '/' + protocol;
    $.post(iURL, iMsg)
    .done(function (data) {
        var endTime = new Date();
        callback(null, data, endTime - startTime);
    })
    .error(function () {
        callback(null, { result: 'http-post-error' });
    });
}

function getAsyncJobData(jobId, cb) {
    var protocol = {
        jobId: jobId
    };

    SendHttpRequest(get_server_url(3900), 'ApiGetAsyncJobData', protocol, function (err, data) {
        err && getErrorCode(err);
        cb(err, data);
    });
}

function getMachineListData(cb) {
    SendHttpRequest(get_server_url(3900), 'ApiServerMachineListReq', {}, function (err, data) {
        if (err) return;
        if (data.result == 'success') {
            cb(data);
        } else {
            alert(data.result);
        }
    });
}

function getPatchListData(cb) {
    SendHttpRequest(get_server_url(3900), 'ApiServerDeployListReq', {}, function (err, data) {
        if (err) return;
        if (data.result == 'success') {
            cb(data);
        } else {
            alert(data.result);
        }
    });
}

function setPatchDataSave(data, cb) { 
    var msg = {
        'name'      : data.name,
        'note'      : data.note,
        'writer'    : data.writer
    };

    SendHttpRequest(get_server_url(3900), 'ApiServerDeploySaveReq', msg, function (err, data) {
        if (err) { cb(err); return; }
        cb(data);
    });
}

function setPatchServerDeploy(version, groupId, cb) {
    var protocol = {
        'version' : version,
        'groupId' : groupId,
    };

    SendHttpRequest(get_server_url(3900), 'ApiServerDeployFileReq', protocol , function (err, data) {
        if (err) { cb(err); return; }
        cb(data);
    });
}

function setPatchServerApply(version, groupId, cb) {
    var protocol = {
        'version': version,
        'groupId': groupId
    };

    SendHttpRequest(get_server_url(3900), 'ApiServerDeployApplyReq', protocol, function (err, data) {
        if (err) { cb(err); return; }
        cb(data);
    });
}

function setPatchServerStop (version, groupId, cb) {
    var protocol = {
        'version': version,
        'groupId': groupId
    };

    SendHttpRequest(get_server_url(3900), 'ApiServerDeployStopReq', protocol, function (err, data) {
        if (err) { cb(err); return; }
        cb(data);
    });
}

function setPatchServerDelete (version, groupId, cb) {
    var protocol = {
        'version': version,
        'groupId': groupId
    };

    SendHttpRequest(get_server_url(3900), 'ApiServerDeployDeleteReq', protocol, function (err, data) {
        if (err) { cb(err); return; }
        cb(data);
    });
}