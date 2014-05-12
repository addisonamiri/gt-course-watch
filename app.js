var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var hbs = require('hbs');
var exec = require('child_process').exec,
    child;

var MongoController = require('./MongoController.js');
var Mailer = require('./Mailer.js');
var Poller = require('./Poller.js');

//AWS Pub DNS
//http://ec2-54-234-151-220.compute-1.amazonaws.com

//*CONFIG
var mailerEmail = "tofubeast1111@gmail.com";
var mailerPass = "Vikram888";
var mongoConnectionUrl = 'mongodb://localhost/gtcw';


app.use(express.cookieParser());
var store = new express.session.MemoryStore;
app.use(express.session({secret:"blahblabhla", store:store}));

server.listen(process.env.PORT || 8080);

//*CONSTANTS
var millisInSecond = 1000;
var millisInMinute = millisInSecond*60;
var millisInHour = millisInMinute*60;
var millisInDay = millisInHour*24;

//*INITIALIZE CUSTOM MODULES
var myMailer = new Mailer(mailerEmail, mailerPass);
var myMongoController = new MongoController(mongoConnectionUrl);

var springPoller, fallPoller, summerPoller; //pollers
var pollers; //collection of json objects

var springTerm, fallTerm, summerTerm; //string ids of current terms, also used to tell which terms to poll

var rejectRequests = false;

initPollers();

console.log('Spring Null? ' + (pollers['spring']==null).toString());
console.log('Fall Null? ' + (pollers['fall']==null).toString());
console.log('Summer Null? ' + (pollers['summer']==null).toString());

//*ROUTING

app.set('view engine', 'html');
app.engine('html', hbs.__express);

app.use(express.bodyParser());
app.use(express.static('public'));

app.post('/verifyBuzzport', function(req, res){
	var post = req.body;
	// console.log(post);

	child = exec('phantomjs PhantomVerifyTask.js ' + post.username + " " + post.password,
	    function (error, stdout, stderr) {
	    }
	);

	child.stdout.on("data", function(data){
		if(data.indexOf("VERIFICATION_SUCCESS")>-1){
			res.send({status: "success"});
		}else{
			res.send({status: "failure"});
		}
	});
});

app.post('/autoRegReq', function(req, res){
	var post = req.body;
	console.log(post);
	
	post.term = post.term.replace(' ', '-');
	var execStatement = 'phantomjs --ignore-ssl-errors=true --ssl-protocol=tlsv1 PhantomRegisterTask.js ' 
		+ post.username + " " + post.password + " " + post.term + " " + post.crn;

	console.log(execStatement);

	child = exec(execStatement,function (error, stdout, stderr) {
		console.log(stdout);
	});

	child.stdout.on("data", function(data){
		if(data.indexOf("SUCCESS")>-1){
			res.send({status: "success"});
		}else{
			res.send({status: "failure"});
		}
	});	

});

app.get('/', function(req, res) {
	var springLabel, summerLabel, fallLabel;

	if(springTerm) springLabel = createLabel(springTerm);
	if(summerTerm) summerLabel = createLabel(summerTerm);
	if(fallTerm) fallLabel = createLabel(fallTerm);

	res.render('index',{title:"Home", 
						spring:springTerm, 
						summer:summerTerm, 
						fall:fallTerm,
						springLabel: springLabel,
						summerLabel: summerLabel,
						fallLabel: fallLabel});
});

app.get('/about', function(req, res) {
	res.render('about', {title:"About"});
});

app.get('/getTimeoutStatus', function(req, res){
	var TIMEOUT = 15*millisInSecond; // 15 sec

	if(req.session.throttleTime == null){
		//initial hit
		req.session.throttleTime = Date.now();
		res.json({status:"good"});
	}else{
		//check if timeoout is up
		var timeDelta = Date.now() - req.session.throttleTime;
		if( timeDelta < TIMEOUT){
			//send bad resonse
			res.json({status:"bad", timeLeft: (TIMEOUT-timeDelta)/1000});
		}else{
			//send good response
			req.session.throttleTime = Date.now();
			res.json({status:"good"})
		}
	}

});

app.get('/getNumWatchers/:crn', function(req, res){
	myMongoController.Request.find({crn:req.params.crn}, function(err, requests){
		myMongoController.smsRequest.find({crn:req.params.crn}, function(err, smsRequests){
			res.json({numWatchers:smsRequests.length + requests.length - 1});
		});
	});
});

app.get('/getStats/:crn/:term', function(req, res){
	myMongoController.Request.find({crn:req.params.crn}, function(err, requests){
		myMongoController.smsRequest.find({crn:req.params.crn}, function(err, smsRequests){
			var pollers = getActivePollers();
			var termPoller;

			for(var i in pollers){
				if(pollers[i].term == req.params.term){
					termPoller = pollers[i];
				}
			}

			if(termPoller){
				termPoller.getSeatStats(req.params.crn, function(result){
					result['numWatchers'] = requests.length + smsRequests.length;
					console.log(result["remaining"]);
					res.send(result);
				});
			}else{
				res.send("bad req");
			}			

		});
	});
});

//*WEBSOCKET HANDLING

// io.disable('heartbeats');
//io.set('transports', ['xhr-polling']);

io.sockets.on('connection', socketHandler);

function socketHandler(socket){
	socket.emit('message', {message:'Welcome to the chat!'});

	socket.on('sendMessage', function(data){
		io.sockets.emit('message', data);
	});

	socket.on('contactReq', function(data){
		myMailer.contactMailJob(data.email, data.name, data.message);
	})

	socket.on('makeRequest', function(data){
		myMongoController.createRequest(data.crn, data.email, data.term);
		myMailer.sendConfirmationMail(data.email, data.crn, false);
	});

	socket.on('makeSMSRequest', function(data){
		myMongoController.createSMSRequest(data.crn, data.email, data.gatewayedNumber, data.term);
		myMailer.sendConfirmationMail(data.email, data.crn, true);
	});
}

function processRegularRequest(){
	myMongoController.createRequest(data.crn, data.email, data.term);
	myMailer.sendConfirmationMail(data.email, data.crn, false);
}

function processSMSRequest(){
	data.gatewayedNumber = data.gatewayedNumber.replace('-','').replace('.',''); //remove dashes
	myMongoController.createSMSRequest(data.crn, data.email, data.gatewayedNumber, data.term);
	myMailer.sendConfirmationMail(data.email, data.crn, true);	
}

function initPollers(){
	var d = new Date();
	var pathComponents= ['/pls/bprod/bwckschd.p_disp_detail_sched?term_in=','4digityear','2digitmonth','&crn_in='];
	var month = d.getMonth();
	var year; //can't initalize due to spring edge cases

	console.log('init pollers, for date:' + d );

	if(month>=9 || month<=0){
		//spring registration
		fallTerm = summerTerm = null;

		if(month == 0) year = pathComponents[1] = d.getFullYear();
		else year = pathComponents[1] = d.getFullYear()+1;

		springTerm = 'spring'+ year.toString();
		pathComponents[2] = '02';
		var springBasePath = pathComponents.join('');
		console.log(springBasePath);
		springPoller = new Poller(myMongoController, myMailer, springBasePath, springTerm);

		summerPoller = fallPoller = summerTerm = fallTerm = null;
		rejectRequests = false;
	}else if(month>=2 && month<=7){
		//summer and fall
		year = pathComponents[1] = d.getFullYear();

		fallTerm = 'fall' + year.toString();
		pathComponents[2] = '08';
		var fallBasePath = pathComponents.join('');
		fallPoller = new Poller(myMongoController, myMailer, fallBasePath, fallTerm);

		summerTerm = 'summer' + year.toString();
		pathComponents[2] = '05';
		var summerBasePath = pathComponents.join('');
		summerPoller = new Poller(myMongoController, myMailer, summerBasePath, summerTerm);

		console.log(fallBasePath);
		console.log(summerBasePath);

		springPoller = springTerm = null;
		rejectRequests = false;
	}else{
		//hibernation months, accept or process no requests, no labels for term selection either
		rejectRequests = true;
		springPoller = fallPoller = summerPoller = springTerm =
		summerTerm = fallTerm = null;
	}

	pollers = {spring:springPoller, summer:summerPoller, fall:fallPoller};
}

function createLabel(term){
	var length = term.length;
	var year = term.slice(length-4,length);
	var season = term.slice(0,length-4);
	season = capitalizeFirstLetter(season);
	return season + " " + year;
}

function capitalizeFirstLetter(string){
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function getActivePollers(){
	var result = [];

	for (var key in pollers) {
		if (pollers.hasOwnProperty(key)) {
			//alert(key + " -> " + p[key]);
			if(pollers[key]){
				result.push(pollers[key]);
			}
		}
	}

	return result;
}

//*SCHEDULED JOBS

//re-init pollers every day in the event of new term
setInterval(function(){
	initPollers();
}, millisInDay)

//polling job
setInterval(function(){
	for (var key in pollers) {
		if (pollers.hasOwnProperty(key)) {
			//alert(key + " -> " + p[key]);
			if(pollers[key]) pollers[key].pollAllSeats();
		}
	}
}, 2*millisInMinute);
