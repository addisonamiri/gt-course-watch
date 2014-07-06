var express = require('express');
var app = express();
var server = require('http').createServer(app).listen(process.env.PORT || 8080);
var io = require('socket.io').listen(server);
var hbs = require('hbs');
var fs = require('fs');

var MongoController = require('./MongoController.js');
var Mailer = require('./Mailer.js');
var Poller = require('./Poller.js');
var PhantomJobDispatcher = require('./PhantomJobDispatcher.js');

//AWS Pub DNS
//http://ec2-54-234-151-220.compute-1.amazonaws.com

// var https_opts = {
// 	key: fs.readFileSync("/home/ec2-user/ssl_key.pem").toString(),
// 	cert: fs.readFileSync("/home/ec2-user/certs/www_gtcoursewatch_us.crt").toString(),
// 	ca: [
// 		fs.readFileSync("/home/ec2-user/certs/AddTrustExternalCARoot.crt").toString(),
// 		fs.readFileSync("/home/ec2-user/certs/COMODORSAAddTrustCA.crt").toString(),
// 		fs.readFileSync("/home/ec2-user/certs/COMODORSADomainValidationSecureServerCA.crt").toString()
// 	]
// }
// var secureServer = require('https').createServer(app, https_opts).listen(443);

//*CONFIG
var mailerEmail = "tofubeast1111@gmail.com";
var mailerPass = "Vikram888";
var mongoConnectionUrl = 'mongodb://localhost/gtcw';
// var hostName = "http://www.gtcoursewatch.us";
var hostName = "http://localhost:8080";

var THROTTLE_DELAY_SECS = 8;

//*CONSTANTS
var millisInSecond = 1000;
var millisInMinute = millisInSecond*60;
var millisInHour = millisInMinute*60;
var millisInDay = millisInHour*24;

//*INITIALIZE CUSTOM MODULES
var myMailer = new Mailer(mailerEmail, mailerPass);
var myMongoController = new MongoController(mongoConnectionUrl);
var myDispatcher = new PhantomJobDispatcher( myMailer, myMongoController);
myDispatcher.startDispatcher(2000);

var springPoller, fallPoller, summerPoller; //pollers
var pollers; //collection of json objects

var springTerm, fallTerm, summerTerm; //string ids of current terms, also used to tell which terms to poll

var rejectRequests = false;

initPollers();

console.log('Spring Null? ' + (pollers['spring']==null).toString());
console.log('Fall Null? ' + (pollers['fall']==null).toString());
console.log('Summer Null? ' + (pollers['summer']==null).toString());

//*Express Config
app.use(express.cookieParser());
var sessionStore = new express.session.MemoryStore; //equivalent to new express.session.MemoryStore()
app.use(express.session({secret:"blahblabhla", store:sessionStore}));


app.configure(function(){
	//middleware + res.locals
  app.use(function(req, res, next){
    res.locals.username = req.session.username;
    next();
  });

  //my implementation of flash
  app.use(function(req, res, next){
    res.locals.success_flash = req.session.success_flash;
    res.locals.warning_flash = req.session.warning_flash;
    res.locals.danger_flash = req.session.danger_flash;
    req.session.success_flash = null;
    req.session.warning_flash = null;
    req.session.danger_flash = null;
    next();
  });
});

app.set('view engine', 'html');
app.engine('html', hbs.__express);

app.use(express.bodyParser());
app.use(app.router);
app.use(express.static('public'));

//username and email are synonymous through this application


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
						fallLabel: fallLabel
					});
});

app.get('/about', function(req, res) {
	res.render('about', {title:"About"});
});

app.post('/verifyBuzzport', function(req, res){
	var post = req.body;

	myDispatcher.addVerifyTaskToQueue(
		{	
			username: post.username, 
			password:post.password 
		}, 
		function(status){
			console.log(status);
			res.json({status: status});
		}
	);
});

app.post('/autoRegReq', function(req, res){
	var post = req.body;
	post.term = post.term.replace(' ', '-');

	var user = req.session.username;

	if(user){
		myMongoController.createAutoRegReq(post.crn, post.email, post.term, post.username, post.password, function(doc){

			myMongoController.userAccessor(user, function(user_arr){
				user_arr[0].auto_reqs.push(doc._id);				
				user_arr[0].save();
			});

			myMongoController.createConfirmationStat(0,0,1);
			myMailer.sendConfirmationMail(post.email, post.crn, false, true);
		});	

		res.json({status: "SUCCESS"});
	}else{
		res.json({status: "NOT_LOGGED_IN"});
	}
});

app.post('/reg_req_sub', function(req, res){
	var post = req.body;

	myMongoController.createRequest(post.crn, post.email, post.term, function(doc){
		var user = req.session.username;

		if(user){
			myMongoController.userAccessor(user, function(user_arr){
				user_arr[0].reg_reqs.push(doc._id);				
				user_arr[0].save();
			});
		}

		myMailer.sendConfirmationMail(post.email, post.crn, false, false);
		myMongoController.createConfirmationStat(1,0,0);

		res.json({status: "SUCCESS"});
	});
});

app.post('/sms_req_sub', function(req, res){
	var post = req.body;

	myMongoController.createSMSRequest(post.crn, post.email, post.gatewayedNumber, post.term, function(doc){
		var user = req.session.username;

		if(user){
			myMongoController.userAccessor(user, function(user_arr){
				user_arr[0].sms_reqs.push(doc._id);				
				user_arr[0].save();	
			});
		}

		myMailer.sendConfirmationMail(post.email, post.crn, true, false);
		myMongoController.createConfirmationStat(0,1,0);

		res.json({status: "SUCCESS"});
	});
});


//Throttle
app.get('/getTimeoutStatus', function(req, res){
	var TIMEOUT = THROTTLE_DELAY_SECS*millisInSecond; // 15 sec

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
				termPoller.getSeatStats(req.params.crn, function(crn, result){
					result['numWatchers'] = requests.length + smsRequests.length;
					res.send(result);
				});
			}else{
				res.send("bad req");
			}			

		});
	});
});

app.get('/verifyCRN/:crn/:term', function(req, res){
	var pollers = getActivePollers();
	var termPoller;

	for(var i in pollers){
		if(pollers[i].term == req.params.term){
			termPoller = pollers[i];
		}
	}

	if(termPoller){
		termPoller.getSeatStats(req.params.crn, function(crn, result){
			if(result.hasOwnProperty('remaining')){
				res.send({verification_status:1})
			}else{
				res.send({verification_status:0})
			}
		});
	}else{
		res.send({verification_status:0})
	}
});

//Account Related Stuffs.
app.get('/verifyEmail', function(req, res){
	var email = req.query.email,
		uuid = req.query.uuid;

	myMongoController.userAccessor(email, function(user_arr){
		var user = user_arr[0];

		if(user.uuid == uuid){
			if(user.activated == true){
				req.session.warning_flash = "Your account has already been activated"
				res.redirect('/');
				return
			}
			user.activated = true;
			user.save();
			req.session.success_flash = "Account activated!"
			res.redirect('/');
		}else{
			req.session.danger_flash = "Account activation failed"
			res.redirect('/');
		}
	});
});

app.get('/sign_up', function(req, res){
	//pass param user: req.session.username
	res.render('sign_up',{title:"Sign Up"});
});

app.post('/create_account', function(req, res){
	// myMongoController.createUser("jo@jo.com", "password", "uuid");
	var post = req.body;

	var email = post.email,
		password = post.password,
		password_conf = post.password_conf;

	if(password != password_conf){
		req.session.danger_flash = "Passwords did not match!";
		res.redirect('back');
	}else if(password.length < 6){
		req.session.danger_flash = "Password must be at least 6 characters in length";
		res.redirect('back');		
	}
	else if(!isEmail(email)){
		req.session.danger_flash = "Invalid email format!";
		res.redirect('back');
	}
	else{ // valid credentials
		myMongoController.userAccessor(email, function(user_arr){
			if(user_arr.length > 0){
				req.session.danger_flash = "That e-mail address has already been taken"
				res.redirect('back');
			}else{
				var uuid=generateUUID(),
					emailLink = generateEmailVerificationURL(email, uuid);

				myMongoController.createUser(email, password, uuid);
				myMailer.sendEmailVerification(email, emailLink);

				req.session.success_flash = 'You have successfully signed up, now you need to verify your email';
				res.redirect('/');
			}
		});
	}
});

app.get('/log_in', function(req, res){
	res.render('login',{title:"Login"});
});

app.post('/login_auth', function(req, res){
	var user = req.body.email;
	var pass = req.body.password;

	myMongoController.authenticate(user, pass, function(authRes, foundUser){
		if(authRes == true){
			if(foundUser.activated == false){
				req.session.warning_flash = "You need to activate your account from your e-mail before you can log in"
				res.send({redirect: '/log_in'});
			}else{
				req.session.username = user;
				req.session.success_flash = "You have successfully logged in"

				res.send({redirect: '/'});				
			}

		}else{
			res.set('Content-Type', 'text/plain');
			res.send(authRes);
		}
	});
});

app.get('/logout', checkAuth, function(req, res){
	req.session.destroy();
	res.redirect('/');
});

app.get('/my_account', checkAuth, function(req, res){
	var username = req.session.username;

	myMongoController.userAccessor(username, function(user_arr){
		res.render('settings', {user:user_arr[0]});
	});
});

app.post('/change_password', checkAuth, function(req, res){
	var post = req.body,
		password = post.password,
		password_conf = post.password_conf;

	if(password != password_conf){
		req.session.danger_flash = "Passwords did not match!";
		res.redirect('back');
	}else if(password.length < 6){
		req.session.danger_flash = "Password must be at least 6 characters in length";
		res.redirect('back');		
	}else{ //success
		myMongoController.changePassword(req.session.username, password);
		req.session.success_flash = "Password changed successfully"
		res.redirect('back');
	}
});

app.get('/my_requests', checkAuth, function(req, res){
	myMongoController.userAccessor(req.session.username, function(user_arr){
		var user = user_arr[0],
			reg_reqs,
			sms_reqs,
			auto_reqs;

		find_reqs(user.reg_reqs, myMongoController.Request, function(result){
			reg_reqs = result;
			find_reqs(user.sms_reqs, myMongoController.smsRequest, function(result){
				sms_reqs = result;
				find_reqs(user.auto_reqs, myMongoController.autoRegReq, function(result){
					auto_reqs = result;

					res.render('my_requests', {
						sms_reqs: sms_reqs,
						email_reqs: reg_reqs,
						auto_reqs: auto_reqs
					});
				});
			});
		});

		function find_reqs(collection, model, next){
			var result = [];
			var collection = collection;
			var model = model;
			var requests_remaining = collection.length;

			if( requests_remaining > 0){
				for(var i in collection){
					var id = collection[i]
					model.findById(id, function(err, doc){
						result.push(doc);
					
						requests_remaining--;
						if(requests_remaining == 0){ //only the last executed async call will meet this condition.
							next(result);
						}
					});
				}
			}else{
				next(result);
			}
		}

	});
});

app.get('/cancel_req/:type/:id', checkAuth, function(req, res){
	var id = req.params.id,
		type = req.params.type;

	switch(type) {
		case "EMAIL":
			myMongoController.Request.findOneAndRemove(id);
			break;
		case "SMS":
			myMongoController.smsRequest.findOneAndRemove(id);
			break;
		case "AUTOMATED":
			myMongoController.autoRegReq.findOneAndRemove(id);
			break;
		default:
			console.log("Cancellation error... No type matched.");
	}
});


//*WEBSOCKET HANDLING

// io.disable('heartbeats');
//io.set('transports', ['xhr-polling']);

// io.sockets.on('connection', socketHandler);

function socketHandler(socket){
	socket.emit('message', {message:'WebSocket connection established; Welcome to the chat!'});

	socket.on('sendMessage', function(data){
		io.sockets.emit('message', data);
	});

	socket.on('contactReq', function(data){
		myMailer.contactMailJob(data.email, data.name, data.message);
	})
}

//figure out what terms are open presently and initalize pollers for them.
function initPollers(){
	var d =  new Date();
	var pathComponents= ['/pls/bprod/bwckschd.p_disp_detail_sched?term_in=','4digityear','2digitmonth','&crn_in='];
	var month = d.getMonth();
	var year; //can't initalize due to spring edge cases
	var atLeastOnePoller = false;

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
		springPoller = new Poller(myMongoController, myMailer, springBasePath, springTerm, myDispatcher);

		summerPoller = fallPoller = summerTerm = fallTerm = null;
		atLeastOnePoller = true;
	}else if(month>=2){
		//summer and fall
		year = pathComponents[1] = d.getFullYear();

		//summer check
		if(month <= 5){
			summerTerm = 'summer' + year.toString();
			pathComponents[2] = '05';
			var summerBasePath = pathComponents.join('');
			summerPoller = new Poller(myMongoController, myMailer, summerBasePath, summerTerm, myDispatcher);
			atLeastOnePoller = true;
		}else{
			summerTerm = summerPoller = null;
		}

		//fall check
		if(month <=8){
			fallTerm = 'fall' + year.toString();
			pathComponents[2] = '08';
			var fallBasePath = pathComponents.join('');
			fallPoller = new Poller(myMongoController, myMailer, fallBasePath, fallTerm, myDispatcher);
			atLeastOnePoller = true;
		}else{
			fallTerm = fallPoller = null;
		}

		springPoller = springTerm = null;
	}else if(!atLeastOnePoller){
		//hibernation months, accept or process no requests, no labels for term selection either
		rejectRequests = true;
		springPoller = fallPoller = summerPoller = springTerm =
		summerTerm = fallTerm = null;
	}

	if(atLeastOnePoller) rejectRequests = false;

	pollers = {spring:springPoller, summer:summerPoller, fall:fallPoller};
}

//get all pollers for current school-terms.
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

function checkAuth(req, res, next) {
  if (!req.session.username) {
	req.session.danger_flash = "You must be logged in to perform that action";
	res.redirect('/');
  } else {
    next();
  }
}

//periodically access unused sessions so that they are expired by Express.
function sessionCleanup() {
    sessionStore.all(function(err, sessions) {
        for (var i = 0; i < sessions.length; i++) {
            sessionStore.get(sessions[i], function() {} );
        }
    });
}

function generateUUID(){
	return 	'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	    return v.toString(16);
	});	
}

function generateEmailVerificationURL(email, uuid){
	return hostName+"/verifyEmail?email=" +
	email + "&uuid=" + uuid;
}

//create labels for front-end term selectors
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

function isEmail(email) {
	var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
	return regex.test(email);
}

//*SCHEDULED JOBS

//re-init pollers every day in the event of new term
setInterval(function(){
	initPollers();
	myMongoController.cleanExpiredReqs();
	sessionCleanup();
}, millisInDay)

//polling job
setInterval(function(){
	for (var key in pollers) {
		if (pollers.hasOwnProperty(key)) {
			//alert(key + " -> " + p[key]);
			if(pollers[key]) pollers[key].pollAllSeats();
		}
	}
}, 2*millisInMinute); //*millisInMinute
