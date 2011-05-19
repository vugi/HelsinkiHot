var log4js = require('log4js')();
var logger = log4js.getLogger();

/*
 * nw: {lat: maxLat, lng: minLng}
 * se: {lat: minLat, lng: maxLng}
 */

/**
 * Creates a new Bounds object.
 * 
 * Two possible parameter combinations:
 * 
 * 1) arguments: nwLatLng, seLatLng
 * 2) arguments: latMin, lngMin, latMax, lngMax
 */
function bounds() {
  var _latMin, _lngMin, _latMax, _lngMax, _nw, _se, _ne, _sw;
  
  if(arguments.length === 2) {
    // NW and SE bounds given
    _nw = arguments[0];
    _se = arguments[1];
    
    _latMin = _se.lat;
    _lngMin = _nw.lng;
    _latMax = _nw.lat;
    _lngMax = _se.lng;
  
  } else if (arguments.length === 4) {
    // latMin, lngMin, latMax, lngMax
    _latMin = arguments[0];
    _lngMin = arguments[1];
    _latMax = arguments[2];
    _lngMax = arguments[3];
    
    _nw = {lat: _latMax, lng: _lngMin};
    _se = {lat: _latMin, lng: _lngMax};
  } else {
    logger.error('Illegal argument count');
  }
  
  _sw = {lat: _latMin, lng: _lngMin};
  _ne = {lat: _latMax, lng: _lngMax};
  
  function _isPointInside(point) {
    var lat = point.lat;
    var lng = point.lng;
    
    // logger.debug('_isInsidePoint: ' + _latMin + ', ' + _latMax + ', ' + _lngMin + ', ' + _lngMax + ', ' + lat + ', ' + lng);
    // logger.debug(_latMin <= lat);
    // logger.debug(_latMax >= lat);
    // logger.debug(_lngMin <= lng);
    // logger.debug(_lngMax >= lng);
    
    if(_latMin <= lat && _latMax >= lat && _lngMin <= lng && _lngMax >= lng) {
      return true;
    } else {
      return false;
    }
  }
  
      
  function _center() {
    return {lat: ((_latMax + _latMin) / 2), lng: ((_lngMax + _lngMin) / 2)};
  }
  
  return {
    latMin: _latMin,
    latMax: _latMax,
    lngMin: _lngMin,
    lngMax: _lngMax,
    nw: _nw,
    ne: _ne,
    sw: _sw,
    se: _se,
    
    isPointInside: _isPointInside,
    
    center: _center,
    
    latLngRatio: function() {
      return Math.abs(_latMax - _latMin) / Math.abs(_lngMax - _lngMin);
    },
    
    isBoundsInside: function(bounds) {
      if(_isPointInside(bounds.se) && _isPointInside(bounds.sw) && _isPointInside(bounds.ne) && _isPointInside(bounds.nw)) {
        return true;
      } else {
        
        return false;
      }
    },
    
    isBoundsCompletelyOutside: function(bounds) {
      if(_nw.lng > bounds.se.lng) {
        // Completely left
        return true;
      } else if(_se.lng < bounds.nw.lng) {
        // Completely right
        return true;
      } else if(_nw.lat < bounds.se.lat) {
        // Completely above
        return true;
      } else if(_se.lat > bounds.nw.lat) {
        // Completely beneath 
        return true;
      } else {
        return false;
      }
    },
    
    /**
     * @deprecated Use GeometryUtils.diameter instead
     */
    diameter: function() {
      var lat1 = _nw.lat;
      var lat2 = _se.lat;
      var lon1 = _nw.lng;
      var lon2 = _se.lng;
    
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
     * @deprecated Use GeometryUtils.divide instead
     */    
    divide: function(){
      return [
        bounds(_nw, _center()),
        bounds({lat: _nw.lat, lng: _center().lng}, {lat: _center().lat, lng: _se.lng}),
        bounds({lat: _center().lat, lng: _nw.lng}, {lat: _se.lat, lng: _center().lng}),
        bounds(_center(), _se)
      ];
    }
  }
}

module.exports = bounds;
