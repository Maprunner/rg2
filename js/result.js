
(function () {
  function Result(data, isScoreEvent, scorecodes, scorex, scorey) {
    // resultid is the kartat id value
    this.resultid = data.resultid;
    this.rawid = this.resultid % rg2.config.GPS_RESULT_OFFSET;
    this.isScoreEvent = isScoreEvent;
    this.name = rg2.he.decode(data.name);
    this.initials = this.getInitials(this.name);
    this.starttime = data.starttime;
    this.time = data.time;
    if ((this.time === "00") || (this.time === "0")) {
      this.time = "";
    }
    this.position = data.position;
    this.status = data.status;
    this.canDelete = false;
    this.showResult = true;
    this.token = 0;
    // get round iconv problem in API for now: unescape special characters to get sensible text
    if (data.comments) {
      this.comments = rg2.he.decode(data.comments);
    } else {
      this.comments = "";
    }
    this.coursename = data.coursename;
    if (this.coursename === "") {
      // need to force this to be a string for use elsewhere
      this.coursename = data.courseid.toString();
    }
    this.courseid = data.courseid;
    this.splits = this.adjustRawSplits(data.splits);

    if (isScoreEvent) {
      // save control locations for score course result
      this.scorex = scorex;
      this.scorey = scorey;
      this.scorecodes = scorecodes;
    }
    this.initialiseTrack(data);
  }


  Result.prototype = {
    Constructor: Result,

    initialiseTrack: function (data) {
      var info;
      this.legpos = [];
      this.racepos = [];
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
      // GPS track ids are normal resultid + GPS_RESULT_OFFSET
      if (this.resultid >= rg2.config.GPS_RESULT_OFFSET) {
        this.isGPSTrack = true;
        // don't get time or splits so need to copy them in from original result
        info = rg2.results.getTimeAndSplitsForID(this.rawid);
        this.time = info.time;
        this.splits = info.splits;
        // allow for events with no results where there won't be a non-GPS result
        if (this.time === rg2.config.TIME_NOT_FOUND) {
          this.time = data.time;
        }
      } else {
        //this.name = data.name;
        this.isGPSTrack = false;
      }
    },

    adjustRawSplits: function (rawSplits) {
      var i;
      // insert a 0 split at the start to make life much easier elsewhere
      rawSplits.splice(0, 0, 0);
      // splits are time in seconds at control, but may have 0 for missing controls
      // make life easier elsewhere by replacing 0 with time at previous valid control
      for (i = 1; i < rawSplits.length; i += 1) {
        // also allow for negative splits
        if (rawSplits[i] <= 0) {
          rawSplits[i] = rawSplits[i - 1];
        }
      }
      return rawSplits;
    },

    putTrackOnDisplay: function () {
      if (this.hasValidTrack) {
        this.trackColour = rg2.colours.getNextColour();
        this.displayTrack = true;
      }
    },

    removeTrackFromDisplay: function () {
      if (this.hasValidTrack) {
        this.trackColour = null;
        this.displayTrack = false;
      }
    },

    addTrack: function (data) {
      var i, trackOK;
      this.trackx = data.x.split(",").map(function (n) {
        return parseInt(n, 10);
      });
      this.tracky = data.y.split(",").map(function (n) {
        return parseInt(n, 10);
      });
      // co-ords sent as differences, so recreate absolute values
      for (i = 1; i < this.trackx.length; i += 1) {
        this.trackx[i] = this.trackx[i - 1] + this.trackx[i];
        this.tracky[i] = this.tracky[i - 1] + this.tracky[i];
      }
      if (this.isGPSTrack) {
        trackOK = this.expandGPSTrack();
      } else {
        // handle events that just have a start and finish time
        if (this.splits.length === 2) {
          trackOK = this.expandTrackWithNoSplits();
        } else {
          trackOK = this.expandNormalTrack();
        }
      }
      if (trackOK) {
        rg2.courses.incrementTracksCount(this.courseid);
      }
    },

    drawTrack: function () {
      var i, l, oldx, oldy, stopCount;
      if (this.displayTrack) {
        if (this.isGPSTrack && rg2.options.showGPSSpeed && (this.speedColour.length === 0)) {
          // set speed colours if we haven't done it yet
          this.setSpeedColours();
        }
        rg2.ctx.lineWidth = rg2.options.routeWidth;
        rg2.ctx.strokeStyle = this.trackColour;
        rg2.ctx.globalAlpha = rg2.options.routeIntensity;
        rg2.ctx.fillStyle = this.trackColour;
        rg2.ctx.font = '10pt Arial';
        rg2.ctx.textAlign = "left";
        rg2.ctx.beginPath();
        rg2.ctx.moveTo(this.trackx[0], this.tracky[0]);
        oldx = this.trackx[0];
        oldy = this.tracky[0];
        stopCount = 0;
        l = this.trackx.length;
        for (i = 1; i < l; i += 1) {
          // lines
          rg2.ctx.lineTo(this.trackx[i], this.tracky[i]);
          if ((this.trackx[i] === oldx) && (this.tracky[i] === oldy)) {
            // we haven't moved
            stopCount += 1;
          } else {
            // we have started moving again
            if (stopCount > 0) {
              if (!this.isGPSTrack || (this.isGPSTrack && rg2.options.showThreeSeconds)) {
                rg2.ctx.fillText("+" + (3 * stopCount), oldx + 5, oldy + 5);
              }
              stopCount = 0;
            }
          }
          oldx = this.trackx[i];
          oldy = this.tracky[i];
          if (this.isGPSTrack && rg2.options.showGPSSpeed) {
            // draw partial track since we need to keep changing colour
            rg2.ctx.strokeStyle = this.speedColour[i];
            rg2.ctx.stroke();
            rg2.ctx.beginPath();
            rg2.ctx.moveTo(oldx, oldy);
          }
        }
        rg2.ctx.stroke();
      }
    },

    drawScoreCourse: function () {
      // draws a score course for an individual runner to show where they went
      // based on drawCourse in course.js
      // could refactor in future...
      // > 1 since we need at least a start and finish to draw something
      var angle, i, opt;
      if ((this.displayScoreCourse) && (this.scorex.length > 1)) {
        opt = rg2.getOverprintDetails();
        rg2.ctx.globalAlpha = rg2.config.FULL_INTENSITY;
        angle = rg2.utils.getAngle(this.scorex[0], this.scorey[0], this.scorex[1], this.scorey[1]);
        rg2.controls.drawStart(this.scorex[0], this.scorey[0], "", angle, opt);
        angle = [];
        for (i = 0; i < (this.scorex.length - 1); i += 1) {
          angle[i] = rg2.utils.getAngle(this.scorex[i], this.scorey[i], this.scorex[i + 1], this.scorey[i + 1]);
        }
        rg2.courses.drawLinesBetweenControls({ x: this.scorex, y: this.scorey }, angle, this.courseid, opt);
        for (i = 1; i < (this.scorex.length - 1); i += 1) {
          rg2.controls.drawSingleControl(this.scorex[i], this.scorey[i], i, Math.PI * 0.25, opt);
        }
        rg2.controls.drawFinish(this.scorex[this.scorex.length - 1], this.scorey[this.scorey.length - 1], "", opt);
      }
    },

    expandNormalTrack: function () {
      var course;
      // allow for getting two tracks for same result: should have been filtered in API...
      this.xysecs.length = 0;
      // add times and distances at each position
      this.xysecs[0] = 0;
      // get course details
      course = {};
      // each person has their own defined score course
      if (this.isScoreEvent) {
        course.x = this.scorex;
        course.y = this.scorey;
      } else {
        course = rg2.courses.getCourseDetails(this.courseid);
      }
      this.calculateTrackTimes(course);
      // treat all score tracks as valid for now
      // may need a complete rethink on score course handling later
      if (this.isScoreEvent) {
        this.hasValidTrack = true;
      }
      return this.hasValidTrack;
    },

    calculateTrackTimes: function (course) {
      var nextcontrol, nextx, nexty, dist, oldx, oldy, i, x, y, previouscontrolindex, cumulativeDistance;
      cumulativeDistance = [];
      cumulativeDistance[0] = 0;
      nextcontrol = this.getNextValidControl(0);
      nextx = course.x[nextcontrol];
      nexty = course.y[nextcontrol];
      dist = 0;
      oldx = this.trackx[0];
      oldy = this.tracky[0];
      x = 0;
      y = 0;
      previouscontrolindex = 0;
      // read through list of controls and copy in split times
      // we are assuming the track starts at the start which is index 0...
      // look at each track point and see if it matches the next control location
      for (i = 1; i < this.trackx.length; i += 1) {
        // calculate distance while we are looping through
        x = this.trackx[i];
        y = this.tracky[i];
        dist += rg2.utils.getDistanceBetweenPoints(x, y, oldx, oldy);
        cumulativeDistance[i] = Math.round(dist);
        oldx = x;
        oldy = y;
        // track ends at control
        if ((nextx === x) && (nexty === y)) {
          this.xysecs[i] = this.splits[nextcontrol];
          this.addInterpolatedTimes(previouscontrolindex, i, cumulativeDistance);
          previouscontrolindex = i;
          nextcontrol = this.getNextValidControl(nextcontrol);
          if (nextcontrol === course.x.length) {
            // we have found all the controls
            this.hasValidTrack = true;
            break;
          }
          nextx = course.x[nextcontrol];
          nexty = course.y[nextcontrol];
        }
      }
    },

    getNextValidControl: function (thisControl) {
      // look through splits to find next control which has a split time
      // to allow drawing for missed controls where the split time is 0
      var i;
      for (i = thisControl + 1; i < this.splits.length; i += 1) {
        if (this.splits[i] !== this.splits[i - 1]) {
          return i;
        }
      }
      // implies we have no finish time which is unlikely but anyway...
      return this.splits.length;
    },

    expandTrackWithNoSplits: function () {
      // based on ExpandNormalTrack, but deals with event format 2: no results
      // this means we have a course and a finish time but no split times
      var totaltime, currenttime, course, nextcontrol, nextx, nexty, lastx, lasty, i, x, y, moved, previouscontrolindex, totaldist, cumulativeDistance;
      this.xysecs.length = 0;
      // only have finish time, which is in [1] at present
      totaltime = this.splits[1];
      currenttime = 0;
      this.xysecs[0] = 0;
      // get course details: can't be a score course since they aren't supported for format 2
      course = {};
      course.x = rg2.courses.getCourseDetails(this.courseid).x;
      course.y = rg2.courses.getCourseDetails(this.courseid).y;
      nextcontrol = 1;
      nextx = course.x[nextcontrol];
      nexty = course.y[nextcontrol];
      lastx = course.x[course.x.length - 1];
      lasty = course.y[course.y.length - 1];
      // add finish location to track just in case...
      this.trackx.push(lastx);
      this.tracky.push(lasty);
      previouscontrolindex = 0;
      cumulativeDistance = this.calculateTotalTrackLength();
      totaldist = cumulativeDistance[cumulativeDistance.length - 1];
      // read through track to generate splits
      x = 0;
      y = 0;
      moved = false;
      for (i = 1; i < this.trackx.length; i += 1) {
        x = this.trackx[i];
        y = this.tracky[i];
        // cope with routes that have start and finish in same place, and where the first point in a route is a repeat of the start
        if ((x !== this.trackx[0]) || (y !== this.tracky[0])) {
          moved = true;
        }
        // track ends at control, as long as we have moved away from the start
        if ((nextx === x) && (nexty === y) && moved) {
          currenttime = parseInt((cumulativeDistance[i] / totaldist) * totaltime, 10);
          this.xysecs[i] = currenttime;
          this.splits[nextcontrol] = currenttime;
          this.addInterpolatedTimes(previouscontrolindex, i, cumulativeDistance);
          previouscontrolindex = i;
          nextcontrol += 1;
          if (nextcontrol === course.x.length) {
            // we have found all the controls
            this.hasValidTrack = true;
            break;
          }
          nextx = course.x[nextcontrol];
          nexty = course.y[nextcontrol];
        }
      }
      return this.hasValidTrack;
    },

    calculateTotalTrackLength: function () {
      // read through track to find total distance
      var i, oldx, oldy, cumulativeDistance;
      cumulativeDistance = [];
      cumulativeDistance[0] = 0;
      oldx = this.trackx[0];
      oldy = this.tracky[0];
      for (i = 1; i < this.trackx.length; i += 1) {
        cumulativeDistance[i] = cumulativeDistance[i - 1] + Math.round(rg2.utils.getDistanceBetweenPoints(this.trackx[i], this.tracky[i], oldx, oldy));
        oldx = this.trackx[i];
        oldy = this.tracky[i];
      }
      return cumulativeDistance;
    },

    addInterpolatedTimes: function (startindex, endindex, cumulativeDistance) {
      // add interpolated time at each point based on cumulative distance; this assumes uniform speed...
      var oldt, deltat, olddist, deltadist, i;
      oldt = this.xysecs[startindex];
      deltat = this.xysecs[endindex] - oldt;
      olddist = cumulativeDistance[startindex];
      deltadist = cumulativeDistance[endindex] - olddist;
      for (i = startindex; i <= endindex; i += 1) {
        this.xysecs[i] = oldt + Math.round(((cumulativeDistance[i] - olddist) * deltat / deltadist));
      }
    },

    expandGPSTrack: function () {
      var t;
      // in theory we get one point every three seconds
      for (t = 0; t < this.trackx.length; t += 1) {
        this.xysecs[t] = 3 * t;
      }
      // colours now set the first time we try to draw the track: major time saving on initial event load
      this.speedColour.length = 0;
      this.hasValidTrack = true;
      return this.hasValidTrack;
    },

    setSpeedColours: function () {
      var t, len, delta, oldDelta;
      len = this.trackx.length;
      //calculate distance between each point in pixels, averaged over 2 points
      this.speedColour[0] = 0;
      oldDelta = 0;
      for (t = 1; t < len; t += 1) {
        delta = rg2.utils.getDistanceBetweenPoints(this.trackx[t], this.tracky[t], this.trackx[t - 1], this.tracky[t - 1]);
        this.speedColour[t] = (delta + oldDelta) / 2;
        oldDelta = delta;
      }
      this.mapSpeedColours();
    },

    mapSpeedColours: function () {
      // speed options are in min/km
      var maxMetresPerSecond = 16.667 / rg2.options.maxSpeed;
      var minMetresPerSecond = 16.667 / rg2.options.minSpeed;
      var secondsPerSample = 3;
      // converts speed to RGB value
      var i, range, value, maxspeed, minspeed, sorted, metresPerPixel;
      sorted = this.speedColour.slice().sort(function (a, b) { return a - b; });
      metresPerPixel = rg2.events.getMetresPerPixel();
      if (metresPerPixel !== undefined) {
        maxspeed = secondsPerSample * maxMetresPerSecond / metresPerPixel;
        minspeed = secondsPerSample * minMetresPerSecond / metresPerPixel;
      } else {
        maxspeed = sorted[sorted.length - 1];
        // arbitrary limit below which everything will be red
        minspeed = sorted[Math.floor(sorted.length / 95)];
      }
      range = maxspeed - minspeed;
      // speedColour comes in with speeds at each point and gets updated to the associated colour
      for (i = 0; i < this.speedColour.length; i += 1) {
        // force value into allowable range
        value = Math.max(this.speedColour[i], minspeed);
        value = Math.min(value, maxspeed);
        //console.log(value, (value - minspeed) / range);
        this.speedColour[i] = this.getColour((value - minspeed) / range);
      }
    },

    getColour: function (value) {
      // RGB Hex values
      //   Red Or  Yel LGr Gre PaG LBl Bl  DBl
      // R 255 255 255 128 0   0   0   0   0
      // G 0   128 255 255 255 255 255 128 0
      // B 0   0   0   0   0   128 255 255 255
      var colour, red, green;
      colour = "#";
      // using range 0 = Red to 1 = Green
      // gets in a value between 0 (slowest) and 1 (fastest) and returns a colour string
      if (value === 0) {
        return "#0080ff";
      }
      if (value < 0.5) {
        colour += "ff";
      } else {
        red = parseInt((1 - value) * 255 * 2, 10);
        if (red < 16) {
          colour += "0";
        }
        colour += red.toString(16);
      }
      if (value >= 0.5) {
        colour += "ff";
      } else {
        green = 255 - parseInt((0.5 - value) * 255 * 2, 10);
        if (green < 16) {
          colour += "0";
        }
        colour += green.toString(16);
      }
      colour += "00";
      // console.log(value, colour);
      return colour;
    },

    getInitials: function (name) {
      var i, addNext, len, initials;
      // converts name to initials
      if (name === null) {
        return "??";
      }
      // replace GPS with * so that we get *SE rather than GSE for initials
      name = name.trim().replace(/GPS/g, '*');
      len = name.length;
      initials = "";
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
  rg2.Result = Result;
}());
