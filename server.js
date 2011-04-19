var port = 3000;
var express = require('express');
var app = express.createServer();
var fs = require('fs');
var path = require('path');

// Initialize socket
var socketAPI = require('./socket/socket_api')(app);

var https = require('https');
var host = "api.foursquare.com";
var mongoose = require('mongoose');
var datamodel = require('./datamodel/datamodel');
var _ = require('./lib/underscore');
var loggerModule = require('./utils/logger');
var logger = loggerModule(loggerModule.level.DEBUG);
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
  var poller = foursquarePoller(
      config.foursquare_client_id, 
      config.foursquare_client_secret, 
      function(events){
    if (events.length > 0) {
      datamodel.addEvents(events, function(success){
        // Nothing here... logging maybe
      });
    }
    else {
      logger.log("No events added");
    }
  }).start();
}

// Middleware configurations
app.configure('development', function(){
  app.use(express.static(__dirname + '/public'));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  readConfigFile('./user_config.json', './user_config_default.json', function(config) {
    initializeFoursquarePoller(config.foursquare_client_id, config.foursquare_client_secret);
  });
});

app.configure('production', function(){
  var oneYear = 31557600000;
  app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
  app.use(express.errorHandler());
  readConfigFile('./production_config.json', null, function(config) {
    initializeFoursquarePoller(config.foursquare_client_id, config.foursquare_client_secret);
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

app.get('/api', function(req, res){
	res.send('hello world from api!');	
});

app.get('/api/venues/add', function(req, res) {
  var eventData = [{name:"TUAS", address: "Otaniementie 17", 
    latitude: 60.186841, longitude: 24.818006,
    service: 'foursquare', serviceId: "4be57f67477d9c74fba9e62d",
    events: [
      {time: new Date(), type: 'checkin', points:10},
      {time: new Date(60*60*24*365*40*1000), type: 'checkin', points:30},
      {time: new Date("2011-01-05 14:45"), type: 'checkin', points:10},
    ]
  }];
  datamodel.addEvents(eventData, function(success) {
    if (success) {
      res.send('OK');
    } else {
      res.send('FAIL');
    }
  });
});

app.get('/api/venues/since/:timestamp', function(req, res) {
  datamodel.getVenues({}, function(venuedata) {
    var since;
    
    var timestamp = parseInt(req.params.timestamp);
    
    if (timestamp == 0 || timestamp) {
      if (timestamp >= 0) { 
        since = new Date(timestamp);
      } else { // negative means relative from now
        since = new Date(new Date().getTime()+timestamp)
      }
      var venues = output.format(venuedata, since);
      res.send({venues: venues, timestamp: new Date().getTime()});
    } else {
      logger.warn('tried to get venues since invalid timestamp (' + 
        timestamp + ')');
      res.send({status: 400, error: 'invalid timestamp'});
    }
  });
});

app.get('/api/venues/del/:id', function(req, res) {
  
});

app.get('/api/db_test', function(req, res){
  var instance = datamodel.testDB()
  
  instance.save(function() {
    logger.log("\nSave successful\n");
    logger.log("Instance details:");
    logger.log(instance);

    res.send(instance);
  });
});

app.get('/api/venues', function(req,res) {
  datamodel.getVenues({}, function(venuedata) {
    var venues = output.format(venuedata);
    res.send(venues);
  });
});

app.get('/api/venues/:name', function(req, res) {
  var venues = [];
  datamodel.getVenues({name: req.params.name}, function(venuedata) {
    for (var i in venuedata) {
      venues.push(venuedata[i]);
    }
    res.send(venues);
  });
});

app.listen(port);

logger.log('Server running at port ' + port);
