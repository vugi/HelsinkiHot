var https = require('https');
var _ = require('../lib/underscore');
var loggerModule = require('../utils/logger');
var logger = loggerModule(loggerModule.level.DEBUG);
var socketAPI = require('../socket/socket_api')();

/**
 * Returns new Foursquare poller. This method is kind of a "factory" method
 * 
 */
function foursquarePoller(_client_id, _client_secret, _callback) {
  var _pollingLimitPerHour = 5000;
  var _pollingInterval = (60 * 60 * 1000) / _pollingLimitPerHour;
  var _logPolling = false;
  
  var _pollingCenterLat = 60.166280;
  var _pollingCenterLng = 24.936905;
 
  var _lngMaxLimit = 25.089684;
  var _lngMinLimit = 24.729538;
  var _latMaxLimit = 60.255486;
  var _latMinLimit = 60.129880;
  
  var _currentAngle = 0; // rad
  var _angleChange = 13 * Math.PI / 180; // rad
  
  var _nextLatLng = {lat: _pollingCenterLat, lng: _pollingCenterLng};
  var _lastLatLng;
  
  var _reqFailedCount = 0;
  
  var _host = "api.foursquare.com";
  var _path = "/v2/venues/search?ll=#{lat},#{lng}" + 
    "&limit=50" +
    "&client_id=" + _client_id + 
    "&client_secret=" + _client_secret;
  
  var _interval;
  
  logger.log("FoursquarePoller initialized");
  
  /* ...................... PRIVATE METHODS ....................... */
  
  function _logRatelimitRemainig(headers) {
    var remaining = headers['x-ratelimit-remaining'];
    
    switch(remaining) {
      case '900', '800', '700', '600', '500', '400', '300', '200':
        logger.log(remaining + ' requests remaining');
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
    var meta = result.meta;
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
      var meta = response.meta;
      var errorType = meta.errorType;
      if(errorType){
        if(errorType === 'rate_limit_exceeded') {
          logger.error('Rate limit exceeded');
          pause(3);
        } else {
          logger.error('Got error type: ' + errorType);
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
    
    var dxW = Math.abs(originalLng - minLng);
    var dxE = Math.abs(originalLng - maxLng);
    var dyN = Math.abs(originalLat - maxLat);
    var dyS = Math.abs(originalLat - minLat);
        
    var sizeX = Math.abs(maxLng - minLng);
    var sizeY = Math.abs(maxLat - minLat);
    
    // Send polling area corners to client
    socketAPI.broadcastPollingArea({lat: maxLat, lng: minLng}, {lat: minLat, lng: maxLng});
    
    // Calculate the next latitude/longitude point
    _nextLatLng = {lat: originalLat + sizeY * Math.sin(_currentAngle), lng: originalLng + sizeX * Math.cos(_currentAngle)};
    
    // Check if goes beyond the limits
    if(_nextLatLng.lat > _latMaxLimit || 
        _nextLatLng.lat < _latMinLimit || 
        _nextLatLng.lng > _lngMaxLimit || 
        _nextLatLng.lng < _lngMinLimit) {
    
      // Limits exceeded. Increase the angle and set next polling position to the center.  
      _currentAngle += _angleChange;
      _nextLatLng = {lat: _pollingCenterLat, lng: _pollingCenterLng};
    
    }
    
    _callback(events);
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
        lat = _pollingCenterLat;
        lng = _pollingCenterLng;
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
          _parseResult(JSON.parse(res.body), lat, lng);
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
  
  /* ...................... PUBLIC METHODS ....................... */
  
  return {
    
    /**
     * Stop poller
     */
    stop: function() {
      if (_interval) {
        clearInterval(_interval);
        _interval = null;
        
        logger.log("Stopped poller");
      }
    },
    
    /**
     * Start poller
     */
    start: function() {
      // Clean up first
      this.stop();
      _interval = setInterval(_sendRequest, _pollingInterval);
      
      logger.log("Started poller, interval: " + _pollingInterval);
    },
    
    /**
     * Pause polling for given duration
     * 
     * @param {Number} duration Pause duration in minutes
     */
    pause: function(duration) {
      this.stop();
      setInterval(start, (duration * 60 * 1000));
      
      logger.log("Paused poller for " + duration + " minutes");
    }
  }
}

// Export this file as a module
module.exports = foursquarePoller;