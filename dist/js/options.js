var app = angular.module('OpenTabs', ['ngRoute', 'ngAnimate', 'ngAria', 'ngMaterial', 'angular-google-analytics']);

app.config(['$routeProvider', '$compileProvider', '$mdIconProvider', '$mdThemingProvider', 'AnalyticsProvider', function ($routeProvider, $compileProvider, $mdIconProvider, $mdThemingProvider, AnalyticsProvider) {

    // Allow "chrome-extension" protocol
    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|chrome-extension|blob:chrome-extension|file|blob):/);
    $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|chrome-extension|file|blob):|data:image\//);

    // Load icons list by name
    $mdIconProvider
        .icon('arrow-right', '/icons/arrow-right.svg')
        .icon('close', '/icons/close.svg')
        .icon('content-duplicate', '/icons/content-duplicate.svg')
        .icon('credit-card', '/icons/credit-card.svg')
        .icon('delete', '/icons/delete.svg')
        .icon('dots-horizontal', '/icons/dots-horizontal.svg')
        .icon('dots-vertical', '/icons/dots-vertical.svg')
        .icon('eye-off', '/icons/eye-off.svg')
        .icon('github-circle', '/icons/github-circle.svg')
        .icon('google-chrome', '/icons/google-chrome.svg')
        .icon('magnify', '/icons/magnify.svg')
        .icon('pin', '/icons/pin.svg')
        .icon('pin-off', '/icons/pin-off.svg')
        .icon('refresh', '/icons/refresh.svg')
        .icon('reload', '/icons/reload.svg')
        .icon('save', '/icons/content-save.svg')
        .icon('settings', '/icons/settings.svg');

    $mdThemingProvider
        .theme('default')
        .primaryPalette('blue', {
            default: '600'
        })
        .accentPalette('yellow', {
            default: '700'
        })
        .warnPalette('red', {
            default: 'A700'
        });

    // Analytics config
    AnalyticsProvider.setAccount('UA-27524593-8');
    AnalyticsProvider.setHybridMobileSupport(true);
    AnalyticsProvider.setDomainName('none');

    var routes = {
        '/:event?/:version?': {
            templateUrl: '/html/home.html',
            controller: 'HomeController'
        }
    };

    for (var path in routes) {
        if (routes.hasOwnProperty(path)) {
            $routeProvider.when(path, routes[path]);
        }
    }

}]);

app.run(['Analytics', function (Analytics) {

}]);

app.filter('searchFilter', function () {
    return function (items, query) {
        if (query === null || query === '') {
            return items;
        }

        query = query.toLowerCase();

        var filtered = [];

        angular.forEach(items, function (item) {
            if (item.title.toLowerCase().indexOf(query) !== -1 || item.url.toLowerCase().indexOf(query) !== -1) {
                filtered.push(item);
            }
        });

        return filtered;
    };
});

app.controller('HomeController', ['$scope', '$routeParams', '$location', '$mdDialog', '$mdToast', 'Analytics', function ($scope, $routeParams, $location, $mdDialog, $mdToast, Analytics) {
    
    $scope.syncHiddenTabs = function () {
        $scope.open_tabs.hidden_tabs = $scope.tabs.hidden.data;
        
        chrome.storage.local.set({ open_tabs: $scope.open_tabs });
    };
    
    // ---------------------------------------------------------------------------------
    // Checkboxes handling
    
    $scope.isIndeterminate = function (array) {
        return (array.selected.length > 0 && array.selected.length !== array.data.length);
    };
    
    $scope.isChecked = function (array) {
        return array.selected.length === array.data.length;
    };
    
    $scope.toggleAll = function (array) {
        if (array.selected.length === array.data.length) {
            array.selected = [];
        } else {
            array.selected = [];
            
            angular.forEach(array.data, function (tab) {
                array.selected.push(tab.id);
            });
        }
    };
    
    $scope.toggle = function (array, tab_id) {
        var i = array.selected.indexOf(tab_id);
        
        if (i > -1) {
            array.selected.splice(i, 1);
        } else {
            array.selected.push(tab_id);
        }
    };
    
    // ---------------------------------------------------------------------------------
    // Actions on checked tabs
    
    $scope.closeAllTabs = function (array) {
        chrome.tabs.remove(array.selected);
        
        array.selected = [];
    };
    
    $scope.reloadAllTabs = function (array) {
        angular.forEach(array.selected, function (id) {
            $scope.reloadTab(id);
        });
        
        array.selected = [];
    };
    
    $scope.pinOrUnpinAllTabs = function (array, pinned) {
        angular.forEach(array.selected, function (id) {
            $scope.pinOrUnpinTab(id, pinned);
        });
        
        array.selected = [];
    };
    
    $scope.hideAllTabs = function (array) {
        angular.forEach(array.selected, function (id) {
            chrome.tabs.get(id, function (tab) {
                $scope.hideTab(tab);
            });
        });
        
        array.selected = [];
    };
    
    $scope.removeAllHiddenTabs = function (array) {
        // Loop in reverse because of splice
        for (var i = array.data.length - 1; i >= 0; i--) {
            if (array.selected.indexOf(array.data[i].id) !== -1) {
                array.data.splice(array.data.indexOf(array.data[i]), 1);
            }
        }
        
        array.selected = [];
        
        $scope.syncHiddenTabs();
    };
    
    // ---------------------------------------------------------------------------------
    // Actions on individual tab
    
    $scope.goToTab = function (tab) {
        chrome.tabs.update(tab.id, { active: true, highlighted: true }, function (current_tab) {
            chrome.windows.update(current_tab.windowId, { focused: true });
        });
    };
    
    $scope.removeTab = function (tab) {
        chrome.tabs.remove(tab.id);
    };
    
    $scope.reloadTab = function (id) {
        chrome.tabs.reload(id);
    };
    
    $scope.duplicateTab = function (tab) {
        chrome.tabs.create({ url: tab.url, active: false, pinned: tab.pinned, index: tab.index + 1 });
    };
    
    $scope.pinOrUnpinTab = function (id, pinned) {
        chrome.tabs.update(id, { pinned: pinned });
    };
    
    $scope.hideTab = function (tab) {
        $scope.tabs.hidden.data.push(tab);
        $scope.removeTab(tab);
        $scope.syncHiddenTabs();
    };
    
    $scope.removeHiddenTab = function (tab) {
        $scope.tabs.hidden.data.splice($scope.tabs.hidden.data.indexOf(tab), 1);
        $scope.syncHiddenTabs();
    };
    
    $scope.openHiddenTab = function (tab) {
        chrome.tabs.create({ url: tab.url, active: true });
        
        $scope.removeHiddenTab(tab);
    };
    
    // --------------------------------------------------------------------------------------------------------
    // Events
    
    // New install
    if ($routeParams.event === 'install') {
        var alert = $mdDialog
            .alert()
            .clickOutsideToClose(true)
            .title('Greetings')
            .textContent('Hello, thank you for installing Open Tabs!')
            .ariaLabel('Greetings')
            .targetEvent()
            .ok('Ok');
        
        $mdDialog.show(alert).then(function () {
            Analytics.trackEvent('greetings-dialog', 'close');
            
            $location.path('/');
        }, function () {
            Analytics.trackEvent('greetings-dialog', 'show-form');
            
            $location.path('/');
        });
    }
    
    // New version
    if ($routeParams.event === 'update' && $routeParams.version !== undefined) {
        $mdToast.show({
            hideDelay: 0,
            position: 'top right',
            controller: 'ToastNewVersionController',
            templateUrl: '../html/toast_new_version.html',
            locals: {
                version: $routeParams.version
            }
        });
    }
    
}]);

app.controller('ToastNewVersionController', ['$scope', '$location', '$mdToast', 'version', function ($scope, $location, $mdToast, version) {
    $scope.version = version;
    
    $scope.closeToast = function () {
        $mdToast.hide().then(function () {
            $location.path('/');
        });
    };
    
    $scope.openGitHubReleases = function () {
        chrome.tabs.create({ url: 'https://github.com/sylouuu/chrome-open-tabs/releases' });
        
        $scope.closeToast();
    };
}]);

app.controller('MainController', ['$scope', '$mdDialog', '$mdMedia', 'Analytics', function ($scope, $mdDialog, $mdMedia, Analytics) {

    $scope.open_tabs = {
        settings: {
            enable_new_version_notification: false,
            show_browser_action_count: true
        },
        hidden_tabs: []
    };
    $scope.search    = { query: null };
    $scope.tabs      = {
        pinned: { code: 'PINNED_TABS', title: 'Pinned tabs', data: [], selected: [] },
        standard: { code: 'STANDARD_TABS', title: 'Standard tabs', data: [], selected: [] },
        hidden: { code: 'HIDDEN_TABS', title: 'Hidden tabs', data: [], selected: [] }
    };

    chrome.storage.local.get('open_tabs', function (items) {
        if (items.open_tabs !== undefined) {
            $scope.open_tabs = items.open_tabs;

            $scope.tabs.hidden.data = (items.open_tabs.hidden_tabs === undefined) ? [] : items.open_tabs.hidden_tabs;
        }

        $scope.$apply();
    });

    $scope.saveSettings = function (open_tabs) {
        chrome.storage.local.set({ open_tabs: open_tabs });

        chrome.extension.getBackgroundPage().handleBrowserActionBadgeEvents();
    };

    $scope.loadTabs = function () {
        chrome.tabs.query({}, function (tabs) {
            $scope.tabs.pinned.data   = [];
            $scope.tabs.standard.data = [];

            for (var i = 0; i < tabs.length; i++) {
                // Exclude options page
                if (tabs[i].url !== chrome.extension.getURL('html/options.html')) {
                    if (tabs[i].pinned === true) {
                        $scope.tabs.pinned.data.push(tabs[i]);
                    } else {
                        $scope.tabs.standard.data.push(tabs[i]);
                    }
                }
            }

            $scope.$apply();
        });
    };

    $scope.loadTabs();

    $scope.showSettings = function (evt) {
        $mdDialog.show({
            controller: 'SettingsModalController',
            templateUrl: '../html/settings_modal.html',
            targetEvent: evt,
            clickOutsideToClose: false,
            fullscreen: $mdMedia('xs'),
            resolve: {
                open_tabs: function () {
                    return $scope.open_tabs;
                }
            }
        }).then(function (data) {
            $scope.saveSettings(data);

            Analytics.trackEvent('settings', 'save');
        });
    };

    // ---------------------------------------------------------------------------------
    // Listeners

    chrome.tabs.onCreated.addListener(function () {
        $scope.loadTabs();
    });

    chrome.tabs.onUpdated.addListener(function () {
        $scope.loadTabs();
    });

    chrome.tabs.onRemoved.addListener(function () {
        $scope.loadTabs();
    });

    chrome.tabs.onReplaced.addListener(function () {
        $scope.loadTabs();
    });

    chrome.tabs.onMoved.addListener(function () {
        $scope.loadTabs();
    });

    chrome.tabs.onDetached.addListener(function () {
        $scope.loadTabs();
    });

    chrome.tabs.onAttached.addListener(function () {
        $scope.loadTabs();
    });

    chrome.tabs.onActivated.addListener(function () {
        $scope.loadTabs();
    });

}]);

app.controller('SettingsModalController', ['$scope', '$mdDialog', 'open_tabs', function ($scope, $mdDialog, open_tabs) {

    $scope.open_tabs = open_tabs;

    $scope.closeForm = function () {
        $mdDialog.cancel();
    };

    $scope.save = function (data) {
        $mdDialog.hide(data);
    };

}]);
