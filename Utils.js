var https = require('https'),
		http = require('http');

module.exports = {
	gt_https_req: function(hostname, path, cb) {
	  var options = {
	    hostname: hostname,
	    port: 443,
	    path: path,
	    method: 'GET',
	    rejectUnauthorized: 'false'
	  };

	  var req = https.request(options, function(res) {
	    var body = [];
	    res.setEncoding('utf8');

	    res
	    .on('data', function(chunk) {
	      body.push(chunk);
	    })
	    .on('end', function() {
	    	var $ = cheerio.load(body.join(''));
	    	cb($);
	    });
	  });

	  req.end();
	  req.on('error', function(e) {
	     console.log("Error: " + e.message); 
	     console.log( e.stack );
	     req.end();
	  });
	},
	http_req: null
};