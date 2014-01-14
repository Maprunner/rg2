 function Animation() {
	'use strict';
	this.runners = [];
	this.timer = null;
	this.animationSecs = 0;
	this.deltaSecs = 5;
	// value in milliseconds
	this.timerInterval = 100;
	this.colours = new Colours();
	// if not real time then mass start
	this.realTime = false;
	this.earliestStartSecs = 0;
	this.latestFinishSecs = 0;
	this.tailLength = 0;
	this.useFullTails = false;
	// control to start from if this option selected
	this.massStartControl = 0;
	// run each leg as a mass start if true
	this.massStartByControl = false;
	this.displayNames = true;
}

Animation.prototype = {
	Constructor : Animation,

	resetAnimation : function() {
		this.runners.length = 0;
		clearInterval(this.timer);
		this.timer = null;
		this.updateAnimationDetails();
		$("#btn-start-stop").removeClass("fa-pause").addClass("fa-play");
		$("#btn-start-stop").prop("title", "Run");
	},

	addRunner : function(runner) {
		this.runners.push(runner);
		this.updateAnimationDetails();
	},

	updateAnimationDetails : function() {
		var html = this.getAnimationNames();
		if (html !== "") {
			$("#rg2-track-names").empty();
			$("#rg2-track-names").append(html);
			$("#rg2-track-names").show();
		} else {
			$("#rg2-track-names").hide();
		}
		this.calculateAnimationRange();
		$("#rg2-clock").text(this.formatSecsAsHHMMSS(this.animationSecs));
	},

	// slider callback
	clockSliderMoved : function(time) {
		this.resetAnimationTime(time);
		rg2.redraw(false);
	},

	getAnimationNames : function() {
		var html = "";
		if (this.runners.length < 1) {
			return html;
		}
		for (var i = 0; i < this.runners.length; i++) {
			html += "<p style='color:" + this.runners[i].colour + ";'>" + this.runners[i].coursename + " " + this.runners[i].name + "</p>";
		}
		return html;
	},

	getSplitsTable : function() {
		var html;
		var i;
		var j;
		var run;
		if (this.runners.length < 1) {
			return "<p>Select runners on Results tab.</p>";
		}

		var maxControls = 0;
		var legSplit = [];
		var prevControlSecs = 0;
		// find maximum number of controls to set size of table
		for ( i = 0; i < this.runners.length; i++) {
			if (this.runners[i].splits.length > maxControls) {
				maxControls = this.runners[i].splits.length;
			}
		}
		// allow for start and finish
		maxControls -= 2;

		html = "<table class='splitstable'><tr><th>Course</th><th>Name</th>";
		for ( i = 1; i <= maxControls; i++) {
			html += "<th>" + i + "</th>";
		}
		html += "<th>F</th></tr>";
		for ( i = 0; i < this.runners.length; i++) {
			run = this.runners[i];
			prevControlSecs = 0;
			html += "<tr class='splitsname-row'><td>" + run.coursename + "</td><td>" + run.name + "</td>";
			for ( j = 1; j < run.splits.length; j++) {
				html += "<td>" + this.formatSecsAsMMSS(run.splits[j]) + "</td>";
				legSplit[j] = run.splits[j] - prevControlSecs;
				prevControlSecs = run.splits[j];
			}
			html += "</tr><tr class='splitstime-row'><td></td><td></td>";
			for ( j = 1; j < run.splits.length; j++) {
				html += "<td>" + this.formatSecsAsMMSS(legSplit[j]) + "</td>";
			}
			html += "</tr><tr class='splitsdistance-row'><td></td><td>pixels</td>";
			for ( j = 1; j < run.splits.length; j++) {
				html += "<td>" + run.legTrackDistance[j] + "</td>";
			}

		}
		html += "</tr></table>";
		return html;
	},

	formatSecsAsMMSS : function(secs) {
		var formattedtime;
		var minutes = Math.floor(secs / 60);
		formattedtime = minutes;
		var seconds = secs - (minutes * 60);
		if (seconds < 10) {
			formattedtime += ":0" + seconds;
		} else {
			formattedtime += ":" + seconds;
		}
		return formattedtime;

	},

	removeRunner : function(runnerid) {
		for (var i = 0; i < this.runners.length; i++) {
			if (this.runners[i].runnerid == runnerid) {
				// delete 1 runner at position i
				this.runners.splice(i, 1);
			}
		}
		this.updateAnimationDetails();
	},

	toggleAnimation : function() {
		if (this.timer === null) {
			this.startAnimation();
			$("#btn-start-stop").removeClass("fa-play").addClass("fa-pause");
			$("#btn-start-stop").prop("title", "Pause");
		} else {
			this.stopAnimation();
			$("#btn-start-stop").removeClass("fa-pause").addClass("fa-play");
			$("#btn-start-stop").prop("title", "Run");
		}
	},

	startAnimation : function() {
		if (this.timer === null) {
			this.timer = setInterval(this.timerExpired.bind(this), this.timerInterval);
		}
	},

	calculateAnimationRange : function() {
		// in theory start time will be less than 24:00
		// TODO: races over midnight: a few other things to sort out before we get to that
		this.earliestStartSecs = 86400;
		this.latestFinishSecs = 0;
		this.slowestTimeSecs = 0;
		for (var i = 0; i < this.runners.length; i++) {
			if (this.runners[i].starttime < this.earliestStartSecs) {
				this.earliestStartSecs = this.runners[i].starttime;
			}
			if ((this.runners[i].starttime + this.runners[i].x.length) > this.latestFinishSecs) {
				this.latestFinishSecs = this.runners[i].starttime + this.runners[i].x.length;
			}
			if ((this.runners[i].x.length) > this.slowestTimeSecs) {
				this.slowestTimeSecs = this.runners[i].x.length;
			}
		}
		this.resetAnimationTime(0);
	},

	stopAnimation : function() {
		clearInterval(this.timer);
		this.timer = null;
	},

	// extra function level in for test purposes
	timerExpired : function() {
		rg2.redraw(true);
	},

	setFullTails : function(fullTails) {
		if (fullTails) {
			this.useFullTails = true;
		} else {
			this.useFullTails = false;
		}
		rg2.redraw(false);
	},

	setTailLength : function(minutes) {
		this.tailLength = 60 * minutes;
		rg2.redraw(false);
	},

	setStartControl : function(control) {
		var i;
		this.massStartControl = parseInt(control, 10);
		if (this.massStartControl === rg2.config.MASS_START_BY_CONTROL) {
			this.massStartControl = 0;
			this.massStartByControl = true;
			// get split time at control 1
			for ( i = 0; i < this.runners.length; i++) {
				this.runners[i].nextStopTime = this.runners[i].splits[1];
			}
		} else {
			this.massStartByControl = false;
			for ( i = 0; i < this.runners.length; i++) {
				this.runners[i].nextStopTime = rg2.config.VERY_HIGH_TIME_IN_SECS;
			}
		}
		this.resetAnimationTime(0);
	},

	setReplayType : function(type) {
		if (type === rg2.config.MASS_START_REPLAY) {
			this.realTime = false;
			$("#btn-mass-start").addClass('active');
			$("#btn-real-time").removeClass('active');
			if (rg2.getHighestControlNumber() > 0) {
				$("#rg2-control-select").prop('disabled', false);
			}
		} else {
			this.realTime = true;
			$("#btn-mass-start").removeClass('active');
			$("#btn-real-time").addClass('active');
			$("#rg2-control-select").prop('disabled', true);
		}
		// go back to start
		this.resetAnimationTime(0);
	},

	resetAnimationTime : function(time) {
		// sets animation time
		if (this.realTime) {
			// if we got a time it was from the slider so use it
			// otherwise reset to base time
			if (time > 0) {
				this.animationSecs = time;
			} else {
				this.animationSecs = this.earliestStartSecs;
			}
			this.startSecs = this.earliestStartSecs;
			$("#rg2-clock-slider").slider("option", "max", this.latestFinishSecs);
			$("#rg2-clock-slider").slider("option", "min", this.earliestStartSecs);
		} else {
			if (time > 0) {
				this.animationSecs = time;
			} else {
				this.animationSecs = 0;
			}
			this.startSecs = 0;
			$("#rg2-clock-slider").slider("option", "max", this.slowestTimeSecs);
			$("#rg2-clock-slider").slider("option", "min", 0);
		}
		$("#rg2-clock-slider").slider("value", this.animationSecs);
		$("#rg2-clock").text(this.formatSecsAsHHMMSS(this.animationSecs));
	},

	toggleNameDisplay : function() {
		if (this.displayNames) {
			$("#btn-toggle-names").prop("title", "Show names");
		} else {
			$("#btn-toggle-names").prop("title", "Hide names");
		}
		this.displayNames = !this.displayNames;
	},

	runAnimation : function(fromTimer) {

		// only increment time if called from the timer and we haven't got to the end already
		if (this.realTime) {
			if (this.animationSecs < this.latestFinishSecs) {
				if (fromTimer) {
					this.animationSecs += this.deltaSecs;
				}
			}
		} else {
			if (this.animationSecs < this.slowestTimeSecs) {
				if (fromTimer) {
					this.animationSecs += this.deltaSecs;
				}
			}
		}
		$("#rg2-clock-slider").slider("value", this.animationSecs);
		$("#rg2-clock").text(this.formatSecsAsHHMMSS(this.animationSecs));
		rg2.ctx.lineWidth = rg2.config.REPLAY_LINE_THICKNESS;
		rg2.ctx.globalAlpha = 1.0;
		var runner;
		var timeOffset;
		var i;
		var t;
		var tailStartTimeSecs;
		if (this.useFullTails) {
			tailStartTimeSecs = this.startSecs + 1;
		} else {
			tailStartTimeSecs = Math.max(this.animationSecs - this.tailLength, this.startSecs + 1);
		}

		for ( i = 0; i < this.runners.length; i++) {
			runner = this.runners[i];
			if (this.realTime) {
				timeOffset = runner.starttime;
			} else {
				if ((this.massStartControl === 0) || (runner.splits.length < this.massStartControl)) {
					// no offset since we are starting from the start
					timeOffset = 0;
				} else {
					// offset needs to move forward (hence negative) to time at control
					timeOffset = -1 * runner.splits[this.massStartControl];
				}
			}
			rg2.ctx.strokeStyle = runner.colour;
			rg2.ctx.beginPath();
			rg2.ctx.moveTo(runner.x[tailStartTimeSecs - timeOffset], runner.y[tailStartTimeSecs - timeOffset]);

			// t runs as real time seconds or 0-based seconds depending on this.realTime
			//runner.x[] is always indexed in 0-based time so needs to be adjusted for starttime offset
			for ( t = tailStartTimeSecs; t <= this.animationSecs; t++) {
				if ((t > timeOffset) && ((t - timeOffset) < runner.nextStopTime)) {
					rg2.ctx.lineTo(runner.x[t - timeOffset], runner.y[t - timeOffset]);
				}
			}
			rg2.ctx.stroke();
			rg2.ctx.fillStyle = runner.colour;
			rg2.ctx.beginPath();
			if ((t - timeOffset) < runner.nextStopTime) {
				t = t - timeOffset;
			} else {
				t = runner.nextStopTime;
			}
			rg2.ctx.arc(runner.x[t] + (rg2.config.RUNNER_DOT_RADIUS / 2), runner.y[t], rg2.config.RUNNER_DOT_RADIUS, 0, 2 * Math.PI, false);
			rg2.ctx.fill();
			if (this.displayNames) {
				rg2.ctx.fillStyle = "black";
				rg2.ctx.font = '20pt Arial';
				rg2.ctx.textAlign = "left";
				rg2.ctx.fillText(runner.name, runner.x[t] + 15, runner.y[t] + 7);
			}
		}
		if (this.massStartByControl) {
			this.checkForStopControl(this.animationSecs);
		}
	},

	// see if all runners have reached stop control and reset if they have
	checkForStopControl : function(currentTime) {
		var allAtControl = true;
		var i;
		var legTime;
		// work out if everybody has got to the next control
		for ( i = 0; i < this.runners.length; i++) {
			legTime = this.runners[i].splits[this.massStartControl + 1] - this.runners[i].splits[this.massStartControl];
			if (legTime > currentTime) {
				allAtControl = false;
				break;
			}
		}
		if (allAtControl) {
			//move on to next control
			this.massStartControl++;
			// find time at next control
			for ( i = 0; i < this.runners.length; i++) {
				if (this.massStartControl < (this.runners[i].splits.length)) {
					// splits includes a start time so index to control is + 1
					this.runners[i].nextStopTime = this.runners[i].splits[this.massStartControl + 1];
				} else {
					this.runners[i].nextStopTime = rg2.config.VERY_HIGH_TIME_IN_SECS;
				}
			}
			this.resetAnimationTime(0);
		}
	},

	goSlower : function() {
		if (this.deltaSecs > 0) {
			this.deltaSecs -= 1;
		}
	},

	goFaster : function() {
		this.deltaSecs += 1;
	},

	// returns seconds as hh:mm:ss
	formatSecsAsHHMMSS : function(time) {
		var hours = Math.floor(time / 3600);
		var formattedtime;
		if (hours < 10) {
			formattedtime = "0" + hours + ":";
		} else {
			formattedtime = hours + ":";
		}
		time = time - (hours * 3600);
		var minutes = Math.floor(time / 60);
		if (minutes < 10) {
			formattedtime += "0" + minutes;
		} else {
			formattedtime += minutes;
		}
		var seconds = time - (minutes * 60);
		if (seconds < 10) {
			formattedtime += ":0" + seconds;
		} else {
			formattedtime += ":" + seconds;
		}
		return formattedtime;
	},

	// returns seconds as mm:ss
	formatSecsAsMinutes : function(time) {
		var minutes = Math.floor(time / 60);
		var seconds = time - (minutes * 60);
		if (seconds < 10) {
			return minutes + ":0" + seconds;
		} else {
			return minutes + ":" + seconds;
		}
	}
};