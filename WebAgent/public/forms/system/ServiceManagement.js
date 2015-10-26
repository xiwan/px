// (function () {
//     function load(script) {
//         document.write('<' + 'script src="' + script + '" type="text/javascript"><' + '/script>');
//     }

//     load("/scripts/utils/jquery-1.11.0.js");
//     load("/scripts/utils/data_utils.js");
// })();

function onReady() {
    $('#dvWorking').hide();

    getServiceList();
    setInterval(function () {
        getServiceList();
    }, 10000);
}

function getServiceList() {
    SendHttpRequest(get_server_url(global.base.cfg.services['WA'].bindPortNo), 'ApiGetServiceList', {}, function (err, data) {
        if (err) {
            return;
        }
        var iList = [];
        for (var idx in data) {
            iList.push(data[idx]);
        };
        var iOrder = {
            SM: 1,
            SS: 2,
            UD: 3,
            CL: 4,
            MB: 5,
            AP: 6
        }

        iList.sort(function (x, y) {
            if (x.hosts == y.hosts) {
                var a = iOrder[x.service] || (a = 99), b = iOrder[y.service] || (b = 99);
                if (a == b) { return a.idx - b.idx }
                else return a - b;
            } else if (x.hosts < y.hosts) return 1;
            else return -1;
        });
        $("#divVersions tr:not(:first)").remove();
        iList.forEach(function (item) {
            var startTime = item.startDate || 0;
            var param = item.service + '.' + item.idx;
            if (!item.state) {
                startTime = '';
                item.memory = item.cpu = 0;
            }
            var iTag = [];
            iTag.push('<tr class="item">');
            iTag.push('<td align="center"><input type="checkbox" /></td>');
            iTag.push('<td class="hosts" align="left">' + item.hosts + '</td>');
            iTag.push('<td class="name" align="center">' + item.service + '.' + item.idx + '</td>');
            iTag.push('<td align="center">' + item.state + '</td>');
            iTag.push('<td align="center">' + item.cpu + '%' + '</td>');
            iTag.push('<td align="center">' + item.memory + 'MB' + '</td>');
            iTag.push('<td align="center">' + " " + '</td>');
            iTag.push('<td align="center">' + startTime + '</td>');
            iTag.push('<td></td>');
            if (item.service === 'SM') {
                iTag.push('<td align="center"><button class="btn-process" id="btnReStartAll" onClick=onServiceAction("restart.' + item.hosts + '.all.0")>restart</button></td>');
            } else {
                iTag.push('<td align="center"><button class="btn-process" id="btnStart" onClick=onServiceAction("start.' + param + '")>start</button></td>');
                iTag.push('<td align="center"><button class="btn-process" id="btnStop" onClick=onServiceAction("stop.' + param + '")>stop</button></td>');
            }
            iTag.push('</tr>');
            $('#divVersions tr:last').after(iTag.join(' '));
        });
    });
}

function onServiceAction(item) {
        var args = item.split('.');
    var iMsg = {
        action: args[0],
        service: args[1],
        idx : args[2]
    }

    if (iMsg.service == 'WA') {
        alert('WebConsole has no permission to '+ iMsg.action +' WA');
        return;
    }

    SendHttpRequest(get_server_url(global.base.cfg.services['WA'].bindPortNo), 'ApiActionServiceReq', iMsg, function (err, data) {
        if (err) return;

        waitForWorking();
    });
}

function waitForWorking() {
    $('#dvWorking').show();
    var iText = 'Working';
    var tid = setInterval(function () {
        iText += '.';
        $('#iWork').text(iText);
    }, 1000);

    setTimeout(function () {
        getServiceList();
        clearInterval(tid);
        $('#dvWorking').hide();
        $('#iWork').text('');
    }, 5000);
}
