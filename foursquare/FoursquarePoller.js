var https = require('https');

/**
 * Returns new Foursquare poller. This method is kind of a "factory" method
 * 
 */
function foursquarePoller(_callback) {
  var _pollingLimitPerHour = 500;
  var _pollingInterval = (60 * 60 * 1000) / _pollingLimitPerHour;
  
  var _pollingCenterLat = 60.166280;
  var _pollingCenterLng = 24.936905;
  var _lngMaxLimit = 25.089684;
  var _lngMinLimit = 24.729538;
  var _latMaxLimit = 60.255486;
  var _latMinLimit = 60.129880;
  var _currentAngle = 0;
  var _angleSteps = 13;
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
  
  function _parseResult(result, originalLat, originalLng) {
    var maxLat = -999999;
    var maxLng = -999999;
    var minLat = 999999;
    var minLng = 999999;
    
    var items = result.response.groups[0].items;
    var itemsLength = items.length;
    
    for (var i = 0; i < itemsLength; i++) {
      var item = items[i];
      var location = item.location;
      maxLat = Math.max(maxLat, location.lat);
      maxLng = Math.max(maxLng, location.lng);
      minLat = Math.min(minLat, location.lat);
      minLng = Math.min(minLng, location.lng);
    }
    
    var dxW = Math.abs(originalLng - minLng);
    var dxE = Math.abs(originalLng - maxLng);
    var dyN = Math.abs(originalLat - maxLat);
    var dyS = Math.abs(originalLat - minLat);
        
    var sizeX = Math.abs(maxLng - minLng);
    var sizeY = Math.abs(maxLat - minLat);
        
    var rad = _currentAngle * Math.PI / 180;
        
    _nextLatLng = {lat: originalLat + sizeY * Math.sin(rad), lng: originalLng + sizeX * Math.cos(rad)};
        
    if(_nextLatLng.lat > _latMaxLimit || _nextLatLng.lat < _latMinLimit || _nextLatLng.lng > _lngMaxLimit || _nextLatLng.lng < _lngMinLimit) {
      _currentAngle += _angleSteps;
      _nextLatLng = {lat: _pollingCenterLat, lng: _pollingCenterLng};
    }
    
    _callback(result);
  }
  
  /**
   * Sends request to Foursquare
   */
  function _sendRequest() {
    var lat = _nextLatLng.lat;
    var lng = _nextLatLng.lng;
    var lastLat = _lastLatLng ? _lastLatLng.lat : null; 
    var lastLng = _lastLatLng ? _lastLatLng.lng : null;
    
    if(lastLat === lat && lastLng === lng) {
      if (_reqFailedCount < 5) {
        // Do not do polling if the previous request is not completed
        console.log((new Date()).toString() + ": Postponing request because the previous request is not completed");
        _reqFailedCount++;
        return;
      } else {
        console.log("Polling failed 5 times in a row... Trying again");
        lat = _pollingCenterLat;
        lng = _pollingCenterLng;
      }
    }
    
    _reqFailedCount = 0;
    
    _lastLatLng = {lat: lat, lng: lng};
  
    var path = _path.replace("#{lat}", lat).replace("#{lng}", lng);
  
    console.log((new Date()).toString() + ": host: " + _host + ", path: " + path);
  
    https.get({ host: _host, path: path }, function(res) {
      console.log("statusCode: ", res.statusCode);
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