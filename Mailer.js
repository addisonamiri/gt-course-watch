var nodemailer = require('nodemailer');

//for gmail, opts={service:'gmail', pass:'pass'}
//for ses, opts={service:'ses', id:'aws_id', sekret: 'aws_secret'}
function Mailer(email, opts) {
  this._emailID = email;
  switch(opts.service) {
    case "gmail":
      this._smtpTransport = nodemailer.createTransport("SMTP",{
          service: "gmail",
          auth: {
              user: email,
              pass: opts.pass
          }
      });  
      break;
    case "ses":
      this._smtpTransport = nodemailer.createTransport("SES", {
          AWSAccessKeyID: opts.id,
          AWSSecretKey: opts.sekret
      });
      break;
    default:
      break;
  }
}

Mailer.prototype.sendGenericMail = function(email, subj, msg) {
  var mailOptions = {
      from: "GT Course Watch Mailer ✔ <"+ this._emailID +">", // sender address
      to: email, // list of receivers: "bar@blurdybloop.com, baz@blurdybloop.com"
      subject: subj, // Subject line
      text: msg // plaintext body
      // html: "<b>Hello world ✔</b>" // html body
  }

  // send mail with defined transport object
  this._smtpTransport.sendMail(mailOptions, function(error, response) {
      if(error) console.log(error);
      // if you don't want to use this transport object anymore, uncomment following line
      //_smtpTransport.close(); // shut down the connection pool, no more messages  
  });    
}

Mailer.prototype.sendEmailVerification = function(email, link) {
  var htmlBody = "<h1>Click the Link to Complete Verification </h1> <br> " +
        '<a href="' + link + '"> Verification Link </a>';

  var mailOptions = {
      from: "GT Course Watch Mailer ✔ <"+ this._emailID +">", // sender address
      to: email, // list of receivers: "bar@blurdybloop.com, baz@blurdybloop.com"
      subject: "Email Verification", // Subject line
      html: htmlBody
  }

  this._smtpTransport.sendMail(mailOptions, function(error, response) {
      if(error) console.log(error);
  });
}

Mailer.prototype.sendPassChangeVerification = function(email, link) {
  var htmlBody = "<h1>Click the Link to Change Your Password </h1> <br> " +
        '<a href="' + link + '"> Change Password </a>';

  var mailOptions = {
      from: "GT Course Watch Mailer ✔ <"+ this._emailID +">", // sender address
      to: email, // list of receivers: "bar@blurdybloop.com, baz@blurdybloop.com"
      subject: "Change Password", // Subject line
      html: htmlBody
  }

  this._smtpTransport.sendMail(mailOptions, function(error, response) {
      if(error) console.log(error);
  });    
}

Mailer.prototype.sendNotificationMail = function(existingRequest, smsRequest) {

  var mailOptions = {
      from: "GT Course Watch Mailer ✔ <"+ this._emailID +">", // sender address
      to: existingRequest.email, // list of receivers: "bar@blurdybloop.com, baz@blurdybloop.com"
      subject: "Seat Open for Class: " + existingRequest.crn, // Subject line
      text: "Registration Link: " + "https://buzzport.gatech.edu/cp/home/displaylogin", // plaintext body
      // html: "<b>Hello world ✔</b>" // html body
  }

  this._smtpTransport.sendMail(mailOptions, function(error, response) {
      if(error) console.log(error);
  });

  if(smsRequest) {

    var smsMailOptions = {
        from: "GT Course Watch Mailer ✔ <"+ this._emailID +">", // sender address
        to: existingRequest.gatewayedNumber, // list of receivers: "bar@blurdybloop.com, baz@blurdybloop.com"
        subject: "Seat Open for Class: " + existingRequest.crn, // Subject line
        text: "Registration Link: "+ "https://buzzport.gatech.edu/cp/home/displaylogin", // plaintext body
        // html: "<b>Hello world ✔</b>" // html body
    }

    this._smtpTransport.sendMail(smsMailOptions, function(error, response) {
        if(error) console.log(error);
    });

  }

}

Mailer.prototype.sendAutoRegSuccessMail = function(existingRequest) {
  var mailOptions = {
      from: "GT Course Watch Mailer ✔ <"+ this._emailID +">", // sender address
      to: existingRequest.email, // list of receivers: "bar@blurdybloop.com, baz@blurdybloop.com"
      subject: "Registration Success CRN: " + existingRequest.crn, // Subject line
      text: "The automatated system was able to successfully register you for your class!", // plaintext body
      // html: "<b>Hello world ✔</b>" // html body
  }

  this._smtpTransport.sendMail(mailOptions, function(error, response) {
      if(error) console.log(error);
  });  
}

Mailer.prototype.sendConfirmationMail = function sendConfirmationMail(requestEmail, requestCRN, smsRequest, autoRegReq) {
    var bodyText="Your Requested Class: " + requestCRN + 
    (autoRegReq ? "\nYou signed up for automatic registration." : 
      ("\nSigned up for SMS notification: " + (smsRequest ? "yes" : "no") ) ) + 
    "\n\nThank you for using my service!";

  var mailOptions = {
      from: "GT Course Watch Mailer ✔ <"+ this._emailID +">", // sender address
      to: requestEmail, // list of receivers: "bar@blurdybloop.com, baz@blurdybloop.com"
      subject: "Course Watch Confirmation for CRN: " + requestCRN, // Subject line
      text: bodyText, // plaintext body
      // html: "<b>Hello world ✔</b>" // html body
  }

  this._smtpTransport.sendMail(mailOptions, function(error, response) {
      if(error) console.log(error);
  });
}

Mailer.prototype.contactMailJob = function(email, name, msg) {
    var bodyText="Name: " + name + 
    "\nEmail: " + email + 
    "\n\nMessage: " + msg;

  // setup e-mail data with unicode symbols
  var mailOptions = {
      from: "CONTACT MESSAGE <" + this._emailID + ">", // sender address
      to: 'gtcoursewatch.mailer@gmail.com', // list of receivers: "bar@blurdybloop.com, baz@blurdybloop.com"
      subject: "CONTACT MESSAGE FROM " + name, // Subject line
      text: bodyText, // plaintext body
  }

  this._smtpTransport.sendMail(mailOptions, function(error, response) {
      if(error) console.log(error);
  });
}

module.exports = Mailer;
