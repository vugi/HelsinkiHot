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
  init: function() {
    
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
      events      : [Event]
    });
    
    mongoose.model('Event', Event);
    mongoose.model('Venue', Venue);
    
    datamodel.models = {};
    
    datamodel.models.Event = mongoose.model('Event');
    datamodel.models.Venue = mongoose.model('Venue');
    
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
  }
}

// init the data model
datamodel.init();

app.get('/api', function(req, res){
	res.send('hello world from api!');	
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

app.get('/api/venues2', function(req, res) {
  var venues = [];
  datamodel.models.Venue.find({}, function(err, venuedata) {
    for (i in venuedata) {
      console.log("\n\nVenue:\n")
      console.log(venuedata[i].doc);
      venues.push(venuedata[i].doc);
    }
    res.send(venues);
  });
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