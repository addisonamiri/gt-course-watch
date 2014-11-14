var https = require('https'),
    cheerio = require('cheerio');

function Poller(mongoController, mailer, basePath, term, dispatcher) {
  this.mongoController = mongoController;
  this.mailer = mailer;
  this.basePath = basePath;
  this.term = term;
  this.dispatcher = dispatcher;
}

Poller.prototype.getSeatStats = function (crn, cb) {
  var _this = this;

  var options = {
    hostname: 'oscar.gatech.edu',
    port: 443,
    path: _this.buildPath(crn),
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


    res.on('end', function() {

      var joinedBody = body.join('');
      var $ = cheerio.load(joinedBody);
      var result = {};

      // console.log(joinedBody);

        //traversing method
        $('.dddefault').each(function(i) {
          if(i==3) {
            result["remaining"] = parseInt($(this).text().trim());
          } else if(i==2) {
            result["actual"] = parseInt($(this).text().trim());
          } else if(i==1) {
            result["capacity"] = parseInt($(this).text().trim());            
          } else if(i==4) {
            result["waitlist_capacity"] = parseInt($(this).text().trim());            
          } else if(i==5) {
            result["waitlist_actual"] = parseInt($(this).text().trim());                        
          } else if(i==6) {
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

Poller.prototype.pollAllSeats = function () {
  var _this = this;

  //need to adjust term for auto reg reqs
  var indexOf2 = this.term.indexOf('2');
  var adjustedTerm = this.term.slice(0, indexOf2) + "-" + this.term.slice(indexOf2);
  adjustedTerm = adjustedTerm.charAt(0).toUpperCase() + adjustedTerm.slice(1);

  aggregateInOrder(function(aggregatedReqs) {      
    for (var crn in aggregatedReqs) {
      _this.getSeatStats(crn, function(crn, result) {
        if(result.hasOwnProperty("remaining") && result["remaining"] > 0) {
          //found a class with an empty seat if in this block
          var aggArray = aggregatedReqs[crn];

          for(i in aggArray) {
            var req = aggArray[i];
            if('gatewayedNumber' in req) {
              _this.scrapeSeats(req, true);
            } else{
              _this.scrapeSeats(req, false);
            }
          }
        }
      });
    }
  });


  function aggregateInOrder(cb) {
    //a hash of "crn" => [requests...]
    var aggregatedReqs = {};

    //auto regs must be handled before unpaid reqs for aggregation to work!  
    //aggregate paid automated reqs first to give them priority
    _this.mongoController.autoRegReq.find({term:adjustedTerm}, function(err, requestPool) {
      if(err) console.log(err);
      aggregateRequests(aggregatedReqs, requestPool);

      _this.mongoController.Request.find({term:_this.term}, function(err, requestPool) {
        if(err) console.log(err);
        aggregateRequests(aggregatedReqs, requestPool);

        _this.mongoController.smsRequest.find({term:_this.term}, function(err, requestPool) {
          if(err) console.log(err);
          aggregateRequests(aggregatedReqs, requestPool);

          cb(aggregatedReqs);
        });
      });
    });
  }

  function aggregateRequests(aggregatorObj, requestPool) {
    for(i in requestPool) {
      var req = requestPool[i];

      if(!aggregatorObj.hasOwnProperty(req.crn)) {
        aggregatorObj[req.crn] = [req];
      } else{
        //only one automated-reg request per CRN is contained in aggregatorObj
        //this way, the person next in line for auto-reg gets registered fairly before anyone else
        if( !('buzzport_id' in req) ) {
          aggregatorObj[req.crn].push(req);
        }
      }
    }
  }

}


Poller.prototype.scrapeSeats = function (existingRequest, smsRequest) {
  var _this = this;
  console.log("scrape exec");

  var options = {
    hostname: 'oscar.gatech.edu',
    port: 443,
    path: _this.buildPath(existingRequest.crn),
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


    res.on('end', function() {

      var joinedBody = body.join('');
      var $ = cheerio.load(joinedBody);

        //traversing method
        $('.dddefault').each(function(i) {
          if(i==3) {
            var remainingSeats = parseInt($(this).text().trim());
            //perserve this reference by calling on _this

            _this.checkSeats(remainingSeats, existingRequest, smsRequest);
          }
        });
    });
  });

  req.end();

  req.on('error', function(e) {
    console.error(e);
  });
}

Poller.prototype.checkSeats = function(numSeats, existingRequest, smsRequest) {
  if(numSeats > 0) {
    // console.log('there is a seat open! ' + numSeats);
    if('buzzport_id' in existingRequest) {
      //encounter case where there is a free slot for an auto registration request.
      //add job to phantom queue
      if(existingRequest.beingProcessed == "false") {
        this.dispatcher.addRegisterTaskToQueue(existingRequest);
        existingRequest.beingProcessed = "true";
        existingRequest.save();
        this.mongoController.createSuccessStat(0,0,1);
      }

    } else{
      if(smsRequest) this.mongoController.createSuccessStat(0,1,0);
      else this.mongoController.createSuccessStat(1,0,0);

      this.mailer.sendNotificationMail(existingRequest, smsRequest);
      existingRequest.remove();
    }
  } else{
    // console.log('there are no seats open currently' + numSeats);
  }
}

Poller.prototype.buildPath = function (crn) {
  return this.basePath + crn;
}


module.exports = Poller;
