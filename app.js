var express = require('express');
var app = express();
var server = require('http').createServer(app);
var socketio = require('socket.io').listen(server);
var hbs = require('hbs');
var mongoose = require('mongoose');
var cheerio = require('cheerio');
var https = require('https');
var nodemailer = require('nodemailer');

server.listen(process.env.PORT || 4000);
//server.listen(80);

var basePath = "/pls/bprod/bwckschd.p_disp_detail_sched?term_in=201402&crn_in=";
var millisInSecond = 1000;

//
// MONGO SETUP
//

mongoose.connect('mongodb://localhost/gtcw');

var db = mongoose.connection;
var requestSchema;
var Request;

db.on('error', console.error.bind(console, 'connection error'));
db.once('open', initDB);

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

// socketio.disable('heartbeats');
socketio.sockets.on('connection', socketHandler);

function socketHandler(socket){

	socket.emit('connect_success', {hello:'world'});

	socket.on('makeRequest', function(data){
		createRequest(data.crn, data.email);
		console.log(data.email);
		console.log(data.crn);
	});
}

function initDB(){
	console.log('db open');
	requestSchema = mongoose.Schema({
		crn: String,
		email: String
	});

	Request = mongoose.model('Request', requestSchema);
	setInterval(pollAllSeats,millisInSecond*60);
}

function createRequest(crnInput, emailInput){
	var newRequest = new Request({crn:crnInput,email:emailInput});
	newRequest.save(function(err, newRequest){
		if(err){
			console.log('save error:' + err);
		}
	});
}

function pollAllSeats(){
	console.log("polling...");

	Request.find(function(err, requestPool){
		if(err){
			console.log(err);
		}

		for (requestIdx in requestPool) {
			var currRequest = requestPool[requestIdx];
			scrapeSeats(currRequest, checkSeats);
		}

	});
}

function scrapeSeats(existingRequest, checkSeatsCallback){

	var path = buildPath(existingRequest.crn);

	var options = {
	  hostname: 'oscar.gatech.edu',
	  port: 443,
	  path: path,
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
		    		checkSeatsCallback(remainingSeats, existingRequest);
		    	}
		    });

		});

	});

	req.end();

	req.on('error', function(e) {
	  console.error(e);
	});

}

// create reusable transport method (opens pool of SMTP connections)
var smtpTransport = nodemailer.createTransport("SMTP",{
    service: "Gmail",
    auth: {
        user: "tofubeast1111@gmail.com",
        pass: "Vikram888"
    }
});

function checkSeats(numSeats, existingRequest){
	if(numSeats > 0){
		// console.log('there is a seat open! ' + numSeats);

		// setup e-mail data with unicode symbols
		var mailOptions = {
		    from: "GT Course Watch Mailer ✔ <tofubeast1111@gmail.com>", // sender address
		    to: existingRequest.email, // list of receivers: "bar@blurdybloop.com, baz@blurdybloop.com"
		    subject: "Seat Open for Class: " + existingRequest.crn, // Subject line
		    text: "Rapido!", // plaintext body
		    // html: "<b>Hello world ✔</b>" // html body
		}

		// send mail with defined transport object
		smtpTransport.sendMail(mailOptions, function(error, response){
		    if(error){
		        console.log(error);
		    }
		    // else{
		    //     console.log("Message sent: " + response.message);
		    // }

		    // if you don't want to use this transport object anymore, uncomment following line
		    //smtpTransport.close(); // shut down the connection pool, no more messages
		});

		existingRequest.remove();
	}else{
		// console.log('there are no seats open currently' + numSeats);
	}
}

function buildPath(crn){
	//format : /pls/bprod/bwckschd.p_disp_detail_sched?term_in=201402&crn_in=
	return basePath + crn
}
