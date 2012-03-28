var fs = require('fs');
var restify = require('restify');
var Logger = require('bunyan');

var macAddr = require('./lib/macaddr');

var log = new Logger({
	name: 'snmp-stitch',
	level: 'info',
});

var server = restify.createServer({
	name: 'snmp-stich',
	version: '0.0.1',
	Logger: log
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.bodyParser());
server.use(restify.queryParser());

var helpMessage = [
  { 
    url: "/bridge/addressTable",
		description: "shows learned mac addresses and ports on all bridges"
	},
	{ url: "/bridge/addressTable/:id",
		description: "lists ports that have learned the mac address specified by 'id"
  }
];
	
server.get('/', function (req, res, next) {
  res.json(200, {help: helpMessage});
	return next();	
});

server.get('/bridge/addressTable', function (req, res, next) {
	macAddr.all(function(err, results) {
	  if (err) {
		  res.json(500, {error: {code: 0, message: "error processing request"}});
		}
		else {
			res.json(200, results);
			return next();
		}
	});
});

server.get('/bridge/addressTable/:id', function (req, res, next) {
	macAddr.find(req.params.id, function (err, results) {
	  if (err) {
		  res.json(500, {error: {code: 0, message: "error processing request"}});
		}
		else {
			res.json(200, results);
			return next();
		}
	});
});


server.listen(80, function() {
	log.info("snmp-stich listening on 0.0.0.0:80");
});
