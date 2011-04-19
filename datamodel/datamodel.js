var mongoose = require('mongoose');
var loggerModule = require('../utils/logger');
var _ = require('../lib/underscore');
var logger = loggerModule(loggerModule.level.LOG);
var socketAPI = require('../socket/socket_api')();

var datamodel = {
  eventListeners: [],
  connect: function(dbname) {
    dbname = typeof dbname == String ? dbname : "helsinkihot"
    mongoose.connect('mongodb://localhost/' + dbname);
  },
  addEventListener: function(callback) {
    if (typeof callback === "function") {
      logger.debug('Adding event listener');
      datamodel.eventListeners.push(callback);
    }
  },
  testDB: function(req,res) {

    Schema = mongoose.Schema;
    ObjectId = Schema.ObjectId;

    // define a model (schema)
    var Document = new Schema({
      title     : String,
      body      : String,
      date      : Date
    });
    // register the model
    mongoose.model('Document', Document);
    
    // create a new "type" from model
    var Doc = mongoose.model('Document');
    
    // instantiate the type (/model)
    var instance = new Doc();
    
    instance.title = "Test title";
    instance.body = "Test body";
    instance.date = new Date();

    return instance;
  },
  init: function(opts) {
    
    datamodel.connect();
    
    Schema = mongoose.Schema;
    ObjectId = Schema.ObjectId;
    
    var Event = new Schema({
      time    : Date,
      type    : String,
      points  : Number
    });
    
    var Venue = new Schema({
      identifier  : ObjectId,
      name        : String,
      address     : String,
      latitude    : Number,
      longitude   : Number,
      service     : String,
      serviceId   : String,
      checkinsCount : Number,
      events      : [Event]
    });
    
    Venue.method('new_events', function () {
      return this.events;
    });
    
    mongoose.model('Event', Event);
    mongoose.model('Venue', Venue);
    
    datamodel.models = {};
    
    datamodel.models.Event = mongoose.model('Event');
    datamodel.models.Venue = mongoose.model('Venue');
    
    datamodel.addEventListener(socketAPI.broadcastNewEvent);
    
    if (opts && opts.addTestData) {
      datamodel.insertSampleData();
    }
    
  },
  insertSampleData: function() {
        
    var eventData = [{name:"TUAS", address: "Otaniementie 17", 
      latitude: 60.186841, longitude: 24.818006,
      service: 'foursquare', serviceId: "4be57f67477d9c74fba9e62d",
      events: [
        {time: new Date("2011-05-10 12:30"), type: 'checkin', points:10},
        {time: new Date("2011-05-10 12:30"), type: 'checkin', points:30},
        {time: new Date("2011-01-05 14:45"), type: 'picture', points:20},
      ]
    },
    {name:"T-talo", address: "Konemiehentie 2", 
      latitude: 60.186841, longitude: 24.818006, // not real
      service: 'foursquare', serviceId: "4be57f67477d9c74fba9e62f", // not real
      events: [
        {time: new Date("2011-05-10 12:30"), type: 'checkin', points:10},
        {time: new Date("2011-05-10 12:30"), type: 'checkin', points:30},
        {time: new Date("2011-01-05 14:45"), type: 'picture', points:20},
      ]
    }
    ];
    datamodel.addEvents(eventData, function(success) {
      if (success) {
        console.log('Added sample data: OK');
      } else {
        logger.log('Added sample data: FAIL');
      }
    });
  },
  
  /**
  * Add events to database
  * @param data array that contains the events, or a single event info in a hash
  * Example data:
  * [{name:"Kauniainen", address: "Kauniaistentie 10",
  *   latitude: 60.20982564510065, longitude: 24.72975254058838,
  *   service: "foursquare", serviceId: "4be57f67477d9c74fba9e62d",
  *   events: [
  *     {time: new Date(), type: 'checkin', points:10},
  *     {time: new Date(60*60*24*365*40), type: 'checkin', points:30},
  *     {time: new Date("2011-01-05 14:45"), type: 'checkin', points:10},
  *   ]
  * }]
  * A new venue (with no checkin events) can be created by supplying the venue
  * data with no or an empty events array
  * @param callback a function with boolean param determining the success of 
  * the operation
  */
  addEvents: function(data, callback) {
    if (data.length) { // array
      for (var i in data) {
        datamodel.addEvent(data[i]);
      }
    } else { // hash/object
      datamodel.addEvent(data);
    }
    
    if (typeof callback === "function")
    callback(true);
  },
  addEvent: function(data, callback) {
    datamodel.getVenues({service: data.service, serviceId: data.serviceId}, function(venues) {
      var venue;
      if (venues.length == 1) {
        logger.debug("Venue " + venues[0].name + " found, checkins: " + venues[0].checkinsCount);
        venue = venues[0];
      } else if (venues.length > 1) {
        // logger.warn("Found multiple venues with service: " + data.service + ", id: " 
        // + data.serviceId + ", choosing the first one.");
        venue = venues[0];
      } else {
        // logger.log("Creating a new venue with data " + utils.inspect(data));
        logger.log("Creating a new venue " + data.name + ", checkins: " + data.checkinsCount);
        venue = new datamodel.models.Venue();
        venue.service = data.service;
        venue.serviceId = data.serviceId;
      }
      
      // updating the potentially changed fields
      if (data.name) {
        venue.name = data.name;
      }
      if (data.address) {
        venue.address = data.address;
      }
      if (data.latitude && data.longitude) {
        venue.latitude = data.latitude;
        venue.longitude = data.longitude;
      }
      
      var oldCheckinsCount = venue.checkinsCount || 0;
      var newCheckinsCount = parseInt(data.checkinsCount);
      
      if (oldCheckinsCount != newCheckinsCount) {
        logger.log(venue.name + ' - old: ' + oldCheckinsCount + ' new: ' + newCheckinsCount);
      }
      
      if (oldCheckinsCount == 0) {
        venue.checkinsCount = newCheckinsCount;
      }
      else if (newCheckinsCount > oldCheckinsCount) {
        // New checkins! Add events
        
        var checkinDifference = newCheckinsCount - oldCheckinsCount;
        
        // Add event
        var newEvent = {
          time: new Date(),
          type: 'checkin',
          points: checkinDifference
        };
        
        
        logger.log('* * * * * * Found new checkin to ' + venue.name + ' worth ' + checkinDifference + ' points * * * * * * * *');
        
        venue.events.push(newEvent);
        
        // notify event listeners
        _.each(datamodel.eventlisteners, function(listener) {
          listener(newEvent);
        });
        
        // Update total checkin count
        venue.checkinsCount = newCheckinsCount;
      }
      else if (newCheckinsCount < oldCheckinsCount) {
        // For some reason, this may happen also. 
        // Probably there has been some errors in the previously 
        // received data. Updating...
        
        // Update total checkin count
        venue.checkinsCount = newCheckinsCount;
        
        logger.log("Updating checkin count from " + oldCheckinsCount + " to " + newCheckinsCount);
      }
      
      venue.save(function(err) {
        if (typeof callback === "function") {
          callback(!err);
        }
      });
    });
  },
  getVenues: function(data, callback) {
    datamodel.models.Venue.find(data, function(err, venuedata) {
      callback(venuedata);
    });
  }
}

// Export this file as a module
module.exports = datamodel;