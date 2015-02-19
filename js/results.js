/*global rg2:false */
(function () {
  function Results() {
    this.results = [];
  }

  Results.prototype = {
    Constructor : Results,

    addResults : function (data, isScoreEvent) {
      var i, j, l, result, id, baseresult, variant, codes, scorex, scorey;
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
          if (baseresult !== undefined) {
            if (baseresult.scorex !== undefined) {
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
      var i, j, k, res, courses, codes, x, y, newControl, courseid;
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

      }
      // save the details we have just generated
      for (i = 0; i < courses.length; i += 1) {
        courseid = courses[i];
        rg2.courses.updateScoreCourse(courseid, codes[courseid], x[courseid], y[courseid]);
      }
    },

    generateLegPositions : function () {
      var i, j, k, courses, controls, pos, p;
      courses = [];
      controls = [];
      for (i = 0; i < this.results.length; i += 1) {
        if (courses.indexOf(this.results[i].courseid) === -1) {
          courses.push(this.results[i].courseid);
          // not a good way fo finding number of controls: better to get from courses?
          controls.push(this.results[i].splits.length);
        }

      }
      pos = [];
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
          for (j = 0; j < pos.length; j += 1) {
            // no allowance for ties yet
            this.results[pos[j].id].legpos[k] = j + 1;
          }
        }
      }
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
      var i, count;
      count = 0;
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].courseid === courseid) {
          // don't double-count GPS tracks
          if (this.results[i].resultid < rg2.config.GPS_RESULT_OFFSET) {
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
      var i, info, res, temp;
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
      info.time = Math.floor(info.secs / 86400) + " days ";
      temp = info.secs - (86400 * Math.floor(info.secs / 86400));
      info.time += Math.floor(temp / 3600) + " hours ";
      temp = temp - (3600 * Math.floor(temp / 3600));
      info.time += Math.floor(temp / 60) + " minutes ";
      info.time += temp - (60 * Math.floor(temp / 60)) + " seconds";
      return info;
    },

    getFullResult : function (resultid) {
      return this.results[resultid];
    },

    drawTracks : function () {
      var i, opt;
      opt = rg2.getReplayDetails();
      for (i = 0; i < this.results.length; i += 1) {
        this.results[i].drawTrack(opt);
        this.results[i].drawScoreCourse();
      }
    },

    updateTrackNames : function () {
      var html;
      $("#rg2-track-names").empty();
      html = this.getDisplayedTrackNames();
      if (html !== "") {
        $("#rg2-track-names").append(html);
        $("#rg2-track-names").show();
      } else {
        $("#rg2-track-names").hide();
      }

    },

    putOneTrackOnDisplay : function (resultid) {
      this.results[resultid].putTrackOnDisplay();
      this.updateTrackNames();
    },

    removeOneTrackFromDisplay : function (resultid) {
      this.results[resultid].removeTrackFromDisplay();
      this.updateTrackNames();
    },

    // add all tracks for one course
    putTracksOnDisplay : function (courseid) {
      var i;
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].courseid === courseid) {
          this.results[i].putTrackOnDisplay();
        }
      }
      this.updateTrackNames();
    },

    // put all tracks for all courses on display
    putAllTracksOnDisplay : function () {
      var i, l;
      l = this.results.length;
      for (i = 0; i < l; i += 1) {
        this.results[i].putTrackOnDisplay();
      }
      this.updateTrackNames();
    },

    getTracksOnDisplay : function () {
      var i, tracks;
      tracks = [];
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].displayTrack) {
          tracks.push(i);
        }
      }
      return tracks;
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

    getSplitsForID : function (resultid) {
      var i;
      for (i = 0; i < this.results.length; i += 1) {
        if (resultid === this.results[i].resultid) {
          return this.results[i].splits;
        }
      }
      return rg2.config.SPLITS_NOT_FOUND;
    },

    getTimeForID : function (resultid) {
      var i;
      for (i = 0; i < this.results.length; i += 1) {
        if (resultid === this.results[i].resultid) {
          return this.results[i].time;
        }
      }
      return rg2.config.TIME_NOT_FOUND;
    },

    removeAllTracksFromDisplay : function () {
      var i;
      for (i = 0; i < this.results.length; i += 1) {
        this.results[i].removeTrackFromDisplay();
      }
      this.updateTrackNames();
    },

    removeTracksFromDisplay : function (courseid) {
      var i;
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].courseid === courseid) {
          this.results[i].removeTrackFromDisplay();
        }
      }
      this.updateTrackNames();
    },

    addTracks : function (tracks) {
      // this gets passed the json data array
      var resultIndex, i, j, l, eventid, eventinfo;
      eventid = rg2.events.getKartatEventID();
      eventinfo = rg2.events.getEventInfo(eventid);
      // for each track
      l = tracks.length;
      for (i = 0; i < l; i += 1) {
        resultIndex = tracks[i].resultid;
        j = 0;
        // don't add GPS track since we got a better one in the original results
        if (resultIndex < rg2.config.GPS_RESULT_OFFSET) {
          // loop through all results and add it against the correct id
          while (j < this.results.length) {
            if (resultIndex === this.results[j].resultid) {
              this.results[j].addTrack(tracks[i], eventinfo.format);
              break;
            }
            j += 1;
          }
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
      // puts all GPS results at bottom of relevant course results
      var html, namehtml, temp, firstCourse, oldCourseID, i, l, tracksForThisCourse;
      html = "";
      namehtml = "";
      firstCourse = true;
      oldCourseID = 0;
      tracksForThisCourse = 0;
      this.results.sort(this.sortByCourseIDThenResultID);
      l = this.results.length;
      for (i = 0; i < l; i += 1) {
        temp = this.results[i];
        if (temp.courseid !== oldCourseID) {
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
        if (temp.rawid === temp.resultid) {
          namehtml = temp.name;
        } else {
          namehtml = "<i>" + temp.name + "</i>";
        }
        if (temp.isScoreEvent) {
          namehtml = "<div><input class='showscorecourse showscorecourse-" + i + "' id=" + i + " type=checkbox name=scorecourse></input> " + namehtml + "</div>";
        } else {
          namehtml = "<div>" + namehtml + "</div>";
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
          comments += "<p><strong>" + this.results[i].name + "</strong>: " + this.results[i].coursename + ": " + this.results[i].comments + "</p>";
        }
      }
      return comments;
    },

    createNameDropdown : function (courseid) {
      var i, dropdown, opt;
      dropdown = document.getElementById("rg2-name-select");
      opt = document.createElement("option");
      $("#rg2-name-select").empty();
      opt.value = null;
      opt.text = rg2.t('Select name');
      dropdown.options.add(opt);
      for (i = 0; i < this.results.length; i += 1) {
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

  rg2.Results = Results;

}());
