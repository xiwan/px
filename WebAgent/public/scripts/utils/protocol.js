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
};