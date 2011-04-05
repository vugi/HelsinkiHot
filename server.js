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
    var str = "{";
    for (var i in obj) {
      str += i + ": " + obj[i] + ", ";
    }
    str += "}";
    return str;
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
      events      : [Event]
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
    var v1 = new datamodel.models.Venue();
    var v2 = new datamodel.models.Venue();

    v1.name = "T-talo";
    v1.address = "Konemiehentie 2";
    v1.events.push({time: new Date(), type: "checkin", points: 10});
    v1.events.push({time: new Date(), type: "checkin", points: 30});
    v1.events.push({time: new Date(), type: "picture", points: 20});

    console.log(v1);

    v2.name = "TUAS";
    v2.address = "Otaniementie X";
    
    v1.save(function() {console.log('Saved v1')});
    v2.save(function() {console.log('Saved v2')});
  },
  
  /**
  * Add events to database
  * @param data array that contains the events, or a single event info in a hash
  * Example data:
  * [{name:"Kauniainen", address: "Kauniaistentie 10", 
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
    datamodel.getVenues({name: data.name, address: data.address}, function(venues) {
      var venue;
      if (venues.length == 1) {
        console.log("Venue " + venues[0].name + " found");
        venue = venues[0];
        // updating the potentially changed latlng
        if (data.latitude && data.longitude) {
          venue.latitude = data.latitude;
          venue.longitude = data.longitude;
        }
      } else if (venues.length > 1) {
        console.warn("Found multiple venues with name: " + data.name + ", address: " 
        + data.address + ", choosing the first one.");
        venue = venues[0];
        // updating the potentially changed latlng
        venue.latitude = data.latitude;
        venue.longitude = data.longitude;
      } else {
        console.log("Creating a new venue with data " + data);
        venue = new datamodel.models.Venue();
        venue.name = data.name;
        venue.address = data.address; 
        venue.latitude = data.latitude;
        venue.longitude = data.longitude;
        //TODO: try with data embedded into constructor call
      }

      for (var i in data.events) {
        var ev = data.events[i];
        console.log('Adding event ' + utils.inspect(ev) + ' to the event');
        venue.events.push(ev);
      }
      
      if (typeof callback === "function") {
        callback(true);
      }
      venue.save(function() {console.log('Saved the venue' + venue);});
    });
  },
  getVenues: function(data, callback) {
    datamodel.models.Venue.find(data, function(err, venuedata) {
      callback(venuedata);
    });
  }
}

// init the data model
datamodel.init({addTestData: false});

app.get('/api', function(req, res){
	res.send('hello world from api!');	
});

app.get('/api/venues/add', function(req, res) {
  var eventData = [{name:"Kauniainen", address: "Kauniaistentie 10", 
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
  var venues = [];
  datamodel.getVenues({}, function(venuedata) {
    for (var i in venuedata) {
      venues.push(venuedata[i]);
    }
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