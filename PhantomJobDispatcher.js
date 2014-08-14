var exec = require('child_process').exec;

var verifyJobsQueue = [], //each index holds an obj {request, callbackFunc}
  registrationJobsQueue = [], //each index just holds a requuest obj from db
  jobInProgress = false,
  numConcurrentJobs = 0,
  maxConcurrentJobs = 8,
  eventLoopInterval;

function PhantomJobDispatcher(mailer, mongoController, throttle) {
     this.throttle = typeof throttle !== 'undefined' ? throttle : false;
  this.mailer = mailer;
  this.mongoController = mongoController;
}

//producers
PhantomJobDispatcher.prototype.addVerifyTaskToQueue = function(validationReq, cb) {
  verifyJobsQueue.push({req:validationReq, func:cb});
}

PhantomJobDispatcher.prototype.addRegisterTaskToQueue = function(autoRegReq) {
  registrationJobsQueue.push(autoRegReq);
}

PhantomJobDispatcher.prototype.startDispatcher = function(eventLoopDelay) {
  var _this=this;

  eventLoopInterval = setInterval(function() {_this.dispatcherEventLoop()}, eventLoopDelay);
}

PhantomJobDispatcher.prototype.stopDispatcher = function() {
  clearInterval(eventLoopInterval);
}

//consumer
PhantomJobDispatcher.prototype.dispatcherEventLoop = function() {
  var _this = this;

  if(registrationJobsQueue.length > 0) {
    //have a registration job to get done, which takes priority over validation
    var job = registrationJobsQueue.shift(); //job is just a request obj from mongoDB
    
    execRegistrationTask(job, function(res, job) {
      if(res.status == "SUCCESS") {
        //check if phantom was able to successfuly register. 
        //if so, send status update email and remove request from db.
        //this is the condition where we bill.
        _this.mailer.sendAutoRegSuccessMail(job);
        _this.mongoController.createSuccessStat(0,0,1);
        job.remove(); //remove from DB  
      } else if(res.status.indexOf("ERROR") > -1) {
        //encountered an error so remove from DB
        var subj = "Registration Error CRN: " + job.crn;
        var msg = "Your automatated registration request encountered the following error: " + res.status +
          "\n\nAs a result, your request has been removed from the system.";

        _this.mailer.sendGenericMail(job.email, subj, msg);
        job.remove();
      } else{
        //generic failure, so leave it in db, let it get re-added to queue by poller.js
        job.beingProcessed = "false";
        job.save();
      }
    });

  } else if(verifyJobsQueue.length > 0 && (numConcurrentJobs <= maxConcurrentJobs)) {
    //we can look for validation tasks to complete.
    var job = verifyJobsQueue.shift();    
    
    execVerifyTask(job.req, function(res) {
      job.func(res.status);
    });
  }
  
}

function execRegistrationTask(job, cb) {
  jobInProgress = true;
  numConcurrentJobs++;

  var maxWaitPeriod = 90000,
    child;

  var execStatement = 'phantomjs --ignore-ssl-errors=true --ssl-protocol=tlsv1 PhantomRegisterTask.js ' 
    + job.buzzport_id + " " + job.buzzport_pass + " " + job.term + " " + job.crn;

  child = exec(execStatement,function (error, stdout, stderr) {});

  child.stdout.on("data", function(data) {
    if(data.indexOf("SUCCESS")>-1) {
      clearTimeout(killJob);  
      jobInProgress = false;  
      numConcurrentJobs--;      
      cb({status: "SUCCESS"}, job);
    }
    else if(data.indexOf("FAILURE")>-1) {
      clearTimeout(killJob);
      jobInProgress = false;            
      numConcurrentJobs--;      
      cb({status: "FAILURE"}, job);
    }
    else if(data.indexOf("INVALID_TERM_ERROR")>-1) {
      clearTimeout(killJob);
      jobInProgress = false;
      numConcurrentJobs--;              
      cb({status: "INVALID TERM ERROR\nYou don't have a time ticket for the term you signed up for."}, job);
    }    
    else if(data.indexOf("REGISTRATION_ERROR")>-1) {
      clearTimeout(killJob);
      jobInProgress = false;
      numConcurrentJobs--;                
      cb({status: "REGISTRATION ERROR\nThis means you can't register for the class for some reason\n"+
        "For specifics, log into BuzzPort and try to add the class to see what the error is."}, job);
    }
  });

  var killJob = setTimeout(function() {
    console.log("Max job time exceeded, sending SIGKILL to phantom..");
    child.kill('SIGKILL');
    jobInProgress = false;
    numConcurrentJobs--;    
    cb({status: "MAX_TIME_REACHED"}, job);
  }, maxWaitPeriod);
}

function execVerifyTask(job, cb) {
  jobInProgress = true;
  numConcurrentJobs++;  

  var maxWaitPeriod = 60000,
    child;

  child = exec('phantomjs PhantomVerifyTask.js ' + job.username + " " + job.password,
      function (error, stdout, stderr) {
      }
  );

  child.stdout.on("data", function(data) {
    // console.log(data);
    if(data.indexOf("VERIFICATION_SUCCESS")>-1) {
      clearTimeout(killJob);
      jobInProgress = false;
      numConcurrentJobs--;      
      cb({status: "SUCCESS"});
    }
    else if(data.indexOf("VERIFICATION_FAILURE")>-1) {
      clearTimeout(killJob);
      jobInProgress = false;
      numConcurrentJobs--;          
      cb({status: "FAILURE"});
    }
  });

  var killJob = setTimeout(function() {
    console.log("Max job time exceeded, sending SIGKILL to phantom..");
    child.kill('SIGKILL');
    jobInProgress = false;
    numConcurrentJobs--;
    cb({status: "MAX_TIME_REACHED"});    
  }, maxWaitPeriod);
}

module.exports = PhantomJobDispatcher;
