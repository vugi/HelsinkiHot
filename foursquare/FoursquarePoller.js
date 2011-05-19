var https = require('https');
var _ = require('../lib/underscore');
var log4js = require('log4js')();
var logger = log4js.getLogger();
var socketAPI = require('../socket/socket_api')();
var bounds = require('./Bounds');

/**
 * Returns new Foursquare poller. This method is kind of a "factory" method
 * 
 */
function foursquarePoller(_client_id, _client_secret, _callback) {
  var _pollingLimitPerHour = 5000;
  var _pollingInterval = (60 * 60 * 1000) / _pollingLimitPerHour;
  var _logPolling = false;
  
  // Center
  var _pollingCenterLat = 60.166280;
  var _pollingCenterLng = 24.936905;
  var _pollingCenter = {lat: _pollingCenterLat, lng: _pollingCenterLng};
 
  // Limits
  var _lngMaxLimit = 25.089684;
  var _lngMinLimit = 24.729538;
  var _latMaxLimit = 60.255486;
  var _latMinLimit = 60.129880;
  var _limitBounds = bounds(_latMinLimit, _lngMinLimit, _latMaxLimit, _lngMaxLimit);
  // Smaller area for testing 
  // var _limitBounds = bounds({lat: 60.183697, lng: 24.896736}, {lat: 60.153638, lng: 24.975357});
  // Very small area for testing
  // var _limitBounds = bounds({lat: 60.206222, lng: 24.934158}, {lat: 60.195132, lng: 24.959736});
  
  // Polling strategy
  var pollingStrategy = require('./GridStrategy')(_limitBounds);
  var _nextLatLng = pollingStrategy.nextPollingPoint();
  var _lastLatLng;
  
  var _reqFailedCount = 0;
  
  var _host = "api.foursquare.com";
  var _path = "/v2/venues/search?ll=#{lat},#{lng}" + 
    "&limit=50" +
    "&client_id=" + _client_id + 
    "&client_secret=" + _client_secret;
  
  var _interval;
  
  logger.info("FoursquarePoller initialized");
  
  /* ...................... PRIVATE METHODS ....................... */
  
  function _logRatelimitRemainig(headers) {
    var remaining = headers['x-ratelimit-remaining'];
    
    switch(remaining) {
      case '900', '800', '700', '600', '500', '400', '300', '200':
        logger.info(remaining + ' requests remaining');
      break;
      case '100', '90', '80', '70', '60', '50', '40', '30', '20', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1', '0':
        logger.warn('ONLY ' + remaining + ' request remaining');
      break;
      default:
        logger.debug('Hour limit remaining: ' + remaining);
      break;
    }
  }
  
  /**
   * Parses the result which means two things:
   * 
   * - Calculates the next polling position
   * - Creates event objects from result
   * 
   * @param {Object} result JSON
   * @param {Number} originalLat
   * @param {Number} originalLng
   */
  function _parseResult(result, originalLat, originalLng) {
    var maxLat = -999999;
    var maxLng = -999999;
    var minLat = 999999;
    var minLng = 999999;
    
    var response = result.response;
    var items;
    
    if(response.groups) {
      var groups = response.groups;
      var nearby = _.detect(groups, function(group){
        return group.type === 'nearby'
      });
      items = nearby.items;
    } 
    
    // Log errors
    else if (result.meta) {
      var meta = result.meta;
      var errorType = meta.errorType;
      if(errorType){
        if(errorType === 'rate_limit_exceeded') {
          logger.error('Rate limit exceeded');
          _pause(3);
          return;
        } else {
          logger.error('Got error type: ' + errorType);
          logger.error(result);
        }
      }
    }
    
    if(items == null) {
      logger.warn("No 'nearby' group found from the response");
      return;
    }
    
    // Parsed events
    var events = [];
    
    _.each(items, function(item) {
      var location = item.location;
      maxLat = Math.max(maxLat, location.lat);
      maxLng = Math.max(maxLng, location.lng);
      minLat = Math.min(minLat, location.lat);
      minLng = Math.min(minLng, location.lng);
      
      var event = {
        name: item.name,
        latitude: location.lat,
        longitude: location.lng,
        service: "foursquare",
        serviceId: item.id,
        checkinsCount: item.stats.checkinsCount
      };
      
      events.push(event);
    });
    
    return {
      events: events,
      bounds: bounds(minLat, minLng, maxLat, maxLng),
      requestCenter: {lat: originalLat, lng: originalLng}
    }
  }
  
  /**
   * Sends request to Foursquare
   */
  function _sendRequest() {
    
    var lat = _nextLatLng.lat;
    var lng = _nextLatLng.lng;
    var lastLat = _lastLatLng ? _lastLatLng.lat : null; 
    var lastLng = _lastLatLng ? _lastLatLng.lng : null;
    
    // If following condition is true, the polling position has not been 
    // updated since last request. We don't want to make request for the same 
    // position too often, so that's why we skip it.
    // Reason for not updating the position is usually that the poller 
    // was not able to calculate the new position because the response failed
    if(lastLat === lat && lastLng === lng) {
      if (_reqFailedCount < 10) {
        _reqFailedCount++;
        return;
        
      } else {
        // If polling has failed five times in a row, reset the polling position and try again
        logger.warn("Polling failed 10 times in a row... Trying again");
        logger.warn("Resetting polling point...");
        _lastLatLng = null;
        _nextLatLng = pollingStrategy.nextPollingPoint();
      }
    }
    
    _reqFailedCount = 0;
    _lastLatLng = {lat: lat, lng: lng};
  
    var path = _path.replace("#{lat}", lat).replace("#{lng}", lng);
  
    https.get({ host: _host, path: path }, function(res) {
      res.body = '';
      res.on('data', function(chunk) {
          res.body += chunk;
      });
      res.on('end', function(){
        try {
          _logRatelimitRemainig(res.headers);
          
          // Parse result
          var parsedResult = _parseResult(JSON.parse(res.body), lat, lng);
          
          // Send polling area corners to client
          socketAPI.broadcastPollingArea(parsedResult.bounds.nw, parsedResult.bounds.se);
          
          // Save results to database
          _callback(parsedResult.events, function() {
            
            
            // Next polling point
            pollingStrategy.lastResult(parsedResult.events, parsedResult.bounds, parsedResult.requestCenter);
            _nextLatLng = pollingStrategy.nextPollingPoint();
          });
                  
        } catch (err) {
          logger.error("Error in parsing venues");
          logger.debug("headers: ", res.headers);
          logger.error(err);
        }
      });
    }).on('error', function(e) {
      logger.error("Error in loading venues");
      logger.error(e);
    });
  }
  
  /**
   * Stop poller
   */
  function _stop() {
    if (_interval) {
      clearInterval(_interval);
      _interval = null;
        
      logger.info("Stopped poller");
    }
  }
    
  /**
   * Start poller
   */
  function _start() {
    // Clean up first
    _stop();
    _interval = setInterval(_sendRequest, _pollingInterval);
      
    logger.info("Started poller, interval: " + _pollingInterval);
  }
  
  /**
   * Pause polling for given duration
   * 
   * @param {Number} duration Pause duration in minutes
   */
  function _pause(duration) {
    _stop();
    setInterval(_start, (duration * 60 * 1000));
      
    logger.info("Paused poller for " + duration + " minutes");
  }
  
  /* ...................... PUBLIC METHODS ....................... */
  
  return {
    start: _start,
    stop: _stop,
    pause: _pause
  }
}

// Export this file as a module
module.exports = foursquarePoller;