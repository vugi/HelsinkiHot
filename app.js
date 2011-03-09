var port = 3000;
var express = require('express');
var app = express.createServer();

// Middleware configurations
app.configure(function(){
  app.use(express.staticProvider(__dirname + '/public'));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.get('/api', function(req, res){
  res.send('hello world you!');
});

app.listen(port);

console.log('Server running at port ' + port);