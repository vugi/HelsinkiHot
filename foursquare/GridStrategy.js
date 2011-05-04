var bounds = require('./Bounds');
var loggerModule = require('../utils/logger');
var logger = loggerModule(loggerModule.level.DEBUG);
var socketAPI = require('../socket/socket_api')();
var _ = require('../lib/underscore');
var GeometryUtils = require('./GeometryUtils');

/**
 * 
 * @param {Object} _limitBounds Bounds object. Polling limits
 * @param {Object} _center Lat/lng object. Center of polling, optional.
 */
function gridPollingStrategy(_limitBounds, _center) {
  var _lastResultBounds;
  var _lastRequestCenter;
  var _lastResultEvents;
  var _pollingBounds = [];
  
  var _updateGrid = true;
  
  var _pollingBounds = [_limitBounds];
  var _pollingIndex = 0;
  var _pollingRound = 0;
  
  function _calculateNextPollingPoint() {
    var lastPollingBounds = _pollingBounds[_pollingIndex];
    
    logger.debug('Grid size: ' + _pollingBounds.length);
    
    function eventsInsideBounds (events, boundsObject) {
      var count = 0;
      _.each(events, function(event) {
        if(boundsObject.isPointInside({lat: event.latitude, lng: event.longitude})) {
          count++;
        }
      });
      return count;
    }
    
    var eventCountInsideBounds = eventsInsideBounds(_lastResultEvents, lastPollingBounds);
    logger.debug('Events inside bounds: ' + eventCountInsideBounds);
    
    // if(_pollingRound % 10 != 0 || _lastResultBounds.diameter() > lastPollingBounds.diameter() * 5 || lastPollingBounds.isBoundsCompletelyOutside(_lastResultBounds) || lastPollingBounds.diameter() < 0.1 || _lastResultBounds.isBoundsInside(lastPollingBounds)){
    if(_pollingRound % 10 != 0 || eventCountInsideBounds < 35 || lastPollingBounds.isBoundsCompletelyOutside(_lastResultBounds) || _lastResultBounds.isBoundsInside(lastPollingBounds)){
      _pollingIndex++;
      if(_pollingIndex < _pollingBounds.length) {
        logger.debug('Area not divided. All venues from given area fetched');
      } else {
        logger.log('GridStrategy: Whole area fetched');
        _pollingIndex = 0;
        _pollingRound++;
      }
      return _pollingBounds[_pollingIndex]
    } else {
      var newPollingBounds;
      if(_pollingIndex === 0) {
        newPollingBounds = GeometryUtils.divideToRatio(lastPollingBounds, 1);
      } else {
        newPollingBounds = lastPollingBounds.divide();
      }
      
      _pollingBounds.splice(_pollingIndex, 1);
      
      function insertItemsToArray(array, index, items) {
        var itemsLength = items.length;
        for(var i = 0; i < itemsLength; i++, index++) {
          array.splice(index, 0, items[i]);
        }
      }
      
      insertItemsToArray(_pollingBounds, _pollingIndex, newPollingBounds);
      // _pollingBounds.splice(_pollingIndex, 0, newPollingBounds[0], newPollingBounds[1], newPollingBounds[2], newPollingBounds[3]);
      
      logger.debug('Area divided into 4 new areas');
      logger.debug('New area diameter: ' + newPollingBounds[0].diameter() + ' km');
      
      socketAPI.broadcastPollingGrid(_pollingBounds);
      
      return _pollingBounds[_pollingIndex];
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
    
    resultEvents: function(events) {
      _lastResultEvents = events;
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