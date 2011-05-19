var bounds = require('./Bounds');
var log4js = require('log4js')();
var logger = log4js.getLogger();
var socketAPI = require('../socket/socket_api')();
var _ = require('../lib/underscore');
var GeometryUtils = require('./GeometryUtils');

/**
 * 
 * @param {Object} _limitBounds Bounds object. Polling limits
 * @param {Object} _center Lat/lng object. Center of polling, optional.
 */
function gridPollingStrategy(_limitBounds, _center) {

  var _resultEvents;
  var _resultEventCount;
  var _resultBounds;
  var _requestCenter;
  var _requestBounds;
  
  var _pollingBounds = [];
  var _pollingBounds = [_limitBounds];
  var _pollingIndex = 0;
  var _pollingRound = 0;
  
  var _isRoundsFirst = true;
  
  var RANDOMIZE_POLLING = true;
  
  var MIN_EVENT_COUNT = 20;
  var MIN_DIAMETER = 0.1;
  var UPDATE_EVERY = 10;
  
  var _pollingIndexes = [false];
  
  function _shouldDivide() {
    // Dividing parameter
    if (_pollingRound % UPDATE_EVERY != 0) {
      logger.debug('Not dividing area: Updating grid every ' + UPDATE_EVERY + ' round. Current round: ' + _pollingRound);
      return false;
    }
    else if (_resultEventCount < MIN_EVENT_COUNT) {
      logger.debug('Not dividing area: Too less events inside area: '+ _resultEventCount);
      return false;
    }
    else if (_requestBounds.diameter() < MIN_DIAMETER) {
      logger.debug('Not dividing area: Too little diameter');
      return false;
    }
    else if (_requestBounds.isBoundsCompletelyOutside(_resultBounds)) {
      logger.debug('Not dividing area: Result bounds is completely outside');
      return false;
    }
    else if (_resultBounds.isBoundsInside(_requestBounds)) {
      logger.debug('Not dividing area: Result area covers completely request area');
      return false;
    } else {
      logger.debug('Dividing area')
      return true;
    }
  }
  
  function _resetIndexes(){
    if (RANDOMIZE_POLLING) {
      for (var i = 0; i < _pollingIndexes.length; i++) {
        _pollingIndexes[i] = false;
      }
    } else {
      _pollingIndex = 0;
    }
  };
  
  function _getAvailableIndexes() {
    if(RANDOMIZE_POLLING) { 
      var availableIndexes = [];
      _.each(_pollingIndexes, function(value, key) {
        if(value !== true) {
          availableIndexes.push(key);
        }
      });
      return availableIndexes;
    } else {
      return _pollingBounds.length - _pollingIndex;
    }
     
  };
  
  function _updateIndex() {
    if (RANDOMIZE_POLLING) {
      var availableIndexes = _getAvailableIndexes();
      
      var randomIndex = Math.floor(Math.random() * availableIndexes.length);
      _pollingIndex = availableIndexes[randomIndex];
    } else {
      if(_isRoundsFirst) {
        _pollingIndex = 0;
      }
      if (!_areaDivided) {
        _pollingIndex++;
      }
    }
  };
  
  function _updateResultEventCount() {
    // Count how many events was inside the polled area
    _resultEventCount = 0;
    _.each(_resultEvents, function(event) {
      if(_requestBounds.isPointInside({lat: event.latitude, lng: event.longitude})) {
        _resultEventCount++;
      }
    });
  };
  
  function addAll(array, index, values, count) {
    var isArray = _.isArray(values);
    var length = isArray ? values.length : count;
    
    for (var i = 0; i < length; i++) {
      if(isArray) {
        array.splice(index + i, 0, values[i]);
      } else {
        array.splice(index + i, 0, values);
      }
    }
  };
  
  function _roundEnded() {
    _pollingRound++;
    
    // Clean pollingBounds
    if (_pollingRound % UPDATE_EVERY === 0) {
      // Reset polling index
      _pollingIndexes = [false];
      
      _pollingBounds = [_limitBounds];
    } else {
      _resetIndexes();
    }
    
    _isRoundsFirst = true;
  }
  
  function _processResult() {
    _updateResultEventCount();
    
    if(_shouldDivide()) {
      _areaDivided = true;
      
      var dividedBounds;
      if(_isRoundsFirst) {
        dividedBounds = GeometryUtils.divideToRatio(_requestBounds, 1);
      } else {
        dividedBounds = _requestBounds.divide();
      }
      
      _pollingBounds.splice(_pollingIndex, 1);
      addAll(_pollingBounds, _pollingIndex, dividedBounds);
      
      _pollingIndexes.splice(_pollingIndex, 1);
      addAll(_pollingIndexes, _pollingIndex, false, dividedBounds.length);
      
      logger.debug('New grid count: ' + _pollingBounds.length);
      
      socketAPI.broadcastPollingGrid(_pollingBounds);
      
    } else {
      _areaDivided = false;
      
      // Mark index as polled
      _pollingIndexes[_pollingIndex] = true;
      
      if(_getAvailableIndexes().length === 0) {
        // Whole area fetched!
        logger.info('- - - Whole area fetched - - -');
       
        _roundEnded();
        return;
      }
    }
    
    _isRoundsFirst = false;
  };
  
  function _calculateNextPollingPoint() {
    _updateIndex();
    var nextBounds = _pollingBounds[_pollingIndex];
    
    // logger.debug('Got next polling point. Total bounds: ' + _pollingBounds.length + '. Indexes left: ' + _getAvailableIndexes().length);
    
    // Update requestBounds
    _requestBounds = nextBounds;
    return nextBounds.center();
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
     return _calculateNextPollingPoint();
    },
    
    lastResult: function(resultEvents, resultBounds, requestCenter) {
      _resultEvents = resultEvents;
      _resultBounds = resultBounds;
      _requestCenter = requestCenter;
      
      _processResult();
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
      // _lastResultBounds = resultBounds;
      // _lastRequestCenter = requestCenter;
    }
  }
}

module.exports = gridPollingStrategy;