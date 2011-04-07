var port = 3000;
var express = require('express');
var app = express.createServer();

var https = require('https');
var host = "api.foursquare.com";
var path = "/v2/venues/trending?ll=60.170833,24.9375&limit=50&radius=1000000&client_id=LTEVQYSCQZZQKSPR1XAI4B0SAUD44AN4JKNURCL1ZFJ1IBDZ&client_secret=TL2ALQWU4VV5J5R5BCH3Z53EDFOU5KLSOIFZSJGLOSK4NGH1";
var mongoose = require('mongoose');

// Middleware configurations
app.configure(function(){
  app.use(express.static(__dirname + '/public'));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

utils = {
  // http://bonta-kun.net/wp/2007/07/05/javascript-typeof-with-array-support/
  typeOf: function(obj) {
    if ( typeof(obj) == 'object' ) {
      if (obj.length)
        return 'array';
      else
        return 'object';
    } else {
      return typeof(obj);
    }
  },
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

var datamodel = {
  connect: function(dbname) {
    dbname = typeof dbname == String ? dbname : "helsinkihot"
    mongoose.connect('mongodb://localhost/' + dbname);
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
        console.log('Added sample data: FAIL');
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
        console.log("Venue " + venues[0].name + " found");
        venue = venues[0];
      } else if (venues.length > 1) {
        console.warn("Found multiple venues with service: " + data.service + ", id: " 
        + data.serviceId + ", choosing the first one.");
        venue = venues[0];
      } else {
        console.log("Creating a new venue with data " + utils.inspect(data));
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
      
      for (var i in data.events) {
        var ev = data.events[i];
        console.log('Adding event ' + utils.inspect(ev) + ' to the event');
        venue.events.push(ev);
      }
      
      venue.save(function(err) {
        console.log('Updated the venue ' + venue.name);
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
      var v = input[i];
      var c = {}; // custom format venue
      
      // add needed the fields
      for (var j in output.venue_fields) {
        var f = output.venue_fields[j];
        c[f] = v[f];
      }
      
      // add events
      c.events = [];
      
      for (var j = 0; j< v.events.length; j++) {
        var e = v.events[j];
        var ce = {};
        
        // add the needed fields
        for (var k in output.event_fields) {
          var f = output.event_fields[k];
          ce[f] = e[f];
        }

        if (!since || ce.time > since) {
          c.events.push(ce);
        }
      }
        
      //c.events.push()
      if (c.events.length > 0) {
        venues.push(c);
      }
      
    }
    return venues;
  }
}

// init the data model
datamodel.init({addTestData: false});

// Foursquare poller
var foursquarePoller = require("./foursquare/FoursquarePoller.js");
var poller = foursquarePoller(function(data) {

 /*
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
  */  
  
  var items = data.response.groups[0].items;
  var itemsLength = items.length;
  var events = [];
  for (var i = 0; i < itemsLength; i++) {
    var item = items[i];
    var location = item.location;
    events.push({
      name: item.name,
      latitude: location.lat,
      longitude: location.lng,
      service: "foursquare",
      serviceId: "123",
      events: [{
        time: new Date(),
        type: 'checkin',
        points: item.hereNow.count 
      }]
    });
  }
  
  if (events.length > 0) {
    datamodel.addEvents(events, function(success){
      if (success) {
        console.log(events.length + " events added to datamodel");
      }
      else {
        console.log("Error while adding data to datamodel");
      }
    });
  } else {
    console.log("No events added");
  }
}).start();

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
      since = new Date(timestamp);
      var venues = output.format(venuedata, since);
      res.send({venues: venues, timestamp: new Date().getTime()});
    } else {
      console.warn('tried to get venues since invalid timestamp (' + 
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
    console.log("\nSave successful\n");
    console.log("Instance details:");
    console.log(instance);

    res.send(instance);
  });
});


app.get('/api/venues', function(req, res){
	getVenues(function(json){
		console.log(json.response.venues);
		res.send(json.response.venues);
	});
});

app.get('/api/venues2', function(req,res) {
  datamodel.getVenues({}, function(venuedata) {
    var venues = output.format(venuedata);
    res.send(venues);
  });
});

app.get('/api/venues2/:name', function(req, res) {
  var venues = [];
  datamodel.getVenues({name: req.params.name}, function(venuedata) {
    for (var i in venuedata) {
      venues.push(venuedata[i]);
    }
    res.send(venues);
  });
  /*datamodel.models.Venue.find({}, function(err, venuedata) {
    for (var i in venuedata) {
      console.log("\n\nVenue:\n")
      console.log(venuedata[i].doc);
      venues.push(venuedata[i].doc);
    }
    res.send(venues);
  });*/
});

/**
 * Search some venues around Helsinki and return them as JSON object
 * HTTPS method from http://nodejs.org/docs/v0.4.0/api/https.html#https.get
 */
function getVenues(callback){
	https.get({ host: host, path: path }, function(res) {
		console.log("statusCode: ", res.statusCode);
		console.log("headers: ", res.headers);
		res.body = '';
		res.on('data', function(chunk) {
	  		res.body += chunk;
		});
		res.on('end', function(){
			//callback(res.body);
			try {
				//console.log(res.body);
				callback(JSON.parse(res.body));
			} catch (err) {
				console.log("Error in parsing venues");
				console.error(err);
			}
		});
	}).on('error', function(e) {
		console.log("Error in loading venues");
		console.error(e);
	});
}

app.listen(port);

console.log('Server running at port ' + port);