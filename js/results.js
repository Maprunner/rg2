
(function () {
  function Results() {
    this.results = [];
  }

  Results.prototype = {
    Constructor: Results,

    addResults: function (data, isScoreEvent) {
      var i, l, result, variant, codes, scorex, scorey;
      l = data.length;
      // extract score course details if necessary
      if (isScoreEvent) {
        codes = [];
        scorex = [];
        scorey = [];
        // details are only sent the first time a variant occurs (to reduce file size quite a lot in some cases)
        // so need to extract them for use later
        for (i = 0; i < l; i += 1) {
          variant = data[i].variant;
          if (codes[variant] === undefined) {
            codes[variant] = data[i].scorecodes;
            scorex[variant] = data[i].scorex;
            scorey[variant] = data[i].scorey;
          }
        }
      }
      // save each result
      for (i = 0; i < l; i += 1) {
        // trap cases where only some courses for an event are set up, but for some reason all the results get saved
        // so you end up getting results for courses you don't know about: just ignore these results
        if (rg2.courses.isValidCourseId(data[i].courseid)) {
          if (data[i].resultid > rg2.config.GPS_RESULT_OFFSET && data[i].coursename === '') {
            data[i].coursename = rg2.courses.getCourseDetails(data[i].courseid).name;
          }
          if (isScoreEvent) {
            variant = data[i].variant;
            result = new rg2.Result(data[i], isScoreEvent, codes[variant], scorex[variant], scorey[variant]);
          } else {
            result = new rg2.Result(data[i], isScoreEvent);
          }
          this.results.push(result);
      }
      }
      this.setDeletionInfo();
      this.setScoreCourseInfo();
      this.sanitiseSplits(isScoreEvent);
      this.generateLegPositions();
    },

    setScoreCourseInfo: function () {
      // don't get score course info for GPS tracks so find it from original result
      var i, baseresult;
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].resultid >= rg2.config.GPS_RESULT_OFFSET) {
          baseresult = this.getFullResultForRawID(this.results[i].rawid);
          if (baseresult !== undefined) {
            if (baseresult.scorex !== undefined) {
              this.results[i].scorex = baseresult.scorex;
              this.results[i].scorey = baseresult.scorey;
              this.results[i].scorecodes = baseresult.scorecodes;
            }
          }
        }
      }
    },

    setDeletionInfo: function () {
      var i, r, eventid, deletionInfo, opt;
      eventid = rg2.events.getKartatEventID();
      deletionInfo = [];
      opt = rg2.options.drawnRoutes;
      // find routes that can be deleted for this event
      for (i = 0; i < opt.length; i += 1) {
        if (opt[i].eventid === eventid) {
          deletionInfo.push(opt[i]);
        }
      }
      for (i = 0; i < deletionInfo.length; i += 1) {
        for (r = 0; r < this.results.length; r += 1) {
          if (this.results[r].resultid === deletionInfo[i].id) {
            this.results[r].canDelete = true;
            this.results[r].token = deletionInfo[i].token;
          }
        }
      }
    },

    getDeletionInfo: function (id) {
      return ({ id: this.results[id].resultid, token: this.results[id].token });
    },

    // lists all runners on a given course
    // withTrack = true means only return runners with a valid track
    getAllRunnersForCourse: function (courseid, withTrack) {
      var i, runners;
      runners = [];
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].courseid === courseid) {
          if (!withTrack || this.results[i].hasValidTrack) {
            runners.push(i);
          }
        }
      }
      return runners;
    },

    getAllResultsForCourse: function (courseid) {
      var i, results;
      results = [];
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].courseid === courseid) {
          // only want first entry: not other drawn routes
          if (this.results[i].resultid === this.results[i].rawid) {
            results.push(this.results[i]);
          }
        }
      }
      return results;
    },

    // read through results to get list of all controls on score courses
    // since there is no master list of controls!
    generateScoreCourses: function () {
      var i, j, res, courses, codes, x, y, courseid;
      courses = [];
      codes = [];
      x = [];
      y = [];
      for (i = 0; i < this.results.length; i += 1) {
        res = this.results[i];
        // only do this for original results, not GPS results
        if (res.resultid < rg2.config.GPS_RESULT_OFFSET) {
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
            if (codes[courseid].indexOf(res.scorecodes[j]) === -1) {
              codes[courseid].push(res.scorecodes[j]);
              x[courseid].push(res.scorex[j]);
              y[courseid].push(res.scorey[j]);
            }
          }
        }

      }
      // save the details we have just generated
      for (i = 0; i < courses.length; i += 1) {
        courseid = courses[i];
        rg2.courses.updateScoreCourse(courseid, codes[courseid], x[courseid], y[courseid]);
      }
    },

    sanitiseSplits: function (isScoreEvent) {
      var i, j, expectedSplits, previousValidSplit, nextSplitInvalid;
      // sort out missing punches and add some helpful new fields
      for (i = 0; i < this.results.length; i += 1) {
        this.results[i].timeInSecs = rg2.utils.getSecsFromHHMMSS(this.results[i].time);
        this.results[i].legSplits = [];
        this.results[i].legSplits[0] = 0;
        previousValidSplit = 0;
        nextSplitInvalid = false;
        for (j = 1; j < this.results[i].splits.length; j += 1) {
          if ((this.results[i].splits[j] - previousValidSplit) === 0) {
            // found a zero split
            this.results[i].legSplits[j] = 0;
            // need to ignore next split as well: e.g missing 3 means splits to 3 and 4 are invalid
            nextSplitInvalid = true;
            if (this.results[i].lastValidSplit === undefined) {
              // race positions need to stop at previous control
              this.results[i].lastValidSplit = j - 1;
            }
          } else {
            if (nextSplitInvalid) {
              this.results[i].legSplits[j] = 0;
              previousValidSplit = this.results[i].splits[j];
              nextSplitInvalid = false;
            } else {
              this.results[i].legSplits[j] = this.results[i].splits[j] - previousValidSplit;
              previousValidSplit = this.results[i].splits[j];
            }
          }
        }
        if (this.results[i].lastValidSplit === undefined) {
          this.results[i].lastValidSplit = this.results[i].splits.length - 1;
        }

        // handle corrupted events with missing splits
        // force all results to have the correct number of splits to make stats processing work correctly
        if (!isScoreEvent) {
          // splits array contains "S" and "F" as well as each control
          expectedSplits = rg2.courses.getNumberOfControlsOnCourse(this.results[i].courseid) + 2;
          while (this.results[i].splits.length < expectedSplits) {
            // copy last valid split data as often as necessary to fill missing gaps
            this.results[i].splits.push(this.results[i].splits[this.results[i].splits.length - 1]);
            this.results[i].legSplits.push(0);
          }
        }
      }
    },

    generateLegPositions: function () {
      var i, j, k, info, pos, prevTime, prevPos, time;
      info = this.getCoursesAndControls();
      pos = [];
      // two very similar bits of code: scope to rationalise...
      // Generate positions for each leg
      for (i = 0; i < info.courses.length; i += 1) {
        // start at 1 since 0 is time 0
        for (k = 1; k < info.controls[i]; k += 1) {
          pos.length = 0;
          for (j = 0; j < this.results.length; j += 1) {
            if ((this.results[j].courseid === info.courses[i]) && (this.results[j].resultid === this.results[j].rawid)) {
              pos.push({ time: this.results[j].legSplits[k], id: j });
            }
          }
          // 0 splits sorted to end
          pos.sort(this.sortLegTimes);
          prevPos = 0;
          prevTime = 0;
          // set positions
          for (j = 0; j < pos.length; j += 1) {
            if (pos[j].time !== prevTime) {
              if (pos[j].time === 0) {
                // all missing splits sorted to end with time 0
                this.results[pos[j].id].legpos[k] = 0;
                prevTime = 0;
                prevPos = 0;
              } else {
                // new time so position increments
                this.results[pos[j].id].legpos[k] = j + 1;
                prevTime = pos[j].time;
                prevPos = j + 1;
              }
            } else {
              // same time so use same position
              this.results[pos[j].id].legpos[k] = prevPos;
            }
          }
        }
      }
      // Generate positions for cumulative time at each control
      pos.length = 0;
      for (i = 0; i < info.courses.length; i += 1) {
        // start at 1 since 0 is time 0
        for (k = 1; k < info.controls[i]; k += 1) {
          pos.length = 0;
          for (j = 0; j < this.results.length; j += 1) {
            if ((this.results[j].courseid === info.courses[i]) && (this.results[j].resultid === this.results[j].rawid)) {
              if (k > this.results[j].lastValidSplit) {
                time = 0;
              } else {
                time = this.results[j].splits[k];
              }
              pos.push({ time: time, id: j });
            }
          }
          // 0 splits sorted to end
          pos.sort(this.sortLegTimes);
          prevPos = 0;
          prevTime = 0;
          for (j = 0; j < pos.length; j += 1) {
            if (pos[j].time !== prevTime) {
              if (pos[j].time === 0) {
                this.results[pos[j].id].racepos[k] = 0;
                prevPos = 0;
                prevTime = 0;
              } else {
                // new time so position increments
                this.results[pos[j].id].racepos[k] = j + 1;
                prevTime = pos[j].time;
                prevPos = j + 1;
              }
            } else {
              // same time so use same position
              this.results[pos[j].id].racepos[k] = prevPos;
            }
          }
        }
      }
    },

    getCoursesAndControls: function () {
      var i, courses, controls;
      courses = [];
      controls = [];
      for (i = 0; i < this.results.length; i += 1) {
        if (courses.indexOf(this.results[i].courseid) === -1) {
          courses.push(this.results[i].courseid);
          // not a good way fo finding number of controls: better to get from courses?
          controls.push(this.results[i].splits.length);
        }

      }
      return { courses: courses, controls: controls };
    },

    putScoreCourseOnDisplay: function (resultid, display) {
      var i;
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].resultid === resultid) {
          this.results[i].displayScoreCourse = display;
        }
      }

    },

    displayScoreCourse: function (id, display) {
      this.results[id].displayScoreCourse = display;
    },

    sortLegTimes: function (a, b) {
      // sort array of times in ascending order
      // 0 splits get sorted to the bottom
      if (a.time === 0) {
        return 1;
      } else {
        if (b.time === 0) {
          return -1;
        } else {
          return a.time - b.time;
        }
      }
    },

    countResultsByCourseID: function (courseid) {
      var i, count, info;
      info = rg2.events.getEventInfo();
      count = 0;
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].courseid === courseid) {
          // don't double-count GPS tracks, unless no initial results (#284)
          if ((this.results[i].resultid < rg2.config.GPS_RESULT_OFFSET) ||
            (info.format === rg2.config.FORMAT_NO_RESULTS) ||
            (info.format === rg2.config.FORMAT_SCORE_EVENT_NO_RESULTS)) {
            count += 1;
          }
        }
      }
      return count;
    },

    getRoutesForEvent: function () {
      var route, routes, i;
      routes = [];
      for (i = 0; i < this.results.length; i += 1) {
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

    getResultsInfo: function () {
      var i, info, res;
      info = {};
      info.results = 0;
      info.drawnroutes = 0;
      info.gpsroutes = 0;
      info.secs = 0;
      for (i = 0; i < this.results.length; i += 1) {
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
      info.time = this.formatTotalRunningTime(info.secs);
      return info;
    },

    formatTotalRunningTime: function (secs) {
      var time;
      time = Math.floor(secs / 86400) + " days ";
      secs = secs - (86400 * Math.floor(secs / 86400));
      time += Math.floor(secs / 3600) + " hours ";
      secs = secs - (3600 * Math.floor(secs / 3600));
      time += Math.floor(secs / 60) + " minutes ";
      time += secs - (60 * Math.floor(secs / 60)) + " seconds";
      return time;
    },

    getFullResult: function (resultid) {
      return this.results[resultid];
    },

    getFullResultForRawID: function (rawid) {
      var i;
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].resultid === rawid) {
          return this.results[i];
        }
      }
      return undefined;
    },

    drawTracks: function () {
      var i;
      for (i = 0; i < this.results.length; i += 1) {
        this.results[i].drawTrack();
        this.results[i].drawScoreCourse();
      }
    },

    getTracksOnDisplay: function () {
      var i, tracks, result;
      tracks = [];
      for (i = 0; i < this.results.length; i += 1) {
        result = this.results[i];
        if (result.displayTrack) {
          tracks.push(result.resultid);
        }
      }
      return tracks;
    },

    putOneTrackOnDisplay: function (resultid) {
      var i;
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].resultid === parseInt(resultid, 10)) {
          this.results[i].putTrackOnDisplay();
        }
      }
    },

    removeOneTrackFromDisplay: function (resultid) {
      var i;
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].resultid === parseInt(resultid, 10)) {
          this.results[i].removeTrackFromDisplay();
        }
      }
    },

    updateTrackDisplay: function (courseid, display) {
      var i;
      for (i = 0; i < this.results.length; i += 1) {
        if ((this.results[i].courseid === courseid) || (rg2.config.DISPLAY_ALL_COURSES === courseid)) {
          if (display) {
            this.results[i].putTrackOnDisplay();
          } else {
            this.results[i].removeTrackFromDisplay();
          }
        }
      }
    },

    getDisplayedTrackNames: function () {
      var i, html;
      html = "";
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].displayTrack) {
          html += "<p style='color:" + this.results[i].trackColour + ";'>" + rg2.courses.getCourseName(this.results[i].courseid);
          html += ": " + this.results[i].name + "</p>";
        }
      }
      return html;
    },

    getDisplayedTrackDetails: function () {
      // used to populate rg2-track-names within animation on screen redraw
      var i, tracks, info;
      tracks = [];
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].displayTrack) {
          info = {};
          info.colour = this.results[i].trackColour;
          info.course = rg2.courses.getCourseName(this.results[i].courseid);
          info.name = this.results[i].name;
          info.id = i;
          tracks.push(info);
        }
      }
      return tracks;
    },

    setSpeedRange: function (max, min) {
      // make sure fastest is faster than slowest
      // remembering speeds are min/km so low is fast
      $("#spn-min-speed").spinner("option", "min", rg2.options.maxSpeed + 1);
      $("#spn-max-speed").spinner("option", "max", rg2.options.minSpeed - 1);
      rg2.setConfigOption("maxSpeed", max);
      rg2.setConfigOption("minSpeed", min);
      this.resetSpeedColours();
      rg2.redraw(false);
    },

    resetSpeedColours: function () {
      // called when user changes GPS speed colour configuration
      var i;
      for (i = 0; i < this.results.length; i += 1) {
        // forces colours to recalculate
        this.results[i].speedColour.length = 0;
      }
    },

    resultIDExists: function (resultid) {
      var i;
      for (i = 0; i < this.results.length; i += 1) {
        if (resultid === this.results[i].resultid) {
          return true;
        }
      }
      return false;
    },

    getTimeAndSplitsForID: function (resultid) {
      var i;
      for (i = 0; i < this.results.length; i += 1) {
        if (resultid === this.results[i].resultid) {
          return { time: this.results[i].time, splits: this.results[i].splits };
        }
      }
      return { time: rg2.config.TIME_NOT_FOUND, splits: [] };
    },

    addTracks: function (tracks) {
      // this gets passed the json data array
      // for each track
      let l = tracks.length;
      for (let i = 0; i < l; i += 1) {
        let resultIndex = tracks[i].id;
        let j = 0;
        // loop through all results and add it against the correct id
        while (j < this.results.length) {
          if (resultIndex === this.results[j].resultid) {
            this.results[j].addTrack(tracks[i]);
            break;
          }
          j += 1;
        }
      }
    },

    deleteAllResults: function () {
      this.results.length = 0;
    },

    sortByCourseIDThenResultID: function (a, b) {
      // sorts GPS results to be immediately after the associated main id
      if (a.courseid > b.courseid) {
        return 1;
      }
      if (b.courseid > a.courseid) {
        return -1;
      }
      if (a.rawid === b.rawid) {
        return a.resultid - b.resultid;
      }
      return a.rawid - b.rawid;
    },

    formatResultListAsAccordion: function () {
      var html, res, firstCourse, oldCourseID, i, tracksForThisCourse;
      if (this.results.length === 0) {
        return "<p>" + rg2.t("No results available") + "</p>";
      }
      html = "";
      firstCourse = true;
      oldCourseID = 0;
      tracksForThisCourse = 0;
      this.prepareResults();
      for (i = 0; i < this.results.length; i += 1) {
        res = this.results[i];
        if (!res.showResult) {
          // result marked not to display as it is being combined with GPS route
          continue;
        }
        if (res.courseid !== oldCourseID) {
          // found a new course so add header
          if (firstCourse) {
            firstCourse = false;
          } else {
            html += this.getBottomRows(tracksForThisCourse, oldCourseID) + "</table></div>";
          }
          tracksForThisCourse = 0;
          html += this.getCourseHeader(res);
          oldCourseID = res.courseid;
        }
        html += '<tr class="resultrow"><td id=' + res.rawid + '>' + res.position + '</td>';
        // #310 filter default comments in local language just in case
        if ((res.comments !== "") && (res.comments !== rg2.t('Type your comment'))) {
          // #304 make sure double quotes show up
          res.comments = res.comments.replace(/"/g, '&quot;');
          html += '<td><a href="#" title="' + res.comments + '">' + this.getNameHTML(res, i) + "</a>";
        } else {
          html += "<td>" + this.getNameHTML(res, i);
        }

        if (res.canDelete) {
          // add share icon
          html += " <i class='shareroute fa fa-share-square-o' id=" + res.resultid + "></i>";
          html += " <i class='deleteroute fa fa-trash' id=" + i + "></i>";
        }
        html += "</td><td>" + res.time + "</td>";
        if (res.hasValidTrack) {
          tracksForThisCourse += 1;
          html += "<td><input class='showtrack showtrack-" + oldCourseID + "' id=" + res.resultid + " type=checkbox name=result></input></td>";
        } else {
          html += "<td></td>";
        }
        html += "<td><input class='showreplay";
        if (res.hasValidTrack) {
          html += " showtrackreplay";
        }
        html += " showreplay-" + oldCourseID + "' id=" + i + " type=checkbox name=replay></input></td>";
        html += "</tr>";
      }
      html += this.getBottomRows(tracksForThisCourse, oldCourseID) + "</table></div></div>";
      return html;
    },

    prepareResults: function () {
      var oldID, i, canCombine;
      // want to avoid extra results line for GPS routes if there is no drawn route
      // first sort so that GPS routes come after initial result
      this.results.sort(this.sortByCourseIDThenResultID);
      // now we can combine first GPS route with original result if needed
      oldID = undefined;
      canCombine = false;
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].rawid === oldID) {
          if (canCombine) {
            if (this.results[i].hasValidTrack) {
              // found a GPS track to combine
              this.results[i - 1].showResult = false;
              // add position to GPS route
              this.results[i].position = this.results[i - 1].position;
              canCombine = false;
            }
          }
        } else {
          // this is the original result which can be combined if
          // it doesn't already have a drawn route
          canCombine = !this.results[i].hasValidTrack;
          oldID = this.results[i].rawid;
        }
      }
    },

    getNameHTML: function (res, i) {
      var namehtml;
      if (res.rawid === res.resultid) {
        namehtml = res.name;
      } else {
        namehtml = "<i>" + res.name + "</i>";
      }
      if (res.isScoreEvent) {
        namehtml = "<input class='showscorecourse showscorecourse-" + i + "' id=" + i + " type=checkbox name=scorecourse></input> " + namehtml;
      }
      return "<div>" + namehtml + "</div>";
    },

    getCourseHeader: function (result) {
      var html, info, text;
      text = result.coursename;
      info = rg2.courses.getCourseDetails(result.courseid);
      // need to protect against some old events with dodgy results
      if (info) {
        text += info.length === undefined ? '' : ": " + info.length + ' km';
      }
      html = "<h3>" + text + "<input class='showcourse' id=" + result.courseid + " type=checkbox name=course title='Show course'></input></h3><div>";
      // Add the search bar with the id of the course name
      html += "<div class='input-group margin-bottom-sm'><span class='input-group-addon'><i class='fa fa-search fa-fw'></i></span><input type='text' class='form-control rg2-result-search' id='search-" + result.courseid + "' placeholder='" + rg2.t("Search") + "'></div>";
      // Start the table with an id that relates to the course name to help with the filtering function
      html += "<table class='resulttable' id='table-" + result.courseid + "'><tr><th></th><th>" + rg2.t("Name") + "</th><th>" + rg2.t("Time") + "</th><th><i class='fa fa-pen'></i></th><th><i class='fa fa-play'></i></th></tr>";
      return html;
    },

    getBottomRows: function (tracks, oldCourseID) {
      // create bottom rows for all tracks checkboxes
      // first row is drawn and GPS routes (if they exist)
      var html;
      html = "<tr class='allitemsrow'><td></td><td>" + rg2.t("Routes") + "</td><td></td>";
      if (tracks > 0) {
        html += "<td><input class='allcoursetracks' id=" + oldCourseID + " type=checkbox name=track></input></td>";
        html += "<td><input class='allcoursetracksreplay' id=" + oldCourseID + " type=checkbox name=replay></input></td>";
      } else {
        html += "<td></td><td></td>";
      }
      // second row allows replay of non-drawn routes
      html += "</tr><tr class='allitemsrow'><td></td><td>" + rg2.t("All") + "</td><td></td><td></td>";
      html += "<td><input class='allcoursereplay' id=" + oldCourseID + " type=checkbox name=replay></input></td></tr>";
      return html;
    },

    getComments: function () {
      var i, comments;
      comments = "";
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].comments !== "") {
          comments += "<tr><td><strong>" + this.results[i].name + "</strong></td><td>";
          comments += this.results[i].coursename + "</td><td class='selectable'>" + this.results[i].comments + "</td></tr>";

        }
      }
      return comments;
    },

    createNameDropdown: function (courseid) {
      var i, dropdown;
      $("#rg2-name-select").empty();
      dropdown = document.getElementById("rg2-name-select");
      dropdown.options.add(rg2.utils.generateOption(null, rg2.t('Select name')));
      for (i = 0; i < this.results.length; i += 1) {
        // only use original results, not GPS results
        if (this.results[i].courseid === courseid) {
          if (this.results[i].resultid < rg2.config.GPS_RESULT_OFFSET) {
            dropdown.options.add(rg2.utils.generateOption(i, this.results[i].time + " " + this.results[i].name));
          }
        }
      }
    }
  };
  rg2.Results = Results;
}());
