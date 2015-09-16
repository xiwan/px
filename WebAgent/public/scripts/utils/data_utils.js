(function () {
    if (!window.localStorage) {
        alert('disable window.localStorage')
    }

    if (!window.sessionStorage) {
        alert('disable window.sessionStorage')
    }

    function load(script) {
        document.write('<' + 'script src="' + script + '" type="text/javascript"><' + '/script>');
    }

    load("/scripts/utils/jquery-2.1.4.min.js");
    load("/scripts/utils/async.js");
    load("/scripts/utils/giveName.js");
    load("/scripts/utils/protocol.js");
    load("/scripts/option/gradeMenu.js");
    //초기 설정파일을 로드한다.
    load("/scripts/option/configure.js");

    var url = location.href.split('/');
    
    if (url[url.length - 1] != 'index.html' && !window.sessionStorage['sessionKey']) {
        location.href = "index.html";
    }
    
})();

/*  */
function iNumPad2(number) {
    return (number < 10 ? '0' : '') + number;
}

/* Date 타입 데이터를 시/분/초 */
function convertToTimeString(date) {
    var iDate = new Date(date);
    return iNumPad2(iNumPad2(iDate.getHours()) + ':' + iNumPad2(iDate.getMinutes()) + ':' + iNumPad2(iDate.getSeconds()));
}

/* Date 타입 데이터를 일/시/분 */
function convertToShortDateTime(date) {
    var iDate = new Date(date);
    return iNumPad2(iDate.getDate()) + ' ' + iNumPad2(iDate.getHours()) + ':' + iNumPad2(iDate.getMinutes());
}

/* Date 타입 데이터를 일/시/분/초 */
function convertToDateSecString(date) {
    var iDate = new Date(date);
    return iNumPad2(iDate.getDate()) + ' ' + iNumPad2(iDate.getHours()) + ':' + iNumPad2(iDate.getMinutes()) + ':' + iNumPad2(iDate.getSeconds());;
}

/* Date 타입 데이터를 년/월/일/시/분/초 */
function convertToDateAllString(date) {
    var iDate = new Date(date);
    return iNumPad2(iDate.getFullYear()) + '-' + iNumPad2(iDate.getMonth()) + '-' + iNumPad2(iDate.getDate()) + ' ' + iNumPad2(iDate.getHours()) + ':' + iNumPad2(iDate.getMinutes()) + ':' + iNumPad2(iDate.getSeconds());
}

/*  */
function convertToDateTimeString(date) {
    var iDate = new Date(date);
    return iDate.getFullYear() + '/' + iNumPad2(iDate.getMonth() + 1) + '/' + iNumPad2(iDate.getDate())
        + ' ' + iNumPad2(iDate.getHours()) + ':' + iNumPad2(iDate.getMinutes());
}

function convertToDateTimeString2(date) {
    var iDate = new Date(date);
    return iDate.getFullYear() + '-' + iNumPad2(iDate.getMonth() + 1) + '-' + iNumPad2(iDate.getDate())
        + ' ' + iNumPad2(iDate.getHours()) + ':' + iNumPad2(iDate.getMinutes()) +':'+iNumPad2(iDate.getSeconds());
}

function convertToDateString(date) {
    var iDate = new Date(date);
    return iDate.getFullYear() + '-' + iNumPad2(iDate.getMonth() + 1) + '-' + iNumPad2(iDate.getDate());
}

function convertToDateSendString(date) {
    var iDate = new Date(date);
    return iDate.getFullYear() + '/' + iNumPad2(iDate.getMonth() + 1) + '/' + iNumPad2(iDate.getDate());
}

function convertToDTLString(date) {
    if (typeof (date) === 'string') {
        var year = date[0] + date[1] + date[2] + date[3];
        var month = date[5] + date[6];
        var day = date[8] + date[9];
        var hour = date[11] + date[12];
        var time = date[14] + date[15];
        return year + '-' + month + '-' + day + ' ' + hour + ':' + time;
    }
    
    if (typeof (date) === 'object') {
        var iDate = new Date(date);
        return iDate.getFullYear() + '-' + iNumPad2(iDate.getMonth() + 1) + '-' + iNumPad2(iDate.getDate())
        + 'T' + iNumPad2(iDate.getHours()) + ':' + iNumPad2(iDate.getMinutes());
    }
    
}

function convertToStringDateString(date) {
    var hour = '';
    if (date[8] != undefined) {
        hour = ' ' + date[7] + date[8] + 'H';
    }
    return date[0] + date[1] + date[2] + date[3] + '/' + date[4] + date[5] + '/' + date[6] + date[7] + hour;
}

/* ITEM GOT TIME*/
function getItemAcquisitionTime(date) {
    var year = "20" + date[1] + date[2];
    var mon = date[3] + date[4];
    var day = date[5] + date[6];
    var time = date[7] + date[8];
    var min = date[9] + date[10];
    var sec = date[11] + date[12];

    this.min = year + '-' + mon + '-' + day + ' ' + time + ':' + min;
    this.allTime = year + '-' + mon + '-' + day + ' ' + time + ':' + min + ':' + sec;
};


/* trim 정의 */
String.prototype.trim = function () {
    return this.replace(/(^\s*)|(\s*$)/gi, "");
};

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

/* 파일 업로드 함수 */
function uploadReq(obj, cb) {
    var data = new FormData();
    data.append('iFile', obj[0].files[0]);

    $.ajax({
        url: get_server_url(3900) + '/ApiFileUploadReq',
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

/* Get SendHttpRequest */
function SendGetHttpRequest(url, key, protocol) {
    var href = url + '/' + key + '?' + protocol;
    window.location.href = href;
}

/* Array Index */
function getArrayIndex(ary, key, val) {
    for (var i = 0, iLen = ary.length; i < iLen; i++) {
        if (ary[i][key] == val)
            return i;
    }
    return -1;
}

/* inputBox 숫자 체크*/
function onlyNumber2(obj) {

    var num_regx = /^[0-9]*$/;
    if (!num_regx.test(obj)) {
        alert('Input Only Number');
        return 'err';
    }

};

/* 날짜 시간 검증 */
function isDate(date) {

    var dateRegEx = /^(\d{4})(\/|-)(\d{1,2})(\/|-)(\d{1,2})(\/|\s)(\d{1,2})(\/|:)(\d{1,2})$/;
    var matchArray = dateRegEx.exec(date);

    if (matchArray == null) return alert('Insert Format : YYYY/MM/DD hh:mm');

    var year = matchArray[1];
    var month = matchArray[3];
    var day = matchArray[5];
    var hour = matchArray[7];
    var min = matchArray[9];
    var date = year + "/" + month + "/" + day + " " + hour + ":" + min;

    if (month.charAt(0) == 0) month = month.charAt(1);
    if (day.charAt(0) == 0) day = day.charAt(1);
    if (month < 1 || month > 12) return alert('Cannot Insert Month');
    if (day < 1 || day > 31) return alert('Cannot Insert Day');
    if ((month == 4 || month == 6 || month == 9 || month == 11) && day == 31) {
        return alert('Cannot Insert Month');
    }
    if (month == 2) {
        var isleap = (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0));
        if (day > 29 || (day == 29 && !isleap)) {
            return alert('Cannot Insert Month');
        }
    }

    if (hour < 0 || hour > 24) return alert('Cannot Insert Hour');
    if (min < 0 || min > 60) return alert('Cannot Insert Min');

    return date;
};

/* 몇일이 다른지 계산 */
function getDateDiff(date1, date2) {
    var arrDate1 = date1.split("-");
    var getDate1 = new Date(parseInt(arrDate1[0]), parseInt(arrDate1[1]) - 1, parseInt(arrDate1[2]));
    var arrDate2 = date2.split("-");
    var getDate2 = new Date(parseInt(arrDate2[0]), parseInt(arrDate2[1]) - 1, parseInt(arrDate2[2]));

    var getDiffTime = getDate1.getTime() - getDate2.getTime();

    return Math.floor(getDiffTime / (1000 * 60 * 60 * 24));
}

function getMainMenuItem(account, name) {
    var iLen = account.mainMenus.length;
    for (var i = 0; i < iLen; i++) {
        var item = account.mainMenus[i];
        if (item.name === name)
            return item;
    }
    return null;
}

function getSubMenuItem(mainMenus, subMenus) {
    var account = JSON.parse(window.sessionStorage['account']);
    var main = getMainMenuItem(account, mainMenus);
    if (!main) return null;

    var iLen = main.subMenus.length;
    for (var i = 0; i < iLen; i++) {
        var item = main.subMenus[i];
        if (item.name === subMenus)
            return item;
    }
    return null;
};

function changeNULL(data) {

    if (data == null) {
        return 0;
    }

};

function base64_decode(data) {
    var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
        ac = 0,
        dec = "",
        tmp_arr = [];

    if (!data) {
        return data;
    }

    data += '';

    do { // unpack four hexets into three octets using index points in b64
        h1 = b64.indexOf(data.charAt(i++));
        h2 = b64.indexOf(data.charAt(i++));
        h3 = b64.indexOf(data.charAt(i++));
        h4 = b64.indexOf(data.charAt(i++));

        bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;

        o1 = bits >> 16 & 0xff;
        o2 = bits >> 8 & 0xff;
        o3 = bits & 0xff;

        if (h3 == 64) {
            tmp_arr[ac++] = String.fromCharCode(o1);
        } else if (h4 == 64) {
            tmp_arr[ac++] = String.fromCharCode(o1, o2);
        } else {
            tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
        }
    } while (i < data.length);

    dec = tmp_arr.join('');
    dec = utf8_decode(dec);

    return dec;
};
// private method for UTF-8 decoding
function utf8_decode (utftext) {
    var string = "";
    var i = 0;
    var c = 0, c1 = 0, c2 = 0;

    while (i < utftext.length) {

        c = utftext.charCodeAt(i);

        if (c < 128) {
            string += String.fromCharCode(c);
            i++;
        }
        else if ((c > 191) && (c < 224)) {
            c1 = utftext.charCodeAt(i + 1);
            string += String.fromCharCode(((c & 31) << 6) | (c1 & 63));
            i += 2;
        }
        else {
            c1 = utftext.charCodeAt(i + 1);
            c2 = utftext.charCodeAt(i + 2);
            string += String.fromCharCode(((c & 15) << 12) | ((c1 & 63) << 6) | (c2 & 63));
            i += 3;
        }

    }
    return string;
};

// String format 구현.
if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined'
              ? args[number]
              : match
            ;
        });
    };
}


/* loadBar 만들기 */
function loader(div) {
    var selectDiv = div;
    var loadHtml = new Array();
    var domain = location.href.split('/');
    var src = domain[0] + '//' + domain[2] + "/images/loader.gif";
    loadHtml.push("<div class='loadDiv'>");
    loadHtml.push("<img class='loader' src='" + src + "' />");
    loadHtml.push("</div>");
    var sheet = document.createElement('style');
    var style = ".loadDiv {background-color : #F5F5F5; display: none; opacity : 0.8; position : absolute; z-index : 10;";
    style += "width : " + Number($(div).width() + 10) + "px; height : " + $(div).height() + "px; top : " + $(div).offset().top + "px;";
    style += " left : " + Number($(div).offset().left - 5) + "px; }";
    style += ".loader { margin-left : 50%; margin-top : " + $(div).height() / 100 * 40 + "px; }";

    sheet.innerHTML = style;

    $(div).after(loadHtml.join(''));
    document.body.appendChild(sheet);
};

loader.prototype.hide = function () {
    $('.loadDiv').hide();
};

loader.prototype.show = function () {
    $('.loadDiv').show();
};

/** Table Excel 받기 */
var tableToExcel = (function () {
    var uri = 'data:application/vnd.ms-excel;base64,'
      , template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head>' +
      '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>' +
      '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><meta http-equiv="content-type" content="text/plain; charset=UTF-8"/></head><body><table>{table}</table></body></html>'
      , base64 = function (s) { return window.btoa(unescape(encodeURIComponent(s))) }
      , format = function (s, c) { return s.replace(/{(\w+)}/g, function (m, p) { return c[p]; }) }
    return function (table, name) {
        if (!table.nodeType) table = document.getElementById(table)
        var ctx = { worksheet: name || 'Worksheet', table: table.innerHTML }
        window.location.href = uri + base64(format(template, ctx))
    }
})()

/** 돈 구분 해주는 콤마 */
function moneyDivisionUtil(data) {

    var money = String(data);

    var reg = /(^[+-]?\d+)(\d{3})/;   // 정규식
    money += '';                          // 숫자를 문자열로 변환

    while (reg.test(money))
        money = money.replace(reg, '$1' + ',' + '$2');

    return money;
};