var mongoose = require('mongoose');

//
// MONGO SETUP
//

function MongoController(url){
	var connectionURL = url;

	mongoose.connect(connectionURL);

	this.myDB = mongoose.connection;
	this.myDB.on('error', console.error.bind(console, 'connection error'));

	//investigate why closure with self wont work..

	this.requestSchema = mongoose.Schema({
		crn: String,
		email: String,
		term: String
	});

	this.smsRequestSchema = mongoose.Schema({
		crn: String,
		email: String,
		gatewayedNumber: String,
		term: String
	});

	this.Request = mongoose.model('Request', this.requestSchema);
	this.smsRequest = mongoose.model('smsRequest', this.smsRequestSchema);

	this.myDB.once('open', function(){
		console.log('db successfully opened');
	});
}

//STANDARD REQUEST
MongoController.prototype.createRequest = function createRequest(crnInput, emailInput, termInput){
	var newRequest = new this.Request({crn:crnInput,email:emailInput,term:termInput});
	newRequest.save(function(err, newRequest){
		if(err){
			console.log('save error:' + err);
		}
	});
}

//SMS REQUEST (same as standard with added sms capability)
MongoController.prototype.createSMSRequest = function createSMSRequest(crnInput, emailInput, gatewayedInput, termInput){
	var newSMSRequest = new this.smsRequest({crn:crnInput,email:emailInput,
		gatewayedNumber:gatewayedInput, term:termInput});
	
	newSMSRequest.save(function(err, newSMSRequest){
		if(err){
			console.log('save error:' + err);
		}
	});
}

module.exports = MongoController;







