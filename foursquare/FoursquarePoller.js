var https = require('https');
var _ = require('../lib/underscore');
var log4js = require('log4js')();
var logger = log4js.getLogger('poller');
var performanceLogger = log4js.getLogger('performance');
var bounds = require('./Bounds');

var _pollingLimitPerHour = 5000;
var _pollingInterval = (60 * 60 * 1000) / _pollingLimitPerHour;
var isReady = false;

// Center
var _pollingCenter = {
    lat: 60.166280,
    lng: 24.936905
};

// Limits
var _limitBounds = bounds(60.129880, 24.729538, 60.255486, 25.089684);

// Smaller area for testing 
// var _limitBounds = bounds({lat: 60.183697, lng: 24.896736}, {lat: 60.153638, lng: 24.975357});
// Very small area for testing
// var _limitBounds = bounds({lat: 60.206222, lng: 24.934158}, {lat: 60.195132, lng: 24.959736});

// Polling strategy
var pollingStrategy = require('./GridStrategy')(_limitBounds);

var _host = "api.foursquare.com";
var _path;

function _logRatelimitRemainig(headers){
  var remaining = headers['x-ratelimit-remaining'];
  
  switch (remaining) {
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
function _parseResult(result, originalLat, originalLng){
  var maxLat = -999999;
  var maxLng = -999999;
  var minLat = 999999;
  var minLng = 999999;
  
  var response = result.response;
  var items;
  
  if (response.groups) {
    var groups = response.groups;
    var nearby = _.detect(groups, function(group){
      return group.type === 'nearby'
    });
    items = nearby.items;
  }
  
  // Log errors
  else 
    if (result.meta) {
      var meta = result.meta;
      var errorType = meta.errorType;
      if (errorType) {
        if (errorType === 'rate_limit_exceeded') {
          logger.error('Rate limit exceeded');
          _pause(3);
          return;
        }
        else {
          logger.error('Got error type: ' + errorType);
          logger.error(result);
        }
      }
    }
  
  if (items == null) {
    logger.warn("No 'nearby' group found from the response");
    return;
  }
  
  // Parsed events
  var events = [];
  
  _.each(items, function(item){
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
    requestCenter: {
      lat: originalLat,
      lng: originalLng
    }
  }
}

var EventEmitter = require("events").EventEmitter;
var poller = new EventEmitter(); 

/**
 * Sends request to Foursquare
 */
poller.send = function(){
  
  var requestLatLng = pollingStrategy.nextPollingPoint();
  var path = _path.replace("#{lat}", requestLatLng.lat).replace("#{lng}", requestLatLng.lng);
  
  isReady = false;
  https.get( { host: _host, path: path }, function( res ) {
    res.body = '';
    res.on('data', function(chunk){
      res.body += chunk;
    });
    res.on('end', function(){
      try {
        _logRatelimitRemainig(res.headers);
        
        // Parse result
        var parsedResult = _parseResult(JSON.parse(res.body), requestLatLng.lat, requestLatLng.lng);
        
        poller.emit('eventsParsed', parsedResult);
        
        // Next polling point
        pollingStrategy.lastResult(parsedResult.events, parsedResult.bounds, parsedResult.requestCenter);
        
      } 
      catch (err) {
        logger.error("Error in parsing venues");
        logger.debug("headers: ", res.headers);
        logger.error(err);
      }
    });
  }).on('error', function(e){
    logger.error("Error in loading venues");
    logger.error(e);
  });
}

poller.initialize = function(_clientId, _clientSecret){
  _path = "/v2/venues/search?ll=#{lat},#{lng}&limit=50&client_id=" + _clientId + "&client_secret=" + _clientSecret;
  isReady = true;
};

module.exports = poller;