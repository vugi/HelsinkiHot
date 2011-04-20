var loggerModule = require('../utils/logger');
var logger = loggerModule(loggerModule.level.DEBUG);

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
  var _latMin, _lngMin, _latMax, _lngMax, _nw, _se;
  
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
  
  return {
    latMin: _latMin,
    latMax: _latMax,
    lngMin: _lngMin,
    lngMax: _lngMax,
    nw: _nw,
    se: _se,
    
    isPointInside: function(point) {
      var lat = point.lat;
      var lng = point.lng;
      if(_latMin <= lat && _latMax >= lat && _lngMin <= lng && _lngMax >= lng) {
        return true;
      } else {
        return false;
      }
    },
    
    isBoundsInside: function(bounds) {
      if(isPointInside(bounds.latMin) && isPointInside(bounds.latMax) && isPointInside(bounds.lngMin) && isPointInside(bounds.lngMax)) {
        return true;
      } else {
        return false;
      }
    }
  }
}

module.exports = bounds;
