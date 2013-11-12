var https = require('https');
var cheerio = require('cheerio');

function Poller(mongoController, mailer, basePath){
	this.mongoController = mongoController;
	this.mailer = mailer;
	this.basePath = basePath;
}

Poller.prototype.pollAllSeats = function pollAllSeats(){
	console.log("polling...");
	var self = this;

	this.mongoController.Request.find(function(err, requestPool){
		if(err){
			console.log(err);
		}

		for (requestIdx in requestPool) {
			var currRequest = requestPool[requestIdx];
			self.scrapeSeats(currRequest, false);
		}

	});

	this.mongoController.smsRequest.find(function(err, requestPool){
		if(err){
			console.log(err)
		}

		for (requestIdx in requestPool) {
			var currSMSRequest = requestPool[requestIdx];
			self.scrapeSeats(currSMSRequest, true);
		}

	});

}

Poller.prototype.scrapeSeats = function scrapeSeats(existingRequest, smsRequest){

	var self = this;

	var options = {
	  hostname: 'oscar.gatech.edu',
	  port: 443,
	  path: self.buildPath(existingRequest.crn),
	  method: 'GET',
	  rejectUnauthorized: 'false'
	};

	var req = https.request(options, function(res) {
	  // console.log("statusCode: ", res.statusCode);
	  // console.log("headers: ", res.headers);
		var body = [];
	    res.setEncoding('utf8');

		res.on('data', function(chunk) {
			body.push(chunk);
		});


		res.on('end', function(){

			var joinedBody = body.join('');
			var $ = cheerio.load(joinedBody);

		    //traversing method
		    $('.dddefault').each(function(i){
		    	if(i==3){
		    		var remainingSeats = parseInt($(this).text().trim());
		    		self.checkSeats(remainingSeats, existingRequest, smsRequest);
		    	}
		    });

		});

	});

	req.end();

	req.on('error', function(e) {
	  console.error(e);
	});

}

Poller.prototype.checkSeats = function checkSeats(numSeats, existingRequest, smsRequest){
	if(numSeats > 0){
		// console.log('there is a seat open! ' + numSeats);
		this.mailer.sendMail(existingRequest, smsRequest);
		existingRequest.remove();
	}else{
		// console.log('there are no seats open currently' + numSeats);
	}
}

Poller.prototype.buildPath = function buildPath(crn){
	//format : /pls/bprod/bwckschd.p_disp_detail_sched?term_in=201402&crn_in=
	return this.basePath + crn
}

module.exports = Poller;
