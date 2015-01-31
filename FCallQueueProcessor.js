'use strict'

function FCallQueueProcessor(func, thisArg, delay) {
	this.dispatch_delay_ms = 
		typeof delay !== 'undefined' ? delay : 100;
	this.fcall_q = [];
	this.check_active = false;
	this.func = func;
	this.func_context = thisArg;
};

//check_probe_q
FCallQueueProcessor.prototype.poll_q = function() {
	var _this = this;

	if(_this.fcall_q.length > 0) {
		var fcall = _this.fcall_q.shift();
		_this.check_active = true;
		// TRACKING show the current CRN being tested
		// console.log(fcall[0]);
		_this.func.apply(_this.func_context, fcall);
		setTimeout(function() {
			_this.poll_q();
		}, _this.dispatch_delay_ms);
	} else {
		_this.check_active = false;
	}	
}

FCallQueueProcessor.prototype.alert_q_to_poll = function() {
	if (!this.check_active) {
		this.poll_q();	
	}
};

module.exports = FCallQueueProcessor;