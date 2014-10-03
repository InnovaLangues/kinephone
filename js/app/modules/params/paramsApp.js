'use strict';

var paramsApp = angular.module('paramsApp', ['angular-gestures', 'errorApp']);

// routes for the module
tableApp.config(['$routeProvider',
    function($routeProvider) {
        $routeProvider
        .when('/:lang/:table/params', {
            templateUrl: 'js/app/modules/params/partials/params.html',
            controller: 'ParamsCtrl'
        });
    }
]);