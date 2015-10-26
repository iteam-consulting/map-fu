
(function (angular) {

	angular.module('map-fu-sample', ['map-fu'])
		.controller('MapController', ['$scope', '$http', function (scope, http) {
			var self = this;
			http.get('data/map.json').success(function (data) {
				 self.map = data;
			});
		}]);
})(angular);
