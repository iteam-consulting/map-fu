
(function (angular) {
	angular.module('map-fu', [])
		.directive('mapFu', function () {
			return {
				restrict: 'E',
				scope: {
					map: '=ngModel'
				},
				require: 'ngModel',
				link: function (scope, element, attr) {
					// load the api and eval

					var geocoder,
						map = new google.maps.Map(element[0], {
						center: { lat: -34.397, lng: 150.644 },
						zoom: 8
					});

					scope.$watch('map', function (newValue, oldValue) {
						if (newValue && newValue.styles) {
							map.set('styles', newValue.styles);
						}
						
						if (newValue && newValue.options) {
							map.setOptions(newValue.options);
						}
						
						if (newValue && newValue.locations) {
							newValue.locations.forEach(function (location, idx) {
								var position;
								if (location.address) {
									geocoder = geocoder || new google.maps.Geocoder();
									geocoder.geocode({ address: location.address }, function(results, status) {
										if (status == google.maps.GeocoderStatus.OK) {
											position = results[0].geometry.location;
											var marker = new google.maps.Marker({
												position: position,
												title: location.title,
												map: map
											})
										}
									})
								}
							});
						}
					});
				}
			}
		});
})(angular);