var MapHelper = {};

/**
 * Converts LatLng to pixels
 *
 * http://stackoverflow.com/questions/2674392/how-to-access-google-maps-api-v3-markers-div-and-its-pixel-position
 * 
 * @param {google.maps.LatLng} latlng LatLng
 * @param {google.maps.Map} map Map element
 * @return {google.maps.Point} Point object with x and y pixel values
 */
MapHelper.fromLatLngToPixel = function(latlng, map){
  var scale = Math.pow(2, map.getZoom());
  var nw = new google.maps.LatLng(map.getBounds().getNorthEast().lat(), map.getBounds().getSouthWest().lng());
  var worldCoordinateNW = map.getProjection().fromLatLngToPoint(nw);
  var worldCoordinate = map.getProjection().fromLatLngToPoint(latlng);
  var pixelOffset = new google.maps.Point(Math.floor((worldCoordinate.x - worldCoordinateNW.x) * scale), Math.floor((worldCoordinate.y - worldCoordinateNW.y) * scale));
	return pixelOffset;
}