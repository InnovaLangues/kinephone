(function () {
    'use strict';

    angular.module('Header').controller('HeaderCtrl', [
        '$scope',
        '$timeout',
        '$location',
        '$route',
        'ConfigService',
        'HeaderService',
        'LanguageService',
        'TableService',
        function ($scope,$timeout, $location, $route, ConfigService, HeaderService, LanguageService, TableService) {

            $scope.languages = {};                                          // available languages
            $scope.tables = {};                                             // available tables for a given language 
            $scope.config = {};                                             // app config
            $scope.langId = null;                                           // current lang id
            $scope.tableId = null;                                          // current table id
            $scope.selectedLanguage = {};                                   // selected language binded to html select
            $scope.selectedTable = {};
            $scope.isAuthenticated = HeaderService.getIsAuthenticated();    // is user authenticated ?
            $scope.gender = HeaderService.getGender();                      // current gender
            $scope.isSilentWay = false;                                     // silent way means that when you tap on an item you won't here the sound but see details
            $scope.login = '';
            $scope.pass = '';

            // get app config
            ConfigService.query({}, function (e) {
                $scope.config = e;
            });


            // get available languages           
            var lPromise = LanguageService.getAvailableLanguages();
            lPromise.then(function (data) {
                $scope.languages = data;
                //    $scope.langId = LanguageService.getCurrentLanguageId();

                var languages = $scope.languages;
                for (var i = 0; i < languages.length; i++) {
                    if (languages[i].language_code_iso === LanguageService.getCurrentLanguageId()) {
                        $scope.langId = languages[i].language_id;
                    }
                }
                /*$timeout(function () {
                    $scope.$apply(function () {*/
                        $scope.selectedLanguage = LanguageService.setCurrentLanguage($scope.languages, $scope.langId);
                    //});
                    getTables(false);
                //}, 5);
                
                
            });

            // get available tables for the current language
            function getTables(reload) {
                var tPromise = TableService.getAvailableTables($scope.langId);
                tPromise.then(function (data) {
                    $scope.tables = data;
                    // when changing language, if we dont select a new table, the current tableId is not updated
                    if (reload) {
                        TableService.setCurrentTableId($scope.tables[0].table_id);
                    }
                    $scope.tableId = TableService.getCurrentTableId();
                    $scope.selectedTable = TableService.setCurrentTable($scope.tables, $scope.tableId);
                });
            }

            $scope.genderChanged = function (value) {
                $scope.gender = value || 'male';
                HeaderService.setGender($scope.gender);
            };

            $scope.eventModeChange = function () {
                $scope.isSilentWay = !$scope.isSilentWay;
                HeaderService.setIsSilentWay($scope.isSilentWay);
            };

            $scope.signIn = function () {
                if ($scope.login == $scope.config.user_config.login && $scope.pass == $scope.config.user_config.pass) {
                    $scope.isAuthenticated = true;
                    HeaderService.setIsAuthenticated($scope.isAuthenticated);
                }
            };

            $scope.signOut = function () {
                $scope.login = '';
                $scope.pass = '';
                $scope.isAuthenticated = false;
                HeaderService.setIsAuthenticated($scope.isAuthenticated);

                // redirect after logout ?
                /*
                 var path = '/' + $scope.selectedLanguage.language_id + '/' + $scope.selectedTable.table_id + '/table';
                 $location.path(path);
                 $location.replace();
                 */
            };

            $scope.onLanguageChange = function () {
                var languages = $scope.languages;
                for (var i = 0; i < languages.length; i++) {
                    if (languages[i].language_code_iso === $scope.selectedLanguage) {
                        $scope.langId = languages[i].language_id;
                    }
                }
                //    $scope.langId = $scope.selectedLanguage.language_id;
                LanguageService.setCurrentLanguageId($scope.langId);
                $scope.selectedLanguage = LanguageService.setCurrentLanguage($scope.languages, $scope.langId);
                // update corresponding table list && current table id
                getTables(true);
            };

            $scope.onTableChange = function () {
                $scope.tableId = $scope.selectedTable.table_id;
                TableService.setCurrentTableId($scope.tableId);
            };

            $scope.reloadData = function () {
                var ctrl = $route.current.controller;
                //    var path = '/' + $scope.selectedLanguage.language_id + '/' + $scope.selectedTable.table_id;
                var path = '/' + $scope.selectedLanguage.language_code_iso + '/' + $scope.selectedTable.table_id;
                if (ctrl === 'TableCtrl') {
                    path += '/table';
                }
                else if (ctrl === 'ParamsCtrl') {
                    path += '/params';
                }
                $location.path(path);
                $location.replace();
            };

            $scope.goToParams = function () {
                var path = '/' + $scope.langId + '/' + $scope.tableId + '/params';
                $location.path(path);
                $location.replace();
            }
        }
    ]);
})();