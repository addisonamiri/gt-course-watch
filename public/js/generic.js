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

	$('#myTab a').click(function(e){
	  e.preventDefault();
	  $(this).tab('show');
	});

	//validation

	$(".alert").hide();
	$("#makeAnother").hide();

	$("#makeAnother").click(makeRequest);
	$("#send_request").click(makeRequest);

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

	$("#get_stats_btn").click(getStats);

});

function makeRequest(){
	// window.location.replace("/");

	getTimeoutStatus(function(data){
			if(data.status == "bad"){
				updateWaitMessage(data.timeLeft);
				$('#wait_alert').show();
			}else{
				$('#wait_alert').hide("fold");
				processInputAndSend();
			}
	});
}

function processInputAndSend(){
	var errorCount = 0;

	var crnInput = $('#inputCRN').val();
	var emailInput = $('#inputEmail').val();
	var phoneInput = $('#inputPhoneNum').val();
	var term = $("#selectTerm").val();

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

		var currentRequest = {
			"crn" : crnInput,
			"email" : emailInput,
			"gatewayedInput" : null
		};

		if(checkDuplicateRequest(submittedRequest, currentRequest)){
			$("#duplicate_alert").show();
		}else{
			$("#duplicate_alert").hide();
			$("#success_alert").show();
			$("#send_request").hide();
			$("#makeAnother").show();
			submittedRequest = currentRequest;
			socket.emit('makeRequest', { email: emailInput, crn: crnInput, term: term});
			updateLastRequested(crnInput);
			updateOtherWatchers(crnInput);
		}


	}else if(!errorCount && smsEnabled){
		$(".alert").hide();

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
			$("#success_alert").show();
			$("#send_request").hide();
			$("#makeAnother").show();
			submittedRequest = currentRequest;
			socket.emit('makeSMSRequest', { email: emailInput, crn: crnInput, gatewayedNumber: gatewayedInput, term:term});
			updateLastRequested(crnInput);
			updateOtherWatchers(crnInput);
		}

	}
}

function getTimeoutStatus(callback){
	$.ajax({
		url:"/getTimeoutStatus",
		dataType: "json",
		type: "GET",
		success: callback
	})
}

function updateOtherWatchers(crn){
	var numWatchers;

	$.ajax({
		url:"/getNumWatchers/"+crn,
		dataType: "json",
		type: "GET",
		success: function(data){
			$('#otherWatchers').html(data.numWatchers + " other people are watching this class.");
		}
	});
}

function getStats(cb){
	var crn = $('#stats_crn').val();
	var term = $('#stats_term').val();

	$.ajax({
		url:"/getStats/"+crn+"/"+term,
		dataType: "json",
		type: "GET",
		success: function(data){
			//dom manipulation to display returned data
			$('#class_stats_div').html("<h3> Loaded CRN: " + crn + "</h3>");
			$('#class_stats_div').append("<h3>" + data.numWatchers + " people are watching this class. </h3>");

			var tableHTML = '<br/> <table class="table table-striped" style="width:300px"> <tr> <th>*</th> <th>Seat Stats</th>' + 
				'<th>Waitlist Stats</th> </tr> <tr> <td>Remaining</td>' +
				'<td>' + data.remaining + '</td>' +	 '<td>' + data.waitlist_remaining + '</td></tr><tr><td>Actual</td>' +
				'<td>' + data.actual + '</td>' + '<td>' + data.waitlist_actual + '</td></tr><tr><td>Capacity</td>' +
				'<td>' + data.capacity + '</td>' + '<td>' + data.waitlist_capacity + '</td></tr></table>';

			$('#class_stats_div').append(tableHTML);

			// <table style="width:300px">
			// 	<tr>
			// 		<th>*</th>
			// 		<th>Seat Stats</th>
			// 		<th>Waitlist Stats</th>
			// 	</tr>

			// 	<tr>
			// 		<td>Remaining</td>
			// 		<td>data.remaining</td>
			// 		<td>data.waitlist_remaining</td> 
			// 	</tr>

			// 	<tr>
			// 		<td>Actual</td>				
			// 		<td>data.actual</td>
			// 		<td>data.waitlist_actual</td> 
			// 	</tr>

			// 	<tr>
			// 		<td>Capacity</td>
			// 		<td>data.capacity</td>
			// 		<td>data.waitlist_capacity</td> 
			// 	</tr>
			// </table>


		}
	});

}

function updateLastRequested(lastCrn){
	$('#lastRequested').html("Last Requested CRN: " + lastCrn)
}

function updateWaitMessage(time){
	$('#wait_alert').html("Please wait the following number of seconds to make your next request: " + time);
}

function checkDuplicateRequest(req1, req2){
	return (req1.crn == req2.crn) && (req1.email == req2.email) && 
		(req1.gatewayedInput == req2.gatewayedInput);
}

function formatPhoneNumber(number){	
	return number.replace(/-/g, "");
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
