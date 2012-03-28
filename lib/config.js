var fs = require('fs');
var path = require('path');

var config = fs.readFileSync(__dirname + '/../etc/config.json');
module.exports = config;
