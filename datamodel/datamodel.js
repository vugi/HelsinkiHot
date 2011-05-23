var mongoose = require('mongoose');
var Query = mongoose.Query;
var _ = require('../lib/underscore');
var socketAPI = require('../socket/socket_api')();

var log4js = require('log4js')();
var logger = log4js.getLogger('datamodel');

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
  init: function(opts) {
    
    datamodel.connect();
    
    Schema = mongoose.Schema;
    ObjectId = Schema.ObjectId;
    
    var Event = new Schema({
      time    : {type: Date, index: true},
      type    : String,
      points  : Number
    });
    
    var Venue = new Schema({
      identifier  : ObjectId,
      name        : String,
      address     : String,
      latitude    : Number,
      longitude   : Number,
      service     : {type: String, index: true},
      serviceId   : {type: String, index: true},
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
        var eventsAdded = 0;
        datamodel.addEvent(data[i], function() {
          eventsAdded++;
          if(eventsAdded >= data.length) {
            callback(true);
          }
        });
      }
    } else { // hash/object
      datamodel.addEvent(data, function() {
          callback(true);
      });
    }
  },
  addEvent: function(data, callback) {
    datamodel.getVenues({service: data.service, serviceId: data.serviceId}, function(venues) {
      var venue;
      if (venues.length == 1) {
        // logger.debug("Venue " + venues[0].name + " found, checkins: " + venues[0].checkinsCount);
        venue = venues[0];
      } else if (venues.length > 1) {
        // logger.warn("Found multiple venues with service: " + data.service + ", id: " 
        // + data.serviceId + ", choosing the first one.");
        venue = venues[0];
      } else {
        logger.debug("Creating a new venue " + data.name + ", checkins: " + data.checkinsCount);
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
        logger.debug(venue.name + ' - old: ' + oldCheckinsCount + ' new: ' + newCheckinsCount);
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
        
        
        logger.debug('* * * * * * Found new checkin to ' + venue.name + ' worth ' + checkinDifference + ' points * * * * * * * *');
        
        venue.events.push(newEvent);
        
        // notify event listeners
        _.each(datamodel.eventListeners, function(listener) {
          listener({venue: 
            {
              name: venue.name, latitude: venue.latitude, longitude: venue.longitude,
              events: [newEvent]
            }
          });
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
        
        logger.debug("Updating checkin count from " + oldCheckinsCount + " to " + newCheckinsCount);
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
  },
  removeEventsOlderThan: function(time) {
    logger.debug('Removing events older than ' + time.toString());
    
    var query = new Query();
    query.where('events.time').lte(time);
    
    datamodel.models.Venue.find(query, function(error, venues) {
      var venuesCount = venues.length;
      var venuesCleared = 0;
      var eventsRemoved = 0;
      _.each(venues, function(venue) {
        var recentEvents = _.select(venue.events, function(event) {
          return event.time.getTime() > time.getTime();
        });
        
        venue.events = recentEvents;
        
        venue.save(function(error) {
          if(error) {
            logger.error(error);
          }
          
          venuesCleared++;
          
          if(venuesCleared >= venuesCount) {
            logger.info('Cleared ' + venuesCleared + ' Venues from old events');
          }
        })
        
      });
    });
  }
}

// Export this file as a module
module.exports = datamodel;