var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var hbs = require('hbs');

var MongoController = require('./MongoController.js');
var Mailer = require('./Mailer.js');
var Poller = require('./Poller.js');

//AWS Pub DNS
//http://ec2-54-234-151-220.compute-1.amazonaws.com

//*CONFIG
var mailerEmail = "tofubeast1111@gmail.com";
var mailerPass = "Vikram888";
var mongoConnectionUrl = 'mongodb://localhost/gtcw';

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
	res.render('about', {title:"About Me"});
});

//*WEBSOCKET HANDLING

// io.disable('heartbeats');
//io.set('transports', ['xhr-polling']);


if(!rejectRequests){
	io.sockets.on('connection', socketHandler);
}

function socketHandler(socket){
	socket.emit('connect_success', {hello:'world'});

	socket.on('makeRequest', function(data){
		myMongoController.createRequest(data.crn, data.email, data.term);
		myMailer.sendConfirmationMail(data.email, data.crn, false)
	});

	socket.on('makeSMSRequest', function(data){
		myMongoController.createSMSRequest(data.crn, data.email, data.gatewayedNumber, data.term);
		myMailer.sendConfirmationMail(data.email, data.crn, true)
	});
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

		springPoller = springTerm = null;
		rejectRequests = false;
	}else{
		rejectRequests = true;
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
