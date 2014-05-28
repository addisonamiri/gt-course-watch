var socket = io.connect(window.location.hostname);
var buzzPortVerified = false;
var autoCRNVerified = false;
var watchCRNVerified = false;
var smsEnabled = false;
var numVerificationReqs = 0;

var submittedRequest = {
	"crn" : null,
	"email" : null,
	"gatewayedInput" : null
};

//live chat code.
window.onload = function() {
    var messages = [];
    var field = document.getElementById("field");
    var sendButton = document.getElementById("send");
    var content = document.getElementById("content"); 
    var name = document.getElementById("name");
 
    socket.on('message', function (data) {
        if(data.message) {
            messages.push(data);
            var html = '';
            for(var i=0; i<messages.length; i++) {
                html += '<b>' + (messages[i].username ? messages[i].username : 'Server') + ': </b>';
                html += messages[i].message + '<br />';
            }
            content.innerHTML = html;
            content.scrollTop = content.scrollHeight; //bring focus to bottom.
        } else {
            console.log("There is a problem:", data);
        }
    });
 
    sendButton.onclick = sendMessage = function() {
        if(name.value == "") {
            alert("Please type your name!");
        } else {
            var text = field.value;
            socket.emit('sendMessage', { message: text, username: name.value });
            field.value = "";
        }
    };

    $("#field").keyup(function(e) {
        if(e.keyCode == 13) {
            sendMessage();
        }
    });

    socket.on('connect_success', function (data) {
		console.log(data);
	});
}



$(document).ready(function(){
	$('#contact-sub').click(function(){
			var iName = $('#contact-name').val();
			var iMessage = $('#contact-msg').val();
			var iEmail = $('#contact-email').val();

			if(!iName || !iMessage || !iEmail){
				$('#contact_alert').show();
				return;
			}

            socket.emit('contactReq', { message: iMessage, 
            							email: iEmail,
            							name:  iName});		
	});

	$('#autoVerifyCRN').click(function(){
		if(autoCRNVerified){
			return;
		}

		var opts = {
		  lines: 13, // The number of lines to draw
		  length: 10, // The length of each line
		  width: 2, // The line thickness
		  radius: 8, // The radius of the inner circle
		  corners: 1, // Corner roundness (0..1)
		  rotate: 0, // The rotation offset
		  direction: 1, // 1: clockwise, -1: counterclockwise
		  color: '#000', // #rgb or #rrggbb or array of colors
		  speed: 1.2, // Rounds per second
		  trail: 42, // Afterglow percentage
		  shadow: false, // Whether to render a shadow
		  hwaccel: false, // Whether to use hardware acceleration
		  className: 'spinner', // The CSS class to assign to the spinner
		  zIndex: 2e9, // The z-index (defaults to 2000000000)
		  top: '60%', // Top position relative to parent
		  left: '20%' // Left position relative to parent
		};

		var iCRN = $('#buzzport_crn').val();
		var iTerm = $('#buzzport_term').val();

		if(!isCRN(iCRN)){
			$('#crn_alert').show();
			return;
		}else{
			$('#crn_alert').hide();
		}

		var target = document.getElementById('autoRegSpinner');
		var spinner = new Spinner(opts).spin(target);

		verifyCRN(iCRN, iTerm, function(result){
			if(result){
				$('#autoRegCrnCheck').show();
				$('#buzzport_crn').attr('disabled', true);
				$('#buzzport_term').attr('disabled', true);
				autoCRNVerified = true;

				if(autoCRNVerified && buzzPortVerified){
					$('#buzz_register').attr('class', 'btn btn-success');
				}
			}else{
				alert("Your crn couldn't be verified.")
			}
			spinner.stop();
		});

	});

	$('#cwVerifyCRN').click(function(){
		var opts = {
		  lines: 13, // The number of lines to draw
		  length: 10, // The length of each line
		  width: 2, // The line thickness
		  radius: 8, // The radius of the inner circle
		  corners: 1, // Corner roundness (0..1)
		  rotate: 0, // The rotation offset
		  direction: 1, // 1: clockwise, -1: counterclockwise
		  color: '#000', // #rgb or #rrggbb or array of colors
		  speed: 1.2, // Rounds per second
		  trail: 42, // Afterglow percentage
		  shadow: false, // Whether to render a shadow
		  hwaccel: false, // Whether to use hardware acceleration
		  className: 'spinner', // The CSS class to assign to the spinner
		  zIndex: 2e9, // The z-index (defaults to 2000000000)
		  top: '62%', // Top position relative to parent
		  left: '15%' // Left position relative to parent
		};

		var iCRN = $('#inputCRN').val();
		var iTerm = $('#selectTerm').val();

		if(!isCRN(iCRN)){
			$('#crn_alert').show();
			return;
		}else{
			$('#crn_alert').hide();
		}

		var target = document.getElementById('watchSpinner');
		var spinner = new Spinner(opts).spin(target);

		verifyCRN(iCRN, iTerm, function(result){
			if(result){
				$('#cwRegCrnCheck').show();
				$('#inputCRN').attr('disabled', true);
				$('#selectTerm').attr('disabled', true);				
				watchCRNVerified = true;
				$('#send_request').attr('class', 'btn btn-success');
			}else{
				alert("Your crn couldn't be verified.")
			}
			spinner.stop();
		});

	});

	function verifyBuzzport(){
		//verify buzzport

		var buzzUser = $('#buzzport_id').val();
		var buzzPass = $('#buzzport_pass').val();

		if( !(buzzUser.length>2) || !(buzzPass.length>4) ){
			$('#buzzport_alert').show();
			return;
		}else{
			$('#buzzport_alert').hide();
		}

		if(numVerificationReqs>=3){
			alert("Max verification attempts reached.");
			return;
		}
		numVerificationReqs++;

		console.log()
		var $modal = $('.loading-bar-modal');

	    $modal.modal({
		  backdrop: 'static',
		  keyboard: false,
		  show: true
		})

		$.ajax({
			url:"/verifyBuzzport",
			dataType: "json",
			timeout: 5*1000*60,
			data: {username: buzzUser, password: buzzPass},
			type: "POST",
			success: function(res){
				console.log(res.status);
				if(res.status=="SUCCESS"){
					$modal.modal('hide');
					$('#autoRegBuzzCheck').show();
					$('#buzzport_id').attr("disabled", true);
					$('#buzzport_pass').attr("disabled", true);
					buzzPortVerified = true;

					if(autoCRNVerified && buzzPortVerified){
						$('#buzz_register').attr('class', 'btn btn-success');
					}
				}else if(res.status=="FAILURE"){
					alert("Your information couldn't be verified.");
					$modal.modal('hide');			
				}else if(res.status=="MAX_TIME_REACHED"){
					alert("Server under heavy load, please try again in a minute.");
					$modal.modal('hide');					
				}else{
					alert("Something went wrong, try again later.");
					$modal.modal('hide');					
				}
			},
			error: function(res){
				alert("Haven't heard back from the server in 5 minutes, please try again later.");
				$modal.modal('hide');
			}
		});
	}

	function autoRegistrationSubmit(){
		//make auto reg request

		if (typeof autoRegistrationSubmit.registrationComplete != 'undefined') {
			return;
		}

		if(!$('#buzz_register').hasClass('btn-success')){
			alert("You need to verify your CRN and BuzzPort before you can do that.");
			return;
		}

		if( !isEmail( $('#auto-reg-email').val() ) ){
			$('#email_alert').show();
			return;
		}else{
			$('#email_alert').hide();
		}

		if(buzzPortVerified==false){
			return;
		}
		
		$.ajax({
			url:"/autoRegReq",
			dataType: "json",
			timeout: 30000,
			data: {	username: $('#buzzport_id').val(), 
					password: $('#buzzport_pass').val(),
					term: $('#buzzport_term option:selected').text(),
					crn: $('#buzzport_crn').val(),
					email: $('#auto-reg-email').val()},
			type: "POST",
			success: function(res){
				console.log(res.status);
				if(res.status=="SUCCESS"){
					$('#success_alert').show();
			
					if (typeof autoRegistrationSubmit.registrationComplete == 'undefined') {
						autoRegistrationSubmit.registrationComplete = true;
					}
				}else{
					alert("Couldn't sign you up due to an error.");
				}	
			},
			error: function(){
				console.log("connection timeout");				
			}
		});
	}

	//validation

	$(".alert").hide();
	$("#makeAnother").hide();

	$("#makeAnother").click(function(){
		window.location = window.location.origin;
		// updateThrottle(processInputAndSend);
	});
	$("#send_request").click(function(){updateThrottle(processInputAndSend)});
	$('#buzz_register').click(function(){updateThrottle(autoRegistrationSubmit)});
	$('#buzz_verify_sub').click(function(){updateThrottle(verifyBuzzport)});

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

function updateThrottle(cb){
	// window.location.replace("/");
	getTimeoutStatus(function(data){
			if(data.status == "bad"){
				updateWaitMessage(data.timeLeft);
				$('#wait_alert').show();
			}else{
				$('#wait_alert').hide("fold");
				cb();
			}
	});
}

function processInputAndSend(){
	if(!$('#send_request').hasClass('btn-success')){
		alert("You need to verify your CRN before you can do that.");
		return;
	}

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

function verifyCRN(crn, term, cb){
	$.ajax({
		url:"/verifyCRN/"+crn+"/"+term,
		dataType: "json",
		type: "GET",
		success: function(data){
			if(data.verification_status==1){
				cb(true);
			}else{
				cb(false);
			}
		}
	});
}

function getStats(cb){
	var crn = $('#stats_crn').val();
	var term = $('#stats_term').val();

	if(!isCRN(crn)){
		$('#crn_alert').show();
		return;
	}else{
		$('#crn_alert').hide();
	}

	var opts = {
	  lines: 13, // The number of lines to draw
	  length: 10, // The length of each line
	  width: 2, // The line thickness
	  radius: 8, // The radius of the inner circle
	  corners: 1, // Corner roundness (0..1)
	  rotate: 0, // The rotation offset
	  direction: 1, // 1: clockwise, -1: counterclockwise
	  color: '#000', // #rgb or #rrggbb or array of colors
	  speed: 1.2, // Rounds per second
	  trail: 42, // Afterglow percentage
	  shadow: false, // Whether to render a shadow
	  hwaccel: false, // Whether to use hardware acceleration
	  className: 'spinner', // The CSS class to assign to the spinner
	  zIndex: 2e9, // The z-index (defaults to 2000000000)
	  top: '91%', // Top position relative to parent
	  left: '80%' // Left position relative to parent
	};

	var target = document.getElementById('classStatsSpinner');
	var spinner = new Spinner(opts).spin(target);

	var remainingPieChart;
	var takenPieChart;

	$.ajax({
		url:"/getStats/"+crn+"/"+term,
		dataType: "json",
		type: "GET",
		success: function(data){
			if(data.remaining == undefined){
				alert("Your crn couldn't be found on BuzzPort.");
				spinner.stop();
				return;
			}

			spinner.stop();			

			//dom manipulation to display returned data
			$('#class_stats_div').html("<h5> Stats for CRN: " + crn + "</h5>");
			// $('#class_stats_div').append("<h5>" + data.numWatchers + " people are watching this class. </h5>");

			var tableHTML = '<br/> <table class="table table-striped" style="width:500px"> <tr> <th></th> <th>Seat Stats</th>' + 
				'<th>Waitlist Stats</th> </tr> <tr> <td>Remaining</td>' +
				'<td>' + data.remaining + '/' + data.capacity + '</td>' +	 
				'<td>' + data.waitlist_remaining + '/' + data.waitlist_capacity + '</td></tr><tr><td>Actual</td>' +
				'<td>' + data.actual + '/' + data.capacity + '</td>' + 
				'<td>' + data.waitlist_actual + '/' + data.waitlist_capacity + '</td></tr></table>';

			$('#class_stats_div').append(tableHTML);

			remainingPieChart = parseInt(data.remaining);
			takenPieChart = parseInt(data.capacity) - remainingPieChart;

			if(data.remaining != undefined){
				updateAlias(remainingPieChart, takenPieChart);
			}

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
	$('#wait_alert').html("(Throttling) You need to wait the following number of seconds to do that: " + time);
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



/*********

D3 STUFF

*********/ 

var updateAlias;

$(document).ready(function(){

var svg = d3.select("#pieChart")
	.append("svg").attr("width", "500px").attr("height", "500px")
	.append("g");


svg.append("g")
	.attr("class", "slices");
svg.append("g")
	.attr("class", "labels");
svg.append("g")
	.attr("class", "lines");

var width = 380,
    height = 300,
	radius = Math.min(width, height) / 2;

var pie = d3.layout.pie()
	.sort(null)
	.value(function(d) {
		return d.value;
	});

var arc = d3.svg.arc()
	.outerRadius(radius * 0.8)
	.innerRadius(radius * 0.4);

var outerArc = d3.svg.arc()
	.innerRadius(radius * 0.9)
	.outerRadius(radius * 0.9);

svg.attr("transform", "translate(" + width / 1.75 + "," + height / 1.75 + ")");

var key = function(d){ return d.data.label; };

var color = d3.scale.ordinal()
	.domain(["Remaining", "Taken"])
	.range(["#72FE95", "#FF5353"]);

updateAlias = function updateData(remainingPieChart, takenPieChart){
	change([{label:"Remaining", value:remainingPieChart}, {label:"Taken" , value: takenPieChart}]);
}

function randomData (){
	var labels = color.domain();
	return labels.map(function(label){
		return { label: label, value: .5 }
	});
}

change(randomData());

// d3.select("#get_stats_btn")
// 	.on("click", function(){
// 		// change(randomData());
// 		change(updateData());
// 	});


function change(data) {

	/* ------- PIE SLICES -------*/
	var slice = svg.select(".slices").selectAll("path.slice")
		.data(pie(data), key);

	slice.enter()
		.insert("path")
		.style("fill", function(d) { return color(d.data.label); })
		.attr("class", "slice");

	slice		
		.transition().duration(1000)
		.attrTween("d", function(d) {
			this._current = this._current || d;
			var interpolate = d3.interpolate(this._current, d);
			this._current = interpolate(0);
			return function(t) {
				return arc(interpolate(t));
			};
		})

	slice.exit()
		.remove();

	/* ------- TEXT LABELS -------*/

	var text = svg.select(".labels").selectAll("text")
		.data(pie(data), key);

	text.enter()
		.append("text")
		.attr("dy", ".35em")
		.text(function(d) {
			return d.data.label;
		});
	
	function midAngle(d){
		return d.startAngle + (d.endAngle - d.startAngle)/2;
	}

	text.transition().duration(1000)
		.attrTween("transform", function(d) {
			this._current = this._current || d;
			var interpolate = d3.interpolate(this._current, d);
			this._current = interpolate(0);
			return function(t) {
				var d2 = interpolate(t);
				var pos = outerArc.centroid(d2);
				pos[0] = radius * (midAngle(d2) < Math.PI ? 1 : -1);
				return "translate("+ pos +")";
			};
		})
		.styleTween("text-anchor", function(d){
			this._current = this._current || d;
			var interpolate = d3.interpolate(this._current, d);
			this._current = interpolate(0);
			return function(t) {
				var d2 = interpolate(t);
				return midAngle(d2) < Math.PI ? "start":"end";
			};
		});

	text.exit()
		.remove();

	/* ------- SLICE TO TEXT POLYLINES -------*/

	var polyline = svg.select(".lines").selectAll("polyline")
		.data(pie(data), key);
	
	polyline.enter()
		.append("polyline");

	polyline.transition().duration(1000)
		.attrTween("points", function(d){
			this._current = this._current || d;
			var interpolate = d3.interpolate(this._current, d);
			this._current = interpolate(0);
			return function(t) {
				var d2 = interpolate(t);
				var pos = outerArc.centroid(d2);
				pos[0] = radius * 0.95 * (midAngle(d2) < Math.PI ? 1 : -1);
				return [arc.centroid(d2), outerArc.centroid(d2), pos];
			};			
		});
	
	polyline.exit()
		.remove();
};

});