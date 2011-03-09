var port = 3000;
var app = require('express').createServer();

app.get('/', function(req, res){
  res.send('hello world you!');
});

app.listen(port);

console.log('Server running at port ' + port);