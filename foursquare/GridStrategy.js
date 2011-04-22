var bounds = require('./bounds');
var loggerModule = require('../utils/logger');
var logger = loggerModule(loggerModule.level.DEBUG);
var socketAPI = require('../socket/socket_api')();

/**
 * 
 * @param {Object} _limitBounds Bounds object. Polling limits
 * @param {Object} _center Lat/lng object. Center of polling, optional.
 */
function gridPollingStrategy(_limitBounds, _center) {
  var _lastResultBounds;
  var _lastRequestCenter;
  var _pollingBounds = [];
  
  var _updateGrid = true;
  
  var _pollingBounds = [_limitBounds];
  var _pollingIndex = 0;
  var _pollingRound = 0;
  
  function _calculateNextPollingPoint() {
    var lastPollingBounds = _pollingBounds[_pollingIndex];
    
    logger.debug('Grid size: ' + _pollingBounds.length);
    
    if(_pollingRound % 10 != 0 || _lastResultBounds.diameter() > lastPollingBounds.diameter() * 5 || lastPollingBounds.isBoundsCompletelyOutside(_lastResultBounds) || lastPollingBounds.diameter() < 0.1 || _lastResultBounds.isBoundsInside(lastPollingBounds)){
      _pollingIndex++;
      if(_pollingIndex < _pollingBounds.length) {
        logger.log('Area not divided. All venues from given area fetched');
      } else {
        logger.log('Whole area fetched');
        _pollingIndex = 0;
        _pollingRound++;
      }
      return _pollingBounds[_pollingIndex]
    } else {
      var newPollingBounds = lastPollingBounds.divide();
      _pollingBounds.splice(_pollingIndex, 1);
      _pollingBounds.splice(_pollingIndex, 0, newPollingBounds[0], newPollingBounds[1], newPollingBounds[2], newPollingBounds[3]);
      logger.debug('Area divided into 4 new areas');
      logger.debug('New area diameter: ' + newPollingBounds[0].diameter() + ' km');
      
      socketAPI.broadcastPollingGrid(_pollingBounds);
      
      return _pollingBounds[_pollingIndex];
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
        var next = _calculateNextPollingPoint();
        // logger.debug('Next polling point:');
        // logger.debug(next)
        return next.center();
      } else {
        logger.debug('Next polling point is the center');
        return _limitBounds.center();
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

module.exports = gridPollingStrategy;