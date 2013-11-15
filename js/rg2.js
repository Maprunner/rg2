/**
 * @author Simon Errington
 *
 * Routegadget 2.0 Viewer
 *
 * Released under the MIT license
 *
 * Date: 2013-10-08T20:21Z
 */
jQuery(document).ready(function() {"use strict";

	function Animation() {
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
		this.massStartControl = 0;
	}


	Animation.prototype = {
		Constructor : Animation,

		resetAnimation : function() {
			this.runners.length = 0;
			clearInterval(this.timer);
			this.timer = null;
		},

		addRunner : function(runner) {
			this.runners.push(runner);
			this.updateAnimationDetails();
		},

		updateAnimationDetails : function() {
			jQuery("#rg2-animation-names").empty();
			jQuery("#rg2-animation-names").append(this.getAnimationNames());
			this.calculateAnimationRange();
			jQuery("#rg2-clock").text(this.formatSecsAsHHMMSS(this.animationSecs));
		},

		// slider callback
		clockSliderMoved : function(time) {
			this.resetAnimationTime(time);
			redraw();
		},

		getAnimationNames : function() {
			var html = "<table>";
			for (var i = 0; i < this.runners.length; i++) {
				html += "<tr><td>" + this.runners[i].coursename + "</td><td>" + this.runners[i].name;
				html += "</td><td style='color:" + this.runners[i].colour + ";'>=====</td></tr>";
			}
			if (html === "<table>") {
				html = "<p>Select runners on the Results tab.</p>";
			} else {
				html += "</table>";
			}
			return html;
		},

		removeRunner : function(runnerid) {
			for (var i = 0; i < this.runners.length; i++) {
				if (this.runners[i].runnerid == runnerid) {
					// splice deletes items from an array
					this.runners.splice(i, 1);
				}
			}
			this.updateAnimationDetails();
		},

		toggleAnimation : function() {
			if (this.timer === null) {
				this.startAnimation();
				jQuery("#btn-start-stop").button("option", "icons", {
					primary : "ui-icon-stop"
				});
				jQuery("#btn-start-stop").button("option", "label", "Stop");
			} else {
				this.stopAnimation();
				jQuery("#btn-start-stop").button("option", "icons", {
					primary : "ui-icon-play"
				});
				jQuery("#btn-start-stop").button("option", "label", "Run");
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
			redraw(true);
		},


    setFullTails: function(fullTails) {
      if (fullTails) {
      	this.useFullTails = true;
      }	else {
      	this.useFullTails = false;      	
      }
      redraw(false);
    },

    setTailLength: function(minutes) {
      this.tailLength = 60 * minutes;	
      redraw(false);
    },
    
    setStartControl: function (control) {
    	this.massStartControl = parseInt(control, 10);
			this.resetAnimationTime(0);    	
    },
    
		setReplayType : function() {
			// change between real time and mass start
			// only btn-mass-start and btn-real-time in the group
			if (jQuery("#btn-replay-type :radio:checked").attr('id') === "btn-mass-start") {
				this.realTime = false;
				jQuery("#rg2-replay-start-control").show();
			} else {
				jQuery("#rg2-replay-start-control").hide();
				this.realTime = true;
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
				jQuery("#rg2-clock-slider").slider("option", "max", this.latestFinishSecs);
				jQuery("#rg2-clock-slider").slider("option", "min", this.earliestStartSecs);
			} else {
				if (time > 0) {
					this.animationSecs = time;
				} else {
					this.animationSecs = 0;
				}
				this.startSecs = 0;
				jQuery("#rg2-clock-slider").slider("option", "max", this.slowestTimeSecs);
				jQuery("#rg2-clock-slider").slider("option", "min", 0);
			}
			jQuery("#rg2-clock-slider").slider("value", this.animationSecs);
			jQuery("#rg2-clock").text(this.formatSecsAsHHMMSS(this.animationSecs));
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
			jQuery("#rg2-clock-slider").slider("value", this.animationSecs);
			jQuery("#rg2-clock").text(this.formatSecsAsHHMMSS(this.animationSecs));

			ctx.lineWidth = 3;
			ctx.globalAlpha = 1.0;
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
				// need to draw full course even though runner has finished so that it stays on display
				if (this.realTime) {
					timeOffset = runner.starttime;
				} else {
					if ((this.massStartControl === 0) || (runner.splits.length < this.massStartControl)) {
					  // no offset since we are starting from the start
					  timeOffset = 0;
					} else {
						// offset needs to move forward (hence negative) to time at control
					  timeOffset = -1 * runner.splits[this.massStartControl - 1];						
					}
				}
				ctx.strokeStyle = runner.colour;
				ctx.beginPath();
				ctx.moveTo(runner.x[tailStartTimeSecs - timeOffset], runner.y[tailStartTimeSecs - timeOffset]);

				// t runs as real time seconds or 0-based seconds depending on this.realTime
				//runner.x[] is always indexed in 0-based time so needs to be adjusted for starttime offset
				for ( t = tailStartTimeSecs; t <= this.animationSecs; t++) {
					if (t > timeOffset) {
						ctx.lineTo(runner.x[t - timeOffset], runner.y[t - timeOffset]);
					}
				}
				ctx.stroke();
				ctx.fillStyle = runner.colour;
				ctx.beginPath();				
				ctx.arc(runner.x[t - timeOffset] + 3, runner.y[t - timeOffset], 6, 0, 2 * Math.PI, false);
				ctx.fill();
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
				formattedtime = hours;
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
	}

	// animated runner details
	function Runner(resultid) {
		var res = results.getFullResult(resultid);
		this.name = res.name;
		// careful: we need the index into results, not the resultid from the text file
		this.runnerid = resultid;
		this.starttime = res.starttime;
		this.splits = res.splits;
		this.colour = animation.colours.getNextColour();
		// get course details
		var course = courses.getFullCourse(res.courseid);
		this.coursename = course.name;
		this.x = [];
		this.y = [];
		// x,y are indexed by time in seconds
		this.x[0] = course.x[0];
		this.y[0] = course.y[0];
		var timeatprevcontrol = 0;
		var timeatcontrol = 0;
		var distance = 0;
		var timeatxy = 0;
		var timeatprevxy = 0;
		var tox;
		var toy;
		var fromx = course.x[0];
		var fromy = course.y[0];
		var diffx;
		var diffy;
		var difft;
		var control;
		var t;
		var xy;

		if (res.validTrack) {
			// x,y are indexed by time in seconds
			this.x[0] = res.trackx[0];
			this.y[0] = res.tracky[0];
			fromx = res.trackx[0];
			fromy = res.tracky[0];
			// for each point on track
			for ( xy = 1; xy < res.xysecs.length; xy++) {
				tox = res.trackx[xy];
				toy = res.tracky[xy];
				diffx = tox - fromx;
				diffy = toy - fromy;
				timeatxy = res.xysecs[xy];
				difft = timeatxy - timeatprevxy;
				for ( t = timeatprevxy + 1; t < timeatxy; t++) {
					this.x[t] = parseInt(fromx + ((t - timeatprevxy) * diffx / difft), 10);
					this.y[t] = parseInt(fromy + ((t - timeatprevxy) * diffy / difft), 10);
				}
				this.x[timeatxy] = tox;
				this.y[timeatxy] = toy;
				fromx = tox;
				fromy = toy;
				timeatprevxy = timeatxy;
			}
		} else {
			// no track so use straight line between controls
			// for each control (0 was Start)
			this.x[0] = course.x[0];
			this.y[0] = course.y[0];
			fromx = course.x[0];
			fromy = course.y[0];
			for ( control = 1; control < course.codes.length; control++) {
				tox = course.x[control];
				toy = course.y[control];
				diffx = tox - fromx;
				diffy = toy - fromy;
				// split times don't have a time for the start
				timeatcontrol = parseInt(res.splits[control - 1], 10);
				difft = timeatcontrol - timeatprevcontrol;
				for ( t = timeatprevcontrol + 1; t < timeatcontrol; t++) {
					this.x[t] = parseInt(fromx + ((t - timeatprevcontrol) * diffx / difft), 10);
					this.y[t] = parseInt(fromy + ((t - timeatprevcontrol) * diffy / difft), 10);
				}
				this.x[timeatcontrol] = tox;
				this.y[timeatcontrol] = toy;
				fromx = tox;
				fromy = toy;
				timeatprevcontrol = timeatcontrol;
			}
		}
		res = 0;
		course = 0;
	}

	function Events() {
		this.events = [];
	  this.activeEventID = null;
	}


	Events.prototype = {
		Constructor : Events,

		addEvent : function(eventObject) {
			this.events.push(eventObject);
		},
				
		getKartatEventID: function () {
			return this.events[this.activeEventID].kartatid;
		},

		getActiveMapID: function () {
			return this.events[this.activeEventID].mapid;
		},

		getActiveEventDate: function () {
			return this.events[this.activeEventID].date;
		},
		
		getActiveEventName: function () {
			return this.events[this.activeEventID].name;
		},
						
		setActiveEventID: function (id) {
			this.activeEventID = id;
		},	
		
		formatEventsAsMenu: function () {
		  var html = '';
		  for (var i = this.events.length - 1; i >= 0; i--) {
			  html += "<li title='" + this.events[i].type + " event on " + this.events[i].date + "' id=" + i + "><a href='#" + i;
			  html += "'><span class='ui-icon ui-icon-calendar'></span>" + this.events[i].name + "</a></li>";
		  }
		  return html;
	  },
	}

  function Event(data) {
		this.kartatid = data.id;
		this.mapid = data.mapid;
		this.name = data.name;
		this.date = data.date;
		this.club = data.club;
		switch(data.type) {
			case "I":
				this.type = "International";
				break;
			case "N":
				this.type = "National";
				break;
			case "R":
				this.type = "Regional";
				break;
			case "L":
				this.type = "Local";
				break;
			case "T":
				this.type = "Training";
				break;
			default:
				this.type = "Unknown";
				break;
		}
		this.comment = data.comment;
		this.courses = 0;

	}
	
	Event.prototype = {
		Constructor : Event,
 }
 
	function Colours() {
		// used to generate track colours: add extra colours as necessary
		this.colours = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"];
		this.colourIndex = 0;
	}


	Colours.prototype = {
		Constructor : Colours,

		getNextColour : function() {
			this.colourIndex++;
			if (this.colourIndex == this.colours.length) {
				this.colourIndex = 0;
			}
			return this.colours[this.colourIndex];
		},
	}

	function Results() {
		this.results = [];
		this.colours = new Colours();
	}


	Results.prototype = {
		Constructor : Results,

		addResult : function(result) {
			this.results.push(result);
		},

		getCourseID : function(resultid) {
			return this.results[resultid].courseid;
		},

		getFullResult : function(resultid) {
			return this.results[resultid];
		},

		drawTracks : function() {
			for (var i = 0; i < this.results.length; i++) {
				this.results[i].drawTrack();
			}
		  jQuery("#rg2-track-names").empty();
		  var html = this.getDisplayedTrackNames();
		  if (html !== "") {
		    jQuery("#rg2-track-names").empty();
		  	jQuery("#rg2-track-names").append(html);
		  	jQuery("#rg2-track-names").show();
		  } else {
		  	jQuery("#rg2-track-names").hide();
		  }
	  },

		putOneTrackOnDisplay : function(resultid) {
			this.results[resultid].putTrackOnDisplay();
		},

		removeOneTrackFromDisplay : function(resultid) {
			this.results[resultid].removeTrackFromDisplay();
		},

		// add all tracks for one course
		putTracksOnDisplay : function(courseid) {
			for (var i = 0; i < this.results.length; i++) {
				if (this.results[i].courseid == courseid) {
					this.results[i].putTrackOnDisplay();
				};
			}
		},

		// put all tracks for all courses on display
		putAllTracksOnDisplay : function() {
			for (var i = 0; i < this.results.length; i++) {
				this.results[i].putTrackOnDisplay();
			}
		},

		getDisplayedTrackNames : function() {
			var html = "";
			for (var i = 0; i < this.results.length; i++) {
				if (this.results[i].displayTrack) {
					html += "<p style='color:" + this.results[i].trackColour + ";'>" + courses.getCourseName(this.results[i].courseid);
					html += ": " + this.results[i].name + "</p>";
				}
			}
			return html;
		},

		getSplitsForID : function(resultid) {
			for (var i = 0; i < this.results.length; i++) {
				if (resultid === this.results[i].resultid) {
					return this.results[i].splits;
				}
			}
			return 9999;
		},

		getTimeForID : function(resultid) {
			for (var i = 0; i < this.results.length; i++) {
				if (resultid === this.results[i].resultid) {
					return this.results[i].time;
				}
			}
			return 9999;
		},

		removeAllTracksFromDisplay : function() {
			for (var i = 0; i < this.results.length; i++) {
				this.results[i].removeTrackFromDisplay();
			}
		},

		removeTracksFromDisplay : function(courseid) {
			for (var i = 0; i < this.results.length; i++) {
				if (this.results[i].courseid == courseid) {
					this.results[i].removeTrackFromDisplay();
				};
			}
		},

		addTracks : function(tracks) {
			// this gets passed the json data array
			var resultIndex;
			var j;
			// for each track
			for (var i = 0; i < tracks.length; i++) {
				resultIndex = tracks[i].resultid;
				j = 0;
				// don't add GPS track since we got a better one in the original results
				if (resultIndex < GPS_RESULT_OFFSET) {
					// loop through all results and add it against the correct id
					while (j < this.results.length) {
						if (resultIndex == this.results[j].resultid) {
							this.results[j].addTrack(tracks[i].coords);
							courses.incrementTracksCount(this.results[j].courseid);
							break;
						}
						j++;
					}
				}
			}

		},

		deleteAllResults : function() {
			this.results.length = 0;
		},

		getRunnerName : function(runner) {
			return this.results[runner].name;
		},

		formatResultListAsAccordion : function() {
			var html = "";
			var temp;
			var firstCourse = true;
			var oldCourseName = "";
			for (var i = 0; i < this.results.length; i++) {
				temp = this.results[i];
				if (temp.coursename != oldCourseName) {
					// found a new course so add header
					if (firstCourse) {
						firstCourse = false;
					} else {
						html += "</table></div>";
					}
					html += "<h3>" + temp.coursename + "</h3><div>";
					html += "<input class='showcourse' id=" + temp.courseid + " type=checkbox name=course> Show course</input>";
					html += "<table class='resulttable'><tr><th>Name</th><th>Time</th><th>Track</th><th>Replay</th></tr>";
					oldCourseName = temp.coursename;
				}
				if (temp.comments !== "") {
					html += "<tr><td><a href='#' title='" + temp.comments + "'>" + temp.name + "</a></td><td>" + temp.time + "</td>";
      } else {
					html += "<tr><td>" + temp.name + "</td><td>" + temp.time + "</td>";      	
      }
				if (temp.hasTrack) {
					html += "<td><input class='showtrack' id=" + i + " type=checkbox name=result></input></td>";
				} else {
					html += "<td></td>";
				}
				html += "<td><input class='replay' id=" + i + " type=checkbox name=replay></input></td></tr>";
			};
			if (html === "") {
				html = "<p>No results available.</p>"
			} else {
				html += "</table></div></div>";
			}
			return html;
		}
	};

	function Result(data) {
		this.resultid = parseInt(data.resultid, 10);
		// GPS track ids are normal resultid + GPS_RESULT_OFFSET
		if (this.resultid >= GPS_RESULT_OFFSET) {
			//this.name = (data.name).replace("GPS ", "");
			this.isGPSTrack = true;
		} else {
			//this.name = data.name;
			this.isGPSTrack = false;
		}
		this.name = data.name;
		this.starttime = parseInt(data.starttime, 10);
		this.time = data.time;
		this.comments = data.comments;
		this.coursename = data.coursename;
		if (this.coursename === "") {
	    this.coursename = "GPS tracks";
		}
		this.courseid = parseInt(data.courseid, 10);
		this.splits = data.splits.split(";");
		// calculated cumulative distance in pixels
		this.cumulativedistance = [];
		// set true if track includes all expected controls in correct order
		this.validTrack = false;
		this.displayTrack = false;
		this.hasTrack = false;
		this.trackColour = 0;
		// raw track data
		this.trackx = [];
		this.tracky = [];
		// interpolated times
		this.xysecs = [];
		if (this.isGPSTrack) {
			// don't get time or splits so need to copy them in from (GPS_RESULT_OFFSET - resultid)
			this.time = results.getTimeForID(this.resultid - GPS_RESULT_OFFSET);
			this.splits = results.getSplitsForID(this.resultid - GPS_RESULT_OFFSET);

		}
		if (data.gpscoords.length > 0) {
			this.addTrack(data.gpscoords);
			courses.incrementTracksCount(this.courseid);
			// check this later
			this.validTrack = true;
		}

	}


	Result.prototype = {
		Constructor : Result,

		putTrackOnDisplay : function() {
			if (this.hasTrack) {
				this.displayTrack = true;
				this.trackColour = results.colours.getNextColour();
			}
		},

		removeTrackFromDisplay : function() {
			if (this.hasTrack) {
				this.displayTrack = false;
			}
		},

		drawTrack : function() {
			if (this.displayTrack) {
				ctx.lineWidth = 2;
				ctx.strokeStyle = this.trackColour;
				ctx.globalAlpha = 1.0;
				// set transparency of overprint
				ctx.beginPath();
				ctx.moveTo(this.trackx[0], this.tracky[0]);
				for (var i = 1; i < this.trackx.length; i++) {
					// lines
					ctx.lineTo(this.trackx[i], this.tracky[i]);
				}
				ctx.stroke();

			}
		},

		addTrack : function(trackcoords) {
			// gets passed in coords
			// coord sets are separated by "N"
			var temp = trackcoords.split("N");
			var xy = 0;
			// ignore first point hack for now
			for (var i = 1; i < temp.length; i++) {
				// coord sets are 2 items in csv format
				xy = temp[i].split(";");
				this.trackx.push(parseInt(xy[0], 10));
				this.tracky.push(-1 * parseInt(xy[1], 10));
			}

			if (this.isGPSTrack) {
				this.expandGPSTrack();
			} else {
				this.expandNormalTrack();
			}
			if (this.validTrack) {
				this.hasTrack = true;
			}
		},

		expandNormalTrack : function() {
			// add times and distances at each position
			this.xysecs[0] = 0;
			this.cumulativedistance[0] = 0;

			// get course details
			var course = courses.getFullCourse(this.courseid);
			// read through list of controls and copy in split times
			var nextcontrol = 1;
			var nextx = course.x[nextcontrol];
			var nexty = course.y[nextcontrol];
			var dist = 0;
			var oldx = this.trackx[0];
			var oldy = this.tracky[0];
			var i;
			var x = 0;
			var y = 0;
			var deltat = 0;
			var deltadist = 0;
			var olddist = 0;
			var oldt = 0;
			var previouscontrolindex = 0;
			// we are assuming the track starts at the start which is index 0...
			// look at each track point and see if it matches the next control location
			for ( i = 1; i < this.trackx.length; i++) {
				// calculate distance while we are looping through
				x = this.trackx[i];
				y = this.tracky[i];
				dist = dist + Math.sqrt(((x - oldx) * (x - oldx)) + ((y - oldy) * (y - oldy)));
				this.cumulativedistance[i] = parseInt(dist, 10);
				oldx = x;
				oldy = y;
				// track ends at control
				if ((nextx == x) && (nexty == y)) {
					// no split for start
					this.xysecs[i] = parseInt(this.splits[nextcontrol - 1], 10);
					// go back and add interpolated time at each point based on cumulative distance
					// this assumes uniform speed...
					oldt = this.xysecs[previouscontrolindex];
					deltat = this.xysecs[i] - oldt;
					olddist = this.cumulativedistance[previouscontrolindex];
					deltadist = this.cumulativedistance[i] - olddist;
					for (var j = previouscontrolindex; j <= i; j++) {
						this.xysecs[j] = oldt + parseInt(((this.cumulativedistance[j] - olddist) * deltat / deltadist), 10);
					}
					previouscontrolindex = i;
					nextcontrol++;
					if (nextcontrol === course.x.length) {
						// we have found all the controls
						this.validTrack = true;
						break;
					} else {
						nextx = course.x[nextcontrol];
						nexty = course.y[nextcontrol];
					}
				}
			}

		},

		expandGPSTrack : function() {
			var t;
			// in theory we get one point every three seconds
			for ( t = 0; t < this.trackx.length; t++) {
				this.xysecs[t] = 3 * t;
			}

		},

		getCourseName : function() {
			if (this.coursename != "") {
				return this.coursename;
			} else {
				return "GPS tracks";
			}
		},
		getRunnerName : function() {
			return this.name;
		},
		getTime : function() {
			return this.time;
		}
	}

	function Controls() {
		this.controls = [];
		this.displayControls = false;
	}


	Controls.prototype = {
		Constructor : Controls,

		addControl : function(code, x, y) {
			var newCode = true;
			for (var i = 0; i < this.controls.length; i++) {
				if (this.controls[i].code === code) {
					newCode = false;
					break;
				}
			}
			if (newCode) {
				this.controls.push(new Control(code, x, y));
			}
		},

		deleteAllControls : function() {
			this.controls.length = 0;
		},

		drawControls : function() {
			if (this.displayControls) {
				ctx.lineWidth = 2;
				ctx.strokeStyle = '#b300ff';
				ctx.font = '14pt Arial';
				ctx.fillStyle = '#b300ff';
				ctx.textAlign = "left";
				ctx.globalAlpha = 1.0;
				// set transparency of overprint
				for (var i = 0; i < this.controls.length; i++) {
					ctx.beginPath();
					ctx.arc(this.controls[i].x, this.controls[i].y, 20, 0, 2 * Math.PI, false);
					ctx.fillText(this.controls[i].code, this.controls[i].x + 20, this.controls[i].y + 20);
					ctx.stroke();
				}

			}
		},

		toggleControlDisplay : function() {
			if (this.displayControls) {
				jQuery("#btn-toggle-controls").button("option", "icons", {
					primary : "ui-icon-radio-off"
				});
				jQuery("#btn-toggle-controls").button("option", "label", "Show controls");
			} else {
				jQuery("#btn-toggle-controls").button("option", "icons", {
					primary : "ui-icon-cancel"
				});
				jQuery("#btn-toggle-controls").button("option", "label", "Hide controls");
			}
			this.displayControls = !this.displayControls;
		}
	}

	function Control(code, x, y) {
		this.code = code;
		this.x = x;
		this.y = y;
	}


	Control.prototype = {
		Constructor : Control,
	}

	function Courses() {
		// indexed by the provided courseid which omits 0 and hence a sparse array
		// careful when iterating or getting length!
		this.courses = [];
		this.totaltracks = 0;
		this.numberofcourses = 0;
		this.highestControlNumber = 0;
	}


	Courses.prototype = {
		Constructor : Courses,

		getCourseName : function(courseid) {
			return this.courses[courseid].name;
		},

		getFullCourse : function(courseid) {
			return courses.courses[courseid];
		},

		incrementTracksCount : function(courseid) {
			this.courses[courseid].incrementTracksCount();
			this.totaltracks++;
		},

		gettrackcountCount : function(courseid) {
			return this.courses[courseid].trackcount;
		},

		getTotalTracksCount : function() {
			return this.totaltracks;
		},

		addCourse : function(courseObject) {
			this.courses[courseObject.courseid] = courseObject;
			this.numberofcourses++;
			// the codes includes Start and Finish: we don't need F so subtract 1 to get controls
			if (this.courses[courseObject.courseid].codes.length > this.highestControlNumber) {
				this.highestControlNumber = this.courses[courseObject.courseid].codes.length - 1;
				this.updateControlDropdown();
			}
		},

		updateControlDropdown: function () {
			jQuery("#rg2-control-select").empty();
			var dropdown = document.getElementById("rg2-control-select");
      for (var i = 0; i < this.highestControlNumber; i++) {
        var opt = document.createElement("option"); 
        opt.value = i;
        if (i === 0) {
        	opt.text = "S";
        } else {
        	opt.text = i;
        }
        dropdown.options.add(opt);
      }
		},
		
		deleteAllCourses : function() {
			this.courses.length = 0;
			this.numberofcourses = 0;
			this.totaltracks = 0;
			this.highestControlNumber = 0;
		},

		drawCourses : function() {
			for (var i = 0; i < this.courses.length; i++) {
				if (this.courses[i] != undefined) {
					this.courses[i].drawCourse();
				}
			}
		},

		putOnDisplay : function(courseid) {
			if (this.courses[courseid] != undefined) {
				this.courses[courseid].display = true;
			}
		},

		putAllOnDisplay : function() {
			for (var i = 0; i < this.courses.length; i++) {
				if (this.courses[i] != undefined) {
					this.courses[i].display = true;
				}
			}
		},

		removeAllFromDisplay : function() {
			for (var i = 0; i < this.courses.length; i++) {
				if (this.courses[i] != undefined) {
					this.courses[i].display = false;
				}
			}
		},

		removeFromDisplay : function(courseid) {
			// remove selected course
			this.courses[courseid].display = false;

		},

		isOnDisplay : function(courseid) {
			return this.courses[courseid].display;
		},

		toggleDisplay : function(courseid) {
			this.courses[courseid].toggleDisplay();
		},

		getNumberOfCourses : function() {
			return this.numberofcourses;
		},

		// look through all courses and extract list of controls
		generateControlList : function() {
			var codes;
			var x;
			var y;
			// for all courses
			for (var i = 0; i < this.courses.length; i++) {
				if (this.courses[i] !== undefined) {
					codes = this.courses[i].codes;
					x = this.courses[i].x;
					y = this.courses[i].y;
					// for all controls on course
					if (codes !== undefined) {
						for (var j = 0; j < codes.length; j++) {
							controls.addControl(codes[j], x[j], y[j]);
						}
					}
				}
			}
		},

		formatCoursesAsTable : function() {
			var html = "<table class='coursemenutable'><tr><th>Course</th><th>Show</th><th>Tracks</th><th>Show</th></tr>";
			for (var i = 0; i < this.courses.length; i++) {
				if (this.courses[i] != undefined) {
					html += "<tr><td>" + this.courses[i].name + "</td>";
					html += "<td><input class='courselist' id=" + i + " type=checkbox name=course></input></td>";
					html += "<td>" + this.courses[i].trackcount + "</td>";
					if (this.courses[i].trackcount > 0) {
						html += "<td><input id=" + i + " class='tracklist' type=checkbox name=track></input></td>";
					} else {
						html += "<td></td>";						
					}
					html += "</tr>";
				}
			}
			// add bottom row for all courses checkboxes
			html += "<tr><td>All</td>";
			html += "<td><input class='allcourses' id=" + i + " type=checkbox name=course></input></td>";
			if (this.totaltracks > 0) {
			  html += "<td>" + this.totaltracks + "</td><td><input id=" + i + " class='alltracks' type=checkbox name=track></input></td>";
			} else {
			  html += "<td>" + this.totaltracks + "</td><td></td>";				
			}
			html += "</tr></table>";
			return html;
		}
	}

	function Course(data) {
		this.name = data.name;
		this.trackcount = 0;
		this.status = data.status;
		this.display = false;
		this.courseid = data.courseid;
		// coord sets are separated by "N"
		this.temp = data.coords.split("N");
		this.coords = [];
		for (var i = 0; i < this.temp.length; i++) {
			// coord sets are 5 items in csv format
			(this.coords).push(new CourseCoord(this.temp[i].split(";")));
		}
		this.codes = data.codes;
		this.x = data.xpos;
		this.y = data.ypos;
		this.temp = 0;
	}


	Course.prototype = {
		Constructor : Course,

		incrementTracksCount : function() {
			this.trackcount++;
		},
		getCourseID : function() {
			return this.courseid;
		},

		toggleDisplay : function() {
			this.display = !this.display;
		},
		drawCourse : function() {
			if (this.display) {
				var temp;
				ctx.lineWidth = 2;
				ctx.strokeStyle = '#b300ff';
				// purple
				ctx.font = '20pt Arial';
				ctx.fillStyle = '#b300ff';
				// purple
				ctx.globalAlpha = 1.0;
				// set transparency of overprint
				for (var i = 0; i < this.coords.length; i++) {
					temp = this.coords[i];
					switch (temp.type) {
						case 1:
							// control circle
							ctx.beginPath();
							ctx.arc(temp.x, temp.y, 20, 0, 2 * Math.PI, false);
							ctx.stroke();
							break;
						case 2:
							// finish circle
							ctx.beginPath();
							ctx.arc(temp.x, temp.y, 16, 0, 2 * Math.PI, false);
							ctx.arc(temp.x, temp.y, 24, 0, 2 * Math.PI, false);
							ctx.stroke();
							break;
						case 3:
							// text
							ctx.beginPath();
							ctx.fillText(temp.a, temp.x, temp.y);
							ctx.stroke();
							break;
						case 4:
							// lines
							ctx.beginPath();
							ctx.moveTo(temp.a, temp.b);
							ctx.lineTo(temp.x, temp.y);
							ctx.stroke();
							break;
					}
				}
			}
		}
	};

	function CourseCoord(data) {
		// store y and b as positive rather than negative to simplify screen drawing
		this.type = parseInt(data[0], 10);
		this.x = parseInt(data[1], 10);
		this.y = -1 * parseInt(data[2], 10);
		this.a = parseInt(data[3], 10);
		this.b = -1 * parseInt(data[4], 10);
	}

	var canvas = jQuery("#rg2-map-canvas")[0];
	var ctx = canvas.getContext('2d');
	var map = new Image();
	var mapLoadingText = "Select an event";
	var events = new Events();
	var courses = new Courses();
	var results = new Results();
	var controls = new Controls();
	var animation = new Animation();
	var timer = 0;
	// added to resultid when saving a GPS track
	var GPS_RESULT_OFFSET = 50000;

	initialize();

	function initialize() {

		jQuery("#rg2-about-dialog").hide();
  	jQuery("#rg2-track-names").hide();
  	
		trackTransforms(ctx);
		resizeCanvas();
		
		jQuery(document).tooltip();
		    
		jQuery("#rg2-about").click(function() {
			displayAboutDialog();
		});

		// start with Event list on Panel 0 active
		jQuery("#rg2-info-panel").tabs({
	    active : 0,
			heightStyle : "content"
		});
		// disable courses, results and replay until we have loaded some
		jQuery("#rg2-info-panel").tabs({
			disabled : [1, 2, 3]
		});

		jQuery("#rg2-result-list").accordion({
			collapsible : true,
			heightStyle : "content",
			select : function(event, ui) {
				console.log("Result index selected: " + ui.item[0].id);
			}
		});

		jQuery("#rg2-clock").text("00:00:00");
		jQuery("#rg2-clock-slider").slider({
			slide : function(event, ui) {
				// passes slider value as new time
				animation.clockSliderMoved(ui.value);
			}
		});

		jQuery("#btn-mass-start").prop('checked', true);
		jQuery("#btn-replay-type").buttonset().click(function(event) {
			animation.setReplayType();
		});
		
		jQuery("#rg2-control-select").click(function(event) {
			animation.setStartControl(jQuery("#rg2-control-select").val());
		});

		jQuery("#btn-zoom-in").button({
			icons : {
				primary : 'ui-icon-zoomin'
			}
		}).click(function() {
			zoom(1);
		});

		jQuery("#btn-reset").button({
			icons : {
				primary : 'ui-icon-arrowrefresh-1-s'
			}
		}).click(function() {
			resetMapState();
		});

		jQuery("#btn-zoom-out").button({
			icons : {
				primary : 'ui-icon-zoomout'
			}
		}).click(function() {
			zoom(-1);
		});

		jQuery("#btn-start-stop").button({
			icons : {
				primary : 'ui-icon-play'
			}
		}).click(function() {
			animation.toggleAnimation();
		});

		jQuery("#btn-faster").button({
			icons : {
				primary : 'ui-icon-plus'
			}
		}).click(function() {
			animation.goFaster();
		});

		jQuery("#btn-slower").button({
			icons : {
				primary : 'ui-icon-minus'
			}
		}).click(function() {
			animation.goSlower();
		});

		jQuery("#btn-toggle-controls").button({
			icons : {
				primary : 'ui-icon-radio-off'
			}
		}).click(function() {
			controls.toggleControlDisplay();
			redraw(false);
		});
		// enable once we have courses loaded
		jQuery("#btn-toggle-controls").button("disable");
		
		// set default to 0 secs = no tails 
		jQuery("#spn-tail-length").spinner({
			max: 600,
			min:0,
			spin: function(event, ui) {
			  animation.setTailLength(ui.value);
			}
		}).val(0);

		jQuery("#btn-full-tails").prop('checked', false);
		jQuery("#btn-full-tails").click(function(event) {
			if (event.target.checked) {
				animation.setFullTails(true);
		    jQuery("#spn-tail-length").spinner("disable");
			} else {
				animation.setFullTails(false);
		    jQuery("#spn-tail-length").spinner("enable");

			}
		});

		window.addEventListener('resize', resizeCanvas, false);

		// load event details
		jQuery.getJSON(json_url, {
			type : "events"
		}).done(function(json) {
			console.log("Events: " + json.data.length);
			jQuery.each(json.data, function() {
				events.addEvent(new Event(this));
			});
			createEventMenu();
		}).fail(function(jqxhr, textStatus, error) {
			var err = textStatus + ", " + error;
			console.log("Events request failed: " + err);
		});
		
		// force redraw once map has loaded
		map.addEventListener("load", function() {
			resetMapState();
		}, false);
		
	}

	function resetMapState() {
		// place map in centre of canvas and scales it down to fit
		var heightscale =  canvas.height / map.height;
		var mapscale;
		if (heightscale < 1) {
			mapscale = heightscale;
		} else {
			mapscale = 1;
		}
		ctx.setTransform(mapscale, 0, 0, mapscale, 350, 0);
		ctx.save();
		redraw(false);
	}

	function resizeCanvas() {
		var winwidth = window.innerWidth;
		var winheight = window.innerHeight;
		jQuery("#rg2-container").css("height", winheight - 70);
		canvas.width = winwidth - 10;
		canvas.height = winheight - 70;
		redraw(false);
	}

	/* called whenever anything changes enough to need screen redraw
   * @param fromTimer {Boolean} true if called from timer: used to determine if animation time should be incremented
	*/
	function redraw(fromTimer) {
		// Clear the entire canvas
		// first save current transformed state
		ctx.save();
		// reset everything back to initial size/state/orientation
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		// clear the canvas
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		// go back to where we started
		ctx.restore();
		// set transparency of map to none
		ctx.globalAlpha = 1.0;

		if (map.height > 0) {
			ctx.drawImage(map, 0, 0);
			courses.drawCourses();
			results.drawTracks();
			controls.drawControls();
			// parameter determines if animation time is updated or not
			if (fromTimer) {
				animation.runAnimation(true);
			} else {
				animation.runAnimation(false);
			}
		} else {
			ctx.fillStyle = "#cccccc";
			ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
			ctx.font = '30pt Arial';
			ctx.textAlign = 'center';
			ctx.fillStyle = "#222222";
			ctx.fillText(mapLoadingText, (((canvas.width - 350) / 2) + 350), canvas.height / 2);
		}

	}

	function displayAboutDialog() {
		jQuery("#rg2-about-dialog").dialog({
			//modal : true,
			minWidth : 400,
			buttons : {
				Ok : function() {
					jQuery(this).dialog("close");
				}
			}
		})
	}


	var lastX = canvas.width / 2, lastY = canvas.height / 2;
	var dragStart;
	var dragged;
	canvas.addEventListener('mousedown', function(evt) {
		document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = 'none';
		lastX = evt.offsetX || (evt.pageX - canvas.offsetLeft);
		lastY = evt.offsetY || (evt.pageY - canvas.offsetTop);
		dragStart = ctx.transformedPoint(lastX, lastY);
		dragged = false;
	}, false);
	canvas.addEventListener('mousemove', function(evt) {
		lastX = evt.offsetX || (evt.pageX - canvas.offsetLeft);
		lastY = evt.offsetY || (evt.pageY - canvas.offsetTop);
		dragged = true;
		if (dragStart) {
			var pt = ctx.transformedPoint(lastX, lastY);
			ctx.translate(pt.x - dragStart.x, pt.y - dragStart.y);
			redraw();
		}
	}, false);

	canvas.addEventListener('mouseup', function(evt) {
		dragStart = null;
		// if mouse hasn't moved since mousedown then treat as a zoom request'
		// no key zooms in, shift key zooms out
		if (!dragged) {
			zoom(evt.shiftKey ? -1 : 1);
		}
	}, false);

	var scaleFactor = 1.1;
	var zoom = function(zoomDirection) {
		var pt = ctx.transformedPoint(lastX, lastY);
		ctx.translate(pt.x, pt.y);
		var factor = Math.pow(scaleFactor, zoomDirection);
		ctx.scale(factor, factor);
		ctx.translate(-pt.x, -pt.y);
		redraw();
	};

	var handleScroll = function(evt) {
		var delta = evt.wheelDelta ? evt.wheelDelta / 40 : evt.detail ? -evt.detail : 0;
		if (delta) {
			zoom(delta);
		}
		return evt.preventDefault() && false;
	};
	canvas.addEventListener('DOMMouseScroll', handleScroll, false);
	canvas.addEventListener('mousewheel', handleScroll, false);

	

	function createEventMenu() {
		//loads menu from populated events array
		var html = events.formatEventsAsMenu();
		jQuery("#rg2-event-list").append(html);

		jQuery("#rg2-event-list").menu({
			select : function(event, ui) {
				// new event selected: show we are waiting
				jQuery('body').css('cursor', 'wait');
				courses.deleteAllCourses();
				controls.deleteAllControls();
				animation.resetAnimation();
				results.deleteAllResults();
				mapLoadingText = "Map loading...";
				redraw();
				events.setActiveEventID(ui.item[0].id);
				// load chosen map
				// map gets redrawn automatically on load so that's it for here
				map.src = maps_url + "/" + events.getActiveMapID() + '.jpg';

				// set title bar
				jQuery("#rg2-event-title").text(events.getActiveEventName() + ": " + events.getActiveEventDate());

				// get courses for event

				jQuery.getJSON(json_url, {
					id : events.getKartatEventID(),
					type : "courses"
				}).done(function(json) {
					console.log("Courses: " + json.data.length);
					jQuery.each(json.data, function() {
						courses.addCourse(new Course(this));
					});
					courses.generateControlList();
       		jQuery("#btn-toggle-controls").button("enable");
					getResults();
				}).fail(function(jqxhr, textStatus, error) {
					jQuery('body').css('cursor', 'auto');
					var err = textStatus + ", " + error;
					console.log("Courses request failed: " + err);
				});

			}
		});

	}

	function getResults() {

		jQuery.getJSON(json_url, {
			id : events.getKartatEventID(),
			type : "results"
		}).done(function(json) {
			console.log("Results: " + json.data.length);
			jQuery.each(json.data, function() {
				results.addResult(new Result(this));
			});
			jQuery("#rg2-result-list").accordion("refresh");
			getGPSTracks();
		}).fail(function(jqxhr, textStatus, error) {
			jQuery('body').css('cursor', 'auto');
			var err = textStatus + ", " + error;
			console.log("Results request failed: " + err);
		});
	}

	function getGPSTracks() {
		jQuery.getJSON(json_url, {
			id : events.getKartatEventID(),
			type : "tracks"
		}).done(function(json) {
			console.log("Tracks: " + json.data.length);
			results.addTracks(json.data);
			createCourseMenu();
			createResultMenu();
			jQuery('body').css('cursor', 'auto');
			// enable Courses, Results and Replay tabs
			jQuery("#rg2-info-panel").tabs("enable", 1);
			jQuery("#rg2-info-panel").tabs("enable", 2);
			jQuery("#rg2-info-panel").tabs("enable", 3);
			// open courses tab
			jQuery("#rg2-info-panel").tabs("option", "active", 1);
			jQuery("#rg2-info-panel").tabs("refresh");
			redraw();
		}).fail(function(jqxhr, textStatus, error) {
			jQuery('body').css('cursor', 'auto');
			var err = textStatus + ", " + error;
			console.log("Tracks request failed: " + err);
		});
	}

	function createCourseMenu() {
		//loads menu from populated courses array
		jQuery("#rg2-course-table").empty();
		jQuery("#rg2-course-table").append(courses.formatCoursesAsTable());

		// checkbox on course tab to show a course
		jQuery(".courselist").click(function(event) {
			if (event.target.checked) {
				courses.putOnDisplay(parseInt(event.currentTarget.id, 10));
			} else {
				courses.removeFromDisplay(parseInt(event.currentTarget.id, 10));
				// make sure the all checkbox is not checked
				jQuery(".allcourses").prop('checked', false);
			}
			redraw();
		})
		// checkbox on course tab to show all courses
		jQuery(".allcourses").click(function(event) {
			if (event.target.checked) {
				courses.putAllOnDisplay();
				// select all the individual checkboxes for each course
				jQuery(".courselist").prop('checked', true);
			} else {
				courses.removeAllFromDisplay();
				jQuery(".courselist").prop('checked', false);
			}
			redraw();
		})
		// checkbox on course tab to show tracks for one course
		jQuery(".tracklist").click(function(event) {
			var courseid = event.target.id;
			if (event.target.checked) {
				results.putTracksOnDisplay(courseid);
			} else {
				results.removeTracksFromDisplay(courseid);
				// make sure the all checkbox is not checked
				jQuery(".alltracks").prop('checked', false);
			}
			redraw();
		})
		// checkbox on course tab to show all tracks
		jQuery(".alltracks").click(function(event) {
			if (event.target.checked) {
				results.putAllTracksOnDisplay();
				// select all the individual checkboxes for each course
				jQuery(".tracklist").prop('checked', true);
			} else {
				results.removeAllTracksFromDisplay();
				// deselect all the individual checkboxes for each course
				jQuery(".tracklist").prop('checked', false);
			}
			redraw();
		})
	}

	function createResultMenu() {
		//loads menu from populated result array
		var html = results.formatResultListAsAccordion();

		jQuery("#rg2-result-list").empty();
		jQuery("#rg2-result-list").append(html);

		jQuery("#rg2-result-list").accordion("refresh");

		jQuery("#rg2-info-panel").tabs("refresh");

		// checkbox on result tab to show a course
		jQuery(".showcourse").click(function(event) {
			if (event.target.checked) {
				courses.putOnDisplay(event.target.id);
			} else {
				courses.removeFromDisplay(event.target.id);
			}
			redraw();
		})
		// checkbox on result tab to show a result
		jQuery(".showtrack").click(function(event) {
			if (event.target.checked) {
				results.putOneTrackOnDisplay(event.target.id);
			} else {
				results.removeOneTrackFromDisplay(event.target.id);
			}
			redraw();
		})
		// checkbox on result tab to animate a result
		jQuery(".replay").click(function(event) {
			if (event.target.checked) {
				animation.addRunner(new Runner(event.target.id));
			} else {
				animation.removeRunner(event.target.id);
			}
			redraw();
		})
	}

});
