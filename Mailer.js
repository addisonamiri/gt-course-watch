var nodemailer = require('nodemailer');

function Mailer(email, pass){
// create reusable transport method (opens pool of SMTP connections)
	this.emailID = email;
	this.emailPass = pass;
	
	this.smtpTransport = nodemailer.createTransport("SMTP",{
	    service: "Gmail",
	    auth: {
	        user: email,
	        pass: pass
	    }
	});

}

Mailer.prototype.sendGenericMail = function(email, subj, msg){
	var mailOptions = {
//	    from: "GT Course Watch Mailer ✔ <tofubeast1111@gmail.com>", // sender address
	    from: "GT Course Watch Mailer ✔ <"+ this.emailID +">", // sender address
	    to: email, // list of receivers: "bar@blurdybloop.com, baz@blurdybloop.com"
	    subject: subj, // Subject line
	    text: msg, // plaintext body
	    // html: "<b>Hello world ✔</b>" // html body
	}

	// send mail with defined transport object
	this.smtpTransport.sendMail(mailOptions, function(error, response){
	    if(error){
	        console.log(error);
	    }
	});		
}

Mailer.prototype.sendEmailVerification = function(email, link){
	var htmlBody = "<h1>Click the Link to Complete Verification </h1> <br> " +
	    	'<a href="' + link + '"> Verification Link </a>';

	console.log(htmlBody);

	var mailOptions = {
	    from: "GT Course Watch Mailer ✔ <"+ this.emailID +">", // sender address
	    to: email, // list of receivers: "bar@blurdybloop.com, baz@blurdybloop.com"
	    subject: "Email Verification", // Subject line
	    html: htmlBody
	}

	// send mail with defined transport object
	this.smtpTransport.sendMail(mailOptions, function(error, response){
	    if(error){
	        console.log(error);
	    }
	});		
}

Mailer.prototype.sendNotificationMail = function(existingRequest, smsRequest){

	// setup e-mail data with unicode symbols
	var mailOptions = {
//	    from: "GT Course Watch Mailer ✔ <tofubeast1111@gmail.com>", // sender address
	    from: "GT Course Watch Mailer ✔ <"+ this.emailID +">", // sender address
	    to: existingRequest.email, // list of receivers: "bar@blurdybloop.com, baz@blurdybloop.com"
	    subject: "Seat Open for Class: " + existingRequest.crn, // Subject line
	    text: "Registration Link: " + "https://buzzport.gatech.edu/cp/home/displaylogin", // plaintext body
	    // html: "<b>Hello world ✔</b>" // html body
	}

	// send mail with defined transport object
	this.smtpTransport.sendMail(mailOptions, function(error, response){
	    if(error){
	        console.log(error);
	    }
	    else{
	    	// console.log('email sent');
	        // console.log("Message sent: " + response.message);
	    }

	    // if you don't want to use this transport object anymore, uncomment following line
	    //smtpTransport.close(); // shut down the connection pool, no more messages
	});

	if(smsRequest){

		var smsMailOptions = {
	//	    from: "GT Course Watch Mailer ✔ <tofubeast1111@gmail.com>", // sender address
		    from: "GT Course Watch Mailer ✔ <"+ this.emailID +">", // sender address
		    to: existingRequest.gatewayedNumber, // list of receivers: "bar@blurdybloop.com, baz@blurdybloop.com"
		    subject: "Seat Open for Class: " + existingRequest.crn, // Subject line
		    text: "Registration Link: "+ "https://buzzport.gatech.edu/cp/home/displaylogin", // plaintext body
		    // html: "<b>Hello world ✔</b>" // html body
		}

		this.smtpTransport.sendMail(smsMailOptions, function(error, response){
		    if(error){
		        console.log(error);
		    }else{
		    	// console.log("texted");
		    }
		});


	}

}

Mailer.prototype.sendAutoRegSuccessMail = function(existingRequest){
	// setup e-mail data with unicode symbols
	var mailOptions = {
//	    from: "GT Course Watch Mailer ✔ <tofubeast1111@gmail.com>", // sender address
	    from: "GT Course Watch Mailer ✔ <"+ this.emailID +">", // sender address
	    to: existingRequest.email, // list of receivers: "bar@blurdybloop.com, baz@blurdybloop.com"
	    subject: "Registration Success CRN: " + existingRequest.crn, // Subject line
	    text: "The automatated system was able to successfully register you for your class!", // plaintext body
	    // html: "<b>Hello world ✔</b>" // html body
	}

	// send mail with defined transport object
	this.smtpTransport.sendMail(mailOptions, function(error, response){
	    if(error){
	        console.log(error);
	    }
	});	
}

Mailer.prototype.sendConfirmationMail = function sendConfirmationMail(requestEmail, requestCRN, smsRequest, autoRegReq){

    var bodyText="Your Requested Class: " + requestCRN + 
    (autoRegReq ? "\nYou signed up for automatic registration." : 
    	("\nSigned up for SMS notification: " + (smsRequest ? "yes" : "no") ) ) + 
    "\n\nThank you for using my service!";

	// setup e-mail data with unicode symbols
	var mailOptions = {
//	    from: "GT Course Watch Mailer ✔ <tofubeast1111@gmail.com>", // sender address
	    // from: "Confirmation @ GT Course Watch ✔ <"+ this.emailID +">", // sender address
	    from: "GT Course Watch Mailer ✔ <"+ this.emailID +">", // sender address
	    to: requestEmail, // list of receivers: "bar@blurdybloop.com, baz@blurdybloop.com"
	    subject: "Course Watch Confirmation for CRN: " + requestCRN, // Subject line
	    text: bodyText, // plaintext body
	    // html: "<b>Hello world ✔</b>" // html body
	}

	// send mail with defined transport object
	this.smtpTransport.sendMail(mailOptions, function(error, response){
	    if(error){
	        console.log(error);
	    }
	});
}

Mailer.prototype.contactMailJob = function(email, name, msg){

	    var bodyText="Name: " + name + 
	    "\nEmail: " + email + 
	    "\n\nMessage: " + msg;

	// setup e-mail data with unicode symbols
	var mailOptions = {
//	    from: "GT Course Watch Mailer ✔ <tofubeast1111@gmail.com>", // sender address
	    from: "CONTACT MESSAGE <tofubeast1111@gmail.com>", // sender address
	    to: this.emailID, // list of receivers: "bar@blurdybloop.com, baz@blurdybloop.com"
	    subject: "CONTACT MESSAGE FROM " + name, // Subject line
	    text: bodyText, // plaintext body
	}

	// send mail with defined transport object
	this.smtpTransport.sendMail(mailOptions, function(error, response){
	    if(error){
	        console.log(error);
	    }
	});


}

module.exports = Mailer;
