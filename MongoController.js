var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	bcrypt = require('bcrypt');

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

	this.autoRegReqSchema = mongoose.Schema({
		crn: String,
		email: String,
		term: String,
		buzzport_id: String,
		buzzport_pass: String,
		beingProcessed: String
	});

	this.confirmationStatSchema = mongoose.Schema({
		reg_reqs: Number,
		sms_reqs: Number,
		auto_reqs: Number
	});

	this.successStatSchema = mongoose.Schema({
		reg_reqs: Number,
		sms_reqs: Number,
		auto_reqs: Number
	});

	this.userSchema = mongoose.Schema({
		email: String,
		password_hash: String,
		uuid: String,
		activated: Boolean,
		reg_reqs: [],
		sms_reqs: [],
		auto_reqs: []
	})

	this.Request = mongoose.model('Request', this.requestSchema);
	this.smsRequest = mongoose.model('smsRequest', this.smsRequestSchema);
	this.autoRegReq = mongoose.model('autoRegReq', this.autoRegReqSchema);
	this.confirmationStat = mongoose.model('confirmationStat', this.confirmationStatSchema);
	this.successStat = mongoose.model('successStat', this.successStatSchema);
	this.user = mongoose.model('user', this.userSchema);

	this.myDB.once('open', function(){
		console.log('db successfully opened');
	});
}

MongoController.prototype.userAccessor = function (email, f){
	this.user.find({email:email},function(err, foundUser){
		if (err) return console.log('find user error: ' + err);
		if(!foundUser) return console.log('could not find user');
		f(foundUser);
	});
}

MongoController.prototype.createUser = function (email, password, uuid){
	var self = this;

	bcrypt.genSalt(10, function(err, salt) {
	    bcrypt.hash(password, salt, function(err, hash) {
	        // Store hash in your password DB.
			var newUser = new self.user({
				email: email,
				password_hash: hash,
				uuid: uuid,
				activated: false
			});

			newUser.save(function(err, doc){
				if(err) console.log('save error: ' + err);
			});
	    });
	});
}

MongoController.prototype.authenticate = function (email, password, next){

	this.user.findOne({email:email}, function(err, foundUser){
		if(err) return console.log("find user error: " + err);
		
		if(!foundUser) next(false, null);
		else{
			bcrypt.compare(password, foundUser.password_hash, function(err, authRes){
				if (err) return console.log('bcrypt compare error: ' + err);

				//authRes == true on match
				next(authRes, foundUser);
			});		
		}
	});
}

MongoController.prototype.changePassword = function(email, password){
	this.user.findOne({email:email}, function(err, user){
		if(err) return console.log("find user error: " + err);

		if(!user) return
		else{
			bcrypt.genSalt(10, function(err, salt) {
			    bcrypt.hash(password, salt, function(err, hash) {
			        // Store hash in your password DB.
			        user.password_hash = hash;
			        user.save();
			    });
			});
		}
	});
}

//STANDARD REQUEST
MongoController.prototype.createRequest = function (crnInput, emailInput, termInput, next){
	var newRequest = new this.Request({crn:crnInput,email:emailInput,term:termInput});

	newRequest.save(function(err, doc){
		if(err){
			console.log('save error:' + err);
		}else{
			next(doc);
		}
	});
}

//SMS REQUEST (same as standard with added sms capability)
MongoController.prototype.createSMSRequest = function createSMSRequest(crnInput, emailInput, gatewayedInput, termInput, next){
	var newSMSRequest = new this.smsRequest({crn:crnInput,email:emailInput,
		gatewayedNumber:gatewayedInput, term:termInput});
	
	newSMSRequest.save(function(err, doc){
		if(err){
			console.log('save error:' + err);
		}else{
			next(doc);
		}
	});
}

MongoController.prototype.createAutoRegReq = function(iCrn, iEmail, iTerm, iBuzzId, iBuzzPass, next){
	var newAutoRegReq = new this.autoRegReq({
			crn: iCrn,
			email: iEmail,
			term: iTerm,
			buzzport_id: iBuzzId,
			buzzport_pass: iBuzzPass,
			beingProcessed: "false"
		});

	newAutoRegReq.save(function(err, doc){
		if(err){
			console.log(err);
		}else{
			next(doc);
		}
	});
}

MongoController.prototype.createConfirmationStat = function (regular, sms, auto){
	var newStat = new this.confirmationStat({reg_reqs:regular,sms_reqs:sms,auto_reqs:auto});
	newStat.save(function(err, doc){
		if(err){
			console.log('save error:' + err);
		}
	});
}

MongoController.prototype.createSuccessStat = function (regular, sms, auto){
	var newStat = new this.successStat({reg_reqs:regular,sms_reqs:sms,auto_reqs:auto});
	newStat.save(function(err, doc){
		if(err){
			console.log('save error:' + err);
		}
	});
}

//delete reqs from last yr.
MongoController.prototype.cleanExpiredReqs = function(){
	var d = new Date();
	var yr = (d.getFullYear() - 1).toString();

	var regex = new RegExp(".*" + yr + ".*");

	this.autoRegReq.find( { term: regex }, helper );
	this.Request.find( { term: regex }, helper );
	this.smsRequest.find( { term: regex }, helper );

	function helper(err, foundReqs){
		if(err) console.log(err);

		foundReqs.forEach(function(e){
			e.remove();
		});
	}
}


module.exports = MongoController;







