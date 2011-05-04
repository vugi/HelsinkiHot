var bounds = require('./Bounds');

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
   * @param {Bounds} boundsObject
   */
  diameter: function(boundsObject) {
    
    var latlng1 = {lat: boundsObject.nw.lat, lng: boundsObject.nw.lng};
    var latlng2 = {lat: boundsObject.se.lat, lng: boundsObject.se.lng};
    
    return GeometryUtils.distance(latlng1, latlng2);
  },
  
  divideHorizontally: function(boundsObject, number) {
    var lngMin = boundsObject.lngMin;
    var lngMax = boundsObject.lngMax;
    var latMin = boundsObject.latMin;
    var latMax = boundsObject.latMax;
    
    var latChange = (latMax - latMin) / number;
    var newLatMin = latMin;
    var newLatMax = latMin + latChange;
    
    var resultBounds = [];
    
    for (var i = 0; i < number; i++) {
      resultBounds.push(bounds(newLatMin, lngMin, newLatMax, lngMax));
      newLatMin = newLatMax;
      newLatMax = newLatMax + latChange;
      
    }
    return resultBounds;
    
    /*
    return [
      bounds(boundsObject.nw, {lat: boundsObject.center().lat, lng: boundsObject.se.lng}),
      bounds({lat: boundsObject.center().lat, lng: boundsObject.nw.lng}, boundsObject.se)
    ];
    */
  },
  
  divideVertically: function(boundsObject, number) {
    var lngMin = boundsObject.lngMin;
    var lngMax = boundsObject.lngMax;
    var latMin = boundsObject.latMin;
    var latMax = boundsObject.latMax;
    
    var lngChange = (lngMax - lngMin) / number;
    var newLngMin = lngMin;
    var newLngMax = lngMin + lngChange;
    
    var resultBounds = [];
    
    for (var i = 0; i < number; i++) {
      resultBounds.push(bounds(latMin, newLngMin, latMax, newLngMax));
      newLngMin = newLngMax;
      newLngMax = newLngMax + lngChange;
      
    }
    return resultBounds;
    
    /*return [
      bounds(boundsObject.nw, {lat: boundsObject.se.lat, lng: boundsObject.center().lng}),
      bounds({lat: boundsObject.nw.lat, lng: boundsObject.center().lng}, boundsObject.se)
    ];
    */
  },
  
  /**
   * Divides bounds according to desired latlng ratio.
   * 
   * For example, if given bounds has ratio of 16:2 and the 
   * desired ratio is 4:1 then array of 8 bounds is returned
   * 
   * @param {Bounds} boundsObject
   * @return {Array.<Bounds>} Array of bounds
   */
  divideToRatio: function(boundsObject, latLngRatio) {
    var currentRatio = boundsObject.latLngRatio();
    
    var number = 1;
    var divided, newRatio, firstDividedBounds;
    if(currentRatio > latLngRatio) {
      // Jaa lat useampaan, lng kahteen
      divided = GeometryUtils.divideVertically(boundsObject, 2);
      firstDividedBounds = divided[0];
      
      do {
        number++;
        newRatio = (Math.abs(firstDividedBounds.latMax - firstDividedBounds.latMin) / number) / Math.abs(firstDividedBounds.lngMax - firstDividedBounds.lngMin);
      } while (newRatio > latLngRatio);
      
      return GeometryUtils.divideHorizontally(divided[0], number).concat(GeometryUtils.divideHorizontally(divided[1], number));
      
    } else {
      // Jaa lng useampaan, lat kahteen
      divided = GeometryUtils.divideHorizontally(boundsObject, 2);
      firstDividedBounds = divided[0];
      
      do {
        number++;
        newRatio = Math.abs(firstDividedBounds.latMax - firstDividedBounds.latMin) / (Math.abs(firstDividedBounds.lngMax - firstDividedBounds.lngMin) / number);
      } while (newRatio < latLngRatio);
      
      return GeometryUtils.divideVertically(divided[0], number).concat(GeometryUtils.divideVertically(divided[1], number));
    }
  },
  
  /**
   * Divides given bounds object into four
   * 
   * @param {Bounds} bounds
   */
  divideToFour: function(boundsObject){
    return [
      bounds(boundsObject.nw, boundsObject.center()),
      bounds(
        {lat: boundsObject.nw.lat, lng: boundsObject.center().lng}, 
        {lat: boundsObject.center().lat, lng: boundsObject.se.lng}
      ),
      bounds(
        {lat: boundsObject.center().lat, lng: boundsObject.nw.lng}, 
        {lat: boundsObject.se.lat, lng: boundsObject.center().lng}
      ),
      bounds(boundsObject.center(), boundsObject.se)
    ];
  }
}

module.exports = GeometryUtils;