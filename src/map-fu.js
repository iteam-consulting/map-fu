(function(angular, google) {
  angular.module("map-fu", []).directive("mapFu", [
    "$timeout",
    function(timeout) {
      return {
        restrict: "E",
        require: "ngModel",
        scope: {
          data: "=ngModel",
          openLocation: "=",
          mapState: "=",
          filteredItems: "=",
          relatedItems: "="
        },
        link: function(scope, element, attr) {
          /**
           * Variables to be used throughout this directive
           */
          var map = new google.maps.Map(element[0], {
            center: { lat: -34.397, lng: 150.644 },
            zoom: 8
          });
          var geocoder = new google.maps.Geocoder();

          var markers = {};
          var related = {};

          var mapIconImage = {
            url: "/assets/img/map_pin.png",
            // This marker is 22 pixels wide by 40 pixels high.
            size: new google.maps.Size(22, 40),
            // The origin for this image is (0, 0).
            origin: new google.maps.Point(0, 0),
            // The anchor for this image is the center at (11,40).
            anchor: new google.maps.Point(11, 40)
          };

          var relatedImage = {
            url: "/assets/img/red_dot.png",
            // This marker is 15 pixels wide by 15 pixels high.
            size: new google.maps.Size(15, 15),
            // The origin for this image is (0, 0).
            origin: new google.maps.Point(0, 0),
            // The anchor for this image is the center at (8, 8).
            anchor: new google.maps.Point(8, 8)
          };
          var styles, options, locations;

          /**
           * Watch the data, and instantiated the map with all of its
           * properties when the data gets brought in.
           */
          scope.$watch("data.locations", function(newValue, oldValue) {
            if (newValue) {
              locations = newValue;
              locations.forEach(function(location, idx) {
                // Build address
                location.address = location.address || "";
                location.city = location.city || "";
                location.state = location.state || "";
                location.zip = location.zip || "";
                location.cityStateZip =
                  location.city + ", " + location.state + " " + location.zip;
                var addr =
                  location.address +
                  " " +
                  location.city +
                  ", " +
                  location.state +
                  " " +
                  location.zip;

                if (!location.position) {
                  if (
                    location.address ||
                    location.city ||
                    location.state ||
                    location.zip
                  ) {
                    // Find address location
                    geocoder.geocode({ address: addr }, function(
                      results,
                      status
                    ) {
                      if (status == google.maps.GeocoderStatus.OK) {
                        location.position = results[0].geometry.location;
                        buildMarker(location);
                        console.log(
                          location.title +
                            "'s position = \n" +
                            location.position.lat() +
                            "\n" +
                            location.position.lng()
                        );
                      } else {
                        console.log(location.title + " was not found!");
                      }
                    });
                  }
                } else {
                  location.position = new google.maps.LatLng(
                    parseFloat(location.position.lat),
                    parseFloat(location.position.lng)
                  );
                  buildMarker(location);
                }
              });
            }
          });

          scope.$watch("data.options", function(newValue, oldValue) {
            if (newValue) {
              // Set the options for the map
              options = newValue;
              map.setOptions(options);
            }
          });

          scope.$watch("data.styles", function(newValue, oldValue) {
            if (newValue) {
              // Set the styles to the map
              styles = newValue;
              map.set("styles", styles);
            }
          }); // Done watching data

          /**
           * Watch the mapState.selected value to add the selected location to the map and
           * add all of the locations within the same state.
           */
          scope.$watch("mapState.selected", function(newValue, oldValue) {
            if (newValue) {
              if (oldValue) {
                // Reset the old selected location's animation
                markers[oldValue.title].setAnimation(null);
              }

              // Get bounds of map if there are related locations
              var i = 0;
              var bounds = new google.maps.LatLngBounds();

              // Check if there are more locations in this state
              if (addRelated() == 0) {
                // If no other locations, set mapState.only.
                scope.mapState.only = newValue;
              } else {
                bounds.extend(markers[newValue.title].getPosition());
                locations.forEach(function(location) {
                  if (related[location.title]) {
                    if (related[location.title].getMap() != null) {
                      // Extend bounds to contain this marker
                      bounds.extend(markers[location.title].getPosition());
                      i++;
                    }
                  }

                  if (markers[location.title] && location !== newValue) {
                    markers[location.title].setMap(null);
                  }
                });
              }

              // Set bounds of map if there are related locations
              if (i > 0) {
                map.fitBounds(bounds);
              } else {
                map.setZoom(12);
                map.setCenter(markers[newValue.title].position);
              }

              // Make selected marker bounce and add it to the map
              markers[newValue.title].setAnimation(
                google.maps.Animation.BOUNCE
              );
              markers[newValue.title].setMap(map);
            } else {
              if (oldValue) {
                markers[oldValue.title].setMap(map);

                // Remove all related markers from map
                addRelated();

                scope.filteredItems.forEach(function(location) {
                  if (markers[location.title]) {
                    markers[location.title].setMap(map);
                  }
                });

                map.setCenter(options.center);
                map.setZoom(options.zoom);
              }
            }
          }); // Done watching mapState.selected

          /**
           * Watch the mapState.only value to do things when a location is selected and
           * it is the only location within that state.
           */
          scope.$watch("mapState.only", function(newValue, oldValue) {
            if (newValue) {
              map.setCenter(markers[newValue.title].position);
              map.setZoom(12);

              if (locations) {
                locations.forEach(function(location) {
                  if (related[location.title]) {
                    related[location.title].setMap(null);
                  }
                });
              }
            }
          }); // Done watching mapState.only

          /**
           * Watch the filtered items and change the visibility of the markers
           * according to which locations are currently being filtered to.
           */
          scope.$watch("filteredItems", function(newValue, oldValue) {
            if (newValue && oldValue) {
              // If there is only one result in the filter, make it the selected location
              if (newValue.length == 1) {
                scope.mapState.selected = newValue[0];
              } else {
                scope.mapState.selected = undefined;
                scope.mapState.only = undefined;
              }

              // Create hashmap of locations in the new filtered list
              var newFiltered = [];
              newValue.forEach(function(current) {
                newFiltered[current.title] = current;
              });

              // Create hashmap of locations in the old filtered list
              var oldFiltered = [];
              oldValue.forEach(function(current) {
                oldFiltered[current.title] = current;
              });

              // Add markers at locations in the new filtered and remove those who are not
              locations.forEach(function(location) {
                if (markers[location.title]) {
                  if (newFiltered[location.title]) {
                    if (!oldFiltered[location.title]) {
                      // If it is in the new, but not the old, then add it onto the map
                      markers[location.title].setMap(map);
                    } else {
                      // If it is in the new and the old, then stop all animations (bouncing/dropping)
                      markers[location.title].setAnimation(null);
                    }
                  } else {
                    // If this marker is not in the new filtered data, then remove it
                    markers[location.title].setMap(null);
                  }
                }
              });
            }
          }); // Done watching filteredItems

          /**
           * Add a zoom listener to change the style of the map based on how far it is zoomed in/out.
           */
          map.addListener("zoom_changed", function() {
            if (map.getZoom() >= 10) {
              map.set("styles", [
                {
                  featureType: "road",
                  styler: [{ visibility: "on" }]
                }
              ]);
            } else {
              map.set("styles", styles);
            }
          }); // Done adding zoom listener

          /**
           * Figure out which locations are in the same state, and drop them onto the map.
           *
           * @return Number of related locations
           */
          function addRelated() {
            var i = 0;

            // Check to see if there is a selected location and it is not the only selected location
            if (scope.mapState.only || !scope.mapState.selected) {
              // Remove all related markers
              scope.relatedItems = [];
              locations.forEach(function(location) {
                if (related[location.title]) {
                  related[location.title].setMap(null);
                }
              });
            } else {
              var arr = [];
              locations.forEach(function(location) {
                if (
                  scope.mapState.selected.state == location.state &&
                  scope.mapState.selected != location
                ) {
                  arr.push(location);
                  i++;

                  if (related[location.title]) {
                    related[location.title].setAnimation(
                      google.maps.Animation.DROP
                    );
                    related[location.title].setMap(map);
                  }
                } else {
                  if (related[location.title]) {
                    related[location.title].setMap(null);
                  }
                }
              });
              scope.relatedItems = arr;
            }

            return i;
          } // Done with addRelated

          /**
           * Build all of the markers (main and related) for this location.
           *
           * @param location Object containing the position and title for the location.
           */
          function buildMarker(location) {
            // Build main marker and add click listener
            var marker = new google.maps.Marker({
              map: map,
              position: location.position,
              animation: google.maps.Animation.DROP,
              title: location.title,
              icon: mapIconImage
            });
            marker.addListener("click", function() {
              scope.openLocation(location);
            });

            // Build related marker and add click listener
            var markerRelated = new google.maps.Marker({
              map: null,
              position: location.position,
              animation: google.maps.Animation.DROP,
              title: location.title,
              icon: relatedImage
            });
            markerRelated.addListener("click", function() {
              scope.openLocation(location);
            });

            // Add markers to hashmaps
            markers[location.title] = marker;
            related[location.title] = markerRelated;
          } // Done with buildMarkers
        }
      };
    }
  ]);
})(angular, google);
