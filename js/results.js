/*global rg2:false */
/*global Colours:false */
/*global getDistanceBetweenPoints:false */
function Results() {
	this.results = [];
}

Results.prototype = {
	Constructor : Results,

	addResults : function(data, isScoreEvent) {
		// for each result
		var l = data.length;
		for (var i = 0; i < l; i += 1) {
			var result = new Result(data[i], isScoreEvent);
			this.results.push(result);
		}
		this.generateLegPositions();
	},

  // lists all runners on a given course
  getAllRunnersForCourse : function(courseid) {
    var i;
    var runners = [];
    for (i = 0; i < this.results.length; i += 1) {
      if (this.results[i].courseid === courseid) {
        runners.push(i);
      }
    }
    return runners;
  },

  generateLegPositions: function() {
    var i;
    var j;
    var k;
    var courses;
    var controls;
    courses = [];
    controls = [];
    for (i = 0; i < this.results.length; i += 1) {
      if (courses.indexOf(this.results[i].courseid) === -1) {
        courses.push(this.results[i].courseid);
        // not a good way fo finding number of controls: better to get from courses?
        controls.push(this.results[i].splits.length);
      }
    
    }
    var pos = [];
    var p;
    for (i = 0; i < courses.length; i += 1) {
      //console.log("Generate positions for course " + courses[i]);

      // start at 1 since 0 is time 0
      for (k = 1; k < controls[i]; k += 1) {
        pos.length = 0;
        for (j = 0; j < this.results.length; j += 1) {
          if (this.results[j].courseid === courses[i]) {
            p = {};
            p.time = this.results[j].splits[k];
            p.id = j;
            pos.push(p);
          }
        }
        pos.sort(this.sortTimes);
        //console.log(pos);
        for (j = 0; j < pos.length; j+= 1) {
          // no allowance for ties yet
          this.results[pos[j].id].legpos[k] = j + 1;
        }
      }
    }
  },

  sortTimes : function(a, b) {
    return a.time - b.time;
  },
  
	getResultsByCourseID : function(courseid) {
		var count = 0;
		for (var i = 0; i < this.results.length; i += 1) {
			if (this.results[i].courseid === courseid) {
				count += 1;
			}

		}
		return count;
	},

  getRoutesForEvent : function() {
    var routes = [];
    var route;
    for (var i = 0; i < this.results.length; i += 1) {
      if (this.results[i].hasValidTrack) {
        route = {};
        route.id = i;
        route.resultid = this.results[i].resultid;
        route.name = this.results[i].name;
        route.time = this.results[i].time;
        route.coursename = this.results[i].coursename;
        routes.push(route);
      }
    }
    return routes;
  },

	getTotalResults : function() {
		return this.results.length;
	},

	getCourseID : function(resultid) {
		return this.results[resultid].courseid;
	},

	getFullResult : function(resultid) {
		return this.results[resultid];
	},

	drawTracks : function() {
    var showthreesecs;
    var showGPSspeed;
    // check if +3 to be displayed once here rather than every time through loop
    showthreesecs = rg2.showThreeSeconds();
    showGPSspeed = rg2.showGPSSpeed();
		for (var i = 0; i < this.results.length; i += 1) {
			this.results[i].drawTrack(showthreesecs, showGPSspeed);
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
		for (var i = 0; i < this.results.length; i += 1) {
			if (this.results[i].courseid == courseid) {
				this.results[i].putTrackOnDisplay();
			}
		}
		this.updateTrackNames();
	},

	// put all tracks for all courses on display
	putAllTracksOnDisplay : function() {
    var i;
    var l;
    l = this.results.length;
		for (i = 0; i < l; i += 1) {
			this.results[i].putTrackOnDisplay();
		}
		this.updateTrackNames();
	},

	getDisplayedTrackNames : function() {
		var html = "";
		for (var i = 0; i < this.results.length; i += 1) {
			if (this.results[i].displayTrack) {
				html += "<p style='color:" + this.results[i].trackColour + ";'>" + rg2.getCourseName(this.results[i].courseid);
				html += ": " + this.results[i].name + "</p>";
			}
		}
		return html;
	},

	resultIDExists : function(resultid) {
		for (var i = 0; i < this.results.length; i += 1) {
			if (resultid === this.results[i].resultid) {
				return true;
			}
		}
		return false;
	},

	getSplitsForID : function(resultid) {
		for (var i = 0; i < this.results.length; i += 1) {
			if (resultid === this.results[i].resultid) {
				return this.results[i].splits;
			}
		}
		return rg2.config.SPLITS_NOT_FOUND;
	},

	getTimeForID : function(resultid) {
		for (var i = 0; i < this.results.length; i += 1) {
			if (resultid === this.results[i].resultid) {
				return this.results[i].time;
			}
		}
		return rg2.config.TIME_NOT_FOUND;
	},

	removeAllTracksFromDisplay : function() {
		for (var i = 0; i < this.results.length; i += 1) {
			this.results[i].removeTrackFromDisplay();
		}
		this.updateTrackNames();
	},

	removeTracksFromDisplay : function(courseid) {
		for (var i = 0; i < this.results.length; i += 1) {
			if (this.results[i].courseid == courseid) {
				this.results[i].removeTrackFromDisplay();
			}
		}
		this.updateTrackNames();
	},

	addTracks : function(tracks) {
		// this gets passed the json data array
		var resultIndex;
		var i;
		var j;
		var l;
		// for each track
		l = tracks.length;
		for (i = 0; i < l; i += 1) {
			resultIndex = tracks[i].resultid;
			j = 0;
			// don't add GPS track since we got a better one in the original results
			if (resultIndex < rg2.config.GPS_RESULT_OFFSET) {
				// loop through all results and add it against the correct id
				while (j < this.results.length) {
					if (resultIndex == this.results[j].resultid) {
						this.results[j].addTrack(tracks[i]);
						break;
					}
					j += 1;
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
    var i;
    var l;
    var tracksForThisCourse = 0;
    l = this.results.length;
		for (i = 0; i < l; i += 1) {
			temp = this.results[i];
			if (temp.courseid != oldCourseID) {
				// found a new course so add header
				if (firstCourse) {
					firstCourse = false;
				} else {
          // add bottom row for all tracks checkboxes
          // <CAREFUL!> these lines need to be identical to those below
          html += "<tr class='allitemsrow'><td>All</td><td></td>";
          if (tracksForThisCourse > 0) {
            html += "<td><input class='allcoursetracks' id=" + oldCourseID + " type=checkbox name=track></input></td>";
          } else {
            html += "<td></td>";
          }
          html += "<td><input class='allcoursereplay' id=" + oldCourseID + " type=checkbox name=replay></input></td></tr>";
          // </CAREFUL!>
					html += "</table></div>";
				}
				tracksForThisCourse = 0;
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
        tracksForThisCourse += 1;
				html += "<td><input class='showtrack showtrack-" + oldCourseID + "' id=" + i + " type=checkbox name=result></input></td>";
			} else {
				html += "<td></td>";
			}
			html += "<td><input class='showreplay showreplay-" + oldCourseID + "' id=" + i + " type=checkbox name=replay></input></td></tr>";
		}
		
		if (html === "") {
			html = "<p>No results available.</p>";
		} else {
      // add bottom row for all tracks checkboxes
      // <CAREFUL!> these lines need to be identical to those above
      html += "<tr class='allitemsrow'><td>All</td><td></td>";
      if (tracksForThisCourse > 0) {
        html += "<td><input class='allcoursetracks' id=" + oldCourseID + " type=checkbox name=track></input></td>";
      } else {
        html += "<td></td>";
      }
      html += "<td><input class='allcoursereplay' id=" + oldCourseID + " type=checkbox name=replay></input></td></tr>";
      // </CAREFUL!>
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
		for (var i = 0; i < this.results.length; i += 1) {
			// don't include result if it has a valid track already
			if ((this.results[i].courseid === courseid) && (!this.results[i].hasValidTrack)) {
				opt = document.createElement("option");
				opt.value = i;
				opt.text = this.results[i].name;
				dropdown.options.add(opt);
			}
		}
		dropdown.options.add(opt);
	}
};

function Result(data, isScoreEvent) {
	// resultid is the kartat id value
	this.resultid = data.resultid;
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
	this.initials = this.getInitials(this.name);
	this.starttime = data.starttime;
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
	this.courseid = data.courseid;
	
	this.splits = data.splits;
	// insert a 0 split at the start to make life much easier elsewhere
	this.splits.splice(0, 0, 0);

	if (data.scoreref !== "") {
		// save control locations for score course result
		this.scorex = data.scorex;
		this.scorey = data.scorey;
		this.scorecodes = data.scorecodes;
	}

	// calculated cumulative distance in pixels
	this.cumulativeDistance = [];
	// set true if track includes all expected controls in correct order or is a GPS track
	this.hasValidTrack = false;
	this.displayTrack = false;
	this.trackColour = null;
	// raw track data
	this.trackx = [];
	this.tracky = [];
	this.speedColour = [];
	// interpolated times
	this.xysecs = [];
	if (this.isGPSTrack) {
		// don't get time or splits so need to copy them in from (GPS_RESULT_OFFSET - resultid)
		this.time = rg2.getTimeForID(this.resultid - rg2.config.GPS_RESULT_OFFSET);
		// allow for events with no results where there won't be a non-GPS result
		if (this.time === rg2.config.TIME_NOT_FOUND) {
      this.time = data.time;
		}
		this.splits = rg2.getSplitsForID(this.resultid - rg2.config.GPS_RESULT_OFFSET);

	}
  this.legpos = [];
	if (data.gpsx.length > 0) {
     this.addTrack(data);
	}

  }

Result.prototype = {
	Constructor : Result,

	putTrackOnDisplay : function() {
		if (this.hasValidTrack) {
      if (this.trackColour === null) {
        this.trackColour = rg2.getNextRouteColour();
      }
			this.displayTrack = true;
		}
	},

	removeTrackFromDisplay : function() {
		if (this.hasValidTrack) {
			this.displayTrack = false;
		}
	},
	
	addTrack: function(data) {
    this.trackx = data.gpsx;
    this.tracky = data.gpsy;
    var trackOK;
    if (this.isGPSTrack) {
      trackOK = this.expandGPSTrack();
    } else {
      trackOK = this.expandNormalTrack();
    }
    if (trackOK) {
      rg2.incrementTracksCount(this.courseid);
    }
	},

	drawTrack : function(showThreeSeconds, showGPSSpeed) {
		var l;
		if (this.displayTrack) {
			rg2.ctx.lineWidth = rg2.getRouteWidth();
			rg2.ctx.strokeStyle = this.trackColour;
			rg2.ctx.globalAlpha = rg2.getRouteIntensity();
      rg2.ctx.fillStyle = this.trackColour;
      rg2.ctx.font = '10pt Arial';
      rg2.ctx.textAlign = "left";
			// set transparency of overprint
			rg2.ctx.beginPath();
			rg2.ctx.moveTo(this.trackx[0], this.tracky[0]);
      var oldx = this.trackx[0];
      var oldy = this.tracky[0];
      var stopCount = 0;
			l = this.trackx.length;
			for (var i = 1; i < l; i += 1) {
				// lines
				rg2.ctx.lineTo(this.trackx[i], this.tracky[i]);
        if ((this.trackx[i] === oldx) && (this.tracky[i] === oldy)) {
          // we haven't moved
          stopCount += 1;
        } else {
          // we have started moving again
          if (stopCount > 0) {
            if (!this.isGPSTrack || (this.isGPSTrack && showThreeSeconds)) {
              rg2.ctx.fillText("+" + (3 * stopCount), oldx + 5, oldy + 5);
            }
            stopCount = 0;
          }
        }
        oldx = this.trackx[i];
        oldy = this.tracky[i];
        if (this.isGPSTrack && showGPSSpeed) {
          rg2.ctx.strokeStyle = this.speedColour[i];
          rg2.ctx.stroke();
          rg2.ctx.beginPath();
          rg2.ctx.moveTo(oldx, oldy);
        }
			}
			rg2.ctx.stroke();
		}
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
		var j;
		var l;
		var x = 0;
		var y = 0;
		var deltat = 0;
		var deltadist = 0;
		var olddist = 0;
		var oldt = 0;
		var previouscontrolindex = 0;
		// we are assuming the track starts at the start which is index 0...
		// look at each track point and see if it matches the next control location
		l = this.trackx.length;
		for ( i = 1; i < l; i += 1) {
			// calculate distance while we are looping through
			x = this.trackx[i];
			y = this.tracky[i];
			dist += getDistanceBetweenPoints(x, y, oldx, oldy);
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
				for (j = previouscontrolindex; j <= i; j += 1) {
					this.xysecs[j] = oldt + Math.round(((this.cumulativeDistance[j] - olddist) * deltat / deltadist));
				}
				previouscontrolindex = i;
				nextcontrol += 1;
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
		var delta;
		var maxSpeed = 0;
		var oldDelta = 0;
		var sum;
		var POWER_FACTOR = 1;
		// in theory we get one point every three seconds
		var l = this.trackx.length;
		for ( t = 0; t < l; t += 1) {
			this.xysecs[t] = 3 * t;
			x = this.trackx[t];
			y = this.tracky[t];
			delta = getDistanceBetweenPoints(x, y, oldx, oldy);
			dist += delta;
			sum = delta + oldDelta;
			if (maxSpeed < sum) {
        maxSpeed = sum;
			}
      this.speedColour[t] = Math.pow(sum, POWER_FACTOR);
			this.cumulativeDistance[t] = Math.round(dist);
			oldx = x;
			oldy = y;
			oldDelta = delta;
		}

		this.setSpeedColours(Math.pow(maxSpeed, POWER_FACTOR));
		this.hasValidTrack = true;
		return this.hasValidTrack;

	},

  setSpeedColours: function(maxspeed) {
    var i;
    var red;
    var green;
    var halfmax;
    //console.log("'Max speed = " + maxspeed);
    halfmax = maxspeed / 2;
    // speedColour comes in with speeds at each point and gets updated to the associated colour
    for ( i = 1; i < this.speedColour.length; i += 1) {
      if (this.speedColour[i] > halfmax) {
        // fade green to orange
        red = Math.round(255 * (this.speedColour[i] - halfmax) / halfmax);
        green = 255;
      } else {
        // fade orange to red
        green = Math.round(255 * this.speedColour[i] /halfmax);
        red = 255;
      }
      this.speedColour[i] = '#';
      if (red < 16) {
        this.speedColour[i] += '0';
      }
      this.speedColour[i] += red.toString(16);
      if (green < 16) {
        this.speedColour[i] += '0';
      }
      this.speedColour[i] += green.toString(16) + '00';
    }
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
	},
	
  getInitials : function (name) {
    // converts name to initials
    // remove white space at each end
    if (name === null) {
      return "";
    }
    name.trim();
    var i;
    var addNext;
    var len = name.length;
    var initials = "";
    if (len === 0) {
      return "";
    }
    addNext = true;
    for (i = 0; i < len; i += 1) {
      if (addNext) {
        initials += name.substr(i, 1);
        addNext = false;
      }
      if (name.charAt(i) === " ") {
        addNext = true;
      }
    }
    
    return initials;
  }
};