// TODO Replace snmpwalk exec with node-snmpjs once it has recursive queries

var execFile = require('child_process').execFile;
var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var util = require('util');
var assert = require('assert');
var config = require('./config');

var SNMPWALK='/opt/local/bin/snmpwalk';
var SWITCHES=config.switches;

function snmpwalk(args, callback) {
	assert(args);
	assert(callback);

	if (typeof(args) !== 'array') {
		throw new TypeError("args must be an array");
	}

	if (typeof(callback) !== 'function') {
		throw new TypeError("callback must be a function");
	}

	execFile(SNMPWALK, args, function (error, stdout, stderr) {
		var result = {stdout: stdout, stderr: stderr};
    if (error) {
		  return callback(error, result);
		}
		return callback(null, result);
	});

}

function normalizeMac(mac) {
	if (typeof(mac) !== 'string') {
		return null;
	}

  // outside the size we care about	
	if (mac.length < 12 || mac.length > 17) {
		return null;
	}
 
	// a string with no separators
	if ( mac.length == 12 ) {
		var tokens = [];
		for ( var i=0; i<12;i+=2 ) {
			var t = mac.charAt(i) + mac.charAt(i + 1);
		  tokens.push(t);
		}
    mac = tokens.join(':');
	}

  // normalize to all uppercase
	mac = mac.toUpperCase();
	// dashes and dots are sometimes used instead of colons
  mac = mac.replace(/-\./, ':');

	// is it still a mac address?
	if ( mac.match(/^([0-9A-F]{2}(:|$)){6}$/) ) {
		return mac;
	} 
	else {
		return null;
	}
}

var dottedToHex = function(val) {
	var tokens = val.split(/\./);

	return tokens.map(function(v) {
		var r = parseInt(v).toString(16);
		if (r.length < 2) r = "0" + r;
		return r.toUpperCase();
	}).join(':');
}

function getAddrTable(switchAddr, callback) {
	assert(switchAddr);

  if (typeof(switchAddr) !== 'string') {
		throw new TypeError("switchAddr must be a string");
	}

	var args = ['-On', '-c', 'public', '-v1', switchAddr, 'dot1qTpFdbTable'];
	var snmpwalk = spawn(SNMPWALK, args);

	var buffer = '';

  snmpwalk.stdout.on('data', function(chunk) {
    buffer = buffer + chunk.toString();
	});

	snmpwalk.stderr.on('data', function(chunk) {
		console.log(chunk.toString());
	});

	snmpwalk.on('exit', function(code) {
		var results = [];

		if (code !==0) {
		  console.log("error: " + code);
		}
		
		var lines = buffer.split(/\n/);
	
		while (lines.length > 1) {
		  var line = lines.shift();
			// .1.3.6.1.2.1.17.7.1.2.2.1.2.120.144.184.208.70.118.203 = INTEGER: 24   
		  var reg=/^\.1\.3\.6\.1\.2\.1\.17\.7\.1\.2\.2\.1\.(\d+)\.(\d+)\.(\d*\.\d*\.\d*\.\d*\.\d*\.\d*) = (\w+): (.*)/
			var tokens = line.match(reg);

			// we only care about status=2 (which ports)
			// XXX is there a way to filter these on the command line?
			
	    if (tokens[1] == 2) {
				var entry = {
				  _switch: switchAddr,
					vlan: parseInt(tokens[2]),
					mac: dottedToHex(tokens[3]),
					port: parseInt(tokens[5])
				}

				results.push(entry);

			}

		}

    callback(null, results);

	});

}

function getAllAddrs(callback) {
	assert.ok('callback');

	if (typeof(callback) !== 'function') {
		throw new TypeError("callback must be a function");
	}

	var count = SWITCHES.length;
  var results = [];

	var next = function(error, res) {
		if (--count == 0) {
			results = results.concat(res);
		  callback(null, results);
	  }
		else {
			results = results.concat(res);
		}
	}	

	for (i in SWITCHES) {
		var sw=SWITCHES[i];
		getAddrTable(sw, next);
	}

}

function queryMacAddr(address, callback) {
	assert.ok('address');
	assert.ok('callback');

	if (typeof(callback) !== 'function') {
		throw new TypeError("callback must be a function");
	}

	if (typeof(address) !== 'string') {
		throw new TypeError("address must be a string");
	}

	address = normalizeMac(address);
	console.log(address);

	if (address === null) {
		return callback("address must be a valid mac", null);
	}

  getAllAddrs(function(err, results) {
		var entries = [];
    for (i in results) {
	    if (results[i].mac.toString() === address) {
		    entries.push(results[i]);
			}
	  }
		return callback(null, entries);
	});

}

module.exports = {
	all: getAllAddrs,
	find: queryMacAddr,
	specific: getAddrTable
}



