var patchList = new Array;
var machineList = new Array;
var groupList = '';
var loadBar;
var version;

function onReady() {
    $('#dvWorking').hide();
    getMachineList(function(){
        getpatchList();
    });
}

$(document).on('click', '#clickFileUpload', function () { $('#uploadReal').click() });
$(document).on('change', '#uploadReal', function () {
    var text = $('#uploadReal').val();
    document.getElementById('txtFile').title = text;
    $('#txtFile').text((text.length >= 38) ? text.slice(0, 38) + '...' : text);
});
$(document).on('click', '.detailArrow', clickDetailArrow);
$(document).on('change', '#uploadReal', clickFileUpload);
$(document).on('click', '#clickFileSave', clickPatchFileSave);
$(document).on('click', '.patchDeploy', clickPatchDeploy);
$(document).on('click', '.patchApply', clickPatchApply);
$(document).on('click', '.patchStop', clickPatchStop);
$(document).on('click', '.patchDelete', clickPatchDelete);
  
function getpatchList(cb) {
    getPatchListData(function (data) {
        patchList = data.items;
        version = data.version;
        setPatchListHtml(1);
        if (cb) cb();
    });

};

function getMachineList(cb){
    getMachineListData(function (data) {
        machineList = data.items;
        setMachineListHtml();
        if (cb) cb();
    });

}

function clickDetailArrow() {
    $('.detailTr').css('display', 'none');
    var detailTr = $(this).parent().parent().next();
    if ($(this).text() === '▲') {
        $(this).text('▼');
        detailTr.css('display', 'none')
    } else {
        $('.detailArrow').text('▼');
        $(this).text('▲'); 
        $('detailTr').css('display', 'none');
        detailTr.css('display', 'table-row');
    }
};

function clickFileUpload() {
    // loadBar.show();
    $('#dvWorking').show();
    uploadReq($(this), function (err, data) {
        if (data.result === 'success') {
            $('#txtFile').val(data.name);
        }
        // loadBar.hide();
        $('#dvWorking').hide();
    });
}

function uploadReq(obj, cb) {
    var data = new FormData();
    data.append('iFile', obj[0].files[0]);

    $.ajax({
        url: get_server_url(global.base.cfg.services['WA'].bindPortNo) + '/ApiFileUploadReq',
        data: data,
        processData: false,
        contentType: false,
        type: 'POST',
        success: function (data) {
            cb(null, data);
        },
        error: function (xhr, ajaxOptions, thrownError) {
            cb({
                status: xhr.status,
                message: thrownError
            }, null);
        }
    });
};

function clickPatchFileSave() {
    name = $('#uploadReal').val().split("\\").pop();
    note = $('#patchNote').val();
    if (name.length == 0 || note.length == 0) {
        alert('not enough data');
        return;
    }

    
    if (confirm("Do you want ?")) {
        // loadBar.show();
        var patchData = {
            'name': name,
            'note': note,
            'writer': ""//window.sessionStorage['userId']
        };
        setPatchDataSave(patchData, function (data) {
            alert(data.result);
            if (data.result == 'success') {
                setTimeout(function () {
                    // loadBar.hide();
                    alert(data.result);
                    onReady();
                    $('#txtFile').text('');
                    $('#patchNote').val('');
                }, 1000);
            } else {
                alert(data.result);
                // loadBar.hide();
            }

        });

    } else {

        return;
    }
};

$(document).on('click', '#paging a', function () {
    if ('◀' == $(this).text()) {

        var prevPage = parseInt($(this).parent().next().find('a').text());
        setPatchListHtml(prevPage - 1);

        return;
    }

    if ('▶' == $(this).text()) {

        var nextPage = parseInt($(this).parent().prev().find('a').text());
        setPatchListHtml(nextPage + 1);

        return;
    }

    setPatchListHtml($(this).text());

});

function clickPatchDeploy() {
    var groupName = $(this).attr('group-name');
    var groupId = $('select[name="'+groupName+'"]').val(); 
    if (!parseInt(groupId)) {
        return alert('Please use correct groupId!');
    }

    if (confirm("Do you want deploy?")) {
        var version = $(this).parent().find('input').val();
        setPatchServerDeploy(version, groupId, function (data) {
            // alert(data.version + ':' + data.result);
            getpatchList();
        });
    } 
}

function clickPatchApply() {
    var groupName = $(this).attr('group-name');
    var groupId = $('select[name="'+groupName+'"]').val();
    if (!parseInt(groupId)) {
        return alert('Please use correct groupId!');
    }

    if (confirm("Do you want apply?")) {
        var version = $(this).parent().find('input').val();
        setPatchServerApply(version, groupId, function (data) {
            alert(data.version + ':' + data.result);
            getpatchList();
        });
    } 
}

function clickPatchStop() {
    var groupName = $(this).attr('group-name');
    var groupId = $('select[name="'+groupName+'"]').val(); 
    if (!parseInt(groupId)) {
        return alert('Please use correct groupId!');
    }

    if (confirm("Do you want stop?")) {
        var version = $(this).parent().find('input').val();
        setPatchServerStop(version, groupId, function (data) {
            alert(data.version + ':' + data.result);
            getpatchList();
        });
    }
}

function clickPatchDelete() {
    var groupName = $(this).attr('group-name');
    var groupId = $('select[name="'+groupName+'"]').val(); 
    if (!parseInt(groupId)) {
        return alert('Please use correct groupId!');
    }
    if (confirm("Do you want delete?")) {
        var version = $(this).parent().find('input').val();
        setPatchServerDelete(version, groupId, function (data) {
            alert(data.version + ':' + data.result);
            getpatchList();
        });
    }
};

function setMachineListHtml(){
    var Html = new Array;
    Html.push('<table class="patchList">');
    Html.push('<tr><td>groupId</td>');
    Html.push('<td>account</td>');
    Html.push('<td>host-name</td>');
    Html.push('<td>ip</td>');
    Html.push('<td>basePath</td>');
    Html.push('<td>status</td>');
    Html.push('<td>action</td></tr>');
    var Html2 = [0];
    if (machineList != undefined) { 
        for (var i=0, len=machineList.length; i<len; i++) {
            Html.push('<tr class="bb">');
            Html.push('<td>'+machineList[i].groupId+'</td>');
            Html.push('<td>'+machineList[i].account+'</td>');
            Html.push('<td>'+machineList[i].hostname+'</td>');
            Html.push('<td>'+machineList[i].ip+'</td>');
            Html.push('<td>'+machineList[i].basePath+'</td>');
            Html.push('<td>'+machineList[i].status+'</td>');
            Html.push('<td></td>');
            Html.push("</tr>");
            Html2.push(machineList[i].groupId);
        }
    }

    // Html2 = _.uniq(Html2, true);
    var Html3 = new Array;
    for (var i=0, len=Html2.length; i<len; i++) {
        Html3.push('<option value='+Html2[i]+'>'+Html2[i]+'</option>');
    }

    Html.push('</table>');
    groupList = Html3.join('');          
    $('.mainTable2').html(Html.join(''));
}

function setPatchListHtml(pageNum) {

    var Html = new Array;

    Html.push("<table class='patchList'>");
    Html.push("<tr>");
    Html.push("<td>Version</td>");
    Html.push("<td>State</td>");
    Html.push("<td>Upload Date</td>");
    Html.push("<td>User</td>");
    Html.push("<td>Location</td>");
    Html.push("<td>Apply Date</td>");
    Html.push("<td>GroupId</td>");
    Html.push("<td>Detail View</td>");
    Html.push("</tr>");

    if (patchList != undefined) {
        for (var i = (pageNum * 10) - 10 ; i < pageNum * 10 ; i++) {
            if (i == patchList.length) break;

            if (parseInt(patchList[i].version) == version) {
                Html.push("<tr  class='bb' style='background: #ffffff;'>");
            }else {
                Html.push("<tr  class='bb'>");
            }
            Html.push("<td>" + patchList[i].version + "</td>");
            Html.push("<td>" + patchList[i].state + "</td>");
            Html.push("<td>" + patchList[i].uploadDate + "</td>");
            var writer = '';
            
            if (patchList[i].writer) writer = patchList[i].writer;
            Html.push("<td>" + writer + "</td>");
            Html.push("<td>" + patchList[i].hosts + "</td>");
            Html.push("<td>");
            Html.push((patchList[i].applyDate == null) ? '-' : patchList[i].applyDate);
            Html.push("</td>");
            Html.push("<td>"+patchList[i].groupId+"</td>");
            
            Html.push("<td>");
            Html.push("<span class='detailArrow'>▼</span>");
            Html.push("</td>");
            Html.push("</tr>");
            Html.push("<tr class='detailTr'>");
            Html.push("<td colspan='8' class='detailView'>");
            Html.push("<textarea class='patchTextArea' readonly='readonly'>" + patchList[i].patchNote + "</textarea>");
            Html.push("<input type='hidden' value='" + patchList[i].version + "'/>");
            var selectedGList = "<select name='groupId"+i+"'> "+groupList+" </select>";

            Html.push("<span>Please Select GroupId: "+selectedGList+"</span>");
            Html.push("<button class='patchDeploy fileBtn' group-name='groupId"+i+"' >Deploy</button>");
            Html.push("<button class='patchApply fileBtn' group-name='groupId"+i+"' >Apply</button>");

            if (parseInt(patchList[i].version) == version && parseInt(patchList[i].state) == 3) {
                Html.push("<button class='patchStop fileBtnRed' group-name='groupId"+i+"' >Stop</button>");
            }
            Html.push("<button class='patchDelete fileBtnRed' group-name='groupId"+i+"' >Delete</button>");
            Html.push("</td>");
            Html.push("</tr>");
        }
    }

    // if (patchList != undefined) {
    //     Html.push("</table>");
    //     Html.push("<div class='blockListPageDiv'>");
    //     Html.push("<table id='paging' class='paging' align='center'>");
    //     Html.push("<tr>");

    //     if (Math.floor((pageNum - 1) / 10) > 0) {
    //         Html.push("<td>");
    //         Html.push("<a>◀</a>");
    //         Html.push("</td>");
    //     }

    //     for (var i = Math.floor((pageNum - 1) / 10) * 10; i < Math.ceil(pageNum / 10) * 10 && i < Math.ceil(patchList.length / 10) ; i++) {
    //         Html.push("<td>");
    //         Html.push("<a id='" + (i + 1) + "'>" + (i + 1) + "</a>");
    //         Html.push("</td>");
    //     }

    //     if (Math.ceil(pageNum / 10) * 100 < patchList.length) {
    //         Html.push("<td>");
    //         Html.push("<a>▶</a>");
    //         Html.push("</td>");
    //     }
    //     Html.push("</tr>");
    //     Html.push("</table>");
    //     Html.push("</div>");

    // }
    $('.mainTable').html(Html.join(''));
    // loadBar = new loader('.fileSaveDiv');
}
