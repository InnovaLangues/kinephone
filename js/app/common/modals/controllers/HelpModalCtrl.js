'use strict';

function HelpModalCtrl($scope, $modalInstance) {

    $scope.close = function() {
        $modalInstance.dismiss('cancel');
    };
}