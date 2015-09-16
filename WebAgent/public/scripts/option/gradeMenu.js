var gameMamtMenu = {
    name: 'Game Mgmt',
    details: [{
    name: 'User Search',
    url: '/forms/gameMgmt/userSearch/userSearch.html'
    },
    /*{
        name: 'Action Log',
        url: '/forms/gameMgmt/actionLog/actionLog.html'
    },*/
    {
        name: 'Action Log',
        url: '/forms/gameMgmt/actionLog/actionLogNew.html'
    },
    {
        name: 'Clan Search',
        url: '/forms/gameMgmt/clanSearch/clanSearch.html'
    },
    {
        name: 'Rank Mgmt',
        url: '/forms/gameMgmt/rankMgmt/rankSearch.html'
    },
    {
        name: 'User Mgmt',
        url: '/forms/gameMgmt/userMgmt/userBlock.html'
    }]
};

var contentsMagtMenu = {
    name: 'Contents Mgmt',
    details: [{
        name: 'Mail Mgmt',
        url: '/forms/contMgmt/mailMgmt/mailSender.html'
    },
    {
        name: 'Notice',
        url: '/forms/contMgmt/noticeSetting.html'
    },
    {
        name: 'Maintenance',
        url: '/forms/contMgmt/maintenanceNotice.html'
    }]
};

var statisticMagMenu = {
    name: 'Game Statistics',
    details: [{
        name: 'User Stats',
        url: '/forms/statistics/basicStats/accountStats.html'
    },
    {
        name: 'Billing Stats',
        url: '/forms/statistics/billingStats/cashBillingStats.html'
    }]
};

var serviceMenu = {
    name: 'Service',
    details: [{
        name: 'Deployment',
        url: '/forms/service/deploy.html'
    },
    {
        name: 'Management',
        url: '/forms/service/management.html'
    }, {
        name: 'Error Moniter',
        url: '/forms/service/errorMoni.html'
    }, {
        name: 'CCU',
        url: '/forms/service/rtCCUStats.html'
    }]
};

var tableVersionMenu = {
    name: 'Table Versions',
    url: '/forms/etc/TableVersions.html'
};

var localizationMenu = {
    name: 'Localization Tools',
    url: '/forms/etc/LangTools.html'
};

var TestPageMenu = {
    name: 'Test',
    details: [{
        name: 'TestPage',
        url: '/forms/testPage/TestPageMain.html'
    }]
};

var privateServiceMenu = {
    name: 'Service',
    details: [{
        name: 'Management',
        url: '/forms/service/management.html'
    }, {
        name: 'CCU',
        url: '/forms/service/rtCCUStats.html'
    }]

}

var pubilcServiceMenu = {
    name: 'Service',
    details: [{
        name: 'CCU',
        url: '/forms/service/rtCCUStats.html'
    }]
};

var hrMenu = {
    name: 'DailySales',
    url: '/forms/statistics/billingStats/dailySales.html'
};

var authDecision = {
    0: {
        'menu1': gameMamtMenu,
        'menu2': contentsMagtMenu,
        'menu3': statisticMagMenu,
        'menu4': serviceMenu,
        'menu5': tableVersionMenu,
        'menu6': localizationMenu,
        'menu7': TestPageMenu
    },
    11: {
        'menu1': tableVersionMenu
    },
    21: {
        'menu1': gameMamtMenu,
        'menu2': pubilcServiceMenu
    },
    31: {
        'menu1': gameMamtMenu,
        'menu2': contentsMagtMenu,
        'menu3': pubilcServiceMenu
    },
    32: {
        'menu1': gameMamtMenu,
        'menu2': contentsMagtMenu,
        'menu3': statisticMagMenu,
        'menu4': privateServiceMenu
    },
    41: {
        'menu1': hrMenu
    }
};

function initLoginMenu(authCode) {
   
    var mainMenu = [];
    console.log(authCode);
    var menuObj = authDecision[authCode];
    Object.keys(menuObj).forEach(function (key) {
        mainMenu.push(menuObj[key]);

    });

    var menu = {
        'mainMenus': [{
            'name' : 'EveryFun',
            'subMenus': mainMenu
        }]
    };


    return menu;
}


