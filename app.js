var port = 3000;
var express = require('express');
var app = express.createServer();

var https = require('https');
var host = "api.foursquare.com";
var path = "/v2/venues/search?ll=60.170833,24.9375&limit=50&client_id=LTEVQYSCQZZQKSPR1XAI4B0SAUD44AN4JKNURCL1ZFJ1IBDZ&client_secret=TL2ALQWU4VV5J5R5BCH3Z53EDFOU5KLSOIFZSJGLOSK4NGH1";

// Middleware configurations
app.configure(function(){
  app.use(express.staticProvider(__dirname + '/public'));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
}); 

app.get('/api', function(req, res){
	res.send('hello world from api!');	
});


app.get('/api/venues', function(req, res){
	getVenues(function(json){
		res.send(json.response.groups[0]);
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
				callback(JSON.parse(res.body));
			} catch (err) {
				console.error(err);
			}
		});
	}).on('error', function(e) {
		console.error(e);
	});
}

app.listen(port);

console.log('Server running at port ' + port);