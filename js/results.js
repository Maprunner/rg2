/*global rg2:false */
/* global he:false */
function Results() {
	this.results = [];
}

Results.prototype = {
	Constructor : Results,

	addResults : function(data, isScoreEvent) {
		var i;
		var j;
		var result;
		var id;
		var baseresult;
		var variant;
		var codes;
		var scorex;
		var scorey;
		var l = data.length;
		// extract score course details if necessary
    if (isScoreEvent) {
      codes = [];
      scorex = [];
      scorey = [];
      // details are only sent the first time a variant occurs (to reduce file size quite a lot in some cases)
      // so need to extract them for use later
      for (i = 0; i < l; i += 1) {
        variant = data[i].variant;
        if (typeof codes[variant] === 'undefined') {
          codes[variant] = data[i].scorecodes;
          scorex[variant] = data[i].scorex;
          scorey[variant] = data[i].scorey;
        }
      }
    }
    // save each result
		for (i = 0; i < l; i += 1) {
			if (isScoreEvent) {
        variant = data[i].variant;
        result = new Result(data[i], isScoreEvent, codes[variant], scorex[variant], scorey[variant]);
			} else {
        result = new Result(data[i], isScoreEvent);
			}
			this.results.push(result);
		}
    // don't get score course info for GPS tracks so find it from original result
    for (i = 0; i < this.results.length; i += 1) {
      if (this.results[i].resultid >= rg2.config.GPS_RESULT_OFFSET) {
        id = this.results[i].resultid;
        while (id >= rg2.config.GPS_RESULT_OFFSET) {
          id -= rg2.config.GPS_RESULT_OFFSET;
        }
        for (j = 0; j < this.results.length; j += 1) {
          if (id === this.results[j].resultid) {
            baseresult = this.getFullResult(j);
          }
        }
        if (typeof baseresult !== 'undefined') {
          if (typeof baseresult.scorex !== 'undefined') {
            this.results[i].scorex = baseresult.scorex;
            this.results[i].scorey = baseresult.scorey;
            this.results[i].scorecodes = baseresult.scorecodes;
          }
        }
      }
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

  // read through results to get list of all controls on score courses
  // since there is no master list of controls!
  generateScoreCourses: function () {
    var i;
    var j;
    var k;
    var res;
    var courses;
    var codes;
    var x;
    var y;
    var newControl;
    var courseid;
    courses = [];
    codes = [];
    x = [];
    y = [];
    for (i = 0; i < this.results.length; i += 1) {
      res = this.results[i];
      if (res.resultid >= rg2.config.GPS_RESULT_OFFSET) {
        continue;
      }
      courseid = res.courseid;
      // save courseid if it is new
      if (courses.indexOf(courseid) === -1) {
        courses.push(courseid);
        codes[courseid] = [];
        x[courseid] = [];
        y[courseid] = [];
      }
      // read all controls for this result and save if new
      for (j = 0; j < res.scorecodes.length; j += 1) {
        newControl = true;
        for (k = 0; k < codes[courseid].length; k += 1) {
          if (res.scorecodes[j] === codes[courseid][k]) {
            newControl = false;
            break;
          }
        }
        if (newControl) {
          codes[courseid].push(res.scorecodes[j]);
          x[courseid].push(res.scorex[j]);
          y[courseid].push(res.scorey[j]);
        }
      }
      
    }
    // save the details we have just generated
    for (i = 0; i < courses.length; i += 1) {
      courseid = courses[i];
      rg2.updateScoreCourse(courseid, codes[courseid], x[courseid], y[courseid]);
    }
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

  putScoreCourseOnDisplay : function(resultid, display) {
    var i;
    for (i = 0; i < this.results.length; i += 1) {
      if (this.results[i].resultid === resultid) {
        this.results[i].displayScoreCourse = display;
      }
    }

  },
  

  displayScoreCourse : function(id, display) {
   this.results[id].displayScoreCourse = display;
  },
  
  sortTimes : function(a, b) {
    return a.time - b.time;
  },
  
	countResultsByCourseID : function(courseid) {
		var count = 0;
		for (var i = 0; i < this.results.length; i += 1) {
			if (this.results[i].courseid === courseid) {
        // don't double-count GPS tracks
        if (this.results[i].resultid < rg2.config.GPS_RESULT_OFFSET) {
        count += 1;
				}
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
  
  getResultsInfo : function () {
    var info = {};
    var res;
    var temp;
    info.results = 0;
    info.drawnroutes = 0;
    info.gpsroutes = 0;
    info.secs = 0;
    for (var i = 0; i < this.results.length; i += 1) {
      res = this.results[i];
      if (res.resultid < rg2.config.GPS_RESULT_OFFSET) {
        info.results += 1;
        // beware invalid splits for incomplete runs
        if (res.time) {
          info.secs += res.splits[res.splits.length - 1];
        }
      }
      if (res.hasValidTrack) {
        if (res.resultid < rg2.config.GPS_RESULT_OFFSET) {
          info.drawnroutes += 1;
        } else {
          info.gpsroutes += 1;
        }
      }
    }
    info.totalroutes = info.drawnroutes + info.gpsroutes;
    if (info.results > 0) {
      info.percent = (100 * info.totalroutes / info.results).toFixed(1);
    } else {
      info.percent = 0;
    }
    info.time = Math.floor(info.secs / 86400) + " days ";
    temp = info.secs - (86400 * Math.floor(info.secs / 86400));
    info.time += Math.floor(temp / 3600) + " hours ";
    temp = temp - (3600 * Math.floor(temp / 3600));
    info.time += Math.floor(temp / 60) + " minutes ";
    info.time += temp - (60 * Math.floor(temp / 60)) + " seconds ";
    return info;
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
			this.results[i].drawScoreCourse();
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

  getTracksOnDisplay : function() {
		var tracks = [];
		for (var i = 0; i < this.results.length; i += 1) {
			if (this.results[i].displayTrack) {
				tracks.push(i);
			}
		}
		return tracks;
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
		var eventid = rg2.getKartatEventID();
		var eventinfo = rg2.getEventInfo(eventid);
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
						this.results[j].addTrack(tracks[i], eventinfo.format);
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
		var namehtml = "";
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
					html += this.getBottomRow(tracksForThisCourse, oldCourseID) + "</table></div>";
				}
				tracksForThisCourse = 0;
				html += "<h3>" + temp.coursename;
				html += "<input class='showcourse' id=" + temp.courseid + " type=checkbox name=course title='Show course'></input></h3><div>";
				html += "<table class='resulttable'><tr><th></th><th>" + rg2.t("Name") + "</th><th>" + rg2.t("Time") + "</th><th><i class='fa fa-pencil'></i></th><th><i class='fa fa-play'></i></th></tr>";
				oldCourseID = temp.courseid;
			}
      if (temp.isScoreEvent) {
        namehtml = "<div><input class='showscorecourse showscorecourse-" + i + "' id=" + i + " type=checkbox name=scorecourse></input> " + temp.name + "</div>";
      } else {
        namehtml = "<div>" + temp.name + "</div>";
      }
			html += '<tr><td>' + temp.position + '</td>';
			if (temp.comments !== "") {
				html += '<td><a href="#" title="' + temp.comments + '">' + namehtml + "</a></td><td>" + temp.time + "</td>";
			} else {
				html += "<td>" + namehtml + "</td><td>" + temp.time + "</td>";
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
			html = "<p>" + rg2.t("No results available") + "</p>";
		} else {
			html += this.getBottomRow(tracksForThisCourse, oldCourseID) + "</table></div></div>";
		}
		return html;
	},
	
	getBottomRow : function(tracks, oldCourseID) {
    // create bottom row for all tracks checkboxes
    var html;
    html = "<tr class='allitemsrow'><td></td><td>" + rg2.t("All") + "</td><td></td>";
    if (tracks > 0) {
      html += "<td><input class='allcoursetracks' id=" + oldCourseID + " type=checkbox name=track></input></td>";
    } else {
      html += "<td></td>";
    }
    html += "<td><input class='allcoursereplay' id=" + oldCourseID + " type=checkbox name=replay></input></td></tr>";
    return html;
	},

  getComments : function() {
    var comments = "";
    for (var i = 0; i < this.results.length; i += 1) {
      if (this.results[i].comments !== "") {
        comments += "<p><strong>" + this.results[i].name + "</strong>: " + this.results[i].coursename + ": " + this.results[i].comments + "</p>";
      }
    }
    return comments;
  },

	createNameDropdown : function(courseid) {
		$("#rg2-name-select").empty();
		var dropdown = document.getElementById("rg2-name-select");
		var opt = document.createElement("option");
		opt.value = null;
		opt.text = rg2.t('Select name');
		dropdown.options.add(opt);
		for (var i = 0; i < this.results.length; i += 1) {
			if (this.results[i].courseid === courseid) {
				opt = document.createElement("option");
				opt.value = i;
				opt.text = this.results[i].name;
				dropdown.options.add(opt);
			}
		}
		dropdown.options.add(opt);
	}
};

function Result(data, isScoreEvent, scorecodes, scorex, scorey) {
	// resultid is the kartat id value
	this.resultid = data.resultid;
	this.isScoreEvent = isScoreEvent;
	// GPS track ids are normal resultid + GPS_RESULT_OFFSET
	if (this.resultid >= rg2.config.GPS_RESULT_OFFSET) {
		this.isGPSTrack = true;
	} else {
		//this.name = data.name;
		this.isGPSTrack = false;
	}
	this.name = he.decode(data.name);
	this.initials = this.getInitials(this.name);
	this.starttime = data.starttime;
	this.time = data.time;
	this.position = data.position;
	this.status = data.status;
	// get round iconv problem in API for now
	if (data.comments !== null) {
		// unescape special characeters to get sensible text
		this.comments = he.decode(data.comments);
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

	if (data.variant !== "") {
		// save control locations for score course result
		this.scorex = scorex;
		this.scorey = scorey;
		this.scorecodes = scorecodes;
	}

	// calculated cumulative distance in pixels
	this.cumulativeDistance = [];
	// set true if track includes all expected controls in correct order or is a GPS track
	this.hasValidTrack = false;
	this.displayTrack = false;
	this.displayScoreCourse = false;
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
	
	addTrack: function(data, format) {
    this.trackx = data.gpsx;
    this.tracky = data.gpsy;
    var trackOK;
    if (this.isGPSTrack) {
      trackOK = this.expandGPSTrack();
    } else {
      if (format === rg2.config.EVENT_WITHOUT_RESULTS) {
        trackOK = this.expandTrackWithNoSplits();
      } else {
        trackOK = this.expandNormalTrack();
      }
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

drawScoreCourse : function() {
    // draws a score course for an individual runner to show where they went
    // based on drawCourse in courses.js
    // could refactor in future...
    // > 1 since we need at least a start and finish to draw something
    if ((this.displayScoreCourse) && (this.scorex.length > 1)) {
      var angle;
      var c1x;
      var c1y;
      var c2x;
      var c2y;
      var i;
      var opt = rg2.getOverprintDetails();
      rg2.ctx.globalAlpha = rg2.config.FULL_INTENSITY;
      angle = rg2.getAngle(this.scorex[0], this.scorey[0], this.scorex[1], this.scorey[1]);
      rg2.drawStart(this.scorex[0], this.scorey[0], "", angle, opt);
      for ( i = 0; i < (this.scorex.length - 1); i += 1) {
        angle = rg2.getAngle(this.scorex[i], this.scorey[i], this.scorex[i + 1], this.scorey[i + 1]);
        if (i === 0) {
          c1x = this.scorex[i] + (opt.startTriangleLength * Math.cos(angle));
          c1y = this.scorey[i] + (opt.startTriangleLength * Math.sin(angle));
        } else {
          c1x = this.scorex[i] + (opt.controlRadius * Math.cos(angle));
          c1y = this.scorey[i] + (opt.controlRadius * Math.sin(angle));
        }
        //Assume the last control in the array is a finish
        if (i === this.scorex.length - 2) {
          c2x = this.scorex[i + 1] - (opt.finishOuterRadius * Math.cos(angle));
          c2y = this.scorey[i + 1] - (opt.finishOuterRadius * Math.sin(angle));
        } else {
          c2x = this.scorex[i + 1] - (opt.controlRadius * Math.cos(angle));
          c2y = this.scorey[i + 1] - (opt.controlRadius * Math.sin(angle));
        }
        rg2.ctx.beginPath();
        rg2.ctx.moveTo(c1x, c1y);
        rg2.ctx.lineTo(c2x, c2y);
        rg2.ctx.stroke();
      }
      for (i = 1; i < (this.scorex.length - 1); i += 1) {
        rg2.drawSingleControl(this.scorex[i], this.scorey[i], i, Math.PI * 0.25, opt);
      }
      rg2.drawFinish(this.scorex[this.scorex.length - 1], this.scorey[this.scorey.length - 1], "", opt);
    }
  },

	expandNormalTrack : function() {
    // allow for getting two tracks for same result: should have been filtered in API...
    this.xysecs.length = 0;
    this.cumulativeDistance.length = 0;
    
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
			dist += rg2.getDistanceBetweenPoints(x, y, oldx, oldy);
			this.cumulativeDistance[i] = Math.round(dist);
			oldx = x;
			oldy = y;
			// track ends at control
			if ((nextx == x) && (nexty == y)) {
				this.xysecs[i] = this.splits[nextcontrol];
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

	expandTrackWithNoSplits : function() {
    // based on ExpandNormalTrack, but deals with event format 2: no results
    // this means we have a course and a finish time but no split times
    this.xysecs.length = 0;
    this.cumulativeDistance.length = 0;

		// only have finish time, which is in [1] at present
		var totaltime= this.splits[1];
		var currenttime = 0;
		this.xysecs[0] = 0;
		this.cumulativeDistance[0] = 0;
		
		// get course details: can't be a score course since they aren't supported for format 2
		var course = {};
		course.x = rg2.getCourseDetails(this.courseid).x;
		course.y = rg2.getCourseDetails(this.courseid).y;
		

		var nextcontrol = 1;
		var nextx = course.x[nextcontrol];
		var nexty = course.y[nextcontrol];
		var dist = 0;
		var totaldist = 0;
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
		// read through track to find total distance
		l = this.trackx.length;
		for ( i = 1; i < l; i += 1) {
			x = this.trackx[i];
			y = this.tracky[i];
			totaldist += rg2.getDistanceBetweenPoints(x, y, oldx, oldy);
			oldx = x;
			oldy = y;
		}

		// read through again to generate splits
		x = 0;
		y = 0;
		oldx = this.trackx[0];
		oldy = this.tracky[0];
		for ( i = 1; i < l; i += 1) {
			x = this.trackx[i];
			y = this.tracky[i];
			dist += rg2.getDistanceBetweenPoints(x, y, oldx, oldy);
			this.cumulativeDistance[i] = Math.round(dist);
			oldx = x;
			oldy = y;
			// track ends at control
			if ((nextx == x) && (nexty == y)) {
				currenttime = parseInt((dist / totaldist) * totaltime, 10);
				this.xysecs[i] = currenttime;
				this.splits[nextcontrol] = currenttime;
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
			delta = rg2.getDistanceBetweenPoints(x, y, oldx, oldy);
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