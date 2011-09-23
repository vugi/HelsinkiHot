var bounds = require('./bounds');
var log4js = require('log4js');
var logger = log4js.getLogger('strategy');

/**
 * Implements radial polling strategy
 * 
 * NOTICE: All PollingStrategies should implement constructor with
 * similar signature as this.
 * 
 * @param {Object} _limitBounds Bounds object. Polling limits
 * @param {Object} _center Lat/lng object. Center of polling, optional.
 */
function radialPollingStrategy(_limitBounds, _center) {
  var _lastResultBounds;
  var _lastRequestCenter;
  
  var _currentAngle = 0; // rad
  var _angleChange = 13 * Math.PI / 180; // rad
  
  function _calculateNextPollingPoint() {
    var dxW = Math.abs(_lastRequestCenter.lng - _lastResultBounds.nw.lng);
    var dxE = Math.abs(_lastRequestCenter.lng - _lastResultBounds.se.lng);
    var dyN = Math.abs(_lastRequestCenter.lat - _lastResultBounds.nw.lat);
    var dyS = Math.abs(_lastRequestCenter.lat - _lastResultBounds.se.lat);
    
    var sizeX = Math.abs(_lastResultBounds.se.lng - _lastResultBounds.nw.lng);
    var sizeY = Math.abs(_lastResultBounds.nw.lat - _lastResultBounds.se.lat);
    
    var _nextLatLng = {lat: _lastRequestCenter.lat + sizeY * Math.sin(_currentAngle), lng: _lastRequestCenter.lng + sizeX * Math.cos(_currentAngle)};
    
    if(!(_limitBounds.isPointInside(_nextLatLng))) {
      // Limits exceeded. Increase the angle and set next polling position to the center.  
      _currentAngle += _angleChange;
      return _center;
    } else {
      return _nextLatLng;
    }
  }
  
  /* ...................... PUBLIC METHODS ....................... */
  
  return {
    
    /**
     * Returns next polling point
     * 
     * NOTICE: This is part of the PollingStrategy "interface". All PollingStrategies
     * should implement this method!
     * 
     */
    nextPollingPoint: function() {
      if(_lastResultBounds) {
        return _calculateNextPollingPoint();
      } else {
        return _center;
      }
    },
    
    /**
     * After venue search result is parsed call this function with resultBounds
     * so that the Strategy can calculate next polling point
     * 
     * NOTICE: This is part of the PollingStrategy "interface". All PollingStrategies
     * should implement this method!
     * 
     * @param {Object} resultBounds Bounds object
     * @param {Object} requestCenter lat/lng object
     */
    resultBounds: function(resultBounds, requestCenter) {
      _lastResultBounds = resultBounds;
      _lastRequestCenter = requestCenter;
    }
  }
}

module.exports = radialPollingStrategy;