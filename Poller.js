var https = require('https');
var cheerio = require('cheerio');

function Poller(mongoController, mailer, basePath, term, dispatcher){
	this.mongoController = mongoController;
	this.mailer = mailer;
	this.basePath = basePath;
	this.term = term;
	this.dispatcher = dispatcher;
}

Poller.prototype.getSeatStats = function (crn, cb){
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

		    cb(crn, result);
		});

	});

	req.end();

	req.on('error', function(e) {
	   console.log("Error: " + e.message); 
	   console.log( e.stack );
	});	
}

Poller.prototype.pollAllSeats = function (){
	var self = this;

	//need to adjust term for auto reg reqs
	var indexOf2 = self.term.indexOf('2');
	var adjustedTerm = self.term.slice(0, indexOf2) + "-" + self.term.slice(indexOf2);
	adjustedTerm = adjustedTerm.charAt(0).toUpperCase() + adjustedTerm.slice(1);

	//a hash of "crn" => [requests...]
	var aggregatedReqs = {};

	//auto regs must be handled before unpaid reqs for aggregation to work!
	this.mongoController.autoRegReq.find({term:adjustedTerm}, function(err, requestPool){
		if(err){
			console.log(err);
		}

		aggregateRequests(aggregatedReqs, requestPool);

		executeUnpaidReqs(function(){			
			for (var crn in aggregatedReqs) {
				self.getSeatStats(crn, function(result){
					if(result!=undefined && result["remaining"] > 0){

						var aggArray = aggregatedReqs[crn];

						for(i in aggArray){
							var req = aggArray[i];
							if('gatewayedNumber' in req){
								self.scrapeSeats(req, true);
							}else{
								self.scrapeSeats(req, false);
							}
						}
					}else if(result==undefined){
						//cleanup bad crns from db
						var aggArray = aggregatedReqs[crn];

						for(i in aggArray){
							console.log("Found a bad CRN entry, removing...");
							aggArray[i].remove();
						}
					}
				});
			}

		});
	});


	function executeUnpaidReqs(cb){
		self.mongoController.Request.find({term:self.term}, function(err, requestPool){
			if(err){
				console.log(err);
			}

			aggregateRequests(aggregatedReqs, requestPool);

			self.mongoController.smsRequest.find({term:self.term}, function(err, requestPool){
				if(err){
					console.log(err);
				}

				aggregateRequests(aggregatedReqs, requestPool);

				cb();
			});
		});		

	}

	function aggregateRequests(aggregatorObj, requestPool){
		for(i in requestPool){
			var req = requestPool[i];

			if(!aggregatorObj.hasOwnProperty(req.crn)){
				aggregatorObj[req.crn] = [req];
			}else{
				if( !('buzzport_id' in req) ){
					aggregatorObj[req.crn].push(req);
				}
			}
		}
	}


}


Poller.prototype.scrapeSeats = function (existingRequest, smsRequest){
	var self = this;
	console.log("scrape exec");

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

Poller.prototype.checkSeats = function(numSeats, existingRequest, smsRequest){
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
			if(smsRequest) this.mongoController.createSuccessStat(0,1,0);
			else this.mongoController.createSuccessStat(1,0,0);

			this.mailer.sendNotificationMail(existingRequest, smsRequest);
			existingRequest.remove();
		}
	}else{
		// console.log('there are no seats open currently' + numSeats);
	}
}

Poller.prototype.buildPath = function (crn){
	return this.basePath + crn;
}


module.exports = Poller;
