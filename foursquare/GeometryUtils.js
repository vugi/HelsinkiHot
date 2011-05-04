/**
 * Utility class that contains useful geometry calculation
 * functions needed by Polling Strategies
 */
var GeometryUtils = {

  /**
   * Calculates distance between two LatLng points
   * @param {{lat: number, lng: number}} First LatLng object
   * @param {{lat: number, lng: number}} Second LatLng object
   * @return distance in km rounded to two decimal points
   */
  distance: function(latlng1, latlng2) {
    var lat1 = latlng1.lat;
    var lat2 = latlng2.lat;
    var lon1 = latlng1.lng;
    var lon2 = latlng2.lng;
    
    var R = 6371; // km
    var dLat = (lat2-lat1) * Math.PI / 180;
    var dLon = (lon2-lon1) * Math.PI / 180; 
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c;
    return Math.round(d*100)/100;    
  },

  /**
   * Calculates diameter of a Bounds object
   * @param {Bounds} Bounds object
   */
  diameter: function(bounds) {
    
    var latlng1 = {lat: bounds.nw.lat, lng: bounds.nw.lng};
    var latlng2 = {lat: bounds.se.lat, lng: bounds.se.lng};
    
    return GeometryUtils.distance(latlng1, latlng2);
  }
}