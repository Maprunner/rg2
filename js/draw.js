/*global rg2:false */
/*global GPSTrack:false */
/*global getAngle:false */
/*global formatSecsAsMMSS:false */
/*global getSecsFromMMSS:false */
/*global rg2WarningDialog:false */
/*global json_url:false */
/*global getDistanceBetweenPoints:false */
// handle drawing of a new route
function Draw() {
  this.trackColor = '#ff0000';
  this.HANDLE_DOT_RADIUS = 7;
  this.CLOSE_ENOUGH = 10;
  this.hasResults = false;
  this.initialiseDrawing();
}

function RouteData() {
  this.courseid = null;
  this.coursename = null;
  this.resultid = null;
  this.eventid = null;
  this.name = null;
  this.comments = null;
  this.x = [];
  this.y = [];
  this.controlx = [];
  this.controly = [];
  this.time = [];
  this.startsecs = 0;
  this.totaltime = 0;
}

Draw.prototype = {
  Constructor : Draw,

  gpsFileLoaded : function() {
    return this.gpstrack.fileLoaded;
  },

  uploadGPS : function(evt) {
    this.gpstrack.uploadGPS(evt);
  },

  getControlX : function() {
    return this.controlx;
  },

  getControlY : function() {
    return this.controly;
  },

  mouseUp : function(x, y, button) {
    // called after a click at (x, y)
    var active = $("#rg2-info-panel").tabs("option", "active");
    var i;
    var trk;
    var len;
    var delta = 3;
    var h = {};
    var handle;
    if (active !== rg2.config.TAB_DRAW) {
      return;
    }
    trk = this.gpstrack;
    if (trk.fileLoaded) {
      handle = this.getHandleClicked(x, y);
      if (handle !== undefined) {
        if ((button === rg2.config.RIGHT_CLICK) &&  (handle !== 0) && (handle !== trk.handles.length)) {
          // delete handle if not first or last entries
          trk.handles.splice(handle, 1);
        } else {
          // clicked in a handle area so toggle state
          if (trk.handles[handle].locked) {
            trk.handles[handle].locked = false;
            this.pointsLocked -= 1;
          } else {
            trk.handles[handle].locked = true;
            this.pointsLocked += 1;
          }
        }
      } else {
        // not an existing handle so read through track to look for x,y
        len = trk.baseX.length;
        for ( i = 0; i < len; i += 1) {
          if ((trk.baseX[i] + delta >= x) && (trk.baseX[i] - delta <= x) && (trk.baseY[i] + delta >= y) && (trk.baseY[i] - delta <= y)) {
            // found on track so add new handle
            h.x = x;
            h.y = y;
            h.basex = x;
            h.basey = y;
            h.locked = false;
            h.time = i;
            trk.handles.push(h);
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
        rg2WarningDialog('Select course and name', 'Please select course and name before you start drawing a route or upload a file.');
      }
    }
  },

  dragEnded : function() {
    if (this.gpstrack.fileLoaded) {
      var trk =this.gpstrack;
      // rebaseline GPS track
      trk.baseX = trk.routeData.x.slice(0);
      trk.baseY = trk.routeData.y.slice(0);
      for (var i = 0; i < trk.handles.length; i += 1) {
        trk.handles[i].basex = trk.handles[i].x;
        trk.handles[i].basey = trk.handles[i].y;
      }
    }
  },

  // locks or unlocks background when adjusting map
  toggleMoveAll : function(checkedState) {
    this.backgroundLocked = checkedState;
  },

  initialiseDrawing : function() {
    this.gpstrack = new GPSTrack();
    this.gpstrack.routeData = new RouteData();
    this.backgroundLocked = false;
    this.pointsLocked = 0;
    this.pendingCourseID = null;
    // the RouteData versions of these have the start control removed for saving
    this.controlx = [];
    this.controly = [];
    this.nextControl = 0;
    this.gpstrack.initialiseGPS();
    this.hasResults = rg2.eventHasResults();
    if (this.hasResults) {
      $("#rg2-select-name").show();
      $("#rg2-enter-name").hide();
    } else {
      $("#rg2-select-name").hide();
      $("#rg2-enter-name").show();
    }
    $("#rg2-name-select").prop('disabled', true);
    $("#rg2-undo").prop('disabled', true);
    $("#btn-save-route").button("disable");
    $("#btn-save-gps-route").button("disable");
    $("#btn-undo").button("disable");
    $("#btn-three-seconds").button("disable");
    $("#btn-reset-drawing").button("enable");
    $("#rg2-name-select").empty();
    $("#rg2-new-comments").empty().val(rg2.config.DEFAULT_NEW_COMMENT);
    $("#rg2-event-comments").empty().val(rg2.config.DEFAULT_EVENT_COMMENT);
    $("rg2-move-all").prop('checked', false);
    $("#rg2-load-gps-file").button('disable');
    $("#rg2-name-entry").empty().val('');
    $("#rg2-time-entry").empty().val('');
    $("#rg2-name").removeClass('valid');
    $("#rg2-time").removeClass('valid');
    rg2.redraw(false);
  },

  setCourse : function(courseid) {
    if (!isNaN(courseid)) {
      if (this.gpstrack.routeData.courseid !== null) {
        // already have a course so we are trying to change it
        if (this.gpstrack.routeData.x.length > 1) {
          // drawing started so ask to confirm change
          this.pendingCourseid = courseid;
          this.confirmCourseChange();
        } else {
          // nothing done yet so just change course
          rg2.removeFromDisplay(this.gpstrack.routeData.courseid);
          this.initialiseCourse(courseid);
        }
      } else {
        // first time course has been selected
        this.initialiseCourse(courseid);
      }
    }
  },

  initialiseCourse : function(courseid) {
    this.gpstrack.routeData.eventid = rg2.getKartatEventID();
    this.gpstrack.routeData.courseid = courseid;
    rg2.putOnDisplay(courseid);
    var course = rg2.getCourseDetails(courseid);
    this.gpstrack.routeData.coursename = course.name;
    this.controlx = course.x;
    this.controly = course.y;
    this.gpstrack.routeData.x.length = 0;
    this.gpstrack.routeData.y.length = 0;
    this.gpstrack.routeData.x[0] = this.controlx[0];
    this.gpstrack.routeData.y[0] = this.controly[0];
    this.nextControl = 1;
    rg2.createNameDropdown(courseid);
    $("#rg2-name-select").prop('disabled', false);
    rg2.redraw(false);
  },

  confirmCourseChange : function() {

    var msg = "<div id='course-change-dialog'>The route you have started to draw will be discarded. Are you sure you want to change the course?</div>";
    var me = this;
    $(msg).dialog({
      title : "Confirm course change",
      modal : true,
      dialogClass : "no-close",
      closeOnEscape : false,
      buttons : [{
        text : "Change course",
        click : function() {
          me.doChangeCourse();
        }
      }, {
        text : "Cancel",
        click : function() {
          me.doCancelChangeCourse();
        }
      }]
    });
  },

  resetDrawing : function() {
    var msg = "<div id='drawing-reset-dialog'>All information you have entered will be removed. Are you sure you want to reset?</div>";
    var me = this;
    $(msg).dialog({
      title : "Confirm reset",
      modal : true,
      dialogClass : "no-close",
      closeOnEscape : false,
      buttons : [{
        text : "Reset",
        click : function() {
          me.doDrawingReset();
        }
      }, {
        text : "Cancel",
        click : function() {
          me.doCancelDrawingReset();
        }
      }]
    });

  },

  doChangeCourse : function() {
    $('#course-change-dialog').dialog("destroy");
    rg2.removeFromDisplay(this.gpstrack.routeData.courseid);
    this.initialiseCourse(this.pendingCourseid);
  },

  doCancelChangeCourse : function() {
    // reset course dropdown
    $("#rg2-course-select").val(this.gpstrack.routeData.courseid);
    this.pendingCourseid = null;
    $('#course-change-dialog').dialog("destroy");
  },

  doDrawingReset : function() {
    $('#drawing-reset-dialog').dialog("destroy");
    this.pendingCourseid = null;
    this.initialiseDrawing();
  },

  doCancelDrawingReset : function() {
    $('#drawing-reset-dialog').dialog("destroy");
  },

  showCourseInProgress : function() {
    if (this.gpstrack.routeData.courseid !== null) {
      rg2.putOnDisplay(this.gpstrack.routeData.courseid);
    }
  },

  setName : function(resultid) {
    if (!isNaN(resultid)) {
      this.gpstrack.routeData.resultid = rg2.getKartatResultID(resultid);
      this.gpstrack.routeData.name = rg2.getRunnerName(resultid);
      this.startDrawing();
    }
  },
  
  setNameAndTime :function(event) {
    var t;
    var time;
    var name = $("#rg2-name-entry").val();
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
    if ((name) && (time)) {
      time = time.replace(".", ":");
      this.gpstrack.routeData.name = name;
      this.gpstrack.routeData.resultid = 0;
      this.gpstrack.routeData.totaltime = time;
      this.gpstrack.routeData.startsecs = 0;
      this.gpstrack.routeData.time[0] = getSecsFromMMSS(time);
      this.startDrawing();
    }
  },

  startDrawing : function() {
    $("#btn-three-seconds").button('enable');
    $("#rg2-load-gps-file").button('enable');
  },

  addNewPoint : function(x, y) {

    // enable here for testing
    //$("#btn-save-route").button("enable");

    if (this.closeEnough(x, y)) {
      this.gpstrack.routeData.x.push(this.controlx[this.nextControl]);
      this.gpstrack.routeData.y.push(this.controly[this.nextControl]);
      this.nextControl += 1;
      if (this.nextControl === this.controlx.length) {
        $("#btn-save-route").button("enable");
      }
    } else {
      this.gpstrack.routeData.x.push(Math.round(x));
      this.gpstrack.routeData.y.push(Math.round(y));
    }
    if (this.gpstrack.routeData.x.length > 1) {
      $("#btn-undo").button("enable");
    } else {
      $("#btn-undo").button("disable");
    }
    rg2.redraw(false);
  },

  undoLastPoint : function() {
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
      $("#btn-undo").button("enable");
    }
    rg2.redraw(false);
  },

  saveGPSRoute : function() {
    // called to save GPS file route
    // tidy up route details
    var i;
    var t = this.gpstrack.routeData.time[this.gpstrack.routeData.time.length - 1] - this.gpstrack.routeData.time[0];
    this.gpstrack.routeData.totaltime = formatSecsAsMMSS(t);
    this.gpstrack.routeData.startsecs = this.gpstrack.routeData.time[0];
    for ( i = 0; i < this.gpstrack.routeData.x.length; i += 1) {
      this.gpstrack.routeData.x[i] = Math.round(this.gpstrack.routeData.x[i]);
      this.gpstrack.routeData.y[i] = Math.round(this.gpstrack.routeData.y[i]);
      // convert real time seconds to offset seconds from start time
      this.gpstrack.routeData.time[i] -= this.gpstrack.routeData.startsecs;
    }
    // allow for already having a GPS route for this runner
    this.gpstrack.routeData.resultid += rg2.config.GPS_RESULT_OFFSET;
    while (rg2.resultIDExists(this.gpstrack.routeData.resultid)) {
      this.gpstrack.routeData.resultid += rg2.config.GPS_RESULT_OFFSET;
      // add marker(s) to name to show it is a duplicate
      this.gpstrack.routeData.name += '*';
    }
    this.gpstrack.routeData.comments = $("#rg2-new-comments").val();

    this.postRoute();
  },

  saveRoute : function() {
    // called to save manually entered route
    this.gpstrack.routeData.comments = $("#rg2-new-comments").val();
    this.gpstrack.routeData.controlx = this.controlx;
    this.gpstrack.routeData.controly = this.controly;
    // don't need start control so remove it
    this.gpstrack.routeData.controlx.splice(0, 1);
    this.gpstrack.routeData.controly.splice(0, 1);
    this.postRoute();
  },

  postRoute : function() {
    var $url = json_url + '?type=addroute&id=' + this.gpstrack.routeData.eventid;
    // create JSON data
    var json = JSON.stringify(this.gpstrack.routeData);
    var self = this;
    $.ajax({
      data : json,
      type : 'POST',
      url : $url,
      dataType : 'json',
      success : function(data, textStatus, jqXHR) {
        if (data.ok) {
          self.routeSaved(data.status_msg);
        } else {
          self.saveError(data.status_msg);
        }
      },
      error : function(jqXHR, textStatus, errorThrown) {
        self.saveError(errorThrown);
      }
    });
  },

  saveError : function(text) {
    rg2WarningDialog(this.gpstrack.routeData.name, 'Your route was not saved. Please try again.' + text);
  },

  routeSaved : function(text) {
    rg2WarningDialog(this.gpstrack.routeData.name, 'Your route has been saved.');
    rg2.loadEvent(rg2.getActiveEventID());
  },

  waitThreeSeconds : function() {
    // insert a new point in the same place as the last point
    this.gpstrack.routeData.x.push(this.gpstrack.routeData.x[this.gpstrack.routeData.x.length - 1]);
    this.gpstrack.routeData.y.push(this.gpstrack.routeData.y[this.gpstrack.routeData.y.length - 1]);
    rg2.redraw(false);
  },

  // snapto: test if drawn route is close enough to control
  closeEnough : function(x, y) {
    if (Math.abs(x - this.controlx[this.nextControl]) < this.CLOSE_ENOUGH) {
      if (Math.abs(y - this.controly[this.nextControl]) < this.CLOSE_ENOUGH) {
        return true;
      }
    }
    return false;
  },

  trackLocked : function() {
    return (this.pointsLocked > 0);
  },

  adjustTrack : function(x1, y1, x2, y2, button, shiftKeyPressed, ctrlKeyPressed) {
// called whilst dragging a GPS track
// TODO: not the greatest function in the world and a candidate for refactoring big-time
// but it works which is a huge step forward
    var i;
    var trk;
    var len;
    var lockBefore;
    var lockAfter;
    var dragIndex;
    var handle;
    var x;
    var y;
    var a;
    var xb;
    var yb;
    var xs;
    var ys;
    var dx;
    var dy;
    var scale1;
    var scale2;
    var scale;
    var oldAngle;
    var newAngle;
    var angle;
    var reverseAngle;
    var earliest;
    var latest;
    var lockedHandle1;
    var lockedHandle2;
    var fromTime;
    var toTime;
    //console.log("adjustTrack ", x1, y1, x2, y2);
    if ((this.backgroundLocked) || (button === rg2.config.RIGHT_CLICK)) {
      rg2.ctx.translate(x2 - x1, y2 - y1);
    } else {
      trk = this.gpstrack;
      len = trk.baseX.length;
      if (this.pointsLocked > 0) {
        if (this.pointsLocked === 1)  {
          handle = this.getLockedHandle();
          // scale and rotate track around single locked point
          oldAngle = getAngle(x1, y1, handle.basex, handle.basey);
          newAngle = getAngle(x2, y2, handle.basex, handle.basey);
          angle = newAngle - oldAngle;
          scale1 = getDistanceBetweenPoints(x1, y1, handle.basex, handle.basey);
          scale2 = getDistanceBetweenPoints(x2, y2, handle.basex, handle.basey);
          scale = scale2/scale1;
          //console.log (x1, y1, x2, y2, handle.basex, handle.basey, scale, angle);
          for ( i = 0; i < len; i += 1) {
            x = trk.baseX[i] - handle.basex;
            y = trk.baseY[i] - handle.basey;
            trk.routeData.x[i] = (((Math.cos(angle) * x) - (Math.sin(angle) * y)) * scale) + handle.basex;
            trk.routeData.y[i] = (((Math.sin(angle) * x) + (Math.cos(angle) * y)) * scale) + handle.basey;
          }
          for (i = 0; i < trk.handles.length; i += 1) {
            if (!trk.handles[i].locked) {
              x = trk.handles[i].basex - handle.basex;
              y = trk.handles[i].basey - handle.basey;
              trk.handles[i].x = (((Math.cos(angle) * x) - (Math.sin(angle) * y)) * scale) + handle.basex;
              trk.handles[i].y = (((Math.sin(angle) * x) + (Math.cos(angle) * y)) * scale) + handle.basey;
            }
          }
          
        } else {
          // check if start of drag is on a handle
          handle = this.getHandleClicked(x1, y1);
          // we already know we have at least two points locked: cases to deal with from here
          // 1: drag point not on a handle: exit
          // 2: drag point on a locked handle: exit
          // 3: drag point between start and a locked handle: scale and rotate around single point
          // 4: drag point between locked handle and end: scale and rotate around single handle
          // 5: drag point between two locked handles: shear around two fixed handles
          //case 1
          if (handle === undefined) {
            //console.log("Point (" + x1 + ", " + y1 + ") not on track: " + this.pointsLocked + " points locked.");
            return;
          }
          // case 2
          if (trk.handles[handle].locked) {
            //console.log("Point (" + x1 + ", " + y1 + ") locked: " + this.pointsLocked + " points locked.");
            return;
          }
          earliest = this.getEarliestLockedHandle();
          latest = this.getLatestLockedHandle();
          
          if ((trk.handles[earliest].time > trk.handles[handle].time) || (trk.handles[latest].time < trk.handles[handle].time)) {
            // case 3 and 4: floating end point
            if (trk.handles[earliest].time > trk.handles[handle].time) {
              lockedHandle1 = earliest;
              fromTime = 0;
              toTime = trk.handles[earliest].time;
            } else {
              lockedHandle1 = latest;
              fromTime = trk.handles[latest].time + 1;
              // second entry is always the last point in the route
              toTime = trk.handles[1].time + 1;
            }
            // scale and rotate track around single locked point
            scale1 = getDistanceBetweenPoints(x1, y1, trk.handles[lockedHandle1].basex, trk.handles[lockedHandle1].basey);
            scale2 = getDistanceBetweenPoints(x2, y2, trk.handles[lockedHandle1].basex, trk.handles[lockedHandle1].basey);
            scale = scale2/scale1;
            oldAngle = getAngle(x1, y1, trk.handles[lockedHandle1].basex, trk.handles[lockedHandle1].basey);
            newAngle = getAngle(x2, y2, trk.handles[lockedHandle1].basex, trk.handles[lockedHandle1].basey);
            angle = newAngle - oldAngle;
            //console.log (x1, y1, x2, y2, trk.handles[handle].basex, trk.handles[handle].basey, scale, angle, fromTime, toTime);
            for ( i = fromTime; i < toTime; i += 1) {
              x = trk.baseX[i] - trk.handles[lockedHandle1].basex;
              y = trk.baseY[i] - trk.handles[lockedHandle1].basey;
              trk.routeData.x[i] = (((Math.cos(angle) * x) - (Math.sin(angle) * y)) * scale) + trk.handles[lockedHandle1].basex;
              trk.routeData.y[i] = (((Math.sin(angle) * x) + (Math.cos(angle) * y)) * scale) + trk.handles[lockedHandle1].basey;
            }
            for (i = 0; i < trk.handles.length; i += 1) {
              if ((!trk.handles[i].locked) && (trk.handles[i].time >= fromTime) && (trk.handles[i].time <= toTime)) {
                x = trk.handles[i].basex - trk.handles[lockedHandle1].basex;
                y = trk.handles[i].basey - trk.handles[lockedHandle1].basey;
                trk.handles[i].x = (((Math.cos(angle) * x) - (Math.sin(angle) * y)) * scale) + trk.handles[lockedHandle1].basex;
                trk.handles[i].y = (((Math.sin(angle) * x) + (Math.cos(angle) * y)) * scale) + trk.handles[lockedHandle1].basey;
              }
            }
          } else {
            // case 5: shear/scale around two locked points 
            // all based on putting handle1 at (0, 0), rotating handle 2 to be on x-axis and then shearing on x-axis and scaling on y-axis.
            // there must be a better way...
            
            lockedHandle1 = this.getPreviousLockedHandle(handle);
            fromTime = trk.handles[lockedHandle1].time;
            lockedHandle2 = this.getNextLockedHandle(handle);
            toTime = trk.handles[lockedHandle2].time;
            //console.log("Point (", x1, ", ", y1, ") in middle of ", lockedHandle1, trk.handles[lockedHandle1].basex, trk.handles[lockedHandle1].basey, " and ",lockedHandle2, trk.handles[lockedHandle2].basex, trk.handles[lockedHandle2].basey);
            reverseAngle = getAngle(trk.handles[lockedHandle1].basex, trk.handles[lockedHandle1].basey, trk.handles[lockedHandle2].basex, trk.handles[lockedHandle2].basey);
            angle = (2 * Math.PI) - reverseAngle;
            
            xb = x1 - trk.handles[lockedHandle1].basex;
            yb = y1 - trk.handles[lockedHandle1].basey;
            x1 = (Math.cos(angle) * xb) - (Math.sin(angle) * yb);
            y1 = (Math.sin(angle) * xb) + (Math.cos(angle) * yb);
                      
            xb = x2 - trk.handles[lockedHandle1].basex;
            yb = y2 - trk.handles[lockedHandle1].basey;
            x2 = (Math.cos(angle) * xb) - (Math.sin(angle) * yb);
            y2 = (Math.sin(angle) * xb) + (Math.cos(angle) * yb);
                        
            xb = trk.handles[lockedHandle2].basex - trk.handles[lockedHandle1].basex;
            yb = trk.handles[lockedHandle2].basey - trk.handles[lockedHandle1].basey;
            x = (Math.cos(angle) * xb) - (Math.sin(angle) * yb);
            y = (Math.sin(angle) * xb) + (Math.cos(angle) * yb);

            // calculate scaling factors
            a = (x2 - x1) /y1;
            scale = y2 / y1;
            
            if (!isFinite(a) || !isFinite(scale)) {
              // TODO: this will cause trouble when y1 is 0 (or even just very small) but I've never managed to get it to happen
              // you need to click exactly on a line through the two locked handles: just do nothing for now
              console.log("y1 became 0: scale factors invalid", a, scale);
              return;
            }
            // recalculate all points between locked handles          
            for ( i = fromTime + 1; i < toTime; i += 1) {
              // translate to put locked point at origin
              xb = trk.baseX[i] - trk.handles[lockedHandle1].basex;
              yb = trk.baseY[i] - trk.handles[lockedHandle1].basey;
              // rotate to give locked points as x-axis
              x = (Math.cos(angle) * xb) - (Math.sin(angle) * yb);
              y = (Math.sin(angle) * xb) + (Math.cos(angle) * yb);
              
              // shear/stretch
              xs = x + (y * a);
              ys = y * scale;
              
              // rotate and translate back
              trk.routeData.x[i] = (Math.cos(reverseAngle) * xs) - (Math.sin(reverseAngle) * ys) + trk.handles[lockedHandle1].basex;
              trk.routeData.y[i] = (Math.sin(reverseAngle) * xs) + (Math.cos(reverseAngle) * ys) + trk.handles[lockedHandle1].basey;

            }
            // recalculate all handles between locked handles
            for (i = 0; i < trk.handles.length; i += 1) {
              if ((!trk.handles[i].locked) && (trk.handles[i].time >= fromTime) && (trk.handles[i].time <= toTime)) {
                xb = trk.handles[i].basex - trk.handles[lockedHandle1].basex;
                yb = trk.handles[i].basey - trk.handles[lockedHandle1].basey;
                
                // rotate to give locked points as x-axis
                x = (Math.cos(angle) * xb) - (Math.sin(angle) * yb);
                y = (Math.sin(angle) * xb) + (Math.cos(angle) * yb);
              
                // shear/stretch
                xs = x + (y * a);
                ys = y * scale;
                             
                trk.handles[i].x = ((Math.cos(reverseAngle) * xs) - (Math.sin(reverseAngle) * ys)) + trk.handles[lockedHandle1].basex;
                trk.handles[i].y = ((Math.sin(reverseAngle) * xs) + (Math.cos(reverseAngle) * ys)) + trk.handles[lockedHandle1].basey;
              }
            }
          }
          
        }
      } else {
        // nothing locked so drag track
        dx = x2 - x1;
        dy = y2 - y1;
        for ( i = 0; i < len; i += 1) {
          trk.routeData.x[i] = trk.baseX[i] + dx;
          trk.routeData.y[i] = trk.baseY[i] + dy;
        }
        for (i = 0; i < trk.handles.length; i += 1) {
          trk.handles[i].x = trk.handles[i].basex + dx;
          trk.handles[i].y = trk.handles[i].basey + dy;
        }
      }
    }
  },
  
  // find if the click was on an existing handle
  // return: handle index or undefined
  // basex and basey are handle locations at the start of the drag which is what we are interested in
  getHandleClicked: function (x, y) {
    //console.log("Get handle clicked for " + x + ", " + y);
    var i;
    var distance;
    for (i = 0; i < this.gpstrack.handles.length; i += 1) {
      distance = getDistanceBetweenPoints(x, y, this.gpstrack.handles[i].basex, this.gpstrack.handles[i].basey);
      if (distance <= this.HANDLE_DOT_RADIUS) {
        return i;
      }
    }
    return undefined;
  },
  
  // called when we know there is only one locked handle
  // return: handle object or undefined
  getLockedHandle: function() {
    var i;
    for (i = 0; i < this.gpstrack.handles.length; i += 1) {
      if (this.gpstrack.handles[i].locked) {
        return this.gpstrack.handles[i];
      }
    }
    return undefined;
  },
  
  // called to find earliest locked handle
  getEarliestLockedHandle: function() {
    var i;
    var earliest = 99999;
    var handle;
    for (i = 0; i < this.gpstrack.handles.length; i += 1) {
      if (this.gpstrack.handles[i].locked) {
        if (this.gpstrack.handles[i].time < earliest) {
          earliest = this.gpstrack.handles[i].time;
          handle = i;
        }
      }
    }
    return handle;
  },

  // called to find latest locked handle
  getLatestLockedHandle: function() {
    var i;
    var latest = -1;
    var handle;
    for (i = 0; i < this.gpstrack.handles.length; i += 1) {
      if (this.gpstrack.handles[i].locked) {
        if (this.gpstrack.handles[i].time > latest) {
          latest = this.gpstrack.handles[i].time;
          handle = i;
        }
      }
    }
    return handle;
  },

  getPreviousLockedHandle: function(handle) {
    var i;
    // max diff possible is last entry time
    var minDiff = this.gpstrack.handles[1].time;
    var time = this.gpstrack.handles[handle].time;
    var previous;
    for (i = 0; i < this.gpstrack.handles.length; i += 1) {
      if (((time - this.gpstrack.handles[i].time) < minDiff) && (this.gpstrack.handles[i].time < time) && this.gpstrack.handles[i].locked) {
        minDiff = time - this.gpstrack.handles[i].time;
        previous = i;
      }
    }
    return previous;
  },

  getNextLockedHandle: function(handle) {
    var i;
    // max diff possible is last entry time
    var minDiff = this.gpstrack.handles[1].time;
    var time = this.gpstrack.handles[handle].time;
    var next;
    for (i = 0; i < this.gpstrack.handles.length; i += 1) {
      if (((this.gpstrack.handles[i].time - time) < minDiff) && (this.gpstrack.handles[i].time > time) && this.gpstrack.handles[i].locked) {
        minDiff = this.gpstrack.handles[i].time - time;
        next = i;
      }
    }
    return next;
  },

  drawNewTrack : function() {
    var i;
    rg2.ctx.lineWidth = 2;
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
        rg2.ctx.arc(this.controlx[this.nextControl], this.controly[this.nextControl], rg2.config.CONTROL_CIRCLE_RADIUS, 0, 2 * Math.PI, false);
      } else {
        // finish
        rg2.ctx.arc(this.controlx[this.nextControl], this.controly[this.nextControl], rg2.config.FINISH_INNER_RADIUS, 0, 2 * Math.PI, false);
        rg2.ctx.stroke();
        rg2.ctx.beginPath();
        rg2.ctx.arc(this.controlx[this.nextControl], this.controly[this.nextControl], rg2.config.FINISH_OUTER_RADIUS, 0, 2 * Math.PI, false);
      }
      // dot at centre of control circle
      rg2.ctx.fillRect(this.controlx[this.nextControl] - 1, this.controly[this.nextControl] - 1, 3, 3);
      rg2.ctx.stroke();
      // dot at start of route
      rg2.ctx.beginPath();
      rg2.ctx.arc(this.gpstrack.routeData.x[0] + (rg2.config.RUNNER_DOT_RADIUS / 2), this.gpstrack.routeData.y[0], rg2.config.RUNNER_DOT_RADIUS, 0, 2 * Math.PI, false);
      rg2.ctx.fill();
    }
    // route itself
    if (this.gpstrack.routeData.x.length > 1) {
      rg2.ctx.beginPath();
      rg2.ctx.moveTo(this.gpstrack.routeData.x[0], this.gpstrack.routeData.y[0]);
      var oldx = this.gpstrack.routeData.x[0];
      var oldy = this.gpstrack.routeData.y[0];
      var stopCount = 0;
      for (i = 1; i < this.gpstrack.routeData.x.length; i += 1) {
        rg2.ctx.lineTo(this.gpstrack.routeData.x[i], this.gpstrack.routeData.y[i]);
        if ((this.gpstrack.routeData.x[i] == oldx) && (this.gpstrack.routeData.y[i] == oldy)) {
          // we haven't moved
          stopCount += 1;
          // only output at current position if this is the last entry
          if (i === (this.gpstrack.routeData.x.length - 1)) {
            rg2.ctx.fillText(stopCount + " secs", this.gpstrack.routeData.x[i] + 5, this.gpstrack.routeData.y[i] + 5);
          }
        } else {
          // we have started moving again
          if (stopCount > 0) {
            rg2.ctx.fillText((stopCount) + " secs", oldx + 5, oldy + 5);
            stopCount = 0;
          }
        }
        oldx = this.gpstrack.routeData.x[i];
        oldy = this.gpstrack.routeData.y[i];
      }
      rg2.ctx.stroke();
    }
    // locked points
    for (i = 0; i < this.gpstrack.handles.length; i += 1) {
      if (this.gpstrack.handles[i].locked === true) {
        rg2.ctx.fillStyle = rg2.config.RED;
      } else {
        rg2.ctx.fillStyle = rg2.config.GREEN;
      }
      rg2.ctx.strokestyle = rg2.config.PURPLE;
      rg2.ctx.beginPath();
      rg2.ctx.arc(this.gpstrack.handles[i].x, this.gpstrack.handles[i].y, this.HANDLE_DOT_RADIUS, 0, 2 * Math.PI, false);
      rg2.ctx.fill();
      rg2.ctx.stroke();
    }
  }
};