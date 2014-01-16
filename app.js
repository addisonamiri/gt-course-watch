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
var basePath = "/pls/bprod/bwckschd.p_disp_detail_sched?term_in=201402&crn_in=";
var mailerEmail = "tofubeast1111@gmail.com";
var mailerPass = "Vikram888";
var mongoConnectionUrl = 'mongodb://localhost/gtcw';

server.listen(process.env.PORT || 8080);

//*INITIALIZE CUSTOM MODULES

var myMailer = new Mailer(mailerEmail, mailerPass);
var myMongoController = new MongoController(mongoConnectionUrl);
var myPoller = new Poller(myMongoController, myMailer, basePath); 

//*CONSTANTS
var millisInSecond = 1000;

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

// app.get('/article/:id', function(req, res) {
// 	var entry = blogEngine.getBlogEntry(req.params.id);
// 	res.render('article',{title:entry.title, blog:entry});
// });


//*WEBSOCKET HANDLING

// io.disable('heartbeats');
//io.set('transports', ['xhr-polling']);

io.sockets.on('connection', socketHandler);

function socketHandler(socket){
	socket.emit('connect_success', {hello:'world'});

	socket.on('makeRequest', function(data){
		myMongoController.createRequest(data.crn, data.email);
		myMailer.sendConfirmationMail(data.email, data.crn,false)
		console.log(data.email);
		console.log(data.crn);
	});

	socket.on('makeSMSRequest', function(data){
		myMongoController.createSMSRequest(data.crn, data.email, data.gatewayedNumber);
		myMailer.sendConfirmationMail(data.email, data.crn, true)
		console.log(data.email);
		console.log(data.crn);
		console.log(data.gatewayedNumber);
	});
}

//*SCHEDULED JOBS

setInterval(function(){ 
	myPoller.pollAllSeats();
},millisInSecond*60);