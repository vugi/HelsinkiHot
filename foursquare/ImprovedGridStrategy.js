var bounds = require('./Bounds');
var GeometryUtils = require('./GeometryUtils');
var loggerModule = require('../utils/logger');
var logger = loggerModule(loggerModule.level.DEBUG);
var socketAPI = require('../socket/socket_api')();
var _ = require('../lib/underscore');

/**
 * 
 * @param {Object} _limitBounds Bounds object. Polling limits
 * @param {Object} _center Lat/lng object. Center of polling, optional.
 */
function gridPollingStrategy(_limitBounds, _center) {
  var _lastResultBounds;
  var _lastRequestCenter;
  var _pollingBounds = [];
  
  /**
   * Update the grid every n:th time.
   */
  var _updateEvery = 10;
  
  var _pollingBounds = [_limitBounds];
  var _pollingIndex = 0;
  var _pollingRound = 0;
  
  var _resultRatios = [];
  
  function _calculateNextPollingPoint() {
    
    var lastPollingBounds = _pollingBounds[_pollingIndex];
    
    logger.debug('Grid size: ' + _pollingBounds.length);
    
    var splitGrid;
    if(_pollingRound % _updateEvery !== 0 && (_pollingRound - 1) % _updateEvery !== 0) {
      // Do not split if it's not time to update
      splitGrid = false;
    }
    else if(GeometryUtils.diameter(_lastResultBounds) > GeometryUtils.diameter(lastPollingBounds) * 5) {
      // Result area is 5 times bigger than the area that was polled
      // This usually means that there aren't much venues inside the area that was polled (sea areas for example).
      splitGrid = false;
    }
    else if(lastPollingBounds.isBoundsCompletelyOutside(_lastResultBounds)) {
      // Result area is completely outside of the area that was polled
      // This usually means that there aren't much venues inside the area that was polled (sea areas for example).
      splitGrid = false;
    }
    else if(GeometryUtils.diameter(lastPollingBounds) < 0.1) {
      // Polling area diameter was smaller that 100m. We're not going into more detailed polling than this.
      splitGrid = false;
    }
    else if(_lastResultBounds.isBoundsInside(lastPollingBounds)) {
      // Result area covers completely the are that was polled.
      splitGrid = false;
    } else {
      // Otherwise, split grid
      splitGrid = true;
    }
    
    function arrayAverage (arr) {
        var length = arr.length;
        var sum = _.reduce(arr, function(memo, num){ return memo + num; }, 0);
        var ratio = sum / length;
        return ratio;
      }
    
    if(_pollingRound % _updateEvery === 0){
        var resultRatio = Math.abs(_lastResultBounds.latMax - _lastResultBounds.latMin) / Math.abs(_lastResultBounds.lngMax - _lastResultBounds.lngMin);
        _resultRatios.push(resultRatio);
        
        logger.debug('Current ratio: ' + arrayAverage(_resultRatios));
        
    }
    
    if(splitGrid) {
      
      var newPollingBounds;
      
      newPollingBounds = GeometryUtils.divideToFour(lastPollingBounds);
      
      // Remove old bounds
      _pollingBounds.splice(_pollingIndex, 1);
      
      function insertItemsToArray(array, index, items) {
        var itemsLength = items.length;
        for(var i = 0; i < itemsLength; i++, index++) {
          array.splice(index, 0, items[i]);
        }
      }
      
      insertItemsToArray(_pollingBounds, _pollingIndex, newPollingBounds);
      
      // Add the four new bounds
      // _pollingBounds.splice(_pollingIndex, 0, newPollingBounds[0], newPollingBounds[1], newPollingBounds[2], newPollingBounds[3]);
      
      logger.debug('Area divided into 4 new areas');
      logger.debug('New area diameter: ' + newPollingBounds[0].diameter() + ' km');
      
      socketAPI.broadcastPollingGrid(_pollingBounds);
      
      return _pollingBounds[_pollingIndex];     
 
    } else {
      _pollingIndex++;
      if(_pollingIndex < _pollingBounds.length) {
        logger.debug('Area not divided. All venues from given area fetched');
      } else {
        logger.log('GridStrategy: Whole area fetched');
        
        if (_pollingRound % _updateEvery === 0) {
          // Count the ratio
          var ratio = arrayAverage(_resultRatios);
        
          // Clean _resultRatios;
          _resultRatios = [];
        
          _pollingBounds = GeometryUtils.divideToRatio(_limitBounds, ratio);
          
          socketAPI.broadcastPollingGrid(_pollingBounds);
        }
        
        _pollingIndex = 0;
        _pollingRound++;
      }
      
      return _pollingBounds[_pollingIndex]      
    }
  }
  
  // Initialize socket listener
  socketAPI.addListener('startPollingAreas', function(data, client){
    var gridsToBeSent = [];
    _.each(_pollingBounds, function(bounds) {
      gridsToBeSent.push({nwLatLng: bounds.nw, seLatLng: bounds.se});
    });
    socketAPI.sendResponse(client, 'pollingGrid', gridsToBeSent);
  });
  
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