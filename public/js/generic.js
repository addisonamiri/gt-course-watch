var socket = io.connect(window.location.hostname);
socket.on('connect_success', function (data) {
	console.log(data);
});

var smsEnabled = false; 

var submittedRequest = {
	"crn" : null,
	"email" : null,
	"gatewayedInput" : null
};

$(document).ready(function(){
	//validation

	$(".alert").hide();

	$("#send_request").click(function(){
		var errorCount = 0;

		var crnInput = $('#inputCRN').val();
		var emailInput = $('#inputEmail').val();
		var phoneInput = $('#inputPhoneNum').val();

		if(!isEmail(emailInput)){
			$('#email_alert').show();
			errorCount++;
		}else{
			$('#email_alert').hide();
		}

		if(!isCRN(crnInput)){
			$('#crn_alert').show();
			errorCount++;
		}else{
			$('#crn_alert').hide();
		}

		if(smsEnabled){
			if(!isPhoneNumber(phoneInput)){
				$('#phone_alert').show();
				errorCount++; 
			}else{
				$('#phone_alert').hide();
				phoneInput = formatPhoneNumber(phoneInput);
			}
		}

		if(!errorCount && !smsEnabled){
			$(".alert").hide();
			$("#success_alert").show();

			var currentRequest = {
				"crn" : crnInput,
				"email" : emailInput,
				"gatewayedInput" : null
			};

			if(checkDuplicateRequest(submittedRequest, currentRequest)){
				$("#duplicate_alert").show();
			}else{
				$("#duplicate_alert").hide();
				submittedRequest = currentRequest;
				socket.emit('makeRequest', { email: emailInput, crn: crnInput});
			}


		}else if(!errorCount && smsEnabled){
			$(".alert").hide();
			$("#success_alert").show();

			var gatewayedInput = "";			
			var serviceProvider = $("#serviceProvider").val();

		  //SMS GATEWAY
		  //http://www.obviously.com/tech_tips/SMS_Text_Email_Gateway.html

			if(serviceProvider == "att"){
				gatewayedInput = phoneInput + "@txt.att.net";
			}else if(serviceProvider == "verizon"){
				gatewayedInput = phoneInput + "@vtext.com";
			}else if(serviceProvider == "sprint"){
				gatewayedInput = phoneInput + "@messaging.sprintpcs.com";
			}else if(serviceProvider == "tmobile"){
				gatewayedInput = phoneInput + "@tmomail.net";
			}else if(serviceProvider == "virginmobile"){
				gatewayedInput = phoneInput + "@vmobl.com";
			}else if(serviceProvider == "metropcs"){
				gatewayedInput = phoneInput + "@mymetropcs.com";
			}else if(serviceProvider == "alltel"){
				gatewayedInput = phoneInput + "@message.alltel.com";
			}else if(serviceProvider == "boost"){
				gatewayedInput = phoneInput + "@myboostmobile.com";
			}

			var currentRequest = {
				"crn" : crnInput,
				"email" : emailInput,
				"gatewayedInput" : gatewayedInput
			};

			if(checkDuplicateRequest(submittedRequest, currentRequest)){
				$("#duplicate_alert").show();
			}else{
				$("#duplicate_alert").hide();
				submittedRequest = currentRequest;
				socket.emit('makeSMSRequest', { email: emailInput, crn: crnInput, gatewayedNumber: gatewayedInput});
			}

		}

	});

});

$(document).ready(function(){
	//SMS gateway

	$("input:radio[name=phoneSupport]").click(function() {
	    var value = $(this).val();

	    if(value == "yes"){
	    	$("#sms_stuff").show("fold");
	    	smsEnabled = true;
	    }else if(value == "no"){
	    	$("#sms_stuff").hide("fold");
	    	smsEnabled = false;
	    }
	});

});

function checkDuplicateRequest(req1, req2){
	return (req1.crn == req2.crn) && (req1.email == req2.email) && 
		(req1.gatewayedInput == req2.gatewayedInput);
}

function formatPhoneNumber(number){
	var toReturn = number.replace("-", "");
	toReturn = number.replace(".", "");
	toReturn = number.replace(" ", "");
	return toReturn;
}

function isPhoneNumber(number){
	var regex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
	return regex.test(number);
}

function isEmail(email) {
	var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
	return regex.test(email);
}

function isCRN(crn){
	var regex = /\b\d{5}\b/g;
	return regex.test(crn)
}