//lev 만 바꿔 주면 됨 0 이면 콘솔 아무것도 안찍힘
var oDegLev = 1;

var oDeg = function () { };

oDeg.Debug = function (message) {

    try {
        if (oDegLev >= 1) {
            console.log(message);
        }
    } catch (exception) {
        return;
    }

}

oDeg.Info = function (message) {

    try {
        if (oDegLev >= 2) {
            console.log(message);
        }
    } catch (exception) {
        return;
    }

}

oDeg.Warn = function (message) {

    try {
        if (oDegLev >= 3) {
            console.log(message);
        }
    } catch (exception) {
        return;
    }

}

oDeg.Error = function (message) {

    try {
        if (oDegLev >= 4) {
            console.log(message);
        }
    } catch (exception) {
        return;
    }

}

oDeg.Fatal = function (message) {

    try {
        if (oDegLev >= 5) {
            console.log(message);
        }
    } catch (exception) {
        return;
    }

}

