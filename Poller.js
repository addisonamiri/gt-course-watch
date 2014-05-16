var https = require('https');
var cheerio = require('cheerio');

function Poller(mongoController, mailer, basePath, term, dispatcher){
	this.mongoController = mongoController;
	this.mailer = mailer;
	this.basePath = basePath;
	this.term = term;
	this.dispatcher = dispatcher;
}

Poller.prototype.pollAllSeats = function pollAllSeats(){
	var self = this;

	this.mongoController.Request.find({term:self.term}, function(err, requestPool){
		if(err){
			console.log(err);
		}

		for (requestIdx in requestPool) {
			self.scrapeSeats(requestPool[requestIdx], false);
		}
	});

	this.mongoController.smsRequest.find({term:self.term}, function(err, requestPool){
		if(err){
			console.log(err)
		}

		for (requestIdx in requestPool) {
			self.scrapeSeats(requestPool[requestIdx], true);
		}
	});

	//need to adjust term for auto reg reqs
	var indexOf2 = self.term.indexOf('2');
	var adjustedTerm = self.term.slice(0, indexOf2) + "-" + self.term.slice(indexOf2);
	adjustedTerm = adjustedTerm.charAt(0).toUpperCase() + adjustedTerm.slice(1);

	this.mongoController.autoRegReq.find({term:adjustedTerm}, function(err, requestPool){
		if(err){
			console.log(err)
		}

		for (requestIdx in requestPool) {
			self.scrapeSeats(requestPool[requestIdx], true);
		}
	});
}

Poller.prototype.getSeatStats = function getSeatStats(crn, cb){
	var self = this;

	var options = {
	  hostname: 'oscar.gatech.edu',
	  port: 443,
	  path: self.buildPath(crn),
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
			var result = {};

			// console.log(joinedBody);

		    //traversing method
		    $('.dddefault').each(function(i){
		    	if(i==3){
		    		result["remaining"] = parseInt($(this).text().trim());
		    	}else if(i==2){
		    		result["actual"] = parseInt($(this).text().trim());
		    	}else if(i==1){
		    		result["capacity"] = parseInt($(this).text().trim());		    		
		    	}else if(i==4){
		    		result["waitlist_capacity"] = parseInt($(this).text().trim());		    		
		    	}else if(i==5){
		    		result["waitlist_actual"] = parseInt($(this).text().trim());		    				    		
		    	}else if(i==6){
		    		result["waitlist_remaining"] = parseInt($(this).text().trim());		    				    		
		    	}
		    });

		    cb(result);
		});

	});

	req.end();

	req.on('error', function(e) {
	  console.error(e);
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
		    		//perserve this reference by calling on self
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
		if('buzzport_id' in existingRequest){
			//encounter case where there is a free slot for an auto registration request.
			//add job to phantom queue
			if(existingRequest.beingProcessed == "false"){
				this.dispatcher.addRegisterTaskToQueue(existingRequest);
				existingRequest.beingProcessed = "true";
				existingRequest.save();
			}

		}else{
			this.mailer.sendNotificationMail(existingRequest, smsRequest);
			existingRequest.remove();
		}
	}else{
		// console.log('there are no seats open currently' + numSeats);
	}
}

Poller.prototype.buildPath = function buildPath(crn){
	//format : /pls/bprod/bwckschd.p_disp_detail_sched?term_in=201402&crn_in=
	return this.basePath + crn;
}


module.exports = Poller;
