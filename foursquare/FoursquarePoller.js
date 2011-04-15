var https = require('https');
var _ = require('../lib/underscore');

/**
 * Returns new Foursquare poller. This method is kind of a "factory" method
 * 
 */
function foursquarePoller(_callback) {
  
  /*
   * Because we are waiting always the previous request to be 
   * completed and parsed, we are not able to break the polling limit.
   * 
   * That's why I set up there interval 500ms
   */
  // var _pollingLimitPerHour = 5000;
  // var _pollingInterval = (60 * 60 * 1000) / _pollingLimitPerHour;
  var _pollingInterval = 500;
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
    "&client_id=LTEVQYSCQZZQKSPR1XAI4B0SAUD44AN4JKNURCL1ZFJ1IBDZ" + 
    "&client_secret=TL2ALQWU4VV5J5R5BCH3Z53EDFOU5KLSOIFZSJGLOSK4NGH1";
  
  var _interval;
  
  console.log("FoursquarePoller initialized");
  
  /* ...................... PRIVATE METHODS ....................... */
  
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
    
    var groups = result.response.groups;
    var nearby = _.detect(groups, function(group) { return group.type === 'nearby'});
    var items = nearby.items;
    
    if(items == null) {
      console.warn("No 'nearby' group found from the response");
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
        console.log("Polling failed 10 times in a row... Trying again");
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
          _parseResult(JSON.parse(res.body), lat, lng);
        } catch (err) {
          console.log("Error in parsing venues");
          console.log("headers: ", res.headers);
          console.error(err);
        }
      });
    }).on('error', function(e) {
      console.log("Error in loading venues");
      console.error(e);
    });
  }
  
  /* ...................... PUBLIC METHODS ....................... */
  
  return {
    
    /**
     * Start poller
     */
    start: function() {
      _interval = setInterval(_sendRequest, _pollingInterval);
    },
    
    /**
     * Stop poller
     */
    stop : function() {
      clearInterval(_interval);
    }
  }
}

// Export this file as a module
module.exports = foursquarePoller;