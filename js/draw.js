/*global rg2:false */
/*global rg2Config:false */
// handle drawing of a new route
(function () {
  function Draw() {
    this.trackColor = '#ff0000';
    this.hasResults = false;
    this.initialiseDrawing();
  }

  Draw.prototype = {
    Constructor : Draw,

    gpsFileLoaded : function () {
      return this.gpstrack.fileLoaded;
    },

    uploadGPS : function (evt) {
      this.gpstrack.uploadGPS(evt);
    },

    getControlXY : function () {
      return {x: this.controlx, y: this.controly};
    },

    mouseUp : function (x, y, button) {
      // console.log(x, y);
      var i, trk, len, delta, handle, active;
      // called after a click at (x, y)
      active = $("#rg2-info-panel").tabs("option", "active");
      delta = 3;
      if (active !== rg2.config.TAB_DRAW) {
        return;
      }
      trk = this.gpstrack;
      if (trk.fileLoaded) {
        handle = trk.handles.getHandleClicked({x: x, y: y});
        if (handle !== undefined) {
          // delete or unlock if not first or last entry
          if ((button === rg2.config.RIGHT_CLICK) && (handle.index !== 0) && (handle.index !== trk.handles.length)) {
            if (handle.locked) {
              // unlock, don't delete
              trk.handles.unlockHandle(handle.index);
            } else {
              // delete handle
              trk.handles.deleteHandle(handle.index);
            }
          } else {
            // clicked in a handle area so toggle state
            if (handle.locked) {
              trk.handles.unlockHandle(handle.index);
            } else {
              trk.handles.lockHandle(handle.index);
            }
          }
        } else {
          // not an existing handle so read through track to look for x,y
          len = trk.baseX.length;
          for (i = 0; i < len; i += 1) {
            if ((trk.baseX[i] + delta >= x) && (trk.baseX[i] - delta <= x) && (trk.baseY[i] + delta >= y) && (trk.baseY[i] - delta <= y)) {
              // found on track so add new handle
              trk.handles.addHandle(x, y, i);
              break;
            }
          }
        }
      } else {
        // drawing new track
        // only allow drawing if we have valid name and course
        if ((trk.routeData.resultid !== null) && (trk.routeData.courseid !== null)) {
          this.addNewPoint(x, y);
        } else {
          rg2.utils.showWarningDialog('No course/name', 'Please select course, name and time before you start drawing a route or upload a file.');
        }
      }
    },

    dragEnded : function () {
      var trk;
      if (this.gpstrack.fileLoaded) {
        trk = this.gpstrack;
        // rebaseline GPS track
        trk.savedBaseX = trk.baseX.slice(0);
        trk.savedBaseY = trk.baseY.slice(0);
        trk.baseX = trk.routeData.x.slice(0);
        trk.baseY = trk.routeData.y.slice(0);
        trk.handles.rebaselineXY();
        $("#btn-undo-gps-adjust").button("enable");
      }
    },

    initialiseDrawing : function () {
      this.gpstrack = new rg2.GPSTrack();
      this.gpstrack.routeData = new rg2.RouteData();
      this.pendingCourseID = null;
      // the RouteData versions of these have the start control removed for saving
      this.controlx = [];
      this.controly = [];
      this.nextControl = 0;
      this.isScoreCourse = false;
      this.gpstrack.initialiseGPS();
      this.hasResults = rg2.events.hasResults();
      this.initialiseUI();
      rg2.redraw(false);
    },

    initialiseUI : function () {
      if (this.hasResults) {
        $("#rg2-select-name").show();
        $("#rg2-enter-name").hide();
      } else {
        $("#rg2-select-name").hide();
        $("#rg2-enter-name").show();
      }
      $("#rg2-name-select").prop('disabled', true);
      $("#rg2-undo").prop('disabled', true);
      $("#btn-reset-drawing").button("enable");
      rg2.utils.setButtonState("disable", ["#btn-save-route", "#btn-save-gps-route", "#btn-undo", "#btn-three-seconds", "#rg2-load-gps-file"]);
      $("#rg2-name-select").empty();
      $("#rg2-new-comments").empty().val(rg2.t(rg2.config.DEFAULT_NEW_COMMENT));
      $("#rg2-event-comments").empty().val(rg2.t(rg2.config.DEFAULT_EVENT_COMMENT));
      $("#btn-move-all").prop('checked', false);
      $("#rg2-name-entry").empty().val('');
      $("#rg2-time-entry").empty().val('');
      $("#rg2-name").removeClass('valid');
      $("#rg2-time").removeClass('valid');
    },

    setCourse : function (courseid) {
      if (!isNaN(courseid)) {
        if (this.gpstrack.routeData.courseid !== null) {
          // already have a course so we are trying to change it
          if (this.gpstrack.routeData.x.length > 1) {
            // drawing started so ask to confirm change
            this.pendingCourseid = courseid;
            this.confirmCourseChange();
          } else {
            // nothing done yet so just change course
            if (this.gpstrack.routeData.resultid !== null) {
              rg2.results.putScoreCourseOnDisplay(this.gpstrack.routeData.resultid, false);
            }
            rg2.courses.removeFromDisplay(this.gpstrack.routeData.courseid);
            this.initialiseCourse(courseid);
          }
        } else {
          // first time course has been selected
          this.initialiseCourse(courseid);
        }
      }
    },

    initialiseCourse : function (courseid) {
      var course;
      this.gpstrack.routeData.eventid = rg2.events.getKartatEventID();
      this.gpstrack.routeData.courseid = courseid;
      course = rg2.courses.getCourseDetails(courseid);
      this.isScoreCourse = course.isScoreCourse;
      if (!this.isScoreCourse) {
        rg2.courses.putOnDisplay(courseid);
        this.gpstrack.routeData.coursename = course.name;
        this.controlx = course.x;
        this.controly = course.y;
        this.gpstrack.routeData.x.length = 0;
        this.gpstrack.routeData.y.length = 0;
        this.gpstrack.routeData.x[0] = this.controlx[0];
        this.gpstrack.routeData.y[0] = this.controly[0];
        this.nextControl = 1;
      }
      rg2.results.createNameDropdown(courseid);
      $("#rg2-name-select").prop('disabled', false);
      $("#btn-undo-gps-adjust").button("disable");
      rg2.redraw(false);
    },

    confirmCourseChange : function () {
      var msg, me;
      msg = "<div id='rg2-course-change-dialog'>The route you have started to draw will be discarded. Are you sure you want to change the course?</div>";
      me = this;
      $(msg).dialog({
        title : "Confirm course change",
        modal : true,
        dialogClass : "no-close rg2-confirm-change-course",
        closeOnEscape : false,
        buttons : [{
          text : "Change course",
          click : function () {
            me.doChangeCourse();
          }
        }, {
          text : "Cancel",
          click : function () {
            me.doCancelChangeCourse();
          }
        }]
      });
    },

    resetDrawing : function () {
      var msg, me;
      msg = "<div id='rg2-drawing-reset-dialog'>All information you have entered will be removed. Are you sure you want to reset?</div>";
      me = this;
      $(msg).dialog({
        title : "Confirm reset",
        modal : true,
        dialogClass : "no-close rg2-confirm-drawing-reset",
        closeOnEscape : false,
        buttons : [{
          text : "Reset",
          click : function () {
            me.doDrawingReset();
          }
        }, {
          text : "Cancel",
          click : function () {
            me.doCancelDrawingReset();
          }
        }]
      });

    },

    doChangeCourse : function () {
      $('#rg2-course-change-dialog').dialog("destroy");
      rg2.courses.removeFromDisplay(this.gpstrack.routeData.courseid);
      if (this.gpstrack.routeData.resultid !== null) {
        rg2.results.putScoreCourseOnDisplay(this.gpstrack.routeData.resultid, false);
      }
      this.doDrawingReset();
      this.initialiseCourse(this.pendingCourseid);
    },

    doCancelChangeCourse : function () {
      // reset course dropdown
      $("#rg2-course-select").val(this.gpstrack.routeData.courseid);
      this.pendingCourseid = null;
      $('#rg2-course-change-dialog').dialog("destroy");
    },

    doDrawingReset : function () {
      $('#rg2-drawing-reset-dialog').dialog("destroy");
      this.pendingCourseid = null;
      this.initialiseDrawing();
    },

    doCancelDrawingReset : function () {
      $('#rg2-drawing-reset-dialog').dialog("destroy");
    },

    showCourseInProgress : function () {
      if (this.gpstrack.routeData.courseid !== null) {
        if (this.isScoreCourse) {
          rg2.results.putScoreCourseOnDisplay(this.gpstrack.routeData.resultid, true);
        } else {
          rg2.courses.putOnDisplay(this.gpstrack.routeData.courseid);
        }
      }
    },

    setName : function (resultid) {
      // callback from select box when we have results
      var res;
      if (!isNaN(resultid)) {
        res = rg2.results.getFullResult(resultid);
        if (res.hasValidTrack) {
          rg2.utils.showWarningDialog("Route already drawn", "If you draw a new route it will overwrite the old route for this runner. GPS routes are saved separately and will not be overwritten.");
        }
        // remove old course from display just in case we missed it somewhere else
        if (this.gpstrack.routeData.resultid !== null) {
          rg2.results.putScoreCourseOnDisplay(this.gpstrack.routeData.resultid, false);
        }
        this.gpstrack.routeData.resultid = res.resultid;
        this.gpstrack.routeData.name = res.name;
        // set up individual course if this is a score event
        if (this.isScoreCourse) {
          rg2.results.putScoreCourseOnDisplay(res.resultid, true);
          this.controlx = res.scorex;
          this.controly = res.scorey;
          this.gpstrack.routeData.x.length = 0;
          this.gpstrack.routeData.y.length = 0;
          this.gpstrack.routeData.x[0] = this.controlx[0];
          this.gpstrack.routeData.y[0] = this.controly[0];
          this.nextControl = 1;
          rg2.redraw(false);
        }
        this.startDrawing();
      }
    },

    setNameAndTime : function () {
      // callback for an entered name when no results available
      var time, name;
      name = $("#rg2-name-entry").val();
      if (name) {
        $("#rg2-name").addClass('valid');
      } else {
        $("#rg2-name").removeClass('valid');
      }
      time = $("#rg2-time-entry").val();
      // matches something like 0:00 to 999:59
      if (time.match(/\d+[:.][0-5]\d$/)) {
        $("#rg2-time").addClass('valid');
      } else {
        $("#rg2-time").removeClass('valid');
        time = null;
      }
      if (name && time) {
        time = time.replace(".", ":");
        this.gpstrack.routeData.name = name;
        this.gpstrack.routeData.resultid = 0;
        this.gpstrack.routeData.totaltime = time;
        this.gpstrack.routeData.startsecs = 0;
        this.gpstrack.routeData.time[0] = rg2.utils.getSecsFromHHMMSS(time);
        this.gpstrack.routeData.totalsecs = rg2.utils.getSecsFromHHMMSS(time);
        this.startDrawing();
      }
    },

    startDrawing : function () {
      $("#btn-three-seconds").button('enable');
      $("#rg2-load-gps-file").button('enable');
    },

    addNewPoint : function (x, y) {
      if (this.closeEnough(x, y)) {
        this.addRouteDataPoint(this.controlx[this.nextControl], this.controly[this.nextControl]);
        this.nextControl += 1;
        if (this.nextControl === this.controlx.length) {
          $("#btn-save-route").button("enable");
        }
      } else {
        this.addRouteDataPoint(Math.round(x), Math.round(y));
      }
      $("#btn-undo").button("enable");
      rg2.redraw(false);
    },

    addRouteDataPoint : function (x, y) {
      this.gpstrack.routeData.x.push(x);
      this.gpstrack.routeData.y.push(y);
    },

    undoGPSAdjust : function () {
      // restore route from before last adjust operation
      var trk;
      trk = this.gpstrack;
      trk.baseX = trk.savedBaseX.slice(0);
      trk.baseY = trk.savedBaseY.slice(0);
      trk.routeData.x = trk.savedBaseX.slice(0);
      trk.routeData.y = trk.savedBaseY.slice(0);
      trk.handles.undo();
      $("#btn-undo-gps-adjust").button("disable");
      rg2.redraw(false);
    },

    undoLastPoint : function () {
      // remove last point if we have one
      var points = this.gpstrack.routeData.x.length;
      if (points > 1) {
        // are we undoing from a control?
        if ((this.controlx[this.nextControl - 1] === this.gpstrack.routeData.x[points - 1]) && (this.controly[this.nextControl - 1] === this.gpstrack.routeData.y[points - 1])) {
          // are we undoing from the finish?
          if (this.nextControl === this.controlx.length) {
            $("#btn-save-route").button("disable");
          }
          // don't go back past first control
          if (this.nextControl > 1) {
            this.nextControl -= 1;
          }
        }
        this.gpstrack.routeData.x.pop();
        this.gpstrack.routeData.y.pop();
      }
      // note that array length has changed so can't use points
      if (this.gpstrack.routeData.x.length > 1) {
        $("#btn-undo").button("enable");
      } else {
        $("#btn-undo").button("disable");
      }
      rg2.redraw(false);
    },

    saveGPSRoute : function () {
      // called to save GPS file route
      // tidy up route details
      var i, l, t, date, offset;
      t = this.gpstrack.routeData.time[this.gpstrack.routeData.time.length - 1] - this.gpstrack.routeData.time[0];
      this.gpstrack.routeData.totaltime = rg2.utils.formatSecsAsMMSS(t);
      // GPS uses UTC: adjust to local time based on local user setting
      // only affects replay in real time
      date = new Date();
      // returns offset in minutes, so convert to seconds
      offset = date.getTimezoneOffset() * 60;
      this.gpstrack.routeData.startsecs = this.gpstrack.routeData.time[0] - offset;

      l = this.gpstrack.routeData.x.length;
      for (i = 0; i < l; i += 1) {
        this.gpstrack.routeData.x[i] = Math.round(this.gpstrack.routeData.x[i]);
        this.gpstrack.routeData.y[i] = Math.round(this.gpstrack.routeData.y[i]);
        // convert real time seconds to offset seconds from start time
        this.gpstrack.routeData.time[i] -= this.gpstrack.routeData.startsecs;
      }
      // allow for already having a GPS route for this runner
      this.gpstrack.routeData.resultid += rg2.config.GPS_RESULT_OFFSET;
      while (rg2.results.resultIDExists(this.gpstrack.routeData.resultid)) {
        this.gpstrack.routeData.resultid += rg2.config.GPS_RESULT_OFFSET;
        // add marker(s) to name to show it is a duplicate
        this.gpstrack.routeData.name += '*';
      }
      this.gpstrack.routeData.comments = $("#rg2-new-comments").val();

      $("#btn-undo-gps-adjust").button("disable");
      this.postRoute();
    },

    saveRoute : function () {
      // called to save manually entered route
      this.gpstrack.routeData.comments = $("#rg2-new-comments").val();
      this.gpstrack.routeData.controlx = this.controlx;
      this.gpstrack.routeData.controly = this.controly;
      // don't need start control so remove it
      this.gpstrack.routeData.controlx.splice(0, 1);
      this.gpstrack.routeData.controly.splice(0, 1);
      this.postRoute();
    },

    postRoute : function () {
      var $url, json, self;
      $url = rg2Config.json_url + '?type=addroute&id=' + this.gpstrack.routeData.eventid;
      // create JSON data
      json = JSON.stringify(this.gpstrack.routeData);
      self = this;
      $.ajax({
        data : json,
        type : 'POST',
        url : $url,
        dataType : 'json',
        success : function (data) {
          if (data.ok) {
            self.routeSaved(data.status_msg);
          } else {
            rg2.utils.showWarningDialog(this.gpstrack.routeData.name, rg2.t('Your route was not saved. Please try again'));
          }
        },
        error : function () {
          rg2.utils.showWarningDialog(this.gpstrack.routeData.name, rg2.t('Your route was not saved. Please try again'));
        }
      });
    },

    routeSaved : function () {
      rg2.utils.showWarningDialog(this.gpstrack.routeData.name, rg2.t('Your route has been saved') + '.');
      rg2.loadEvent(rg2.events.getActiveEventID());
    },

    waitThreeSeconds : function () {
      // insert a new point in the same place as the last point
      this.addRouteDataPoint(this.gpstrack.routeData.x[this.gpstrack.routeData.x.length - 1], this.gpstrack.routeData.y[this.gpstrack.routeData.y.length - 1]);
      rg2.redraw(false);
    },

    // snapto: test if drawn route is close enough to control
    closeEnough : function (x, y) {
      var range;
      if (rg2.options.set) {
        range = 7;
      } else {
        range = 2;
      }
      if (Math.abs(x - this.controlx[this.nextControl]) < range) {
        if (Math.abs(y - this.controly[this.nextControl]) < range) {
          return true;
        }
      }
      return false;
    },

    adjustTrack : function (p1, p2, button) {
      // called whilst dragging a GPS track
      var trk, handle, earliest, latest;
      //console.log("adjustTrack ", p1.x, p1.y, p2.x, p2.y);
      // check if background is locked or right click
      if ($('#btn-move-all').prop('checked') || button === rg2.config.RIGHT_CLICK) {
        rg2.ctx.translate(p2.x - p1.x, p2.y - p1.y);
      } else {
        trk = this.gpstrack;
        if (trk.handles.handlesLocked() > 0) {
          if (trk.handles.handlesLocked() === 1) {
            this.scaleRotateAroundSingleLockedPoint(p1, p2, trk.handles.getSingleLockedHandle(), trk.handles.getStartHandle().time, trk.handles.getFinishHandle().time);
          } else {
            // check if start of drag is on a handle
            handle = trk.handles.getHandleClicked(p1);
            // we already know we have at least two points locked: cases to deal with from here
            // 1: drag point not on a handle: exit
            // 2: drag point on a locked handle: exit
            // 3: drag point between start and a locked handle: scale and rotate around single point
            // 4: drag point between locked handle and end: scale and rotate around single handle
            // 5: drag point between two locked handles: shear around two fixed handles
            //case 1
            if (handle === undefined) {
              return;
            }
            // case 2
            if (handle.locked) {
              return;
            }
            earliest = trk.handles.getEarliestLockedHandle();
            latest = trk.handles.getLatestLockedHandle();

            if (earliest.time >= handle.time) {
              // case 3: drag point between start and a locked handle
              this.scaleRotateAroundSingleLockedPoint(p1, p2, earliest, trk.handles.getStartHandle().time, earliest.time);
            } else if (latest.time < handle.time) {
              // case 4: drag point between locked handle and end
              this.scaleRotateAroundSingleLockedPoint(p1, p2, latest, latest.time, trk.handles.getFinishHandle().time);
            } else {
              // case 5: shear/scale around two locked points
              this.scaleRotateBetweenTwoLockedPoints(p1, p2, handle);
            }
          }
        } else {
          // nothing locked so drag track
          this.dragTrack((p2.x - p1.x), (p2.y - p1.y));
        }
      }
    },

    scaleRotateBetweenTwoLockedPoints : function (p1, p2, handle) {
      // case 5: shear/scale between two locked points
      // all based on putting handle1 at (0, 0), rotating handle 2 to be on x-axis and then shearing on x-axis and scaling on y-axis.
      // there must be a better way...
      var i, lockedHandle1, lockedHandle2, scale, angle, reverseAngle, a, x, y, pt, pt1, pt2, trk;
      trk = this.gpstrack;
      lockedHandle1 = trk.handles.getPreviousLockedHandle(handle);
      lockedHandle2 = trk.handles.getNextLockedHandle(handle);
      //console.log("Point (", p1.x, ", ", p1.y, ") in middle of ", lockedHandle1.index, lockedHandle1.basex, lockedHandle1.basey, " and ", lockedHandle2.index, lockedHandle2.basex, lockedHandle2.basey);
      reverseAngle = rg2.utils.getAngle(lockedHandle1.basex, lockedHandle1.basey, lockedHandle2.basex, lockedHandle2.basey);
      angle = (2 * Math.PI) - reverseAngle;

      pt1 = rg2.utils.rotatePoint(p1.x - lockedHandle1.basex, p1.y - lockedHandle1.basey, angle);
      pt2 = rg2.utils.rotatePoint(p2.x - lockedHandle1.basex, p2.y - lockedHandle1.basey, angle);

      // calculate scaling factors
      a = (pt2.x - pt1.x) / pt1.y;
      scale = pt2.y / pt1.y;

      if (!isFinite(a) || !isFinite(scale)) {
        // this will cause trouble when y1 is 0 (or even just very small) but I've never managed to get it to happen
        // you need to click exactly on a line through the two locked handles: just do nothing for now
        // console.log("p1.y became 0: scale factors invalid", a, scale);
        return;
      }
      // recalculate all points between locked handles
      for (i = lockedHandle1.time + 1; i < lockedHandle2.time; i += 1) {
        // translate to put locked point at origin
        // rotate to give locked points as x-axis
        pt = rg2.utils.rotatePoint(trk.baseX[i] - lockedHandle1.basex, trk.baseY[i] - lockedHandle1.basey, angle);
        x = pt.x;
        y = pt.y;

        // shear/stretch/rotate and translate back
        pt = rg2.utils.rotatePoint(x + (y * a), y * scale, reverseAngle);
        trk.routeData.x[i] = pt.x + lockedHandle1.basex;
        trk.routeData.y[i] = pt.y + lockedHandle1.basey;
      }
      // recalculate all handles between locked handles
      trk.handles.scaleAndRotateBetweenLockedPoints(lockedHandle1, a, scale, angle, reverseAngle, lockedHandle1.time, lockedHandle2.time);
    },

    scaleRotateAroundSingleLockedPoint : function (p1, p2, lockedHandle, fromTime, toTime) {
      var i, scale, angle, pt;
      // scale and rotate track around single locked point
      scale = rg2.utils.getDistanceBetweenPoints(p2.x, p2.y, lockedHandle.basex, lockedHandle.basey) / rg2.utils.getDistanceBetweenPoints(p1.x, p1.y, lockedHandle.basex, lockedHandle.basey);
      angle = rg2.utils.getAngle(p2.x, p2.y, lockedHandle.basex, lockedHandle.basey) - rg2.utils.getAngle(p1.x, p1.y, lockedHandle.basex, lockedHandle.basey);
      //console.log (p1.x, p1.y, p2.x, p2.y, handle.basex, handle.basey, scale, angle, fromTime, toTime);
      for (i = fromTime; i <= toTime; i += 1) {
        pt = rg2.utils.rotatePoint(this.gpstrack.baseX[i] - lockedHandle.basex, this.gpstrack.baseY[i] - lockedHandle.basey, angle);
        this.gpstrack.routeData.x[i] = (pt.x * scale) + lockedHandle.basex;
        this.gpstrack.routeData.y[i] = (pt.y * scale) + lockedHandle.basey;
      }
      this.gpstrack.handles.scaleAndRotate(lockedHandle, scale, angle, fromTime, toTime);
    },

    dragTrack : function (dx, dy) {
      var i, trk;
      trk = this.gpstrack;
      for (i = 0; i < trk.baseX.length; i += 1) {
        trk.routeData.x[i] = trk.baseX[i] + dx;
        trk.routeData.y[i] = trk.baseY[i] + dy;
      }
      trk.handles.dragHandles(dx, dy);
    },

    drawNewTrack : function () {
      var opt;
      opt = rg2.getOverprintDetails();
      rg2.ctx.lineWidth = opt.overprintWidth;
      rg2.ctx.strokeStyle = this.trackColor;
      rg2.ctx.fillStyle = this.trackColour;
      rg2.ctx.font = '10pt Arial';
      rg2.ctx.textAlign = "left";
      rg2.ctx.globalAlpha = 1.0;
      // highlight next control if we have a course selected
      if ((this.nextControl > 0) && (!this.gpstrack.fileLoaded)) {
        rg2.ctx.beginPath();
        if (this.nextControl < (this.controlx.length - 1)) {
          // normal control
          rg2.ctx.arc(this.controlx[this.nextControl], this.controly[this.nextControl], opt.controlRadius, 0, 2 * Math.PI, false);
        } else {
          // finish
          rg2.ctx.arc(this.controlx[this.nextControl], this.controly[this.nextControl], opt.finishInnerRadius, 0, 2 * Math.PI, false);
          rg2.ctx.stroke();
          rg2.ctx.beginPath();
          rg2.ctx.arc(this.controlx[this.nextControl], this.controly[this.nextControl], opt.finishOuterRadius, 0, 2 * Math.PI, false);
        }
        // dot at centre of control circle
        rg2.ctx.fillRect(this.controlx[this.nextControl] - 1, this.controly[this.nextControl] - 1, 3, 3);
        rg2.ctx.stroke();
      }
      this.drawRoute();
      this.gpstrack.handles.drawHandles();
    },

    drawRoute : function () {
      var i, l;
      if (this.gpstrack.routeData.x.length > 1) {
        rg2.ctx.beginPath();
        rg2.ctx.moveTo(this.gpstrack.routeData.x[0], this.gpstrack.routeData.y[0]);
        // don't bother with +3 second displays in GPS adjustment
        l = this.gpstrack.routeData.x.length;
        for (i = 1; i < l; i += 1) {
          rg2.ctx.lineTo(this.gpstrack.routeData.x[i], this.gpstrack.routeData.y[i]);
        }
        rg2.ctx.stroke();
      }
    }
  };
  rg2.Draw = Draw;
}());