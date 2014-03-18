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
var basePath = null;
var mailerEmail = "tofubeast1111@gmail.com";
var mailerPass = "Vikram888";
var mongoConnectionUrl = 'mongodb://localhost/gtcw';

server.listen(process.env.PORT || 8080);

//*CONSTANTS
var millisInSecond = 1000;

//*INITIALIZE CUSTOM MODULES
var myMailer = new Mailer(mailerEmail, mailerPass);
var myMongoController = new MongoController(mongoConnectionUrl);
var myPoller = new Poller(myMongoController, myMailer, basePath); 


var summerBasePath = 'pls/bprod/bwckschd.p_disp_detail_sched?term_in=201405&crn_in='; 
var summerTerm = "summer2014";
var summerPoller = new Poller(myMongoController, myMailer, summerBasePath, summerTerm);

var fallBasePath = '/pls/bprod/bwckschd.p_disp_detail_sched?term_in=201408&crn_in=';
var fallTerm = "fall2014";
var fallPoller = new Poller(myMongoController, myMailer, fallBasePath, fallTerm);

var springBasePath = null;
var springTerm = null;
var springPoller = new Poller(myMongoController, myMailer, springBasePath, springTerm);


//input term, scheduling jobs.

var pollerStatuses = {spring:springTerm, fall:fallTerm, summer:summerTerm};
var pollers = {spring:springPoller, summer:summerPoller, fall:fallPoller};

//*ROUTING

app.set('view engine', 'html');
app.engine('html', hbs.__express);

app.use(express.bodyParser());
app.use(express.static('public'));

app.get('/', function(req, res) {
	res.render('index',{title:"Home"});
});

app.get('/about', function(req, res) {
	res.render('about', {title:"About"});
});

//*WEBSOCKET HANDLING

// io.disable('heartbeats');
//io.set('transports', ['xhr-polling']);

io.sockets.on('connection', socketHandler);

function socketHandler(socket){
	socket.emit('connect_success', {hello:'world'});

	socket.on('makeRequest', function(data){
		myMongoController.createRequest(data.crn, data.email, data.term);
		myMailer.sendConfirmationMail(data.email, data.crn, false)
		console.log(data.term);
	});

	socket.on('makeSMSRequest', function(data){
		myMongoController.createSMSRequest(data.crn, data.email, data.gatewayedNumber, data.term);
		myMailer.sendConfirmationMail(data.email, data.crn, true)
		console.log(data.term);
	});
}



//*SCHEDULED JOBS

setInterval(function(){

	for (var key in pollers) {
		if (pollers.hasOwnProperty(key)) {
			//alert(key + " -> " + p[key]);
			if(pollerStatuses[key] != null) pollers[key].pollAllSeats();
		}
	}

},millisInSecond*60);
