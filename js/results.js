/*global rg2:false */
(function () {
  function Results() {
    this.results = [];
  }

  Results.prototype = {
    Constructor : Results,

    addResults : function (data, isScoreEvent) {
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
        if (isScoreEvent) {
          variant = data[i].variant;
          result = new rg2.Result(data[i], isScoreEvent, codes[variant], scorex[variant], scorey[variant]);
        } else {
          result = new rg2.Result(data[i], isScoreEvent);
        }
        this.results.push(result);
      }
      this.setDeletionInfo();
      this.setScoreCourseInfo();
      this.generateLegPositions();
    },

    setScoreCourseInfo : function () {
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

    setDeletionInfo : function () {
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

    getDeletionInfo : function (id) {
      return ({id: this.results[id].resultid, token: this.results[id].token});
    },

    // lists all runners on a given course
    getAllRunnersForCourse : function (courseid) {
      var i, runners;
      runners = [];
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].courseid === courseid) {
          runners.push(i);
        }
      }
      return runners;
    },

    // read through results to get list of all controls on score courses
    // since there is no master list of controls!
    generateScoreCourses : function () {
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

    generateLegPositions : function () {
      var i, j, k, info, pos;
      info = this.getCoursesAndControls();
      pos = [];
      for (i = 0; i < info.courses.length; i += 1) {
        //console.log("Generate positions for course " + info.courses[i]);
        // start at 1 since 0 is time 0
        for (k = 1; k < info.controls[i]; k += 1) {
          pos.length = 0;
          for (j = 0; j < this.results.length; j += 1) {
            if (this.results[j].courseid === info.courses[i]) {
              pos.push({time: this.results[j].splits[k], id: j});
            }
          }
          pos.sort(this.sortTimes);
          //console.log(pos);
          for (j = 0; j < pos.length; j += 1) {
            // no allowance for ties yet
            this.results[pos[j].id].legpos[k] = j + 1;
          }
        }
      }
    },

    getCoursesAndControls : function () {
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
      return {courses: courses, controls: controls};
    },

    putScoreCourseOnDisplay : function (resultid, display) {
      var i;
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].resultid === resultid) {
          this.results[i].displayScoreCourse = display;
        }
      }

    },

    displayScoreCourse : function (id, display) {
      this.results[id].displayScoreCourse = display;
    },

    sortTimes : function (a, b) {
      return a.time - b.time;
    },

    countResultsByCourseID : function (courseid) {
      var i, count, info;
      info = rg2.events.getEventInfo();
      count = 0;
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].courseid === courseid) {
          // don't double-count GPS tracks, unless no initial results (#284)
          if ((this.results[i].resultid < rg2.config.GPS_RESULT_OFFSET) || (info.format === rg2.config.EVENT_WITHOUT_RESULTS)) {
            count += 1;
          }
        }
      }
      return count;
    },

    getRoutesForEvent : function () {
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

    getResultsInfo : function () {
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

    formatTotalRunningTime : function (secs) {
      var time;
      time = Math.floor(secs / 86400) + " days ";
      secs = secs - (86400 * Math.floor(secs / 86400));
      time += Math.floor(secs / 3600) + " hours ";
      secs = secs - (3600 * Math.floor(secs / 3600));
      time += Math.floor(secs / 60) + " minutes ";
      time += secs - (60 * Math.floor(secs / 60)) + " seconds";
      return time;
    },

    getFullResult : function (resultid) {
      return this.results[resultid];
    },

    getFullResultForRawID : function (rawid) {
      var i;
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].resultid === rawid) {
          return this.results[i];
        }
      }
      return undefined;
    },

    drawTracks : function () {
      var i;
      for (i = 0; i < this.results.length; i += 1) {
        this.results[i].drawTrack();
        this.results[i].drawScoreCourse();
      }
    },

    updateTrackNames : function () {
      var html;
      $("#rg2-track-names").empty();
      html = this.getDisplayedTrackNames();
      if (html !== "") {
        $("#rg2-track-names").append(html).show();
      } else {
        $("#rg2-track-names").hide();
      }
    },

    getTracksOnDisplay : function () {
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

    putOneTrackOnDisplay : function (resultid) {
      var i;
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].resultid === parseInt(resultid, 10)) {
          this.results[i].putTrackOnDisplay();
        }
      }
      this.updateTrackNames();
    },

    removeOneTrackFromDisplay : function (resultid) {
      var i;
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].resultid === parseInt(resultid, 10)) {
          this.results[i].removeTrackFromDisplay();
        }
      }
      this.updateTrackNames();
    },

    updateTrackDisplay : function (courseid, display) {
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
      this.updateTrackNames();
    },

    getDisplayedTrackNames : function () {
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

    resultIDExists : function (resultid) {
      var i;
      for (i = 0; i < this.results.length; i += 1) {
        if (resultid === this.results[i].resultid) {
          return true;
        }
      }
      return false;
    },

    getTimeAndSplitsForID : function (resultid) {
      var i;
      for (i = 0; i < this.results.length; i += 1) {
        if (resultid === this.results[i].resultid) {
          return {time: this.results[i].time, splits: this.results[i].splits};
        }
      }
      return {time: rg2.config.TIME_NOT_FOUND, splits: []};
    },

    addTracks : function (tracks) {
      // this gets passed the json data array
      var resultIndex, i, j, l, eventinfo;
      eventinfo = rg2.events.getEventInfo();
      // for each track
      l = tracks.length;
      for (i = 0; i < l; i += 1) {
        resultIndex = tracks[i].id;
        j = 0;
        // loop through all results and add it against the correct id
        while (j < this.results.length) {
          if (resultIndex === this.results[j].resultid) {
            this.results[j].addTrack(tracks[i], eventinfo.format);
            break;
          }
          j += 1;
        }
      }
    },

    deleteAllResults : function () {
      this.results.length = 0;
    },

    sortByCourseIDThenResultID : function (a, b) {
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

    formatResultListAsAccordion : function () {
      var html, res, firstCourse, oldCourseID, i, tracksForThisCourse;
      if (this.results.length === 0) {
        return "<p>" + rg2.t("No results available") + "</p>";
      }
      html = "";
      firstCourse = true;
      oldCourseID = 0;
      tracksForThisCourse = 0;
      this.results.sort(this.sortByCourseIDThenResultID);
      for (i = 0; i < this.results.length; i += 1) {
        res = this.results[i];
        if (res.courseid !== oldCourseID) {
          // found a new course so add header
          if (firstCourse) {
            firstCourse = false;
          } else {
            html += this.getBottomRow(tracksForThisCourse, oldCourseID) + "</table></div>";
          }
          tracksForThisCourse = 0;
          html += this.getCourseHeader(res);
          oldCourseID = res.courseid;
        }
        html += '<tr><td>' + res.position + '</td>';
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
          html += " <i class='shareroute fa fa-share-square-o' id=" + res.rawid + "></i>";
          html += " <i class='deleteroute fa fa-trash' id=" + i + "></i>";
        }
        html += "</td><td>" + res.time + "</td>";
        if (res.hasValidTrack) {
          tracksForThisCourse += 1;
          html += "<td><input class='showtrack showtrack-" + oldCourseID + "' id=" + res.resultid + " type=checkbox name=result></input></td>";
        } else {
          html += "<td></td>";
        }
        html += "<td><input class='showreplay showreplay-" + oldCourseID + "' id=" + i + " type=checkbox name=replay></input></td>";
        html += "</tr>";
      }
      html += this.getBottomRow(tracksForThisCourse, oldCourseID) + "</table></div></div>";
      return html;
    },

    getNameHTML : function (res, i) {
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

    getCourseHeader : function (result) {
      var html;
      html = "<h3>" + result.coursename + "<input class='showcourse' id=" + result.courseid + " type=checkbox name=course title='Show course'></input></h3><div>";
      // Add the search bar with the id of the course name
      html += "<div class='input-group margin-bottom-sm'><span class='input-group-addon'><i class='fa fa-search fa-fw'></i></span><input type='text' class='form-control rg2-result-search' id='search-" + result.courseid + "' placeholder='" + rg2.t("Search") + "'></div>";
      // Start the table with an id that relates to the course name to help with the filtering function
      html += "<table class='resulttable' id='table-" + result.courseid + "'><tr><th></th><th>" + rg2.t("Name") + "</th><th>" + rg2.t("Time") + "</th><th><i class='fa fa-pencil'></i></th><th><i class='fa fa-play'></i></th></tr>";
      return html;
    },

    getBottomRow : function (tracks, oldCourseID) {
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

    getComments : function () {
      var i, comments;
      comments = "";
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].comments !== "") {
          comments += "<tr><td><strong>" + this.results[i].name + "</strong></td><td>" + this.results[i].coursename + "</td><td>" + this.results[i].comments + "</td></tr>";
        }
      }
      return comments;
    },

    createNameDropdown : function (courseid) {
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
