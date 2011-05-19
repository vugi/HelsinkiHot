var port = 80;
var express = require('express');
var app = express.createServer();
var fs = require('fs');
var path = require('path');

// Initialize socket
var socketAPI = require('./socket/socket_api')(app);

var https = require('https');
var host = "api.foursquare.com";
var mongoose = require('mongoose');
// var Query = require('mongoose/query')
var Query = mongoose.Query;
var datamodel = require('./datamodel/datamodel');
var _ = require('./lib/underscore');

var log4js = require('log4js')();
var logger = log4js.getLogger();
var performanceLogger = log4js.getLogger('performance');

var foursquarePoller = require("./foursquare/FoursquarePoller.js");

var config;

/**
 * Reads given config file. If file doesn't exist, reads fallbackFile
 * 
 * @param {Object} file
 * @param {Object} fallbackFile
 */
function readConfigFile(file, fallbackFile, callback) {
  var configFile;
  path.exists(file, function (exists) {
    configFile = exists === true ? file : fallbackFile;
  
    logger.debug('Reading file ' + configFile);
    var data = fs.readFileSync(configFile, 'utf8');
    config = JSON.parse(data);
    
    callback(config);
  });
}

// Foursquare poller
var initializeFoursquarePoller = function(){
  var poller = foursquarePoller(config.foursquare_client_id, config.foursquare_client_secret, 
  
  // Callback
  function(events, callback){
    if (events.length > 0) {
      // logger.info(' * * * Adding ' + events.length + ' new checkins * * * ');
      datamodel.addEvents(events, function(success){
        // Nothing here... logging maybe
        callback();
      });
    }
    else {
      logger.info("No events added");
      callback();
    }
  }).start();
}

function configured(config) {
  app.listen(config.port);
}

// Middleware configurations
app.configure('development', function(){
  app.use(express.static(__dirname + '/public'));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  readConfigFile('./user_config.json', './user_config_default.json', function(config) {
    initializeFoursquarePoller(config.foursquare_client_id, config.foursquare_client_secret);
    configured(config);
  });
});

app.configure('production', function(){
  var oneYear = 31557600000;
  app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
  app.use(express.errorHandler());
  readConfigFile('./production_config.json', null, function(config) {
    initializeFoursquarePoller(config.foursquare_client_id, config.foursquare_client_secret);
    configured(config);
  });
  
});

utils = {
  inspect: function(obj) {
    if (typeof obj === "object") {
      var str = "{";
      for (var i in obj) {
        str += i + ": " + obj[i] + ", ";
      }
      str += "}";
      return str;
    }
    else {
      return obj.toString();
    }
  }
}

var output = {
  venue_fields: ['name', 'address', 'latitude', 'longitude', 'service',
    'serviceId'],
  event_fields: ['time', 'type', 'points'],
  /**
  * Formats & filters a mongoose result array for outputting for frontend
  * @param input mongoose result array
  * @param since Date. only venues with events newer than this are included
  */
  format: function(input, since) {
    
    
    var venues = [];
    
    for (var i in input) {
      var out = [];
      var input_venue = input[i];
      var output_venue = {}; // custom format venue
      
      // add needed the fields
      for (var j in output.venue_fields) {
        var field = output.venue_fields[j];
        output_venue[field] = input_venue[field];
      }
      
      // add events
      output_venue.events = [];
      
      for (var j = 0; j< input_venue.events.length; j++) {
        var input_event = input_venue.events[j];
        var output_event = {};
        
        // add the needed fields
        for (var k in output.event_fields) {
          var field = output.event_fields[k];
          output_event[field] = input_event[field];
        }

        if (!since || output_event.time > since) {
          output_venue.events.push(output_event);
        }
      }
        
      //c.events.push()
      if (output_venue.events.length > 0) {
        venues.push(output_venue);
      }
      
    }
    return venues;
  }
}

var datamodel = require("./datamodel/datamodel.js");

// init the data model
datamodel.init({addTestData: false});

// Start garbage collector. Remove all events older than two
// days. Do it every second hour and when ever the application
// is restarted
var ONE_MINUTE = 60 * 1000;
var ONE_HOUR = 24 * ONE_MINUTE;
var time = new Date(Date.now() - 48 * ONE_HOUR);

var garbageCollectorId = setInterval(function() {
  datamodel.removeEventsOlderThan(time);
}, 2 * ONE_HOUR);
datamodel.removeEventsOlderThan(time);


app.get('/api', function(req, res){
	res.send('hello world from api!');	
});

app.get('/api/venues/since/:timestamp', function(req, res) {
  var timestamp, since, query, startTime, endTime;
  var start = (new Date().getTime());
  
  // Parse timestamp
  timestamp = parseInt(req.params.timestamp);
  if(_.isNumber(timestamp)) {
    if(timestamp >= 0) {
      since = new Date(timestamp);
    } else {
      since = new Date(new Date().getTime() + timestamp);
    }
  } else {
    logger.warn('tried to get venues since invalid timestamp (' + 
      timestamp + ')');
    res.send({status: 400, error: 'invalid timestamp'});
    return;  
  }
  
  query = new Query();
  query.where('events.time').gte(since);
  
  datamodel.models.Venue.find(query, function(err, venuedata) {
    var formatStart = (new Date().getTime());
    var venues = output.format(venuedata, since);
    performanceLogger.debug("Formating events to JSON took " + ((new Date()).getTime() - formatStart) + " ms");
    
    res.send({venues: venues, timestamp: new Date().getTime()});
    
    performanceLogger.debug("Loading events from database took " + ((new Date()).getTime() - start) + " ms");
  });
});

logger.info('Server running at port ' + port);
