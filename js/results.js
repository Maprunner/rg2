function Results() {
	this.results = [];
	this.colours = new Colours();
}

Results.prototype = {
	Constructor : Results,

	addResults : function(data, isScoreEvent) {
		// for each result
		for (var i = 0; i < data.length; i++) {
			var result = new Result(data[i], isScoreEvent, this.colours.getNextColour());
			this.results.push(result);
		}
	},

	getResultsByCourseID : function(courseid) {
		var count = 0;
		for (var i = 0; i < this.results.length; i++) {
			if (this.results[i].courseid === courseid) {
				count++;
			}

		}
		return count;
	},

	getTotalResultsByCourseID : function(courseid) {
		return this.results.length;
	},

	getCourseID : function(resultid) {
		return this.results[resultid].courseid;
	},

	getFullResult : function(resultid) {
		return this.results[resultid];
	},

	getKartatResultID : function(resultid) {
		return this.results[resultid].resultid;
	},

	drawTracks : function() {
		for (var i = 0; i < this.results.length; i++) {
			this.results[i].drawTrack();
		}
	},

	updateTrackNames : function() {
		$("#rg2-track-names").empty();
		var html = this.getDisplayedTrackNames();
		if (html !== "") {
			$("#rg2-track-names").append(html);
			$("#rg2-track-names").show();
		} else {
			$("#rg2-track-names").hide();
		}

	},

	putOneTrackOnDisplay : function(resultid) {
		this.results[resultid].putTrackOnDisplay();
		this.updateTrackNames();
	},

	removeOneTrackFromDisplay : function(resultid) {
		this.results[resultid].removeTrackFromDisplay();
		this.updateTrackNames();
	},

	// add all tracks for one course
	putTracksOnDisplay : function(courseid) {
		for (var i = 0; i < this.results.length; i++) {
			if (this.results[i].courseid == courseid) {
				this.results[i].putTrackOnDisplay();
			}
		}
		this.updateTrackNames();
	},

	// put all tracks for all courses on display
	putAllTracksOnDisplay : function() {
		for (var i = 0; i < this.results.length; i++) {
			this.results[i].putTrackOnDisplay();
		}
		this.updateTrackNames();
	},

	getDisplayedTrackNames : function() {
		var html = "";
		for (var i = 0; i < this.results.length; i++) {
			if (this.results[i].displayTrack) {
				html += "<p style='color:" + this.results[i].trackColour + ";'>" + rg2.getCourseName(this.results[i].courseid);
				html += ": " + this.results[i].name + "</p>";
			}
		}
		return html;
	},

	resultIDExists : function(resultid) {
		for (var i = 0; i < this.results.length; i++) {
			if (resultid === this.results[i].resultid) {
				return true;
			}
		}
		return false;
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
		this.updateTrackNames();
	},

	removeTracksFromDisplay : function(courseid) {
		for (var i = 0; i < this.results.length; i++) {
			if (this.results[i].courseid == courseid) {
				this.results[i].removeTrackFromDisplay();
			}
		}
		this.updateTrackNames();
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
			if (resultIndex < rg2.config.GPS_RESULT_OFFSET) {
				// loop through all results and add it against the correct id
				while (j < this.results.length) {
					if (resultIndex == this.results[j].resultid) {
						if (this.results[j].addTrack(tracks[i].coords)) {
							rg2.incrementTracksCount(this.results[j].courseid);
						}
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

	sortByCourseIDThenResultID : function(a, b) {
		if (a.courseid > b.courseid) {
			return 1;
		} else if (b.courseid > a.courseid) {
			return -1;
		} else {
			return a.resultid - b.resultid;
		}
	},

	formatResultListAsAccordion : function() {
		// puts all GPS results at bottom of relevant course results
		this.results.sort(this.sortByCourseIDThenResultID);

		var html = "";
		var temp;
		var firstCourse = true;
		var oldCourseID = 0;
		for (var i = 0; i < this.results.length; i++) {
			temp = this.results[i];
			if (temp.courseid != oldCourseID) {
				// found a new course so add header
				if (firstCourse) {
					firstCourse = false;
				} else {
					html += "</table></div>";
				}
				html += "<h3>" + temp.coursename;
				html += "<input class='showcourse' id=" + temp.courseid + " type=checkbox name=course title='Show course'></input></h3><div>";
				html += "<table class='resulttable'><tr><th>Name</th><th>Time</th><th>Track</th><th>Replay</th></tr>";
				oldCourseID = temp.courseid;
			}
			if (temp.comments !== "") {
				html += "<tr><td><a href='#' title='" + temp.comments + "'>" + temp.name + "</a></td><td>" + temp.time + "</td>";
			} else {
				html += "<tr><td>" + temp.name + "</td><td>" + temp.time + "</td>";
			}
			if (temp.hasValidTrack) {
				html += "<td><input class='showtrack' id=" + i + " type=checkbox name=result></input></td>";
			} else {
				html += "<td></td>";
			}
			html += "<td><input class='replay' id=" + i + " type=checkbox name=replay></input></td></tr>";
		}
		
		if (html === "") {
			html = "<p>No results available.</p>";
		} else {
			html += "</table></div></div>";
		}
		return html;
	},

	createNameDropdown : function(courseid) {
		$("#rg2-name-select").empty();
		var dropdown = document.getElementById("rg2-name-select");
		var opt = document.createElement("option");
		opt.value = null;
		opt.text = 'Select name';
		dropdown.options.add(opt);
		for (var i = 0; i < this.results.length; i++) {
			// don't include result if it has a valid track already
			if ((this.results[i].courseid === courseid) && (!this.results[i].hasValidTrack)) {
				opt = document.createElement("option");
				opt.value = i;
				opt.text = this.results[i].name;
				dropdown.options.add(opt);
			}
		}
		dropdown.options.add(opt);
	},
};

function Result(data, isScoreEvent, colour) {
	// resultid is the kartat id value
	this.resultid = parseInt(data.resultid, 10);
	this.isScoreEvent = isScoreEvent;
	// GPS track ids are normal resultid + GPS_RESULT_OFFSET
	if (this.resultid >= rg2.config.GPS_RESULT_OFFSET) {
		//this.name = (data.name).replace("GPS ", "");
		this.isGPSTrack = true;
	} else {
		//this.name = data.name;
		this.isGPSTrack = false;
	}
	this.name = data.name;
	this.starttime = Math.round(data.starttime);
	this.time = data.time;
	// get round iconv problem in API for now
	if (data.comments !== null) {
		// escape single quotes so that tooltips show correctly
		this.comments = data.comments.replace("'", "&apos;");
	} else {
		this.comments = "";
	}
	this.coursename = data.coursename;
	if (this.coursename === "") {
		this.coursename = data.courseid;
	}
	this.courseid = parseInt(data.courseid, 10);
	this.splits = data.splits.split(";");
	// force to integers to avoid doing it every time we read it
	for (var i = 0; i < this.splits.length; i++) {
		this.splits[i] = Math.round(this.splits[i]);
	}
	// insert a 0 split at the start to make life much easier elsewhere
	this.splits.splice(0, 0, 0);

	if (data.scoreref !== "") {
		// save control locations for score course result
		this.scorex = data.scorex;
		this.scorey = data.scorey;
	}

	// calculated cumulative distance in pixels
	this.cumulativeDistance = [];
	// set true if track includes all expected controls in correct order
	// or is a GPS track
	this.hasValidTrack = false;
	this.displayTrack = false;
	this.trackColour = colour;
	// raw track data
	this.trackx = [];
	this.tracky = [];
	// interpolated times
	this.xysecs = [];
	if (this.isGPSTrack) {
		// don't get time or splits so need to copy them in from (GPS_RESULT_OFFSET - resultid)
		this.time = rg2.getTimeForID(this.resultid - rg2.config.GPS_RESULT_OFFSET);
		this.splits = rg2.getSplitsForID(this.resultid - rg2.config.GPS_RESULT_OFFSET);

	}
	if (data.gpscoords.length > 0) {
		if (this.addTrack(data.gpscoords)) {
			rg2.incrementTracksCount(this.courseid);
		}
	}

}

Result.prototype = {
	Constructor : Result,

	putTrackOnDisplay : function() {
		if (this.hasValidTrack) {
			this.displayTrack = true;
		}
	},

	removeTrackFromDisplay : function() {
		if (this.hasValidTrack) {
			this.displayTrack = false;
		}
	},

	drawTrack : function() {
		if (this.displayTrack) {
			rg2.ctx.lineWidth = 2;
			rg2.ctx.strokeStyle = this.trackColour;
			rg2.ctx.globalAlpha = 1.0;
			// set transparency of overprint
			rg2.ctx.beginPath();
			rg2.ctx.moveTo(this.trackx[0], this.tracky[0]);
			for (var i = 1; i < this.trackx.length; i++) {
				// lines
				rg2.ctx.lineTo(this.trackx[i], this.tracky[i]);
			}
			rg2.ctx.stroke();

		}
	},

	addTrack : function(trackcoords, getFullCourse) {
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
		var trackOK;
		if (this.isGPSTrack) {
			trackOK = this.expandGPSTrack();
		} else {
			trackOK = this.expandNormalTrack();
		}
		return trackOK;
	},

	expandNormalTrack : function() {
		// add times and distances at each position
		this.xysecs[0] = 0;
		this.cumulativeDistance[0] = 0;
		// get course details
		var course = {};
		// each person has their own defined score course
		if (this.isScoreEvent) {
			course.x = this.scorex;
			course.y = this.scorey;
		} else {
			//course.x = getFullCourse(this.courseid).x;
			//course.y = getFullCourse(this.courseid).y;
			course.x = rg2.getCourseDetails(this.courseid).x;
			course.y = rg2.getCourseDetails(this.courseid).y;

		}
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
			this.cumulativeDistance[i] = Math.round(dist);
			oldx = x;
			oldy = y;
			// track ends at control
			if ((nextx == x) && (nexty == y)) {
				this.xysecs[i] = parseInt(this.splits[nextcontrol], 10);
				// go back and add interpolated time at each point based on cumulative distance
				// this assumes uniform speed...
				oldt = this.xysecs[previouscontrolindex];
				deltat = this.xysecs[i] - oldt;
				olddist = this.cumulativeDistance[previouscontrolindex];
				deltadist = this.cumulativeDistance[i] - olddist;
				for (var j = previouscontrolindex; j <= i; j++) {
					this.xysecs[j] = oldt + Math.round(((this.cumulativeDistance[j] - olddist) * deltat / deltadist));
				}
				previouscontrolindex = i;
				nextcontrol++;
				if (nextcontrol === course.x.length) {
					// we have found all the controls
					this.hasValidTrack = true;
					break;
				} else {
					nextx = course.x[nextcontrol];
					nexty = course.y[nextcontrol];
				}
			}
		}
		// treat all score tracks as valid for now
		// may need a complete rethink on score course handling later
		if (this.isScoreEvent) {
			this.hasValidTrack = true;
		}
		return this.hasValidTrack;
	},

	expandGPSTrack : function() {
		var t;
		var dist = 0;
		var oldx = this.trackx[0];
		var oldy = this.tracky[0];
		var x = 0;
		var y = 0;
		// in theory we get one point every three seconds
		for ( t = 0; t < this.trackx.length; t++) {
			this.xysecs[t] = 3 * t;
			x = this.trackx[t];
			y = this.tracky[t];
			dist = dist + Math.sqrt(((x - oldx) * (x - oldx)) + ((y - oldy) * (y - oldy)));
			this.cumulativeDistance[t] = Math.round(dist);
			oldx = x;
			oldy = y;
		}
		this.hasValidTrack = true;
		return this.hasValidTrack;

	},

	getCourseName : function() {
		if (this.coursename !== "") {
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
};