// Version 1.2.7 2016-06-14T23:35:25;
/*
 * Routegadget 2
 * https://github.com/Maprunner/rg2
 *
 * Copyright (c) 2014 Simon Errington and contributors
 * Licensed under the MIT license.
 * https://github.com/Maprunner/rg2/blob/master/LICENSE
 */
/*global rg2Config:false */
/*global setTimeout:false */
var rg2 = (function (window, $) {
  'use strict';

  function startDisplayingInfo() {
    // check if a specific event has been requested
    if ((window.location.hash) && (!rg2.config.managing)) {
      rg2.requestedHash.parseHash(window.location.hash);
    }
    // load event details
    rg2.getEvents();
    // slight delay looks better than going straight in....
    setTimeout(function () {
      $("#rg2-container").show();
    }, 500);
  }

  function getResultsStats(controls) {
    var stats, resultsinfo, coursearray;
    resultsinfo = rg2.results.getResultsInfo();
    coursearray = rg2.courses.getCoursesForEvent();
    stats = "<p><strong>" +  rg2.t("Courses") + ":</strong> " + coursearray.length + ". <strong>" +  rg2.t("Controls") + ":</strong> " + controls;
    stats += ". <strong> " +  rg2.t("Results") + ":</strong> " + resultsinfo.results + ".</p>";
    stats += "<p><strong>" +  rg2.t("Routes") + ":</strong> " + resultsinfo.totalroutes + " (" + resultsinfo.percent + "%). ";
    stats += "<strong>" +  rg2.t("Drawn routes") + ":</strong> " + resultsinfo.drawnroutes + ". <strong>" +  rg2.t("GPS routes") + ":</strong> " + resultsinfo.gpsroutes + ".</p>";
    stats += "<p><strong>" +  rg2.t("Total time") + ":</strong> " + resultsinfo.time + ".</p>";
    return stats;
  }

  function getMapStats(validWordlfile) {
    var stats, mapSize;
    mapSize = rg2.getMapSize();
    stats = "<p><strong>" +  rg2.t("Map ") + ":</strong> ID " + rg2.events.getActiveMapID() + ", " + mapSize.width + " x " + mapSize.height + " pixels";
    if (validWordlfile) {
      stats += ". " +  rg2.t("Map is georeferenced") + ".</p>";
    } else {
      stats += ".</p>";
    }
    return stats;
  }

  function getEventStats() {
    var stats, runnercomments, eventinfo, id;
    id = rg2.events.getActiveEventID();
    // check there is an event to report on
    if (id === null) {
      return "";
    }
    id = rg2.events.getKartatEventID();
    eventinfo = rg2.events.getEventInfo(parseInt(id, 10));
    runnercomments = rg2.results.getComments();
    stats = "<h3>" +  rg2.t("Event statistics") + ": " + eventinfo.name + ": " + eventinfo.date + "</h3>";
    stats += getResultsStats(eventinfo.controls);
    if (eventinfo.comment) {
      stats += "<p>" + eventinfo.comment + "</p>";
    }
    stats += getMapStats(eventinfo.worldfile.valid);
    if (runnercomments) {
      stats += "<p><strong>" +  rg2.t("Comments") + ":</strong></p>" + runnercomments;
    }
    // #177 not pretty but gets round problems of double encoding
    stats = stats.replace(/&amp;/g, '&');
    return stats;
  }

  function setManagerOptions() {
    if ($('#rg2-manage-login').length !== 0) {
      rg2.config.managing = true;
      rg2.manager = new rg2.Manager(rg2Config.keksi);
      rg2.managerUI.initialiseUI();
    } else {
      rg2.config.managing = false;
    }
  }

  function updateUIForNewEvent(eventid) {
    // highlight the selected event
    $('#rg2-event-ul > li').removeClass('rg2-active-event').filter('#' + eventid).addClass('rg2-active-event');
    // show we are waiting
    $('body').css('cursor', 'wait');
    $("#rg2-load-progress-label").text(rg2.t("Loading courses"));
    $("#rg2-load-progress").show();
  }

  function loadEvent(eventid) {
    updateUIForNewEvent(eventid);
    rg2.courses.deleteAllCourses();
    rg2.controls.deleteAllControls();
    rg2.animation.resetAnimation();
    rg2.results.deleteAllResults();
    rg2.events.setActiveEventID(eventid);
    rg2.drawing.initialiseDrawing(rg2.events.hasResults(eventid));
    rg2.loadNewMap(rg2Config.maps_url + rg2.events.getMapFileName());
    rg2.ui.setTitleBar();
    rg2.redraw(false);
    rg2.getCourses();
  }

  function createObjects() {
    rg2.events = new rg2.Events();
    rg2.courses = new rg2.Courses();
    rg2.colours = new rg2.Colours();
    rg2.results = new rg2.Results();
    rg2.controls = new rg2.Controls();
    rg2.animation = new rg2.Animation();
    rg2.drawing = new rg2.Draw();
    rg2.requestedHash = new rg2.RequestedHash();
  }

  function init() {
    $("#rg2-container").hide();
    $.ajaxSetup({
      cache : false,
      // suppress jQuery jsonp handling problem: see issue #291 
      jsonp: false
    });
    rg2.loadConfigOptions();
    rg2.ui.configureUI();
    rg2.setLanguageOptions();
    createObjects();
    setManagerOptions();
    rg2.setUpCanvas();
    startDisplayingInfo();
  }

  return {
    // functions and variables available elsewhere
    init : init,
    loadEvent : loadEvent,
    getEventStats : getEventStats
  };
}(window, window.jQuery));

/*global rg2:false */
/*global clearInterval:false */
/*global setInterval:false */
(function () {
  function Animation() {
    'use strict';
    this.runners = [];
    this.timer = null;
    this.animationSecs = 0;
    this.deltaSecs = 5;
    // value in milliseconds
    this.timerInterval = 100;
    // if not real time then mass start
    this.realTime = false;
    this.earliestStartSecs = 0;
    this.latestFinishSecs = 0;
    this.tailLength = 0;
    this.useFullTails = false;
    // control to start from if this option selected
    this.massStartControl = 0;
    // run each leg as a mass start if true
    this.massStartByControl = false;
    this.displayNames = true;
    this.displayInitials = false;
  }


  Animation.prototype = {
    Constructor : Animation,

    resetAnimation : function () {
      this.runners.length = 0;
      clearInterval(this.timer);
      this.timer = null;
      this.massStartControl = 0;
      this.massStartByControl = false;
      this.updateAnimationDetails();
      $("#btn-start-stop").removeClass("fa-pause").addClass("fa-play");
      $("#btn-start-stop").prop("title", rg2.t("Run"));
    },

    // @@param courseresults: array of results to be removed
    // @@param doAnimate: true if add to replay, false if remove from replay
    animateRunners : function (courseresults, doAnimate) {
      var i;
      for (i = 0; i < courseresults.length; i += 1) {
        if (doAnimate) {
          this.addRunner(new rg2.Runner(courseresults[i]), false);
        } else {
          this.removeRunner(courseresults[i], false);
        }
      }
      this.updateAnimationDetails();
    },

    addRunner : function (runner, updateDetails) {
      var i;
      for (i = 0; i < this.runners.length; i += 1) {
        if (this.runners[i].runnerid === runner.runnerid) {
          // runner already exists so ignore
          return;
        }
      }
      this.runners.push(runner);
      if (updateDetails) {
        this.updateAnimationDetails();
      }
    },

    updateAnimationDetails : function () {
      var html = this.getAnimationNames();
      if (html !== "") {
        $("#rg2-track-names").empty().append(html).show();
        $("#rg2-animation-controls").show();
      } else {
        $("#rg2-track-names").hide();
        $("#rg2-animation-controls").hide();
      }
      this.calculateAnimationRange();
      $("#rg2-clock").text(rg2.utils.formatSecsAsHHMMSS(this.animationSecs));
    },

    // slider callback
    clockSliderMoved : function (time) {
      this.resetAnimationTime(time);
      rg2.redraw(false);
    },

    getAnimationNames : function () {
      var i, html;
      html = "";
      if (this.runners.length < 1) {
        return html;
      }
      for (i = 0; i < this.runners.length; i += 1) {
        html += "<p style='color:" + this.runners[i].colour + ";'>" + this.runners[i].coursename + ":&nbsp;" + this.runners[i].name.trim() + "</p>";
      }
      return html;
    },

    getMaxControls : function () {
      var maxControls, i;
      maxControls = 0;
      // find maximum number of controls to set size of table
      for (i = 0; i < this.runners.length; i += 1) {
        maxControls = Math.max(maxControls, this.runners[i].splits.length);
      }
      // allow for start and finish
      return (maxControls - 2);
    },

    getSplitsTableHeader: function (controls) {
      var html, i;
      html = "<table class='splitstable'><tr><th>" + rg2.t("Course") + "</th><th>" + rg2.t("Name") + "</th>";
      for (i = 1; i <= controls; i += 1) {
        html += "<th>" + i + "</th>";
      }
      return (html + "<th>F</th></tr>");
    },

    getSplitsTable : function () {
      var html, i, j, run, metresPerPixel, units, maxControls, legSplit, prevControlSecs, info;
      if (this.runners.length < 1) {
        return "<p>" + rg2.t("Select runners on Results tab") + ".</p>";
      }
      legSplit = [];
      prevControlSecs = 0;
      info = rg2.events.getMetresPerPixel();
      metresPerPixel = info.metresPerPixel;
      units = info.units;
      maxControls = this.getMaxControls();
      html = this.getSplitsTableHeader(maxControls);
      for (i = 0; i < this.runners.length; i += 1) {
        run = this.runners[i];
        prevControlSecs = 0;
        html += "<tr class='splitsname-row'><td>" + run.coursename + "</td><td>" + run.name + "</td>";
        for (j = 1; j < run.splits.length; j += 1) {
          html += "<td>" + rg2.utils.formatSecsAsMMSS(run.splits[j]) + "</td>";
          legSplit[j] = run.splits[j] - prevControlSecs;
          prevControlSecs = run.splits[j];
        }
        html += "</tr><tr class='splitstime-row'><td></td><td></td>";
        for (j = 1; j < run.splits.length; j += 1) {
          html += "<td>" + rg2.utils.formatSecsAsMMSS(legSplit[j]) + "</td>";
        }
        if (isNaN(run.cumulativeTrackDistance[run.cumulativeTrackDistance.length - 1])) {
          html += "</tr><tr class='splitsdistance-row'><td></td><td>--</td>";
        } else {
          html += "</tr><tr class='splitsdistance-row'><td></td><td>" + Math.round(metresPerPixel * run.cumulativeTrackDistance[run.cumulativeTrackDistance.length - 1]) + " " + units + "</td>";
        }
        for (j = 1; j < run.splits.length; j += 1) {
          if (isNaN(run.legTrackDistance[j])) {
            // handle various problems with missing splits
            html += "<td>--</td>";
          } else {
            html += "<td>" + Math.round(metresPerPixel * run.legTrackDistance[j]) + "</td>";
          }
        }
      }
      html += "</tr></table>";
      return html;
    },

    removeRunner : function (runnerid, updateDetails) {
      var i;
      for (i = 0; i < this.runners.length; i += 1) {
        if (this.runners[i].runnerid === runnerid) {
          // delete 1 runner at position i
          this.runners.splice(i, 1);
        }
      }
      if (updateDetails) {
        this.updateAnimationDetails();
      }
    },

    toggleAnimation : function () {
      if (this.timer === null) {
        this.startAnimation();
        $("#btn-start-stop").removeClass("fa-play").addClass("fa-pause").prop("title", rg2.t("Pause"));
      } else {
        this.stopAnimation();
        $("#btn-start-stop").removeClass("fa-pause").addClass("fa-play").prop("title", rg2.t("Run"));
      }
    },

    startAnimation : function () {
      if (this.timer === null) {
        this.timer = setInterval(this.timerExpired.bind(this), this.timerInterval);
      }
    },

    calculateAnimationRange : function () {
      // in theory start time will be less than 24:00
      // TODO: races over midnight: a few other things to sort out before we get to that
      var i;
      this.earliestStartSecs = 86400;
      this.latestFinishSecs = 0;
      this.slowestTimeSecs = 0;
      for (i = 0; i < this.runners.length; i += 1) {
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

    stopAnimation : function () {
      clearInterval(this.timer);
      this.timer = null;
    },

    // extra function level in for test purposes
    timerExpired : function () {
      rg2.redraw(true);
    },

    setFullTails : function (fullTails) {
      if (fullTails) {
        this.useFullTails = true;
      } else {
        this.useFullTails = false;
      }
      rg2.redraw(false);
    },

    setTailLength : function (minutes) {
      this.tailLength = 60 * minutes;
      rg2.redraw(false);
    },

    setStartControl : function (control) {
      var i;
      this.massStartControl = parseInt(control, 10);
      if (this.massStartControl === rg2.config.MASS_START_BY_CONTROL) {
        this.massStartControl = 0;
        this.massStartByControl = true;
        // get split time at control 1
        for (i = 0; i < this.runners.length; i += 1) {
          this.runners[i].nextStopTime = this.runners[i].splits[1];
        }
      } else {
        this.massStartByControl = false;
        for (i = 0; i < this.runners.length; i += 1) {
          this.runners[i].nextStopTime = rg2.config.VERY_HIGH_TIME_IN_SECS;
        }
      }
      this.resetAnimationTime(0);
    },

    setReplayType : function () {
      // toggles between mass start and real time
      if (this.realTime) {
        this.realTime = false;
        $("#btn-real-time").removeClass().addClass('fa fa-users').prop('title', rg2.t('Mass start'));
        if (rg2.courses.getHighestControlNumber() > 0) {
          $("#rg2-control-select").prop('disabled', false);
        }
      } else {
        this.realTime = true;
        $("#btn-real-time").removeClass().addClass('fa fa-clock-o').prop('title', rg2.t('Real time'));
        $("#rg2-control-select").prop('disabled', true);
      }
      // go back to start
      this.resetAnimationTime(0);
    },

    resetAnimationTime : function (time) {
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
        $("#rg2-clock-slider").slider("option", "max", this.latestFinishSecs);
        $("#rg2-clock-slider").slider("option", "min", this.earliestStartSecs);
      } else {
        if (time > 0) {
          this.animationSecs = time;
        } else {
          this.animationSecs = 0;
        }
        this.startSecs = 0;
        $("#rg2-clock-slider").slider("option", "max", this.slowestTimeSecs);
        $("#rg2-clock-slider").slider("option", "min", 0);
      }
      $("#rg2-clock-slider").slider("value", this.animationSecs);
      $("#rg2-clock").text(rg2.utils.formatSecsAsHHMMSS(this.animationSecs));
    },

    toggleNameDisplay : function () {
      var title = "";
      if (this.displayNames) {
        if (this.displayInitials) {
          this.displayNames = false;
          this.displayInitials = false;
          title = "Show names";
        } else {
          this.displayInitials = true;
          title = "Hide names";
        }
      } else {
        this.displayNames = true;
        title = "Show initials";
      }
      $("#btn-toggle-names").prop("title", rg2.t(title));
    },

    displayName : function (runner, time) {
      var text;
      if (this.displayNames) {
        // make sure we have a valid position to display
        if ((time < runner.x.length) && (time >= 0)) {
          rg2.ctx.fillStyle = "black";
          rg2.ctx.font = rg2.options.replayFontSize + 'pt Arial';
          rg2.ctx.globalAlpha = rg2.config.FULL_INTENSITY;
          rg2.ctx.textAlign = "left";
          if (this.displayInitials) {
            text = runner.initials;
          } else {
            text = runner.name;
          }
          rg2.ctx.save();
          // centre map on runner location
          rg2.ctx.translate(runner.x[time], runner.y[time]);
          // rotate map so that text stays horizontal
          rg2.ctx.rotate(rg2.ctx.displayAngle);
          // no real science: offsets just look OK
          rg2.ctx.fillText(text, 12, 6);
          rg2.ctx.restore();
        }
      }
    },

    setAnimationTime : function (fromTimer) {
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
      if (this.useFullTails) {
        return (this.startSecs + 1);
      }
      return Math.max(this.animationSecs - this.tailLength, this.startSecs + 1);
    },

    runAnimation : function (fromTimer) {
      var runner, timeOffset, i, t, tailStartTimeSecs;
      tailStartTimeSecs = this.setAnimationTime(fromTimer);
      $("#rg2-clock-slider").slider("value", this.animationSecs);
      $("#rg2-clock").text(rg2.utils.formatSecsAsHHMMSS(this.animationSecs));
      rg2.ctx.lineCap = "round";
      rg2.ctx.lineJoin = "round";
      rg2.ctx.lineWidth = rg2.options.routeWidth;
      rg2.ctx.globalAlpha = rg2.config.FULL_INTENSITY;
      for (i = 0; i < this.runners.length; i += 1) {
        runner = this.runners[i];
        if (this.realTime) {
          timeOffset = runner.starttime;
        } else {
          if ((this.massStartControl === 0) || (runner.splits.length < this.massStartControl)) {
            // no offset since we are starting from the start
            timeOffset = 0;
          } else {
            // offset needs to move forward (hence negative) to time at control
            timeOffset = -1 * runner.splits[this.massStartControl];
          }
        }
        rg2.ctx.strokeStyle = runner.colour;
        rg2.ctx.globalAlpha = rg2.options.routeIntensity;
        rg2.ctx.beginPath();
        rg2.ctx.moveTo(runner.x[tailStartTimeSecs - timeOffset], runner.y[tailStartTimeSecs - timeOffset]);

        // t runs as real time seconds or 0-based seconds depending on this.realTime
        //runner.x[] is always indexed in 0-based time so needs to be adjusted for starttime offset
        for (t = tailStartTimeSecs; t <= this.animationSecs; t += 1) {
          if ((t > timeOffset) && ((t - timeOffset) < runner.nextStopTime)) {
            rg2.ctx.lineTo(runner.x[t - timeOffset], runner.y[t - timeOffset]);
          }
        }
        rg2.ctx.stroke();

        rg2.ctx.beginPath();
        if ((t - timeOffset) < runner.nextStopTime) {
          t = t - timeOffset;
        } else {
          t = runner.nextStopTime;
        }
        rg2.ctx.arc(runner.x[t], runner.y[t], rg2.config.RUNNER_DOT_RADIUS,
          0, 2 * Math.PI, false);
        rg2.ctx.globalAlpha = rg2.config.FULL_INTENSITY;
        rg2.ctx.strokeStyle = rg2.config.BLACK;
        rg2.ctx.stroke();
        rg2.ctx.fillStyle = runner.colour;
        rg2.ctx.fill();
        this.displayName(runner, t);
      }
      if (this.massStartByControl) {
        this.checkForStopControl(this.animationSecs);
      }
    },

    // see if all runners have reached stop control and reset if they have
    checkForStopControl : function (currentTime) {
      var i, legTime, allAtControl;
      allAtControl = true;
      // work out if everybody has got to the next control
      for (i = 0; i < this.runners.length; i += 1) {
        legTime = this.runners[i].splits[this.massStartControl + 1] - this.runners[i].splits[this.massStartControl];
        if (legTime > currentTime) {
          allAtControl = false;
          break;
        }
      }
      if (allAtControl) {
        //move on to next control
        this.massStartControl += 1;
        // find time at next control
        for (i = 0; i < this.runners.length; i += 1) {
          if (this.massStartControl < (this.runners[i].splits.length)) {
            // splits includes a start time so index to control is + 1
            this.runners[i].nextStopTime = this.runners[i].splits[this.massStartControl + 1];
          } else {
            this.runners[i].nextStopTime = rg2.config.VERY_HIGH_TIME_IN_SECS;
          }
        }
        this.resetAnimationTime(0);
      }
    },

    goSlower : function () {
      if (this.deltaSecs > 0) {
        this.deltaSecs -= 1;
      }
    },

    goFaster : function () {
      this.deltaSecs += 1;
    }
  };
  rg2.Animation = Animation;
}());

/*global rg2:false */
/*global Image:false */
(function () {
  var canvas, ctx, map;
  canvas = $("#rg2-map-canvas")[0];
  ctx = canvas.getContext('2d');
  map = new Image();
  ctx.displayAngle = 0;

  function loadNewMap(mapFile) {
    $("#rg2-map-load-progress-label").text(rg2.t("Loading map"));
    $("#rg2-map-load-progress").show();
    map.src = mapFile;
  }

  function drawSelectEventText() {
    if (!rg2.config.managing) {
      ctx.font = '30pt Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = rg2.config.BLACK;
      ctx.fillText(rg2.t("Select an event"), rg2.canvas.width / 2, rg2.canvas.height / 2);
    }
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
    // fill canvas to erase things: clearRect doesn't work on Android (?) and leaves the old map as background when changing
    ctx.globalAlpha = rg2.config.FULL_INTENSITY;
    ctx.fillStyle = rg2.config.GREY;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    // go back to where we started
    ctx.restore();
    // set transparency of map
    ctx.globalAlpha = rg2.options.mapIntensity;
    if (map.height > 0) {
      // using non-zero map height to show we have a map loaded
      ctx.drawImage(map, 0, 0);
      var active = $("#rg2-info-panel").tabs("option", "active");
      if (active === rg2.config.TAB_DRAW) {
        rg2.courses.drawCourses(rg2.config.DIM);
        rg2.controls.drawControls(false);
        rg2.results.drawTracks();
        rg2.drawing.drawNewTrack();
      } else {
        if (active === rg2.config.TAB_CREATE) {
          rg2.manager.drawControls();
        } else {
          rg2.courses.drawCourses(rg2.config.DIM);
          rg2.results.drawTracks();
          rg2.controls.drawControls(false);
          // parameter determines if animation time is updated or not
          if (fromTimer) {
            rg2.animation.runAnimation(true);
          } else {
            rg2.animation.runAnimation(false);
          }
        }
      }
    } else {
      drawSelectEventText();
    }
  }

  function applyMapRotation(angle, x, y, moveMap) {
    var pt;
    // save new absolute angle
    ctx.displayAngle = (ctx.displayAngle - angle) % (Math.PI * 2);
    // rotate around given co-ordinates
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (moveMap) {
      // move map so that given point is centre-bottom of screen
      pt = ctx.transformedPoint((canvas.width / 2), (canvas.height * 0.9));
      ctx.translate(pt.x - x, pt.y - y);
    } else {
      // put map back where it started
      ctx.translate(-1 * x, -1 * y);
    }
    ctx.save();
    redraw(false);
  }

  function rotateMap(direction) {
    // rotate a little bit from UI control input
    // direction is -1 for left and 1 for right
    var angle;
    angle = direction * (Math.PI / 36);
    // rotate around centre of map
    applyMapRotation(angle, (map.width / 2), (map.height / 2), false);
  }

  function alignMap(angle, x, y) {
    // align to an absolute angle: 0 is up/north
    // rotate around defined x, y
    applyMapRotation((ctx.displayAngle - angle) % (Math.PI * 2), x, y, true);
  }

  function resetMapState() {
    // place map in centre of canvas and scale it down to fit
    var mapscale, heightscale;
    heightscale = canvas.height / map.height;
    rg2.input.lastX = canvas.width / 2;
    rg2.input.lastY = canvas.height / 2;
    rg2.input.zoomSize = 1;
    rg2.input.dragStart = null;
    // looks odd but this works for initialisation
    rg2.input.dragged = true;
    // don't stretch map: just shrink to fit
    if (heightscale < 1) {
      mapscale = heightscale;
    } else {
      mapscale = 1;
    }
    // move map into view on small screens
    // avoid annoying jumps on larger screens
    if (rg2.input.infoPanelMaximised || window.innerWidth >= rg2.config.BIG_SCREEN_BREAK_POINT) {
      ctx.setTransform(mapscale, 0, 0, mapscale, $("#rg2-info-panel").outerWidth(), 0);
    } else {
      ctx.setTransform(mapscale, 0, 0, mapscale, 0, 0);
    }
    // don't need to rotate here since the call to setTransform above does that for us
    ctx.displayAngle = 0;
    ctx.save();
    redraw(false);
  }

  function showInfoDisplay(show, title, position) {
    var chevronRemove, chevronAdd;
    rg2.input.infoPanelMaximised = show;
    $("#rg2-resize-info").prop("title",  rg2.t(title));
    $("#rg2-hide-info-panel-control").css("left", position);
    if (show) {
      $("#rg2-info-panel").show();
      chevronRemove = "fa-chevron-right";
      chevronAdd = "fa-chevron-left";
    } else {
      $("#rg2-info-panel").hide();
      chevronRemove = "fa-chevron-left";
      chevronAdd = "fa-chevron-right";
    }
    $("#rg2-hide-info-panel-icon").removeClass(chevronRemove).addClass(chevronAdd).prop("title",  rg2.t(title));
  }

  function resizeInfoDisplay() {
    if (rg2.input.infoPanelMaximised) {
      showInfoDisplay(false, "Show info panel", "0px");
    } else {
      showInfoDisplay(true, "Hide info panel", "366px");
    }
    // move map around if necesssary
    resetMapState();
  }

  function zoom(zoomDirection) {
    var pt, factor, tempZoom;
    factor = Math.pow(rg2.input.scaleFactor, zoomDirection);
    tempZoom = rg2.input.zoomSize * factor;
    // limit zoom to avoid things disappearing
    // chosen values seem reasonable after some quick tests
    if ((tempZoom < 50) && (tempZoom > 0.05)) {
      rg2.input.zoomSize = tempZoom;
      pt = ctx.transformedPoint(rg2.input.lastX, rg2.input.lastY);
      ctx.translate(pt.x, pt.y);
      ctx.scale(factor, factor);
      ctx.translate(-pt.x, -pt.y);
      ctx.save();
      redraw(false);
    }
  }

  function trackTransforms(ctx) {
    var xform, svg, savedTransforms, save, restore, scale, translate, setTransform, pt, rotate;
    svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
    xform = svg.createSVGMatrix();
    savedTransforms = [];
    save = ctx.save;
    ctx.save = function () {
      savedTransforms.push(xform.translate(0, 0));
      return save.call(ctx);
    };
    restore = ctx.restore;
    ctx.restore = function () {
      xform = savedTransforms.pop();
      return restore.call(ctx);
    };
    scale = ctx.scale;
    ctx.scale = function (sx, sy) {
      xform = xform.scaleNonUniform(sx, sy);
      return scale.call(ctx, sx, sy);
    };
    translate = ctx.translate;
    ctx.translate = function (dx, dy) {
      xform = xform.translate(dx, dy);
      return translate.call(ctx, dx, dy);
    };
    setTransform = ctx.setTransform;
    ctx.setTransform = function (a, b, c, d, e, f) {
      xform.a = a;
      xform.b = b;
      xform.c = c;
      xform.d = d;
      xform.e = e;
      xform.f = f;
      return setTransform.call(ctx, a, b, c, d, e, f);
    };
    pt = svg.createSVGPoint();
    ctx.transformedPoint = function (x, y) {
      // converts x, y screen co-ords to x, y in map image
      pt.x = x;
      pt.y = y;
      return pt.matrixTransform(xform.inverse());
    };
    //ctx.getTransform = function () {
    //  return xform;
    //};
    //transform = ctx.transform;
    //ctx.transform = function (a, b, c, d, e, f) {
    //  m2 = svg.createSVGMatrix();
    //  m2.a = a;
    //  m2.b = b;
    //  m2.c = c;
    //  m2.d = d;
    //  m2.e = e;
    //  m2.f = f;
    //  xform = xform.multiply(m2);
    //  return transform.call(ctx, a, b, c, d, e, f);
    //};
    rotate = ctx.rotate;
    ctx.rotate = function (radians) {
      xform = xform.rotate(radians * 180 / Math.PI);
      return rotate.call(ctx, radians);
    };
  }

  function getMapSize() {
    return {height: map.height, width: map.width};
  }

  function resizeCanvas() {
    rg2.input.scaleFactor = rg2.config.DEFAULT_SCALE_FACTOR;
    // allow for header
    $("#rg2-container").css("height", window.innerHeight - 36);
    canvas.width = window.innerWidth;
    // allow for header
    canvas.height = window.innerHeight - 36;
    rg2.ui.setTitleBar();
    resetMapState();
  }

  function mapLoadedCallback() {
    $("#rg2-map-load-progress").hide();
    resetMapState();
    if (rg2.config.managing) {
      rg2.manager.mapLoadCallback();
    }
  }

  function addListeners() {
    canvas.addEventListener('touchstart', rg2.handleTouchStart, false);
    canvas.addEventListener('touchmove', rg2.handleTouchMove, false);
    canvas.addEventListener('touchend', rg2.handleTouchEnd, false);
    canvas.addEventListener('DOMMouseScroll', rg2.handleScroll, false);
    canvas.addEventListener('mousewheel', rg2.handleScroll, false);
    canvas.addEventListener('mousedown', rg2.handleMouseDown, false);
    canvas.addEventListener('mousemove', rg2.handleMouseMove, false);
    canvas.addEventListener('mouseup', rg2.handleMouseUp, false);
    window.addEventListener('resize', resizeCanvas, false);    // force redraw once map has loaded
    map.addEventListener("load", function () {
      mapLoadedCallback();
    }, false);
  }

  function setUpCanvas() {
    addListeners();
    trackTransforms(ctx);
    resizeCanvas();
  }
  rg2.zoom = zoom;
  rg2.rotateMap = rotateMap;
  rg2.alignMap = alignMap;
  rg2.redraw =  redraw;
  rg2.canvas = canvas;
  rg2.setUpCanvas = setUpCanvas;
  rg2.ctx = ctx;
  rg2.addListeners = addListeners;
  rg2.resetMapState = resetMapState;
  rg2.getMapSize = getMapSize;
  rg2.loadNewMap = loadNewMap;
  rg2.resizeInfoDisplay = resizeInfoDisplay;
}());

/*global rg2:false */
/*global console:false */
/*global localStorage:false */
/*global rg2Config:false */
(function () {
  var config, options, dictionary;

  config = {
    DEFAULT_SCALE_FACTOR : 1.1,
    TAB_EVENTS : 0,
    TAB_COURSES : 1,
    TAB_RESULTS : 2,
    TAB_DRAW : 3,
    TAB_LOGIN : 4,
    TAB_CREATE : 5,
    TAB_EDIT : 6,
    TAB_MAP : 7,
    INVALID_MAP_ID: 9999,
    // translated when output so leave as English here
    DEFAULT_NEW_COMMENT : "Type your comment",
    DEFAULT_EVENT_COMMENT : "Comments (optional)",
    // added to resultid when saving a GPS track
    GPS_RESULT_OFFSET : 50000,
    MASS_START_REPLAY : 1,
    REAL_TIME_REPLAY : 2,
    // dropdown selection value
    MASS_START_BY_CONTROL : 99999,
    VERY_HIGH_TIME_IN_SECS : 99999,
    // screen sizes for different layouts
    BIG_SCREEN_BREAK_POINT : 800,
    SMALL_SCREEN_BREAK_POINT : 500,
    PURPLE : '#b300ff',
    RED : '#ff0000',
    GREEN : '#00ff00',
    GREY : '#e0e0e0',
    RED_30 : 'rgba(255,0,0,0.3)',
    GREEN_30 : 'rgba(0,255,0,0.3)',
    WHITE : '#ffffff',
    BLACK : '#000000',
    RUNNER_DOT_RADIUS : 6,
    HANDLE_DOT_RADIUS : 7,
    HANDLE_COLOUR: '#ff0000',
    // parameters for call to draw courses
    DIM : 0.75,
    FULL_INTENSITY : 1.0,
    // values of event format
    NORMAL_EVENT : 1,
    EVENT_WITHOUT_RESULTS : 2,
    SCORE_EVENT : 3,
    // version gets set automatically by grunt file during build process
    RG2VERSION: '1.2.7',
    TIME_NOT_FOUND : 9999,
    // values for evt.which
    RIGHT_CLICK : 3,
    DO_NOT_SAVE_COURSE: 9999,
    FORMAT_NORMAL: 1,
    FORMAT_NO_RESULTS: 2,
    FORMAT_SCORE_EVENT: 3,
    DISPLAY_ALL_COURSES: 99999
  };

  options = {
    // initialised to default values: overwritten from storage later
    mapIntensity : 1,
    routeIntensity : 1,
    replayFontSize : 12,
    courseWidth : 3,
    routeWidth : 4,
    circleSize : 20,
    snap : true,
    showThreeSeconds : false,
    showGPSSpeed : false,
    // align map with next control at top when drawing route
    alignMap: false
  };

  // translation function
  function t(str) {
    if (dictionary.hasOwnProperty(str)) {
      return dictionary[str];
    }
    return str;
  }

  function setTextContents($elem, text) {
    $elem.contents().filter(function () {
      if (this.nodeType === 3) {
        this.nodeValue = text;
      }
    });
    //$elem.contents().filter(function () { return this.nodeType === 3; })[0].nodeValue = text;
  }
  function translateTextFields() {
    var i, selector, text;
    selector = ["#rg2-events-tab a", "#rg2-courses-tab a", "#rg2-results-tab a", "#rg2-draw-tab a", '#rg2-draw-title', '#draw-text-1', '#draw-text-2', '#draw-text-3',
      '#draw-text-4', '#draw-text-5', '#rg2-load-gps-title', '.rg2-options-dialog .ui-dialog-title'];
    text = ['Events', 'Courses', 'Results', 'Draw', 'Draw route', 'Left click to add/lock/unlock a handle', 'Green - draggable', 'Red - locked', 'Right click to delete a handle',
      'Drag a handle to adjust track around locked point(s)', 'Load GPS file (GPX or TCX)', 'Configuration options'];
    for (i = 0; i < selector.length; i += 1) {
      setTextContents($(selector[i]), t(text[i]));
    }
  }

  function translateTitleProperties() {
    var i, selector, text;
    selector = ["#rg2-hide-info-panel-icon", '#btn-about', '#btn-options', '#btn-zoom-out', '#btn-zoom-in', '#btn-reset', '#btn-show-splits', '#rg2-splits-table', '#btn-slower',
      '#btn-faster', '#btn-rotate-right', '#btn-rotate-left'];
    text = ["Hide info panel", 'Help', 'Options', 'Zoom out', 'Zoom in', 'Reset', 'Splits', 'Splits table', 'Slower', 'Faster', 'Rotate right', 'Rotate-left'];
    for (i = 0; i < selector.length; i += 1) {
      $(selector[i]).prop('title', t(text[i]));
    }
  }

  function translateTextContentProperties() {
    var i, selector, text;
    selector = ['label[for=rg2-control-select]', 'label[for=btn-full-tails]', 'label[for=spn-tail-length]', 'label[for=rg2-select-language]', 'label[for=spn-map-intensity]',
      'label[for=spn-route-intensity]', 'label[for=spn-route-width]', 'label[for=spn-name-font-size]', 'label[for=spn-course-width]', 'label[for=spn-control-circle]',
      'label[for=chk-snap-toggle]', 'label[for=chk-show-three-seconds]', 'label[for=chk-show-GPS-speed]', 'label[for=rg2-course-select]', 'label[for=rg2-name-select]',
      'label[for=btn-move-all]', 'label[for=btn-align-map]'];
    text = ['Start at', 'Full tails', 'Length', 'Language', 'Map intensity %', 'Route intensity %', 'Route width', 'Replay label font size', 'Course overprint width', 'Control circle size',
      'Snap to control when drawing', 'Show +3 time loss for GPS routes', 'Show GPS speed colours', 'Select course', 'Select name', 'Move track and map together (or right click-drag)',
      'Align map to next control'];
    for (i = 0; i < selector.length; i += 1) {
      $(selector[i]).prop('textContent', t(text[i]));
    }
  }

  function translateButtons() {
    var i, selector, text;
    selector = ['#btn-undo', '#btn-undo-gps-adjust', '#btn-save-route', '#btn-reset-drawing', '#btn-three-seconds', '#btn-save-gps-route', '#btn-autofit-gps'];
    text = ['Undo', 'Undo', 'Save', 'Reset', '+3 sec', 'Save GPS route', 'Autofit'];
    for (i = 0; i < selector.length; i += 1) {
      $(selector[i]).button('option', 'label', t(text[i]));
    }
  }

  function translateFixedText() {
    var temp;
    translateTextFields();
    translateTitleProperties();
    translateTextContentProperties();
    translateButtons();
    temp = $('#btn-toggle-controls').prop('title');
    $('#btn-toggle-controls').prop('title', t(temp));
    temp = $('#btn-toggle-names').prop('title');
    $('#btn-toggle-names').prop('title', t(temp));
    temp = $('#btn-start-stop').prop('title');
    $('#btn-start-stop').prop('title', t(temp));
  }

  function createLanguageDropdown() {
    var i, selected, dropdown;
    $("#rg2-select-language").empty();
    dropdown = document.getElementById("rg2-select-language");
    selected = (dictionary.code === "en");
    dropdown.options.add(rg2.utils.generateOption('en', 'en: English', selected));
    for (i in rg2Config.languages) {
      if (rg2Config.languages.hasOwnProperty(i)) {
        selected = (dictionary.code === i);
        dropdown.options.add(rg2.utils.generateOption(i, i + ": " + rg2Config.languages[i], selected));
      }
    }
  }

  function getDictionaryCode() {
    return dictionary.code;
  }

  function setDictionary(newDictionary) {
    dictionary = newDictionary;
    translateFixedText();
  }

  function setLanguageOptions() {
    // use English unless a dictionary was passed in
    if (rg2Config.dictionary.code === undefined) {
      dictionary = {};
      dictionary.code = 'en';
    } else {
      dictionary = rg2Config.dictionary;
    }
    translateFixedText();
    createLanguageDropdown();
  }

  function setConfigOption(option, value) {
    this.options[option] = value;
  }

  function saveConfigOptions() {
    try {
      if ((window.hasOwnProperty('localStorage')) && (window.localStorage !== null)) {
        localStorage.setItem('rg2-options', JSON.stringify(this.options));
      }
    } catch (e) {
      // storage not supported so just return
      return;
    }
  }

  function loadConfigOptions() {
    try {
      if ((window.hasOwnProperty('localStorage')) && (window.localStorage !== null)) {
        if (localStorage.getItem('rg2-options') !== null) {
          this.options = JSON.parse(localStorage.getItem('rg2-options'));
          // best to keep these at default?
          this.options.circleSize = 20;
          if (this.options.mapIntensity === 0) {
            rg2.utils.showWarningDialog("Warning", "Your saved settings have 0% map intensity so the map is invisible. You can adjust this on the configuration menu");
          }
        }
      }
    } catch (e) {
      // storage not supported so just continue
      console.log('Local storage not supported');
    }
  }

  function getOverprintDetails() {
    var opt, size, scaleFact, circleSize;
    opt = {};
    // attempt to scale overprint depending on map image size
    // this avoids very small/large circles, or at least makes things a bit more sensible
    size = rg2.getMapSize();
    // Empirically derived  so open to suggestions. This is based on a nominal 20px circle
    // as default. The square root stops things getting too big too quickly.
    // 1500px is a typical map image maximum size.
    scaleFact = Math.pow(Math.min(size.height, size.width) / 1500, 0.5);
    // don't get too carried away, although these would be strange map files
    scaleFact = Math.min(scaleFact, 5);
    scaleFact = Math.max(scaleFact, 0.5);
    circleSize = Math.round(rg2.options.circleSize * scaleFact);
    // ratios based on IOF ISOM overprint specification
    opt.controlRadius = circleSize;
    opt.finishInnerRadius = circleSize * (5 / 6);
    opt.finishOuterRadius = circleSize * (7 / 6);
    opt.startTriangleLength = circleSize * (7 / 6);
    opt.overprintWidth = this.options.courseWidth;
    opt.font = circleSize + 'pt Arial';
    return opt;
  }

  rg2.t = t;
  rg2.options = options;
  rg2.config = config;
  rg2.saveConfigOptions = saveConfigOptions;
  rg2.setConfigOption = setConfigOption;
  rg2.loadConfigOptions = loadConfigOptions;
  rg2.getOverprintDetails = getOverprintDetails;
  rg2.setDictionary = setDictionary;
  rg2.getDictionaryCode = getDictionaryCode;
  rg2.setLanguageOptions = setLanguageOptions;
}());

/*global rg2:false */
(function () {
  function Control(code, x, y) {
    this.code = code;
    this.x = x;
    this.y = y;
  }

  Control.prototype = {
    Constructor : Control
  };

  rg2.Control = Control;
}());
/*global rg2:false */
(function () {
  function Controls() {
    this.controls = [];
    this.displayControls = false;
  }


  Controls.prototype = {
    Constructor : Controls,

    addControl : function (code, x, y) {
      var i, newCode;
      newCode = true;
      for (i = 0; i < this.controls.length; i += 1) {
        if (this.controls[i].code === code) {
          newCode = false;
          break;
        }
      }
      if (newCode) {
        this.controls.push(new rg2.Control(code, x, y));
      }
    },

    deleteAllControls : function () {
      this.controls.length = 0;
    },

    drawControls : function (drawDot) {
      var i, l, opt;
      if (this.displayControls) {
        opt = rg2.getOverprintDetails();
        //rg2.ctx.globalAlpha = 1.0;
        l = this.controls.length;
        for (i = 0; i < l; i += 1) {
          // Assume things starting with 'F' or 'M' are Finish or Mal
          if ((this.controls[i].code.indexOf('F') === 0) || (this.controls[i].code.indexOf('M') === 0)) {
            this.drawFinish(this.controls[i].x, this.controls[i].y, this.controls[i].code, opt);
          } else {
            // Assume things starting with 'S' are a Start
            if (this.controls[i].code.indexOf('S') === 0) {
              this.drawStart(this.controls[i].x, this.controls[i].y, this.controls[i].code, (1.5 * Math.PI), opt);
            } else {
              // Else it's a normal control
              this.drawSingleControl(this.controls[i].x, this.controls[i].y, this.controls[i].code, Math.PI * 0.25, opt);
              if (drawDot) {
                rg2.ctx.fillRect(this.controls[i].x - 1, this.controls[i].y - 1, 3, 3);
              }

            }
          }
        }
      }
    },
    drawSingleControl : function (x, y, code, angle, opt) {
      var scale, metrics, xoffset, yoffset;
      //Draw the white halo around the controls
      rg2.ctx.beginPath();
      rg2.ctx.lineCap = "round";
      rg2.ctx.lineJoin = "miter";
      rg2.ctx.strokeStyle = "white";
      rg2.ctx.lineWidth = opt.overprintWidth + 2;
      rg2.ctx.arc(x, y, opt.controlRadius, 0, 2 * Math.PI, false);
      rg2.ctx.stroke();
      //Draw the white halo around the control code
      rg2.ctx.beginPath();
      rg2.ctx.textAlign = "center";
      rg2.ctx.font = opt.font;
      rg2.ctx.strokeStyle = "white";
      rg2.ctx.miterLimit = 2;
      rg2.ctx.lineWidth = 1.5;
      rg2.ctx.textBaseline = "middle";
      metrics = rg2.ctx.measureText(code);
      // offset to left if left of centre, to right if right of centre
      if (angle < Math.PI) {
        xoffset = metrics.width / 2;
      } else {
        xoffset = -1 * metrics.width / 2;
      }
      // control radius is also the control code text height
      // offset up if above half way, down if below half way
      if ((angle >= (Math.PI / 2)) && (angle <= (Math.PI * 1.5))) {
        yoffset = -1 * opt.controlRadius / 2;
      } else {
        yoffset = opt.controlRadius / 2;
      }
      // empirically looks OK with this scale
      scale = 1.3;
      rg2.ctx.strokeText(code, x + (opt.controlRadius * scale * Math.sin(angle)) + xoffset, y + (opt.controlRadius * scale * Math.cos(angle)) + yoffset);
      //Draw the purple control
      rg2.ctx.beginPath();
      rg2.ctx.font = opt.font;
      rg2.ctx.fillStyle = rg2.config.PURPLE;
      rg2.ctx.strokeStyle = rg2.config.PURPLE;
      rg2.ctx.lineWidth = opt.overprintWidth;
      rg2.ctx.arc(x, y, opt.controlRadius, 0, 2 * Math.PI, false);
      rg2.ctx.fillText(code, x + (opt.controlRadius * scale * Math.sin(angle)) + xoffset, y + (opt.controlRadius * scale * Math.cos(angle)) + yoffset);
      rg2.ctx.stroke();
    },

    drawFinish : function (x, y, code, opt) {
      //Draw the white halo around the finish control
      rg2.ctx.lineCap = "round";
      rg2.ctx.lineJoin = "miter";
      rg2.ctx.strokeStyle = "white";
      rg2.ctx.lineWidth = opt.overprintWidth + 2;
      rg2.ctx.beginPath();
      rg2.ctx.arc(x, y, opt.finishInnerRadius, 0, 2 * Math.PI, false);
      rg2.ctx.stroke();
      rg2.ctx.beginPath();
      rg2.ctx.arc(x, y, opt.finishOuterRadius, 0, 2 * Math.PI, false);
      rg2.ctx.stroke();
      //Draw the white halo around the finish code
      rg2.ctx.beginPath();
      rg2.ctx.font = opt.font;
      rg2.ctx.textAlign = "left";
      rg2.ctx.strokeStyle = "white";
      rg2.ctx.miterLimit = 2;
      rg2.ctx.lineWidth = 1.5;
      rg2.ctx.strokeText(code, x + (opt.controlRadius * 1.5), y + opt.controlRadius);
      rg2.ctx.stroke();
      //Draw the purple finish control
      rg2.ctx.beginPath();
      rg2.ctx.fillStyle = rg2.config.PURPLE;
      rg2.ctx.strokeStyle = rg2.config.PURPLE;
      rg2.ctx.lineWidth = opt.overprintWidth;
      rg2.ctx.arc(x, y, opt.finishInnerRadius, 0, 2 * Math.PI, false);
      rg2.ctx.stroke();
      rg2.ctx.beginPath();
      rg2.ctx.arc(x, y, opt.finishOuterRadius, 0, 2 * Math.PI, false);
      rg2.ctx.fillText(code, x + (opt.controlRadius * 1.5), y + opt.controlRadius);
      rg2.ctx.stroke();
    },
    drawStart : function (startx, starty, code, angle, opt) {
      //Draw the white halo around the start triangle
      var x, y, DEGREES_120;
      x = [];
      y = [];
      DEGREES_120 = (2 * Math.PI / 3);
      angle = angle + (Math.PI / 2);
      rg2.ctx.lineCap = "round";
      rg2.ctx.lineJoin = "round"; //miter
      rg2.ctx.strokeStyle = "white";
      rg2.ctx.lineWidth = opt.overprintWidth + 2;
      rg2.ctx.beginPath();
      x[0] = startx + (opt.startTriangleLength * Math.sin(angle));
      y[0] = starty - (opt.startTriangleLength * Math.cos(angle));
      rg2.ctx.moveTo(x[0], y[0]);
      x[1] = startx + (opt.startTriangleLength * Math.sin(angle + DEGREES_120));
      y[1] = starty - (opt.startTriangleLength * Math.cos(angle + DEGREES_120));
      rg2.ctx.lineTo(x[1], y[1]);
      rg2.ctx.stroke();
      rg2.ctx.beginPath();
      rg2.ctx.moveTo(x[1], y[1]);
      x[2] = startx + (opt.startTriangleLength * Math.sin(angle - DEGREES_120));
      y[2] = starty - (opt.startTriangleLength * Math.cos(angle - DEGREES_120));
      rg2.ctx.lineTo(x[2], y[2]);
      rg2.ctx.stroke();
      rg2.ctx.beginPath();
      rg2.ctx.moveTo(x[2], y[2]);
      rg2.ctx.lineTo(x[0], y[0]);
      rg2.ctx.stroke();
      //Draw the white halo around the start code
      rg2.ctx.beginPath();
      rg2.ctx.font = opt.font;
      rg2.ctx.textAlign = "left";
      rg2.ctx.strokeStyle = "white";
      rg2.ctx.miterLimit = 2;
      rg2.ctx.lineJoin = "round";
      rg2.ctx.lineWidth = 1.5;
      rg2.ctx.strokeText(code, x[0] + (opt.controlRadius * 1.25), y[0] + (opt.controlRadius * 1.25));
      rg2.ctx.stroke();
      //Draw the purple start control
      rg2.ctx.strokeStyle = rg2.config.PURPLE;
      rg2.ctx.lineWidth = opt.overprintWidth;
      rg2.ctx.font = opt.font;
      rg2.ctx.fillStyle = rg2.config.PURPLE;
      rg2.ctx.beginPath();
      rg2.ctx.moveTo(x[0], y[0]);
      rg2.ctx.lineTo(x[1], y[1]);
      rg2.ctx.stroke();
      rg2.ctx.beginPath();
      rg2.ctx.moveTo(x[1], y[1]);
      rg2.ctx.lineTo(x[2], y[2]);
      rg2.ctx.stroke();
      rg2.ctx.beginPath();
      rg2.ctx.moveTo(x[2], y[2]);
      rg2.ctx.lineTo(x[0], y[0]);
      rg2.ctx.fillText(code, x[0] + (opt.controlRadius * 1.25), y[0] + (opt.controlRadius * 1.25));
      rg2.ctx.stroke();
    },
    toggleControlDisplay : function () {
      if (this.displayControls) {
        $("#btn-toggle-controls").removeClass("fa-ban").addClass("fa-circle-o");
        $("#btn-toggle-controls").prop("title", rg2.t("Show controls"));
      } else {
        $("#btn-toggle-controls").removeClass("fa-circle-o").addClass("fa-ban");
        $("#btn-toggle-controls").prop("title", rg2.t("Hide controls"));
      }
      this.displayControls = !this.displayControls;
    },

    displayAllControls : function () {
      this.displayControls = true;
    },

    getControlCount : function () {
      return this.controls.length;
    }
  };
  rg2.Controls = Controls;
}());
/*global rg2:false */
(function () {
  function Course(data, isScoreCourse) {
    this.name = data.name;
    this.trackcount = 0;
    this.display = false;
    this.courseid = data.courseid;
    this.codes = data.codes;
    this.x = data.xpos;
    this.y = data.ypos;
    this.isScoreCourse = isScoreCourse;
    this.resultcount = 0;
    // save angle to next control to simplify later calculations
    this.angle = [];
    // save angle to show control code text
    this.textAngle = [];
    this.setAngles();
  }

  Course.prototype = {
    Constructor : Course,

    incrementTracksCount : function () {
      this.trackcount += 1;
    },

    setAngles : function () {
      var i, c1x, c1y, c2x, c2y, c3x, c3y;
      for (i = 0; i < (this.x.length - 1); i += 1) {
        if (this.isScoreCourse) {
          // align score event start triangle and controls upwards
          this.angle[i] = Math.PI * 1.5;
          this.textAngle[i] = Math.PI * 0.25;
        } else {
          // angle of line to next control
          this.angle[i] = rg2.utils.getAngle(this.x[i], this.y[i], this.x[i + 1], this.y[i + 1]);
          // create bisector of angle to position number
          c1x = Math.sin(this.angle[i - 1]);
          c1y = Math.cos(this.angle[i - 1]);
          c2x = Math.sin(this.angle[i]) + c1x;
          c2y = Math.cos(this.angle[i]) + c1y;
          c3x = c2x / 2;
          c3y = c2y / 2;
          this.textAngle[i] = rg2.utils.getAngle(c3x, c3y, c1x, c1y);
        }
      }
      // angle for finish aligns to north
      this.angle[this.x.length - 1] = Math.PI * 1.5;
      this.textAngle[this.x.length - 1] = Math.PI * 1.5;
    },

    drawCourse : function (intensity) {
      var i, opt;
      if (this.display) {
        opt = rg2.getOverprintDetails();
        rg2.ctx.globalAlpha = intensity;
        rg2.controls.drawStart(this.x[0], this.y[0], "", this.angle[0], opt);
        // don't join up controls for score events
        if (!this.isScoreCourse) {
          this.drawLinesBetweenControls({x: this.x, y: this.y}, this.angle, opt);
        }
        if (this.isScoreCourse) {
          for (i = 1; i < (this.x.length); i += 1) {
            if ((this.codes[i].indexOf('F') === 0) || (this.codes[i].indexOf('M') === 0)) {
              rg2.controls.drawFinish(this.x[i], this.y[i], "", opt);
            } else {
              rg2.controls.drawSingleControl(this.x[i], this.y[i], this.codes[i], this.textAngle[i], opt);
            }
          }

        } else {
          for (i = 1; i < (this.x.length - 1); i += 1) {
            rg2.controls.drawSingleControl(this.x[i], this.y[i], i, this.textAngle[i], opt);
          }
          rg2.controls.drawFinish(this.x[this.x.length - 1], this.y[this.y.length - 1], "", opt);
        }
      }
    },
    drawLinesBetweenControls : function (pt, angle, opt) {
      var c1x, c1y, c2x, c2y, i, dist;
      for (i = 0; i < (pt.x.length - 1); i += 1) {
        if (i === 0) {
          dist = opt.startTriangleLength;
        } else {
          dist = opt.controlRadius;
        }
        c1x = pt.x[i] + (dist * Math.cos(angle[i]));
        c1y = pt.y[i] + (dist * Math.sin(angle[i]));
        //Assume the last control in the array is a finish
        if (i === this.x.length - 2) {
          dist = opt.finishOuterRadius;
        } else {
          dist = opt.controlRadius;
        }
        c2x = pt.x[i + 1] - (dist * Math.cos(angle[i]));
        c2y = pt.y[i + 1] - (dist * Math.sin(angle[i]));
        rg2.ctx.beginPath();
        rg2.ctx.moveTo(c1x, c1y);
        rg2.ctx.lineTo(c2x, c2y);
        rg2.ctx.stroke();
      }
    }
  };
  rg2.Course = Course;
}());

/*global rg2:false */
(function () {
  function CourseParser(evt, worldfile, localWorldfile) {
    this.courses = [];
    this.newcontrols = new rg2.Controls();
    this.courses.length = 0;
    this.fromCondes = false;
    this.coursesGeoreferenced = false;
    this.newcontrols.deleteAllControls();
    // holding copies of worldfiles: not ideal but it works
    this.localWorldfile = localWorldfile;
    this.worldfile = worldfile;
    this.processCoursesXML(evt.target.result);
    return {courses: this.courses, newcontrols: this.newcontrols, georeferenced: this.coursesGeoreferenced};
  }

  CourseParser.prototype = {

    Constructor : CourseParser,

    processCoursesXML : function (rawXML) {
      var xml, version, nodelist;
      try {
        xml = $.parseXML(rawXML);
      } catch (err) {
        rg2.utils.showWarningDialog("XML file error", "File is not a valid XML course file.");
        return;
      }
      nodelist = xml.getElementsByTagName('CourseData');
      if (nodelist.length === 0) {
        rg2.utils.showWarningDialog("XML file error", "File is not a valid XML course file. CourseData element missing.");
        return;
      }
      version = this.getVersion(xml);
      switch (version) {
      case "2.0.3":
        this.processIOFV2XMLCourses(xml);
        break;
      case "3.0":
        this.processIOFV3XMLCourses(xml);
        break;
      default:
        rg2.utils.showWarningDialog("XML file error", 'Invalid IOF file format. Version ' + version + ' not supported.');
      }
    },

    getVersion : function (xml) {
      var nodelist, version;
      version = "";
      // test for IOF Version 2
      nodelist = xml.getElementsByTagName('IOFVersion');
      if (nodelist.length > 0) {
        version = nodelist[0].getAttribute('version');
      }
      if (version === "") {
        // test for IOF Version 3
        nodelist = xml.getElementsByTagName('CourseData');
        if (nodelist.length > 0) {
          version = nodelist[0].getAttribute('iofVersion').trim();
          this.setCreator(nodelist[0].getAttribute('creator').trim());
        }
      }
      return version;
    },

    setCreator : function (text) {
      // allow handling of files from Condes which use original worldfile rather than WGS-84 as expected by IOF scheme
      if (text.indexOf('Condes') > -1) {
        this.fromCondes = true;
      }
    },

    processIOFV3XMLCourses : function (xml) {
      // extract all controls
      var nodelist, i, code, pt, latlng;
      nodelist = xml.getElementsByTagName('Control');
      // only need first-level Controls
      pt = {x: 0, y: 0};
      for (i = 0; i < nodelist.length; i += 1) {
        if (nodelist[i].parentNode.nodeName === 'RaceCourseData') {
          code = nodelist[i].getElementsByTagName("Id")[0].textContent;
          latlng = nodelist[i].getElementsByTagName("Position");
          if ((this.localWorldfile.valid) && (latlng.length > 0)) {
            pt = this.getXYFromLatLng(latlng);
            this.coursesGeoreferenced = true;
          } else {
            // only works if all controls have lat/lon or none do: surely a safe assumption...
            pt = this.getXYFromMapPosition(nodelist[i].getElementsByTagName("MapPosition"));
          }
          // don't want to save crossing points
          if (nodelist[i].getAttribute('type') !== 'CrossingPoint') {
            this.newcontrols.addControl(code.trim(), pt.x, pt.y);
          }
        }
      }
      // extract all courses
      nodelist = xml.getElementsByTagName('Course');
      this.extractV3Courses(nodelist);
    },

    getXYFromLatLng : function (latLng) {
      var lat, lng, pt;
      pt = {x: 0, y: 0};
      lat = parseFloat(latLng[0].getAttribute('lat'));
      lng = parseFloat(latLng[0].getAttribute('lng'));
      // handle Condes-specific georeferencing
      if (this.fromCondes) {
        // use original map worldfile
        pt.x = this.localWorldfile.getX(lng, lat);
        pt.y = this.localWorldfile.getY(lng, lat);
      } else {
        // use WGS-84 worldfile as expected (?) by IOF V3 schema
        pt.x = this.worldfile.getX(lng, lat);
        pt.y = this.worldfile.getY(lng, lat);
      }
      return pt;
    },

    processIOFV2XMLCourses : function (xml) {
      var i, x, y;
      // extract all start controls
      this.extractV2Controls(xml.getElementsByTagName('StartPoint'), 'StartPointCode');
      // extract all normal controls
      this.extractV2Controls(xml.getElementsByTagName('Control'), 'ControlCode');
      // extract all finish controls
      this.coursesGeoreferenced = this.extractV2Controls(xml.getElementsByTagName('FinishPoint'), 'FinishPointCode');
      if (this.coursesGeoreferenced) {
        if (this.localWorldfile.valid) {
          for (i = 0; i < this.newcontrols.controls.length; i += 1) {
            x = this.newcontrols.controls[i].x;
            y = this.newcontrols.controls[i].y;
            this.newcontrols.controls[i].x = this.localWorldfile.getX(x, y);
            this.newcontrols.controls[i].y = this.localWorldfile.getY(x, y);
          }
        }
      }
      // extract all courses
      this.extractV2Courses(xml.getElementsByTagName('Course'));
    },

    extractV2Courses : function (nodelist) {
      var i, name, codes, x, y;
      for (i = 0; i < nodelist.length; i += 1) {
        codes = [];
        x = [];
        y = [];
        name = nodelist[i].getElementsByTagName('CourseName')[0].textContent.trim();
        codes = this.extractCodesFromControlList(nodelist[i], "ControlCode");
        // add start code at beginning of array
        codes.unshift(nodelist[i].getElementsByTagName('StartPointCode')[0].textContent.trim());
        codes.push(nodelist[i].getElementsByTagName('FinishPointCode')[0].textContent.trim());
        // courseid 0 for now: set when result mapping is known
        this.courses.push({courseid: 0, x: x, y: y, codes: codes, name: name});
      }
      $("#rg2-select-course-file").addClass('valid');
    },

    extractV3Courses : function (nodelist) {
      var i, name, codes, x, y;
      for (i = 0; i < nodelist.length; i += 1) {
        codes = [];
        x = [];
        y = [];
        name = nodelist[i].getElementsByTagName('Name')[0].textContent.trim();
        codes = this.extractCodesFromControlList(nodelist[i], "Control");
        // courseid 0 for now: set when result mapping is known
        this.courses.push({courseid: 0, x: x, y: y, codes: codes, name: name});
      }
      $("#rg2-select-course-file").addClass('valid');
    },

    extractCodesFromControlList : function (nodeList, tagName) {
      // tagName depends on IOF version being parsed
      var i, code, codes, controlList;
      controlList = nodeList.getElementsByTagName('CourseControl');
      codes = [];
      for (i = 0; i < controlList.length; i += 1) {
        code = controlList[i].getElementsByTagName(tagName)[0].textContent.trim();
        // if control code doesn't exist it was a crossing point so we don't need it
        if (this.validControlCode(code)) {
          codes.push(code);
        }
      }
      return codes;
    },

    // returns true if controls are georeferenced
    extractV2Controls : function (nodelist, type) {
      var i, pt, code, geopos, isGeoref;
      isGeoref = false;
      pt = {x: 0, y: 0};
      for (i = 0; i < nodelist.length; i += 1) {
        code = nodelist[i].getElementsByTagName(type)[0].textContent;
        geopos = nodelist[i].getElementsByTagName("ControlPosition");
        // subtle bug and a half #190
        // if you have an IOF XML V2 file which has georeferenced controls AND
        // the map file itself isn't georeferenced
        // then you need to use X, Y and not the georeferenced co-ordinates
        if ((geopos.length > 0) && (this.localWorldfile.valid)) {
          pt.x = parseFloat(geopos[0].getAttribute('x'));
          pt.y = parseFloat(geopos[0].getAttribute('y'));
          isGeoref = true;
        } else {
          pt = this.getXYFromMapPosition(nodelist[i].getElementsByTagName("MapPosition"));
        }
        this.newcontrols.addControl(code.trim(), pt.x, pt.y);
      }
      return isGeoref;
    },

    getXYFromMapPosition : function (mapPosition) {
      // #269 allow for getting a comma instead of a decimal point
      return {x: mapPosition[0].getAttribute('x').replace(",", "."), y: mapPosition[0].getAttribute('y').replace(",", ".")};
    },

    // check if a given control code is in the list of known controls
    validControlCode : function (code) {
      var i, controls;
      controls = this.newcontrols.controls;
      for (i = 0; i < controls.length; i += 1) {
        if (controls[i].code === code) {
          return true;
        }
      }
      return false;
    }
  };
  rg2.CourseParser = CourseParser;
}());
/*global rg2:false */
(function () {
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

    getCourseName : function (courseid) {
      return this.courses[courseid].name;
    },

    getCoursesForEvent : function () {
      var i, course, courses;
      courses = [];
      for (i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          course = {};
          course.id = this.courses[i].courseid;
          course.name = this.courses[i].name;
          course.results = this.courses[i].resultcount;
          courses.push(course);
        }
      }
      return courses;
    },

    getHighestControlNumber : function () {
      return this.highestControlNumber;
    },

    getCourseDetails : function (courseid) {
      return this.courses[courseid];
    },

    incrementTracksCount : function (courseid) {
      this.courses[courseid].incrementTracksCount();
      this.totaltracks += 1;
    },

    addCourse : function (courseObject) {
      this.courses[courseObject.courseid] = courseObject;
      this.numberofcourses += 1;
      // allow for courses with no defined controls
      // careful here: != catches null and undefined, but !== just catches undefined
      if (this.courses[courseObject.courseid].codes !== undefined) {
        if (this.courses[courseObject.courseid].codes.length > this.highestControlNumber) {
          // the codes includes Start and Finish: we don't need F so subtract 1 to get controls
          this.highestControlNumber = this.courses[courseObject.courseid].codes.length - 1;
          this.updateControlDropdown();
        }
      }
    },

    updateCourseDropdown : function () {
      $("#rg2-course-select").empty();
      var i, dropdown;
      dropdown = document.getElementById("rg2-course-select");
      dropdown.options.add(rg2.utils.generateOption(null, rg2.t("Select course")));
      for (i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          dropdown.options.add(rg2.utils.generateOption(i, this.courses[i].name));
        }
      }
    },

    updateControlDropdown : function () {
      var i, dropdown;
      dropdown = document.getElementById("rg2-control-select");
      $("#rg2-control-select").empty();
      dropdown.options.add(rg2.utils.generateOption(0, "S"));
      for (i = 0; i < this.highestControlNumber; i += 1) {
        dropdown.options.add(rg2.utils.generateOption(i, i));
      }
      dropdown.options.add(rg2.utils.generateOption(rg2.config.MASS_START_BY_CONTROL, "By control"));
    },

    deleteAllCourses : function () {
      this.courses.length = 0;
      this.numberofcourses = 0;
      this.totaltracks = 0;
      this.highestControlNumber = 0;
    },

    drawCourses : function (intensity) {
      var i;
      for (i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          this.courses[i].drawCourse(intensity);
        }
      }
    },

    putOnDisplay : function (courseid) {
      if (this.courses[courseid] !== undefined) {
        this.courses[courseid].display = true;
      }
    },

    putAllOnDisplay : function () {
      this.setDisplayAllCourses(true);
    },

    removeAllFromDisplay : function () {
      this.setDisplayAllCourses(false);
    },

    setDisplayAllCourses : function (doDisplay) {
      var i;
      for (i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          this.courses[i].display = doDisplay;
        }
      }
    },

    removeFromDisplay : function (courseid) {
      // remove selected course
      this.courses[courseid].display = false;

    },

    getCoursesOnDisplay : function () {
      var i, courses;
      courses = [];
      for (i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          if (this.courses[i].display) {
            courses.push(i);
          }
        }
      }
      return courses;
    },

    getNumberOfCourses : function () {
      return this.numberofcourses;
    },

    // look through all courses and extract list of controls
    generateControlList : function (controls) {
      var codes, x, y, i, j;
      // for all courses
      for (i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          codes = this.courses[i].codes;
          x = this.courses[i].x;
          y = this.courses[i].y;
          // for all controls on course
          if (codes !== undefined) {
            for (j = 0; j < codes.length; j += 1) {
              controls.addControl(codes[j], x[j], y[j]);
            }
          }
        }
      }
    },

    updateScoreCourse : function (courseid, codes, x, y) {
      var i;
      for (i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          if (this.courses[i].courseid === courseid) {
            this.courses[i].codes = codes;
            this.courses[i].x = x;
            this.courses[i].y = y;
            this.courses[i].setAngles();
            break;
          }
        }
      }
    },

    setResultsCount : function () {
      var i;
      for (i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          this.courses[i].resultcount = rg2.results.countResultsByCourseID(i);
        }
      }
    },

    formatCoursesAsTable : function () {
      var details, html;
      html = "<table class='coursemenutable'><tr><th>" + rg2.t("Course") + "</th><th><i class='fa fa-eye'></i></th>";
      html += "<th>" + rg2.t("Runners") + "</th><th>" + rg2.t("Routes") + "</th><th><i class='fa fa-eye'></i></th></tr>";
      details = this.formatCourseDetails();
      // add bottom row for all courses checkboxes
      html += details.html + "<tr class='allitemsrow'><td>" + rg2.t("All") + "</td>";
      html += "<td><input class='allcourses' id=" + details.coursecount + " type=checkbox name=course></input></td>";
      html += "<td>" + details.res + "</td><td>" + this.totaltracks + "</td><td>";
      if (this.totaltracks > 0) {
        html += "<input id=" + details.coursecount + " class='alltracks' type=checkbox name=track></input>";
      }
      html += "</td></tr></table>";
      return html;
    },

    formatCourseDetails : function () {
      var i, details;
      details = {html: "", res: 0};
      for (i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          details.html += "<tr><td>" + this.courses[i].name + "</td>" + "<td><input class='courselist' id=" + i + " type=checkbox name=course></input></td>";
          details.html += "<td>" + this.courses[i].resultcount + "</td>" + "<td>" + this.courses[i].trackcount + "</td><td>";
          details.res += this.courses[i].resultcount;
          if (this.courses[i].trackcount > 0) {
            details.html += "<input id=" + i + " class='tracklist' type=checkbox name=track></input>";
          }
          details.html += "</td></tr>";
        }
      }
      details.coursecount = i;
      return details;
    },

    drawLinesBetweenControls : function (pt, angle, courseid, opt) {
      this.courses[courseid].drawLinesBetweenControls(pt,  angle, opt);
    }
  };
  rg2.Courses = Courses;
}());
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

    autofitGPSTrack : function () {
      this.gpstrack.autofitTrack();
    },

    adjustOffset : function (offset) {
      this.gpstrack.adjustOffset(offset);
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
        trk.handles.saveForUndo();
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
      this.angles = [];
      this.nextControl = 0;
      this.isScoreCourse = false;
      this.gpstrack.initialiseGPS();
      this.hasResults = rg2.events.hasResults();
      this.initialiseUI();
      rg2.redraw(false);
    },

    initialiseUI : function () {
      rg2.courses.updateCourseDropdown();
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
      rg2.utils.setButtonState("disable", ["#btn-save-route", "#btn-save-gps-route", "#btn-undo", "#btn-three-seconds", "#rg2-load-gps-file", "#rg2-autofit-gps"]);
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
      // save details for normal courses
      // can't do this here for score courses since you need to know the
      // variant for a given runner
      if (!this.isScoreCourse) {
        rg2.courses.putOnDisplay(courseid);
        this.gpstrack.routeData.coursename = course.name;
        this.controlx = course.x;
        this.controly = course.y;
        this.gpstrack.routeData.x.length = 0;
        this.gpstrack.routeData.y.length = 0;
        this.gpstrack.routeData.x[0] = this.controlx[0];
        this.gpstrack.routeData.y[0] = this.controly[0];
        this.gpstrack.routeData.controlx = this.controlx;
        this.gpstrack.routeData.controly = this.controly;
        this.angles = course.angle;
        this.nextControl = 1;
      }
      rg2.results.createNameDropdown(courseid);
      $("#rg2-name-select").prop('disabled', false);
      $("#rg2-load-gps-file").val('').button("disable");
      $("#btn-autofit-gps").button("disable");
      this.gpstrack.autofitOffset = null;
      $("#spn-offset").spinner("value", 0).spinner("disable");
      $("#btn-undo-gps-adjust").button("disable");
      rg2.redraw(false);
    },

    doDrawingReset : function () {
      $('#rg2-drawing-reset-dialog').dialog("destroy");
      rg2.courses.removeFromDisplay(this.gpstrack.routeData.courseid);
      if (this.gpstrack.routeData.resultid !== null) {
        rg2.results.putScoreCourseOnDisplay(this.gpstrack.routeData.resultid, false);
      }
      this.pendingCourseid = null;
      this.initialiseDrawing();
    },

    doCancelDrawingReset : function () {
      $('#rg2-drawing-reset-dialog').dialog("destroy");
    },

    confirmCourseChange : function () {
      var dlg;
      dlg = {};
      dlg.selector = "<div id='rg2-course-change-dialog'>The route you have started to draw will be discarded. Are you sure you want to change the course?</div>";
      dlg.title = "Confirm course change";
      dlg.classes = "rg2-confirm-change-course";
      dlg.doText = "Change course";
      dlg.onDo = this.doChangeCourse.bind(this);
      dlg.onCancel = this.doCancelChangeCourse.bind(this);
      rg2.utils.createModalDialog(dlg);
    },

    resetDrawing : function () {
      var dlg;
      dlg = {};
      dlg.selector = "<div id='rg2-drawing-reset-dialog'>All information you have entered will be removed. Are you sure you want to reset?</div>";
      dlg.title = "Confirm reset";
      dlg.classes = "rg2-confirm-drawing-reset";
      dlg.doText = "Reset";
      dlg.onDo = this.doDrawingReset.bind(this);
      dlg.onCancel = this.doCancelDrawingReset.bind(this);
      rg2.utils.createModalDialog(dlg);
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
      var res, msg;
      if (!isNaN(resultid)) {
        res = rg2.results.getFullResult(resultid);
        if (res.hasValidTrack) {
          msg = rg2.t("If you draw a new route it will overwrite the old route for this runner.") + " " + rg2.t("GPS routes are saved separately and will not be overwritten.");
          rg2.utils.showWarningDialog(rg2.t("Route already drawn"), msg);
        }
        // remove old course from display just in case we missed it somewhere else
        if (this.gpstrack.routeData.resultid !== null) {
          rg2.results.putScoreCourseOnDisplay(this.gpstrack.routeData.resultid, false);
        }
        this.gpstrack.routeData.resultid = res.resultid;
        this.gpstrack.routeData.name = res.name;
        this.gpstrack.routeData.splits = res.splits;
        // set up individual course if this is a score event
        if (this.isScoreCourse) {
          rg2.results.putScoreCourseOnDisplay(res.resultid, true);
          this.controlx = res.scorex;
          this.controly = res.scorey;
          this.gpstrack.routeData.x.length = 0;
          this.gpstrack.routeData.y.length = 0;
          this.gpstrack.routeData.x[0] = this.controlx[0];
          this.gpstrack.routeData.y[0] = this.controly[0];
          this.gpstrack.routeData.controlx = this.controlx;
          this.gpstrack.routeData.controly = this.controly;
          this.nextControl = 1;
          rg2.redraw(false);
        }
        // resetting it here avoids trying to start drawing before selecting
        // a name, which is always what happened when testing the prototype
        this.alignMapToAngle(0);
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

    alignMapToAngle : function (control) {
      var angle;
      if (rg2.options.alignMap) {
        // don't adjust after we have got to the finish
        if (control < (this.controlx.length - 1)) {
          if (this.isScoreCourse) {
            // need to calculate this here since score courses use variants for
            // each person, not single courses
            angle = rg2.utils.getAngle(this.controlx[control], this.controly[control],
              this.controlx[control + 1], this.controly[control + 1]);
          } else {
            angle = this.angles[control];
          }
          // course angles are based on horizontal as 0: need to reset to north
          rg2.alignMap(angle  + (Math.PI / 2), this.controlx[control], this.controly[control]);
        }
      }
    },

    addNewPoint : function (x, y) {
      if (this.closeEnough(x, y)) {
        this.addRouteDataPoint(this.controlx[this.nextControl], this.controly[this.nextControl]);
        this.alignMapToAngle(this.nextControl);
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
      $("#btn-autofit-gps").button("enable");
      this.gpstrack.autofitOffset = null;
      $("#spn-offset").spinner("value", 0).spinner("disable");
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
          this.alignMapToAngle(this.nextControl - 1);
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
      var i, l, t, date, offset, text, fitidx, fitoffset;

      // set start time by auto fit offset
      fitidx = this.gpstrack.autofitOffset;
      if (fitidx === undefined || fitidx === null) {
        fitidx = 0;
      }
      if (fitidx < 0) {
        // calculate time offset from autofit position
        fitoffset = this.gpstrack.routeData.time[0] + fitidx;
      } else {
        fitoffset = this.gpstrack.routeData.time[fitidx];
      }
      t = this.gpstrack.routeData.time[this.gpstrack.routeData.time.length - 1] - fitoffset;

      this.gpstrack.routeData.totaltime = rg2.utils.formatSecsAsMMSS(t);
      // GPS uses UTC: adjust to local time based on local user setting
      // only affects replay in real time
      date = new Date();
      // returns offset in minutes, so convert to seconds
      offset = date.getTimezoneOffset() * 60;
      this.gpstrack.routeData.startsecs = fitoffset - offset;

      l = this.gpstrack.routeData.x.length - fitidx;
      if (fitidx > 0) {
        // delete auto fit amount from the begining of the route
        this.gpstrack.routeData.x.splice(0, fitidx);
        this.gpstrack.routeData.y.splice(0, fitidx);
        this.gpstrack.routeData.time.splice(0, fitidx);
      } else if (fitidx < 0) {
        // add start point from course data to route and calculated start time
        //TODO zero point against start control
        this.gpstrack.routeData.x.unshift(rg2.courses.getCourseDetails(this.gpstrack.routeData.courseid).x[0]);
        this.gpstrack.routeData.y.unshift(rg2.courses.getCourseDetails(this.gpstrack.routeData.courseid).y[0]);
        // convert real time seconds to offset seconds from start time
        this.gpstrack.routeData.time.unshift(fitoffset);
      }
      // loop thru routedata and round values + times
      for (i = 0; i < l; i += 1) {
        this.gpstrack.routeData.x[i] = Math.round(this.gpstrack.routeData.x[i]);
        this.gpstrack.routeData.y[i] = Math.round(this.gpstrack.routeData.y[i]);
        // convert real time seconds to offset seconds from start time
        this.gpstrack.routeData.time[i] = this.gpstrack.routeData.time[i] - fitoffset;
      }
      // allow for already having a GPS route for this runner
      this.gpstrack.routeData.resultid += rg2.config.GPS_RESULT_OFFSET;
      while (rg2.results.resultIDExists(this.gpstrack.routeData.resultid)) {
        this.gpstrack.routeData.resultid += rg2.config.GPS_RESULT_OFFSET;
        // add marker(s) to name to show it is a duplicate
        this.gpstrack.routeData.name += '*';
      }
      text = $("#rg2-new-comments").val();
      if (text === rg2.t(rg2.config.DEFAULT_NEW_COMMENT)) {
        this.gpstrack.routeData.comments = "";
      } else {
        this.gpstrack.routeData.comments = text;
      }

      $("#btn-undo-gps-adjust").button("disable");
      this.postRoute();
    },

    saveRoute : function () {
      var text;
      // called to save manually entered route
      text = $("#rg2-new-comments").val();
      if (text === rg2.t(rg2.config.DEFAULT_NEW_COMMENT)) {
        this.gpstrack.routeData.comments = "";
      } else {
        this.gpstrack.routeData.comments = text;
      }
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
            rg2.utils.showWarningDialog(self.gpstrack.routeData.name, rg2.t('Your route was not saved. Please try again'));
          }
        },
        error : function () {
          rg2.utils.showWarningDialog(self.gpstrack.routeData.name, rg2.t('Your route was not saved. Please try again'));
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
      if (rg2.options.snap) {
        range = 8;
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
      rg2.ctx.strokeStyle = rg2.config.RED;
      rg2.ctx.fillStyle = rg2.config.RED_30;
      // highlight next control if we have a course selected
      if ((this.nextControl > 0) && (!this.gpstrack.fileLoaded)) {
        rg2.ctx.beginPath();
        if (this.nextControl < (this.controlx.length - 1)) {
          // normal control
          this.drawCircle(opt.controlRadius);
        } else {
          // finish
          this.drawCircle(opt.finishInnerRadius);
          rg2.ctx.stroke();
          rg2.ctx.beginPath();
          this.drawCircle(opt.finishOuterRadius);
        }
        // dot at centre of control circle
        rg2.ctx.fillRect(this.controlx[this.nextControl] - 1, this.controly[this.nextControl] - 1, 3, 3);
        rg2.ctx.stroke();
      }
      rg2.ctx.lineCap = "round";
      rg2.ctx.lineJoin = "round";
      rg2.ctx.strokeStyle = this.trackColor;
      rg2.ctx.fillStyle = this.trackColour;
      rg2.ctx.font = '10pt Arial';
      rg2.ctx.textAlign = "left";
      rg2.ctx.globalAlpha = 0.6;
      this.drawRoute();
      this.gpstrack.handles.drawHandles();
    },

    drawCircle : function (radius) {
      rg2.ctx.arc(this.controlx[this.nextControl], this.controly[this.nextControl], radius, 0, 2 * Math.PI, false);
      // fill in with transparent colour to highlight control better
      rg2.ctx.fill();
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

/*global rg2:false */
(function () {
  function Event(data) {
    this.kartatid = data.id;
    this.mapid = data.mapid;
    this.format = data.format;
    this.name = data.name;
    this.date = data.date;
    this.club = data.club;
    this.rawtype = data.type;
    switch (data.type) {
    case "I":
      this.type = "International event";
      break;
    case "N":
      this.type = "National event";
      break;
    case "R":
      this.type = "Regional event";
      break;
    case "L":
      this.type = "Local event";
      break;
    case "T":
      this.type = "Training event";
      break;
    default:
      this.type = "Unknown";
      break;
    }
    this.comment = data.comment;
    this.courses = 0;
    this.setMapDetails(data);
  }


  Event.prototype = {
    Constructor : Event,

    setMapDetails : function (data) {
      if (data.suffix === undefined) {
        this.mapfilename = this.mapid + '.' + 'jpg';
      } else {
        this.mapfilename = this.mapid + '.' + data.suffix;
      }
      this.worldfile = new rg2.Worldfile(data);
    }
  };
  rg2.Event = Event;
}());

/*global rg2:false */
(function () {
  function Events() {
    this.events = [];
    this.activeEventID = null;
  }

  Events.prototype = {
    Constructor : Events,

    deleteAllEvents : function () {
      this.events.length = 0;
      this.activeEventID = null;
    },

    addEvent : function (eventObject) {
      this.events.push(eventObject);
    },

    getEventInfo : function (kartatid) {
      var realid, info;
      kartatid = kartatid || this.getKartatEventID();
      realid = this.getEventIDForKartatID(kartatid);
      info = this.events[realid];
      info.id = realid;
      info.controls = rg2.controls.getControlCount();
      return info;
    },

    getKartatEventID : function () {
      return this.events[this.activeEventID].kartatid;
    },

    getActiveMapID : function () {
      return this.events[this.activeEventID].mapid;
    },

    getMapFileName : function () {
      return this.events[this.activeEventID].mapfilename;
    },

    setActiveEventID : function (eventid) {
      this.activeEventID = parseInt(eventid, 10);
    },

    getActiveEventID : function () {
      return this.activeEventID;
    },

    getEventIDForKartatID : function (kartatID) {
      var i;
      for (i = 0; i < this.events.length; i += 1) {
        if (this.events[i].kartatid === kartatID) {
          return i;
        }
      }
      return undefined;
    },

    getActiveEventDate : function () {
      if (this.activeEventID !== null) {
        return this.events[this.activeEventID].date;
      }
      return "";
    },

    getActiveEventName : function () {
      if (this.activeEventID !== null) {
        return this.events[this.activeEventID].name;
      }
      return "Routegadget 2";
    },

    getEventEditDropdown : function (dropdown) {
      var i;
      dropdown.options.add(rg2.utils.generateOption(null, 'No event selected'));
      for (i = (this.events.length - 1); i > -1; i -= 1) {
        dropdown.options.add(rg2.utils.generateOption(this.events[i].kartatid, this.events[i].kartatid + ": " + this.events[i].date + ": " + rg2.he.decode(this.events[i].name)));
      }
      return dropdown;
    },

    isScoreEvent : function () {
      return (this.events[this.activeEventID].format === rg2.config.SCORE_EVENT);
    },

    hasResults : function () {
      if (this.activeEventID !== null) {
        return (this.events[this.activeEventID].format !== rg2.config.EVENT_WITHOUT_RESULTS);
      }
      return true;
    },

    mapIsGeoreferenced : function () {
      if (this.activeEventID === null) {
        return false;
      }
      return this.events[this.activeEventID].worldfile.valid;
    },

    getMetresPerPixel : function () {
      var lat1, lat2, lon1, lon2, size, pixels, w;
      if ((this.activeEventID === null) || (!this.mapIsGeoreferenced())) {
        // 1 is as harmless as anything else in this situation
        return {metresPerPixel: 1, units: "pixels"};
      }
      size = rg2.getMapSize();
      pixels = rg2.utils.getDistanceBetweenPoints(0, 0, size.width, size.height);
      w = this.events[this.activeEventID].worldfile;
      lon1 = w.C;
      lat1 = w.F;
      lon2 = (w.A * size.width) + (w.B * size.height) + w.C;
      lat2 = (w.D * size.width) + (w.E * size.height) + w.F;
      return {metresPerPixel: rg2.utils.getLatLonDistance(lat1, lon1, lat2, lon2) / pixels, units: "metres"};
    },

    getWorldFile : function () {
      return this.events[this.activeEventID].worldfile;
    },

    formatEventsAsMenu : function () {
      var title, html, i;
      html = '';
      for (i = this.events.length - 1; i >= 0; i -= 1) {
        title = rg2.t(this.events[i].type) + ": " + this.events[i].date;
        if (this.events[i].worldfile.valid) {
          title += ": " + rg2.t("Map is georeferenced");
        }

        if (this.events[i].comment !== "") {
          title += ": " + this.events[i].comment;
        }
        html += '<li title="' + title + '" id=' + i + "><a href='#" + this.events[i].kartatid + "'>";
        if (this.events[i].comment !== "") {
          html += "<i class='fa fa-info-circle event-info-icon' id='info-" + i + "'></i>";
        }
        if (this.events[i].worldfile.valid) {
          html += "<i class='fa fa-globe event-info-icon' id='info-" + i + "'>&nbsp</i>";
        }
        html += this.events[i].date + ": " + this.events[i].name + "</a></li>";
      }
      return html;

    }
  };
  rg2.Events = Events;
}());

/*global rg2:false */
/*global console:false */
(function () {
  function GPSTrack() {
    this.lat = [];
    this.lon = [];
    this.startOffset = 0;
    this.baseX = [];
    this.baseY = [];
    this.handles = new rg2.Handles();
    this.savedBaseX = [];
    this.savedBaseY = [];
    this.fileLoaded = false;
    this.fileName = "";
    this.fileType = "";
    this.routeData = new rg2.RouteData();
    this.xml = "";
    this.autofitOffset = null;
  }


  GPSTrack.prototype = {

    Constructor : GPSTrack,

    initialiseGPS : function () {
      this.lat.length = 0;
      this.lon.length = 0;
      this.startOffset = 0;
      this.baseX.length = 0;
      this.baseY.length = 0;
      this.handles.deleteAllHandles();
      this.savedBaseX.length = 0;
      this.savedBaseY.length = 0;
      this.fileLoaded = false;
      this.routeData.x.length = 0;
      this.routeData.y.length = 0;
      this.routeData.time.length = 0;
    },

    uploadGPS : function (evt) {
      //console.log ("File" + evt.target.files[0].name);
      var reader, self;
      reader = new FileReader();
      this.fileName = evt.target.files[0].name;

      reader.onerror = function () {
        rg2.utils.showWarningDialog('GPS file problem', 'Unable to open GPS file.');
      };
      self = this;
      reader.onload = function (evt) {
        try {
          self.fileType = self.fileName.slice(-3).toLowerCase();
          if ((self.fileType !== 'gpx') && (self.fileType !== 'tcx')) {
            rg2.utils.showWarningDialog('GPS file problem', 'File type not recognised. Please check you have selected the correct file.');
            return;
          }
          //$("#rg2-load-gps-file").button('disable');
          self.xml = $.parseXML(evt.target.result);
          self.processGPSFile();
        } catch (err) {
          rg2.utils.showWarningDialog('GPS file problem', 'File is not valid XML. Please check you have selected the correct file.');
          return;
        }
      };
      // read the selected file
      reader.readAsText(evt.target.files[0]);
    },

    processGPSFile : function () {
      this.initialiseGPS();
      if (this.fileType === "gpx") {
        this.processGPX();
      } else {
        this.processTCX();
      }
      this.processGPSTrack();
    },

    processGPX : function () {
      var trksegs, trkpts, i, j;
      trksegs = this.xml.getElementsByTagName('trkseg');
      for (i = 0; i < trksegs.length; i += 1) {
        trkpts = trksegs[i].getElementsByTagName('trkpt');
        this.startOffset = this.getStartOffset(trkpts[0].getElementsByTagName('time')[0].textContent);
        for (j = 0; j < trkpts.length; j += 1) {
          this.lat.push(trkpts[j].getAttribute('lat'));
          this.lon.push(trkpts[j].getAttribute('lon'));
          this.routeData.time.push(this.getSecsFromTrackpoint(trkpts[j].getElementsByTagName('time')[0].textContent));
        }
      }
    },

    processTCX : function () {
      var trksegs, trkpts, i, j, position;
      trksegs = this.xml.getElementsByTagName('Track');
      for (i = 0; i < trksegs.length; i += 1) {
        trkpts = trksegs[i].getElementsByTagName('Trackpoint');
        this.startOffset = this.getStartOffset(trkpts[0].getElementsByTagName('Time')[0].textContent);
        for (j = 0; j < trkpts.length; j += 1) {
          // allow for <trackpoint> with no position: see #199
          if (trkpts[j].getElementsByTagName('Position').length > 0) {
            position = trkpts[j].getElementsByTagName('Position');
            this.lat.push(position[0].getElementsByTagName('LatitudeDegrees')[0].textContent);
            this.lon.push(position[0].getElementsByTagName('LongitudeDegrees')[0].textContent);
            this.routeData.time.push(this.getSecsFromTrackpoint(trkpts[j].getElementsByTagName('Time')[0].textContent));
          }
        }
      }
    },

    getStartOffset : function (timestring) {
      var secs;
      // needs to be set to midnight for supplied timestring
      // input is 2013-12-03T12:34:56Z (or 56.000Z)
      secs = parseInt(Date.parse(timestring.substr(0, 11) + "00:00:00Z") / 1000, 10);
      if (isNaN(secs)) {
        return 0;
      }
      return secs;
    },

    getSecsFromTrackpoint : function (timestring) {
      var secs;
      // input is 2013-12-03T12:34:56Z (or 56.000Z)
      // needs to offset from midnight to allow replays, and alos needs to handle date (and year!) rollover
      secs = parseInt(Date.parse(timestring) / 1000, 10);
      if (isNaN(secs)) {
        return 0;
      }
      return secs - this.startOffset;
    },

    processGPSTrack : function () {
      if (rg2.events.mapIsGeoreferenced()) {
        this.applyWorldFile();
        if (this.trackMatchesMapCoordinates()) {
          // everything OK so lock background to avoid accidental adjustment
          $('#btn-move-all').prop('checked', true);
        } else {
          // warn and fit to track
          rg2.utils.showWarningDialog('GPS file problem', 'Your GPS file does not match the map co-ordinates. Please check you have selected the correct file.');
          this.fitTrackInsideCourse();
        }
      } else {
        this.fitTrackInsideCourse();
      }
      // finished with lat and lon so they can go just in case
      this.lat.length = 0;
      this.lon.length = 0;
      this.expandToOneSecondInterval();
      this.baseX = this.routeData.x.slice(0);
      this.baseY = this.routeData.y.slice(0);
      this.addStartAndFinishHandles();
      this.fileLoaded = true;
      if (this.routeData.splits.length > 0) {
        $("#btn-autofit-gps").button("enable");
      }
      $("#btn-save-gps-route").button("enable");
      rg2.redraw(false);
    },

    adjustOffset : function (offset) {
      this.autofitOffset = offset;
      this.processGPSFile();
      this.autofitTrack();
    },


    expandToOneSecondInterval : function () {
      // convert to one second intervals to make what follows a bit easier since we can index x and y directly
      // time from GPX has already been converted to integer seconds so we don't need to worry about sub-seconds in the expansion
      // gets reset to 3 second intervals on server when saved
      var i, x, y, time, oldtime, nexttime, oldx, oldy, difftime, xpersec, ypersec, trk, secs;
      x = [];
      y = [];
      time = [];
      trk = this.routeData;
      oldtime = trk.time[0];
      oldx = trk.x[0];
      oldy = trk.y[0];
      x[0] = oldx;
      y[0] = oldy;
      time[0] = trk.time[0];
      nexttime = time[0] + 1;
      for (i = 1; i < trk.x.length; i += 1) {
        difftime = trk.time[i] - oldtime;
        // shouldn't have 0 intervals, but discard them if we do
        if (difftime > 0) {
          xpersec = (trk.x[i] - oldx) / difftime;
          ypersec = (trk.y[i] - oldy) / difftime;
          secs = 1;
          while (secs <= difftime) {
            x.push(oldx + (xpersec * secs));
            y.push(oldy + (ypersec * secs));
            // 
            time.push(nexttime);
            nexttime += 1;
            secs += 1;
          }
          oldx = trk.x[i];
          oldy = trk.y[i];
          oldtime = nexttime - 1;
        }
      }
      this.routeData.x = x.slice(0);
      this.routeData.y = y.slice(0);
      this.routeData.time = time.slice(0);
    },

    autofitTrack : function () {
      // fits a GPS track to the course based on split times at control locations 
      var i, split;
      // unlock map to allow adjustment
      $('#btn-move-all').prop('checked', false);
      this.handles.deleteAllHandles();
      this.addStartAndFinishHandles();
      if (this.autofitOffset === null) {
        this.autofitOffset = this.getOffset();
        rg2.ui.setAutofitSpinner(this.autofitOffset);
      }
      // adjust for each control in turn
      for (i = 1; i < (this.routeData.splits.length - 1); i += 1) {
        // move track to control location
        split = this.routeData.splits[i] + this.autofitOffset;
        if ((split < this.baseX.length) && (split >= 0)) {
          // add handle at control on track
          this.handles.addHandle(this.routeData.x[split], this.routeData.y[split], split);
          // drag handle to correct place on map
          rg2.drawing.adjustTrack({x: this.routeData.x[split], y: this.routeData.y[split]}, {x: this.routeData.controlx[i], y: this.routeData.controly[i]});
          // lock handle at control
          this.handles.lockHandleByTime(split);
          // rebaseline everything
          this.baseX = this.routeData.x.slice(0);
          this.baseY = this.routeData.y.slice(0);
          this.handles.rebaselineXY();
        }
      }
      $("#btn-autofit-gps").button("disable");
      $("#btn-undo-gps-adjust").button("enable");
      rg2.redraw(false);
    },

    getOffset : function () {
      // calculates an offset to split times based on lowest average speed summed across all controls
      var i, j, split, speedAverage, speedAtControl, speedExtract, range, bestGuess, offset;
      speedAverage = this.getSpeedAverage();
      speedAtControl = [];
      // range of seconds either side to check for "minimum speed" at control
      range = 10;
      for (i = 0; i <= (2 * range); i += 1) {
        speedAtControl[i] = 0;
      }
      for (i = 1; i < (this.routeData.splits.length - 1); i += 1) {
        split = this.routeData.splits[i];
        if ((split >= range) && ((split + range) < speedAverage.length)) {
          speedExtract = speedAverage.slice(split - range, split + range + 1);
          for (j = 0; j <= (2 * range); j += 1) {
            speedAtControl[j] += speedExtract[j];
          }
        }
      }
      bestGuess = range; // in the middle of the range
      speedAtControl[bestGuess] = speedAtControl[bestGuess] * 0.7; // higher rate for initial middle range value
      for (i = 0; i < speedAtControl.length; i += 1) {
        if (speedAtControl[i] < speedAtControl[bestGuess]) {
          bestGuess = i;
        }
      }
      // convert index in bestGuess into offset in x, y, time
      offset = bestGuess - range;
      console.log("Offset = " + offset);
      return offset;
    },

    getSpeedAverage : function () {
      var i, speed, speedAverage;
      speed = [];
      speedAverage = [];
      speed[0] = 0;
      for (i = 1; i < this.routeData.x.length; i += 1) {
        // stored at second intervals so don't need to divide by time'
        speed[i] = rg2.utils.getDistanceBetweenPoints(this.routeData.x[i], this.routeData.y[i], this.routeData.x[i - 1], this.routeData.y[i - 1]);
      }
      // average over 3 seconds to smooth things out
      for (i = 1; i < this.routeData.x.length - 1; i += 1) {
        speedAverage[i] = (speed[i - 1] + speed[i] + speed[i + 1]) / 3;
      }
      // not really worried about these but set to a sensible value
      speedAverage[0] = speed[0];
      speedAverage[this.routeData.x.length - 1] = speed[this.routeData.x.length - 1];
      return speedAverage;
    },

    trackMatchesMapCoordinates : function () {
      var minX, maxX, minY, maxY, mapSize;
      // find bounding box for track
      minX = Math.min.apply(Math, this.routeData.x);
      maxX = Math.max.apply(Math, this.routeData.x);
      minY = Math.min.apply(Math, this.routeData.y);
      maxY = Math.max.apply(Math, this.routeData.y);
      mapSize = rg2.getMapSize();
      // check we are somewhere on the map
      return ((maxX > 0) && (minX < mapSize.width) && (minY < mapSize.height) && (maxY > 0));
    },

    applyWorldFile : function () {
      var i, worldFile;
      // translate lat/lon to x,y based on world file info: see http://en.wikipedia.org/wiki/World_file
      worldFile = rg2.events.getWorldFile();
      for (i = 0; i < this.lat.length; i += 1) {
        this.routeData.x[i] = Math.round(((worldFile.E * this.lon[i]) - (worldFile.B * this.lat[i]) + worldFile.xCorrection) / worldFile.AEDB);
        this.routeData.y[i] = Math.round(((-1 * worldFile.D * this.lon[i]) + (worldFile.A * this.lat[i]) + worldFile.yCorrection) / worldFile.AEDB);
      }
    },

    addStartAndFinishHandles : function () {
      // add handles at start and finish of route
      this.handles.addHandle(this.baseX[0], this.baseY[0], 0);
      this.handles.addHandle(this.baseX[this.baseX.length - 1], this.baseY[this.baseY.length - 1], this.baseY.length - 1);
    },

    fitTrackInsideCourse : function () {
      // fit track to within limits of course
      // find bounding box for track
      var i, latLon, controlXY, scaleX, scaleY, deltaX, deltaY;
      latLon = this.getLatLonInfo();
      controlXY = this.getControlInfo();

      // scale GPS track to within bounding box of controls: a reasonable start
      scaleX = (controlXY.maxX - controlXY.minX) / (latLon.maxLon - latLon.minLon);
      scaleY = (controlXY.maxY - controlXY.minY) / (latLon.maxLat - latLon.minLat);
      // don't want to skew track so scale needs to be equal in each direction
      // so we need to account for differences between a degree of latitude and longitude
      if (scaleX > scaleY) {
        // pix/lat = pix/lon * m/lat * lon/m
        scaleY = scaleX * latLon.latCorrection / latLon.lonCorrection;
      } else {
        // pix/lon = pix/lat * m/lon * lat/m
        scaleX = scaleY * latLon.lonCorrection / latLon.latCorrection;
      }
      // extra offset to put start of track at start location
      this.routeData.x[0] = ((this.lon[0] - latLon.minLon) * scaleX) + controlXY.minX;
      this.routeData.y[0] = (-1 * (this.lat[0] - latLon.maxLat) * scaleY) + controlXY.minY;

      // translate lat/lon to x,y
      deltaX = controlXY.minX - (this.routeData.x[0] - controlXY.x[0]);
      deltaY = controlXY.minY - (this.routeData.y[0] - controlXY.y[0]);

      for (i = 0; i < this.lat.length; i += 1) {
        this.routeData.x[i] = ((this.lon[i] - latLon.minLon) * scaleX) + deltaX;
        this.routeData.y[i] = (-1 * (this.lat[i] - latLon.maxLat) * scaleY) + deltaY;
      }
    },

    getLatLonInfo : function () {
      var latLon;
      latLon = {};
      latLon.maxLat = Math.max.apply(Math, this.lat);
      latLon.maxLon = Math.max.apply(Math, this.lon);
      latLon.minLat = Math.min.apply(Math, this.lat);
      latLon.minLon = Math.min.apply(Math, this.lon);
      latLon.lonCorrection = rg2.utils.getLatLonDistance(latLon.minLat, latLon.maxLon, latLon.minLat, latLon.minLon) / (latLon.maxLon - latLon.minLon);
      latLon.latCorrection = rg2.utils.getLatLonDistance(latLon.minLat, latLon.minLon, latLon.maxLat, latLon.minLon) / (latLon.maxLat - latLon.minLat);
      return latLon;
    },

    getControlInfo : function () {
      var controlXY, size;
      controlXY = rg2.drawing.getControlXY();
      controlXY.minX = Math.min.apply(Math, controlXY.x);
      controlXY.maxX = Math.max.apply(Math, controlXY.x);
      controlXY.minY = Math.min.apply(Math, controlXY.y);
      controlXY.maxY = Math.max.apply(Math, controlXY.y);

      // issue #60: allow for no controls or just a few in a small area
      // 100 is an arbitrary but sensible cut-off
      if (((controlXY.maxY - controlXY.minY) < 100) || ((controlXY.maxX - controlXY.minX) < 100)) {
        controlXY.minX = 0;
        controlXY.minY = 0;
        size = rg2.getMapSize();
        controlXY.maxX = size.width;
        controlXY.maxY = size.height;
      }
      //console.log (minControlX, maxControlX, minControlY, maxControlY);
      return controlXY;
    }
  };
  rg2.GPSTrack = GPSTrack;
}());
/*global rg2:false */
(function () {
  function Handle(x, y, time, index) {
    // current position of handles
    this.x = x;
    this.y = y;
    // positions before start of adjustment
    this.basex = x;
    this.basey = y;
    // saved positions to allow undo
    this.undox = x;
    this.undoy = y;
    this.locked = false;
    // not really a time: instead an index into the GPX data
    // this is "time" for 1s intervals, but not if in a different recording mode
    this.time = time;
    this.index = index;
  }

  function Handles() {
    // array of handles used to adjust GPS tracks
    // maintained in time order which means they are also in order along the GPS track
    this.handles = [];
  }

  Handles.prototype = {
    Constructor : Handles,

    addHandle : function (x, y, time) {
      this.handles.push(new Handle(x, y, time, this.handles.length));
      this.handles.sort(function (a, b) {
        return a.time - b.time;
      });
      this.renumberHandles();
    },

    deleteHandle : function (index) {
      if ((index === 0) || (index === this.handles.length - 1)) {
        // can't delete start or finish
        return;
      }
      this.handles.splice(index, 1);
      this.renumberHandles();
    },

    renumberHandles : function () {
      var i;
      for (i = 0; i < this.handles.length; i += 1) {
        this.handles[i].index = i;
      }
    },

    lockHandle : function (index) {
      this.handles[index].locked = true;
    },

    lockHandleByTime : function (time) {
      var i;
      for (i = 0; i < this.handles.length; i += 1) {
        if (this.handles[i].time === time) {
          this.handles[i].locked = true;
        }
      }
    },

    unlockAllHandles : function () {
      var i;
      for (i = 0; i < this.handles.length; i += 1) {
        this.handles[i].locked = false;
      }
    },

    unlockHandle : function (index) {
      this.handles[index].locked = false;
    },

    handlesLocked : function () {
      var i, count;
      count = 0;
      for (i = 0; i < this.handles.length; i += 1) {
        if (this.handles[i].locked) {
          count += 1;
        }
      }
      return count;
    },

    deleteAllHandles : function () {
      this.handles.length = 0;
    },

    rebaselineXY : function () {
      // save new locations at end of drag
      this.copyHandleFields('', 'base');
    },

    saveForUndo : function () {
      this.copyHandleFields('base', 'undo');
    },

    undo : function () {
      // undo last move: reset to saved values
      this.copyHandleFields('undo', 'base');
      this.copyHandleFields('undo', '');
    },

    copyHandleFields : function (from, to) {
      var i;
      for (i = 0; i < this.handles.length; i += 1) {
        this.handles[i][to + 'x'] = this.handles[i][from + 'x'];
        this.handles[i][to + 'y'] = this.handles[i][from + 'y'];
      }
    },

    getStartHandle : function () {
      // always the first entry
      return this.handles[0];
    },

    getFinishHandle : function () {
      // always the last entry
      return this.handles[this.handles.length - 1];
    },

    getHandleClicked : function (pt) {
      // find if the click was on an existing handle: return handle object or undefined
      // basex and basey are handle locations at the start of the drag which is what we are interested in
      var i, distance;
      for (i = 0; i < this.handles.length; i += 1) {
        distance = rg2.utils.getDistanceBetweenPoints(pt.x, pt.y, this.handles[i].basex, this.handles[i].basey);
        if (distance <= rg2.config.HANDLE_DOT_RADIUS) {
          return this.handles[i];
        }
      }
      return undefined;
    },

    getEarliestLockedHandle : function () {
      // called to find earliest locked handle: we already know at least one is locked
      var i;
      for (i = 0; i < this.handles.length; i += 1) {
        if (this.handles[i].locked) {
          return this.handles[i];
        }
      }
    },

    getLatestLockedHandle : function () {
      // called to find latest locked handle: we already know at least one is locked
      var i;
      for (i = this.handles.length - 1; i > 0; i -= 1) {
        if (this.handles[i].locked) {
          return this.handles[i];
        }
      }
    },

    getPreviousLockedHandle : function (handle) {
      // called to find previous locked handle: we already know we are between locked handles
      var i;
      for (i = handle.index - 1; i >= 0; i -= 1) {
        if (this.handles[i].locked) {
          return this.handles[i];
        }
      }
    },

    getNextLockedHandle : function (handle) {
      // called to find next locked handle: we already know we are between locked handles
      var i;
      for (i = handle.index + 1; i < this.handles.length; i += 1) {
        if (this.handles[i].locked) {
          return this.handles[i];
        }
      }
    },

    getSingleLockedHandle : function () {
    // called when we know there is only one locked handle, so we can reuse another function
      return this.getEarliestLockedHandle();
    },

    dragHandles : function (dx, dy) {
      var i;
      for (i = 0; i < this.handles.length; i += 1) {
        this.handles[i].x = this.handles[i].basex + dx;
        this.handles[i].y = this.handles[i].basey + dy;
      }
    },

    drawHandles : function () {
      var i;
      for (i = 0; i < this.handles.length; i += 1) {
        rg2.ctx.lineWidth = 1;
        if (this.handles[i].locked === true) {
          rg2.ctx.fillStyle = rg2.config.RED_30;
          rg2.ctx.strokeStyle = rg2.config.RED;
        } else {
          rg2.ctx.fillStyle = rg2.config.GREEN_30;
          rg2.ctx.strokeStyle = rg2.config.GREEN;
        }
        rg2.ctx.beginPath();
        rg2.ctx.arc(this.handles[i].x, this.handles[i].y, rg2.config.HANDLE_DOT_RADIUS, 0, 2 * Math.PI, false);
        rg2.ctx.fill();
        rg2.ctx.stroke();
      }
    },

    adjustThisHandle : function (handle, fromTime, toTime) {
      if (!handle.locked && (handle.time >= fromTime) && (handle.time <= toTime)) {
        return true;
      }
      return false;
    },

    scaleAndRotate : function (lockedHandle, scale, angle, fromTime, toTime) {
      // scale and rotate handles around a single fixed point
      // times determine which side of locked point (or both) this applies to
      var i, pt;
      for (i = 0; i < this.handles.length; i += 1) {
        if (this.adjustThisHandle(this.handles[i], fromTime, toTime)) {
          pt = rg2.utils.rotatePoint(this.handles[i].basex - lockedHandle.basex, this.handles[i].basey - lockedHandle.basey, angle);
          this.handles[i].x = (pt.x * scale) + lockedHandle.basex;
          this.handles[i].y = (pt.y * scale) + lockedHandle.basey;
        }
      }
    },

    scaleAndRotateBetweenLockedPoints : function (lockedHandle, a, scale, angle, reverseAngle, fromTime, toTime) {
      var i, pt, pt2;
      // scale/rotate/shear around two locked points
      for (i = 0; i < this.handles.length; i += 1) {
        if (this.adjustThisHandle(this.handles[i], fromTime, toTime)) {
          // rotate to give locked points as x-axis
          pt = rg2.utils.rotatePoint(this.handles[i].basex - lockedHandle.basex, this.handles[i].basey - lockedHandle.basey, angle);
          // shear/stretch
          pt2 = rg2.utils.rotatePoint(pt.x + (pt.y * a), pt.y * scale, reverseAngle);
          this.handles[i].x = pt2.x + lockedHandle.basex;
          this.handles[i].y = pt2.y + lockedHandle.basey;
        }
      }
    }
  };
  rg2.Handles = Handles;
}());

/*global rg2:false */
/*global rg2Config:false */
(function () {
  function Georef(description, name, params) {
    this.description = description;
    this.name = name;
    this.params = params;
  }

  function Georefs() {
    this.georefsystems = [];
    this.georefsystems.push(new Georef("Not georeferenced", "none", ""));
    this.georefsystems.push(new Georef("GB National Grid", "EPSG:27700", "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs"));
    this.georefsystems.push(new Georef("Google EPSG:900913", "EPSG:900913", "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs"));
    if (rg2Config.epsg_code !== undefined) {
      this.georefsystems.push(new Georef(rg2Config.epsg_code, rg2Config.epsg_code.replace(" ", ""), rg2Config.epsg_params));
      this.defaultGeorefVal = rg2Config.epsg_code.replace(" ", "");
    } else {
      this.defaultGeorefVal = "EPSG:27700";
    }
  }

  Georefs.prototype = {
    Constructor : Georefs,

    getDefault : function () {
      return this.defaultGeorefVal;
    },

    getDropdown : function (dropdown) {
      var i;
      for (i = 0; i < this.georefsystems.length; i += 1) {
        dropdown.options.add(rg2.utils.generateOption(this.georefsystems[i].name, this.georefsystems[i].description));
      }
      return dropdown;
    },

    getParams : function (name) {
      var i, params;
      params = "";
      for (i = 0; i < this.georefsystems.length; i += 1) {
        if (this.georefsystems[i].name === name) {
          return this.georefsystems[i].params;
        }
      }
      return params;
    }
  };

  function Worldfile(wf) {
    // see http://en.wikipedia.org/wiki/World_file
    if (wf.A === undefined) {
      this.valid = false;
      this.A = 0;
      this.B = 0;
      this.C = 0;
      this.D = 0;
      this.E = 0;
      this.F = 0;
    } else {
      this.A = parseFloat(wf.A);
      this.B = parseFloat(wf.B);
      this.C = parseFloat(wf.C);
      this.D = parseFloat(wf.D);
      this.E = parseFloat(wf.E);
      this.F = parseFloat(wf.F);
      this.valid = true;
      // helps make later calculations easier
      this.AEDB = (wf.A * wf.E) - (wf.D * wf.B);
      this.xCorrection = (wf.B * wf.F) - (wf.E * wf.C);
      this.yCorrection = (wf.D * wf.C) - (wf.A * wf.F);
    }
  }

  Worldfile.prototype = {
    Constructor : Worldfile,

    // use worldfile to generate X value
    getX : function (lng, lat) {
      return Math.round(((this.E * lng) - (this.B * lat) + this.xCorrection) / this.AEDB);
    },

    // use worldfile to generate y value
    getY : function (lng, lat) {
      return Math.round(((-1 * this.D * lng) + (this.A * lat) + this.yCorrection) / this.AEDB);
    },

    // use worldfile to generate longitude
    getLon : function (x, y) {
      return (this.A * x) + (this.B * y) + this.C;
    },

    // use worldfile to generate latitude
    getLat : function (x, y) {
      return (this.D * x) + (this.E * y) + this.F;
    }

  };

  function Map(data) {
    if (data !== undefined) {
      // existing map from database
      this.mapid = data.mapid;
      this.name = data.name;
      this.copyright = data.copyright;
      // worldfile for GPS to map image conversion (for GPS files)
      this.worldfile = new Worldfile(data);
      // worldfile for local co-ords to map image conversion (for georeferenced courses)
      this.localworldfile = new Worldfile({A: data.localA, B: data.localB, C: data.localC, D: data.localD, E: data.localE, F: data.localF});
      if (data.mapfilename === undefined) {
        this.mapfilename = this.mapid + '.' + 'jpg';
      } else {
        this.mapfilename = data.mapfilename;
      }

    } else {
      // new map to be added
      this.mapid = 0;
      this.name = "";
      this.copyright = "";
      this.worldfile = new Worldfile(0);
      this.localworldfile = new Worldfile(0);
    }
    this.xpx = [];
    this.ypx = [];
    this.lat = [];
    this.lon = [];
  }
  rg2.Georefs = Georefs;
  rg2.Worldfile = Worldfile;
  rg2.Map = Map;
}());

// Avoid `console` errors in browsers that lack a console.
( function() {
    var method;
    var noop = function() {
    };
    var methods = ['assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error', 'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log', 'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd', 'timeStamp', 'trace', 'warn'];
    var length = methods.length;
    var console = (window.console = window.console || {});

    while (length) {
      length -= 1;
      method = methods[length];

      // Only stub undefined methods.
      if (!console[method]) {
        console[method] = noop;
      }
    }
  }());
/*global rg2:false */
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
    this.position = data.position;
    this.status = data.status;
    // get round iconv problem in API for now: unescape special characters to get sensible text
    if (data.comments) {
      this.comments = rg2.he.decode(data.comments);
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
    if (isScoreEvent) {
      // save control locations for score course result
      this.scorex = scorex;
      this.scorey = scorey;
      this.scorecodes = scorecodes;
    }
    this.initialiseTrack(data);
  }


  Result.prototype = {
    Constructor : Result,

    initialiseTrack : function (data) {
      var info;
      this.cumulativeDistance = [];
      this.legpos = [];
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

    putTrackOnDisplay : function () {
      if (this.hasValidTrack) {
        this.trackColour = rg2.colours.getNextColour();
        this.displayTrack = true;
      }
    },

    removeTrackFromDisplay : function () {
      if (this.hasValidTrack) {
        this.trackColour = null;
        this.displayTrack = false;
      }
    },

    addTrack : function (data, format) {
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
        if (format === rg2.config.EVENT_WITHOUT_RESULTS) {
          trackOK = this.expandTrackWithNoSplits();
        } else {
          trackOK = this.expandNormalTrack();
        }
      }
      if (trackOK) {
        rg2.courses.incrementTracksCount(this.courseid);
      }
    },

    drawTrack : function () {
      var i, l, oldx, oldy, stopCount;
      if (this.displayTrack) {
        if (this.isGPSTrack && rg2.options.showGPSSpeed && (this.speedColour.length === 0)) {
          // set speed colours if we haven't done it yet
          this.setSpeedColours();
        }
        rg2.ctx.lineCap = "round";
        rg2.ctx.lineJoin = "round";
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

    drawScoreCourse : function () {
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
        rg2.courses.drawLinesBetweenControls({x: this.scorex, y: this.scorey}, angle, this.courseid, opt);
        for (i = 1; i < (this.scorex.length - 1); i += 1) {
          rg2.controls.drawSingleControl(this.scorex[i], this.scorey[i], i, Math.PI * 0.25, opt);
        }
        rg2.controls.drawFinish(this.scorex[this.scorex.length - 1], this.scorey[this.scorey.length - 1], "", opt);
      }
    },

    expandNormalTrack : function () {
      var course;
      // allow for getting two tracks for same result: should have been filtered in API...
      this.xysecs.length = 0;
      this.cumulativeDistance.length = 0;
      // add times and distances at each position
      this.xysecs[0] = 0;
      this.cumulativeDistance[0] = 0;
      // get course details
      course = {};
      // each person has their own defined score course
      if (this.isScoreEvent) {
        course.x = this.scorex;
        course.y = this.scorey;
      } else {
        course.x = rg2.courses.getCourseDetails(this.courseid).x;
        course.y = rg2.courses.getCourseDetails(this.courseid).y;
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
      var nextcontrol, nextx, nexty, dist, oldx, oldy, i, x, y, previouscontrolindex;
      nextcontrol = 1;
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
        this.cumulativeDistance[i] = Math.round(dist);
        oldx = x;
        oldy = y;
        // track ends at control
        if ((nextx === x) && (nexty === y)) {
          this.xysecs[i] = this.splits[nextcontrol];
          this.addInterpolatedTimes(previouscontrolindex, i);
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
    },

    expandTrackWithNoSplits : function () {
      // based on ExpandNormalTrack, but deals with event format 2: no results
      // this means we have a course and a finish time but no split times
      var totaltime, currenttime, course, nextcontrol, nextx, nexty, lastx, lasty, i, x, y, moved, previouscontrolindex, dist, totaldist, oldx, oldy;
      this.xysecs.length = 0;
      this.cumulativeDistance.length = 0;

      // only have finish time, which is in [1] at present
      totaltime = this.splits[1];
      currenttime = 0;
      this.xysecs[0] = 0;
      this.cumulativeDistance[0] = 0;

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
      dist = 0;
      previouscontrolindex = 0;
      totaldist = this.calculateTotalTrackLength();
      // read through track to generate splits
      x = 0;
      y = 0;
      moved = false;
      oldx = this.trackx[0];
      oldy = this.tracky[0];
      for (i = 1; i < this.trackx.length; i += 1) {
        x = this.trackx[i];
        y = this.tracky[i];
        // cope with routes that have start and finish in same place, and where the first point in a route is a repeat of the start
        if ((x !== this.trackx[0]) || (y !== this.tracky[0])) {
          moved = true;
        }
        dist += rg2.utils.getDistanceBetweenPoints(x, y, oldx, oldy);
        this.cumulativeDistance[i] = Math.round(dist);
        oldx = x;
        oldy = y;
        // track ends at control, as long as we have moved away from the start
        if ((nextx === x) && (nexty === y) && moved) {
          currenttime = parseInt((dist / totaldist) * totaltime, 10);
          this.xysecs[i] = currenttime;
          this.splits[nextcontrol] = currenttime;
          this.addInterpolatedTimes(previouscontrolindex, i);
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

    calculateTotalTrackLength : function () {
      // read through track to find total distance
      var i, oldx, oldy, totaldist;
      totaldist = 0;
      oldx = this.trackx[0];
      oldy = this.tracky[0];
      for (i = 1; i < this.trackx.length; i += 1) {
        totaldist += rg2.utils.getDistanceBetweenPoints(this.trackx[i], this.tracky[i], oldx, oldy);
        oldx = this.trackx[i];
        oldy = this.tracky[i];
      }
      return totaldist;
    },

    addInterpolatedTimes : function (startindex, endindex) {
      // add interpolated time at each point based on cumulative distance; this assumes uniform speed...
      var oldt, deltat, olddist, deltadist, i;
      oldt = this.xysecs[startindex];
      deltat = this.xysecs[endindex] - oldt;
      olddist = this.cumulativeDistance[startindex];
      deltadist = this.cumulativeDistance[endindex] - olddist;
      for (i = startindex; i <= endindex; i += 1) {
        this.xysecs[i] = oldt + Math.round(((this.cumulativeDistance[i] - olddist) * deltat / deltadist));
      }
    },

    expandGPSTrack : function () {
      var t, dist, oldx, oldy, delta, len;
      dist = 0;
      oldx = this.trackx[0];
      oldy = this.tracky[0];
      len = this.trackx.length;
      // in theory we get one point every three seconds
      for (t = 0; t < len; t += 1) {
        this.xysecs[t] = 3 * t;
        delta = rg2.utils.getDistanceBetweenPoints(this.trackx[t], this.tracky[t], oldx, oldy);
        dist += delta;
        this.cumulativeDistance[t] = Math.round(dist);
        oldx = this.trackx[t];
        oldy = this.tracky[t];
      }
      // colours now set the first time we try to draw the track: major time saving on initial event load
      this.setSpeedColours.length = 0;
      this.hasValidTrack = true;
      return this.hasValidTrack;
    },

    setSpeedColours : function () {
      var t, oldx, oldy, delta, maxSpeed, oldDelta, sum, len;
      oldx = this.trackx[0];
      oldy = this.tracky[0];
      maxSpeed = 0;
      oldDelta = 0;
      len = this.trackx.length;
      //calculate "speed" at each point as sum of distance travelled for two points
      for (t = 0; t < len; t += 1) {
        delta = rg2.utils.getDistanceBetweenPoints(this.trackx[t], this.tracky[t], oldx, oldy);
        sum = delta + oldDelta;
        if (maxSpeed < sum) {
          maxSpeed = sum;
        }
        this.speedColour[t] = sum;
        oldx = this.trackx[t];
        oldy = this.tracky[t];
        oldDelta = delta;
      }
      this.mapSpeedColours(maxSpeed);

    },

    mapSpeedColours : function (maxspeed) {
      // converts speed to RGB value
      var i, red, green, halfmax;
      //console.log("'Max speed = " + maxspeed);
      halfmax = maxspeed / 2;
      // speedColour comes in with speeds at each point and gets updated to the associated colour
      for (i = 1; i < this.speedColour.length; i += 1) {
        if (this.speedColour[i] > halfmax) {
          // fade green to orange
          red = Math.round(255 * (this.speedColour[i] - halfmax) / halfmax);
          green = 255;
        } else {
          // fade orange to red
          green = Math.round(255 * this.speedColour[i] / halfmax);
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

/*global rg2:false */
(function () {
  function ResultParser(evt, fileFormat) {
    var parsedResults;
    this.results = [];
    this.resultCourses = [];
    this.valid = true;
    parsedResults = this.processResults(evt, fileFormat);
    this.results = parsedResults.results;
    this.valid = parsedResults.valid;
    this.getCoursesFromResults();
    return {results: this.results, resultCourses: this.resultCourses, valid: this.valid};
  }

  ResultParser.prototype = {

    Constructor : ResultParser,

    processResults : function (evt, fileFormat) {
      switch (fileFormat) {
      case 'CSV':
        return (new rg2.ResultParserCSV(evt.target.result));
      case 'XML':
        return this.processResultsXML(evt.target.result);
      default:
        // shouldn't ever get here but...
        rg2.utils.showWarningDialog("File type error", "Results file type is not recognised. Please select a valid file.");
        return {results: [], valid: false};
      }
    },

    getCoursesFromResults : function () {
      // creates an array of all course names in the results file
      var i, j, found;
      for (i = 0; i < this.results.length; i += 1) {
        // have we already found this course?
        found = false;
        for (j = 0; j < this.resultCourses.length; j += 1) {
          if (this.resultCourses[j].course === this.results[i].course) {
            found = true;
            break;
          }
        }
        if (!found) {
          // courseid is set later when mapping is known
          this.resultCourses.push({course: this.results[i].course, courseid: rg2.config.DO_NOT_SAVE_COURSE});
        }
      }
    },

    processResultsXML : function (rawXML) {
      var xml, version, nodelist;
      version = "";
      try {
        xml = $.parseXML(rawXML);
        nodelist = xml.getElementsByTagName('ResultList');
        if (nodelist.length === 0) {
          rg2.utils.showWarningDialog("XML file error", "File is not a valid XML results file. ResultList element missing.");
          return {results: [], valid: false};
        }
        // test for IOF Version 2
        version = rg2.utils.extractAttributeZero(xml.getElementsByTagName("IOFVersion"), "version", "");
        if (version === "") {
          // test for IOF Version 3
          version = rg2.utils.extractAttributeZero(xml.getElementsByTagName('ResultList'), "iofVersion", "");
        }
      } catch (err) {
        rg2.utils.showWarningDialog("XML file error", "File is not a valid XML results file.");
        return {results: [], valid: false};
      }

      switch (version) {
      case "2.0.3":
        return (new rg2.ResultParserIOFV2(xml));
      case "3.0":
        return (new rg2.ResultParserIOFV3(xml));
      default:
        rg2.utils.showWarningDialog("XML file error", 'Invalid IOF file format. Version ' + version + ' not supported.');
        return {results: [], valid: false};
      }
    }
  };
  rg2.ResultParser = ResultParser;
}());
/*global rg2:false */
(function () {
  function ResultParserCSV(rawCSV) {
    this.results = [];
    this.CSVFormat = {};
    this.separator = "";
    this.valid = true;
    this.processResultsCSV(rawCSV);
    return {results: this.results, valid: this.valid};
  }

  ResultParserCSV.prototype = {

    Constructor : ResultParserCSV,

    processResultsCSV : function (rawCSV) {
      var rows, commas, semicolons;
      rows = rawCSV.split(/[\r\n|\n]+/);
      // try and work out what the separator is
      commas = rows[0].split(',').length - 1;
      semicolons = rows[0].split(';').length - 1;
      if (commas > semicolons) {
        this.separator = ',';
      } else {
        this.separator = ";";
      }
      // Spklasse has two items on first row, SI CSV has a lot more...
      if (rows[0].split(this.separator).length === 2) {
        this.processSpklasseCSVResults(rows);
      } else {
        this.getCSVFormat(rows[0]);
        this.processCSVResults(rows);
      }
    },

    // rows: array of raw lines from SI results csv file
    processCSVResults : function (rows) {
      var i, fields;
      // extract what we need: first row is headers so ignore
      for (i = 1; i < rows.length; i += 1) {
        fields = rows[i].split(this.separator);
        // need at least this many fields...
        if (fields.length >= this.CSVFormat.FIRST_SPLIT_IDX) {
          this.results.push(this.extractSingleCSVResult(fields));
        }
      }
    },

    getPosition : function (fields) {
      var position;
      position = parseInt(fields[this.CSVFormat.POSITION_IDX], 10);
      if (isNaN(position)) {
        position = '';
      }
      return position;
    },

    extractSingleCSVResult: function (fields) {
      var result, info;
      result = {};
      result.chipid = fields[this.CSVFormat.CHIP_IDX];
      // delete quotes from CSV file: output from MERCS
      result.name = (fields[this.CSVFormat.FIRST_NAME_IDX] + " " + fields[this.CSVFormat.SURNAME_IDX]).trim().replace(/\"/g, '');
      result.dbid = (fields[this.CSVFormat.DB_IDX] + "__" + result.name).replace(/\"/g, '');
      result.starttime = rg2.utils.getSecsFromHHMMSS(fields[this.CSVFormat.START_TIME_IDX]);
      result.time = fields[this.CSVFormat.TOTAL_TIME_IDX];
      result.position = this.getPosition(fields);
      result.status = this.getSICSVStatus(fields[this.CSVFormat.NC_IDX], fields[this.CSVFormat.CLASSIFIER_IDX]);
      result.club = fields[this.CSVFormat.CLUB_IDX].trim().replace(/\"/g, '');
      result.course = fields[this.CSVFormat.COURSE_IDX];
      result.controls = parseInt(fields[this.CSVFormat.NUM_CONTROLS_IDX], 10);
      info = this.extractSISplits(fields, result.controls);
      result.splits = info.splits;
      // add finish split
      if (result.splits !== "") {
        result.splits += ";";
      }
      result.splits += rg2.utils.getSecsFromHHMMSS(result.time);
      result.codes = info.codes;
      return result;
    },

    extractSISplits : function (fields, controls) {
      var i, result, nextcode, nextsplit;
      nextsplit = this.CSVFormat.FIRST_SPLIT_IDX;
      nextcode = this.CSVFormat.FIRST_CODE_IDX;
      result = {};
      result.splits = "";
      result.codes = [];
      for (i = 0; i < controls; i += 1) {
        if (fields[nextcode]) {
          if (i > 0) {
            result.splits += ";";
          }
          result.codes[i] = fields[nextcode];
          result.splits += rg2.utils.getSecsFromHHMMSS(fields[nextsplit]);
        }
        nextsplit += this.CSVFormat.STEP;
        nextcode += this.CSVFormat.STEP;
      }
      return {splits: result.splits, codes: result.codes};
    },

    getCSVFormat : function (headers) {
      // not a pretty function but it should allow some non-standard CSV formats to be processed such as OEScore output
      var titles, values, fields, i, j, found;
      titles = ['SI card', 'Database Id', 'Surname', 'First name', 'nc', 'Start', 'Time', 'Classifier', 'City', 'Short', 'Course', 'Course controls', 'Pl', 'Start punch', 'Control1', 'Punch1', 'Control2'];
      values = [];
      fields = headers.split(this.separator);
      for (i = 0; i < titles.length; i += 1) {
        found = false;
        for (j = 0; j < fields.length; j += 1) {
          if (fields[j] === titles[i]) {
            values[i] = j;
            found = true;
            break;
          }
          // horrid hacks to handle semi-compliant files
          if ('SI card' === titles[i]) {
            if (('Chipno' === fields[j]) || ('SIcard' === fields[j]) || ('Database Id' === fields[j])) {
              values[i] = j;
              found = true;
              break;
            }
          }
          if ('nc' === titles[i]) {
            if ('Classifier' === fields[j]) {
              values[i] = j;
              found = true;
              break;
            }
          }
          if ('City' === titles[i]) {
            if ('Club' === fields[j]) {
              values[i] = j;
              found = true;
              break;
            }
          }
          if ('Pl' === titles[i]) {
            if ('Place' === fields[j]) {
              values[i] = j;
              found = true;
              break;
            }
          }
        }
        if (!found) {
          // stop if we didn't find what we needed
          break;
        }
      }

      if (!found) {
        // default to BOF CSV format
        values = [1, 2, 3, 4, 8, 9, 11, 12, 15, 18, 39, 42, 43, 44, 46, 47, 2];
      }
      this.setCSVFormat(values);
    },

    setCSVFormat : function (values) {
      this.CSVFormat.CHIP_IDX = values[0];
      this.CSVFormat.DB_IDX = values[1];
      this.CSVFormat.SURNAME_IDX = values[2];
      this.CSVFormat.FIRST_NAME_IDX = values[3];
      this.CSVFormat.NC_IDX = values[4];
      this.CSVFormat.START_TIME_IDX = values[5];
      this.CSVFormat.TOTAL_TIME_IDX = values[6];
      this.CSVFormat.CLASSIFIER_IDX = values[7];
      this.CSVFormat.CLUB_IDX = values[8];
      this.CSVFormat.CLASS_IDX = values[9];
      this.CSVFormat.COURSE_IDX = values[10];
      this.CSVFormat.NUM_CONTROLS_IDX = values[11];
      this.CSVFormat.POSITION_IDX = values[12];
      this.CSVFormat.START_PUNCH_IDX = values[13];
      this.CSVFormat.FIRST_CODE_IDX = values[14];
      this.CSVFormat.FIRST_SPLIT_IDX = values[15];
      this.CSVFormat.STEP = values[16] - values[14];
    },

    getSICSVStatus : function (nc, classifier) {
      if ((nc === '0') || (nc === '') || (nc === 'N')) {
        if ((classifier === '') || (classifier === '0')) {
          return 'ok';
        }
        return 'nok';
      }
      return 'nc';
    },

    // rows: array of raw lines from Spklasse results csv file
    processSpklasseCSVResults : function (rows) {
      // fields in course row
      var COURSE_IDX = 0, NUM_CONTROLS_IDX = 1, course, controls, i, fields;
      fields = [];
      course = '';
      controls = 0;
      // read through all rows
      for (i = 0; i < rows.length; i += 1) {
        fields = rows[i].split(this.separator);
        // check for new course
        if (fields.length === 2) {
          course = fields[COURSE_IDX];
          controls = parseInt(fields[NUM_CONTROLS_IDX], 10);
        } else {
          this.extractResult(fields, course, controls);
        }
      }
    },

    extractResult : function (fields, course, controls) {
      var FIRST_NAME_IDX = 0, SURNAME_IDX = 1, CLUB_IDX = 2, START_TIME_IDX = 3, result, info;
      result = {};
      result.chipid = 0;
      result.name = (fields[FIRST_NAME_IDX] + " " + fields[SURNAME_IDX] + " " + fields[CLUB_IDX]).trim();
      result.dbid = (result.chipid + "__" + result.name);
      result.starttime = rg2.utils.getSecsFromHHMM(fields[START_TIME_IDX]);
      result.club = fields[CLUB_IDX];
      result.course = course;
      result.controls = controls;
      info = this.extractSpklasseSplits(fields);
      result.splits = info.splits;
      result.codes = info.codes;
      result.time = rg2.utils.formatSecsAsMMSS(info.totaltime);
      this.results.push(result);
    },

    extractSpklasseSplits : function (fields) {
      var i, splits, codes, totaltime, len, FIRST_SPLIT_IDX = 4;
      splits = '';
      codes = [];
      len = fields.length - FIRST_SPLIT_IDX;
      totaltime = 0;
      for (i = 0; i < len; i += 1) {
        if (i > 0) {
          splits += ";";
        }
        codes[i] = 'X';
        totaltime += rg2.utils.getSecsFromHHMMSS(fields[i + FIRST_SPLIT_IDX]);
        splits += totaltime;
      }
      return {splits: splits, codes: codes, totaltime: totaltime};
    }
  };
  rg2.ResultParserCSV = ResultParserCSV;
}());
/*global rg2:false */
(function () {
  function ResultParserIOFV2(xml) {
    this.results = [];
    this.valid = true;
    this.processIOFV2Results(xml);
    return {results: this.results, valid: this.valid};
  }

  ResultParserIOFV2.prototype = {

    Constructor : ResultParserIOFV2,

    getDBID : function (element, name) {
      // remove new lines from empty <PersonId> tags
      element = element.replace(/[\n\r]/g, '').trim();
      if (element) {
        return element;
      }
      return name;
    },

    getName : function (personlist) {
      var temp;
      temp = personlist.getElementsByTagName('Given')[0].textContent + " " + personlist.getElementsByTagName('Family')[0].textContent;
      // remove new lines from empty <Given> and <Family> tags
      return (temp.replace(/[\n\r]/g, '').trim());
    },

    processIOFV2Results : function (xml) {
      var classlist, personlist, resultlist, i, j, result, course;
      try {
        classlist = xml.getElementsByTagName('ClassResult');
        for (i = 0; i < classlist.length; i += 1) {
          course = classlist[i].getElementsByTagName('ClassShortName')[0].textContent;
          personlist = classlist[i].getElementsByTagName('PersonResult');
          for (j = 0; j < personlist.length; j += 1) {
            result = {};
            result.course = course;
            result.name = this.getName(personlist[j]);
            result.dbid = this.getDBID(personlist[j].getElementsByTagName('PersonId')[0].textContent, result.name);
            result.club = rg2.utils.extractTextContentZero(personlist[j].getElementsByTagName('ShortName'), '');
            resultlist = personlist[j].getElementsByTagName('Result');
            this.extractIOFV2Results(resultlist, result);
            if (result.status !== 'DidNotStart') {
              this.results.push(result);
            }
          }
        }
      } catch (err) {
        this.valid = false;
        rg2.utils.showWarningDialog("XML parse error", "Error processing XML file. Error is : " + err.message);
        return;
      }

    },

    getStartFinishTimeAsSecs : function (element) {
      var time;
      if (element.length > 0) {
        time = element[0].getElementsByTagName('Clock')[0].textContent;
        return rg2.utils.getSecsFromHHMMSS(time);
      }
      return 0;
    },

    getPosition : function (element) {
      if (element.length > 0) {
        return parseInt(element[0].textContent, 10);
      }
      return '';
    },

    getTime : function (element) {
      if (element.length > 0) {
        return element[0].textContent.replace(/[\n\r]/g, '');
      }
      return '';
    },

    extractIOFV2Results : function (resultlist, result) {
      var i, finishtime, splitlist;
      for (i = 0; i < resultlist.length; i += 1) {
        result.status = rg2.utils.extractAttributeZero(resultlist[i].getElementsByTagName('CompetitorStatus'), "value", "");
        result.position = this.getPosition(resultlist[i].getElementsByTagName('ResultPosition'));
        result.chipid = rg2.utils.extractTextContentZero(resultlist[i].getElementsByTagName('CCardId'), 0);
        // assuming first <Time> is the total time...
        result.time = this.getTime(resultlist[i].getElementsByTagName('Time'));
        result.starttime = this.getStartFinishTimeAsSecs(resultlist[i].getElementsByTagName('StartTime'));
        result.splits = "";
        result.codes = [];
        splitlist = resultlist[i].getElementsByTagName('SplitTime');
        result.controls = splitlist.length;
        this.extractIOFV2Splits(splitlist, result);
        finishtime = this.getStartFinishTimeAsSecs(resultlist[i].getElementsByTagName('FinishTime'));
        result.splits += Math.max(finishtime - result.starttime, 0);
      }
    },

    extractIOFV2Splits : function (splitlist, result) {
      var l, temp;
      for (l = 0; l < splitlist.length; l += 1) {
        if (l > 0) {
          result.splits += ";";
        }
        temp = splitlist[l].getElementsByTagName('Time');
        if (temp.length > 0) {
          // previously read timeFormat but some files lied!
          // allow for XML files that don't tell you what is going on
          // getSecsFromHHMMSS copes with MM:SS as well
          result.splits += rg2.utils.getSecsFromHHMMSS(temp[0].textContent);
          result.codes[l] = rg2.utils.extractTextContentZero(splitlist[l].getElementsByTagName('ControlCode'), "");
        } else {
          result.splits += 0;
          result.codes[l] = "";
        }
      }
      // add finish split
      result.splits += ";";
    }
  };
  rg2.ResultParserIOFV2 = ResultParserIOFV2;
}());

/*global rg2:false */
(function () {
  function ResultParserIOFV3(xml) {
    this.results = [];
    this.valid = true;
    this.processIOFV3Results(xml);
    return {results: this.results, valid: this.valid};
  }

  ResultParserIOFV3.prototype = {

    Constructor : ResultParserIOFV3,

    getID : function (element, name) {
      var temp;
      if (element.length > 0) {
        temp = element[0].textContent;
        // remove new lines from empty <Id> tags
        temp.replace(/[\n\r]/g, '');
        return (temp.trim() + "__" + name);
      }
      // no id defined so just use count of runners
      return (this.results.length + "__" + name);
    },

    getClub : function (element) {
      if (element.length > 0) {
        return element[0].getElementsByTagName('Name')[0].textContent;
      }
      return "";
    },

    processIOFV3Results : function (xml) {
      var classlist, personlist, resultlist, i, j, result, course, temp;
      try {
        classlist = xml.getElementsByTagName('ClassResult');
        for (i = 0; i < classlist.length; i += 1) {
          temp = classlist[i].getElementsByTagName('Class');
          course = temp[0].getElementsByTagName('Name')[0].textContent;
          personlist = classlist[i].getElementsByTagName('PersonResult');
          for (j = 0; j < personlist.length; j += 1) {
            result = {};
            result.course = course;
            temp = personlist[j].getElementsByTagName('Given')[0].textContent + " " + personlist[j].getElementsByTagName('Family')[0].textContent;
            // remove new lines from empty <Given> and <Family> tags
            result.name = temp.replace(/[\n\r]/g, '').trim();
            result.dbid = this.getID(personlist[j].getElementsByTagName('Id'), result.name);
            result.club = this.getClub(personlist[j].getElementsByTagName('Organisation'));
            resultlist = personlist[j].getElementsByTagName('Result');
            this.extractIOFV3Results(resultlist, result);
            if (result.status !== 'DidNotStart') {
              this.results.push(result);
            }
          }
        }
      } catch (err) {
        this.valid = false;
        rg2.utils.showWarningDialog("XML parse error", "Error processing XML file. Error is : " + err.message);
        return;
      }
    },

    getStartFinishTimeAsSeconds : function (time) {
      if (time.length >= 19) {
        // format is yyyy-mm-ddThh:mm:ss and might have extra Z or +nn
        return rg2.utils.getSecsFromHHMMSS(time.substr(11, 8));
      }
      return 0;
    },

    getTotalTimeAsSeconds : function (time) {
      if (time.length > 0) {
        return rg2.utils.formatSecsAsMMSS(parseInt(time[0].textContent, 10));
      }
      return 0;
    },

    extractIOFV3Results : function (resultlist, result) {
      var k, finishtime, splitlist;
      for (k = 0; k < resultlist.length; k += 1) {
        result.chipid = rg2.utils.extractTextContentZero(resultlist[k].getElementsByTagName('ControlCard'), 0);
        result.position = rg2.utils.extractTextContentZero(resultlist[k].getElementsByTagName('Position'), '');
        result.status = rg2.utils.extractTextContentZero(resultlist[k].getElementsByTagName('Status'), '');
        // assuming first <Time> is the total time...
        // this one is in seconds and might even have tenths...
        result.time = this.getTotalTimeAsSeconds(resultlist[k].getElementsByTagName('Time'));
        result.starttime = this.getStartFinishTimeAsSeconds(rg2.utils.extractTextContentZero(resultlist[k].getElementsByTagName('StartTime'), 0));
        result.splits = "";
        result.codes = [];
        splitlist = resultlist[k].getElementsByTagName('SplitTime');
        this.extractIOFV3Splits(splitlist, result);
        finishtime = this.getStartFinishTimeAsSeconds(rg2.utils.extractTextContentZero(resultlist[k].getElementsByTagName('FinishTime'), 0));
        if (finishtime > 0) {
          result.splits += finishtime - result.starttime;
        } else {
          result.splits += 0;
        }
      }
    },

    extractIOFV3Splits : function (splitlist, result) {
      var x, codes;
      codes = [];
      for (x = 0; x < splitlist.length; x += 1) {
        // only possible attributes are "Missing" and "Additional" so
        // if splitlist has attributes it is invalid and needs to be ignored
        if (splitlist[x].attributes.length === 0) {
          result.splits += rg2.utils.extractTextContentZero(splitlist[x].getElementsByTagName('Time'), 0);
          codes.push(rg2.utils.extractTextContentZero(splitlist[x].getElementsByTagName('ControlCode'), 'X' + x));
          result.splits += ";";
        }
      }
      result.codes = codes;
      result.controls = result.codes.length;
    }
  };
  rg2.ResultParserIOFV3 = ResultParserIOFV3;
}());

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
      var i, tracks;
      tracks = [];
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].displayTrack) {
          tracks.push(i);
        }
      }
      return tracks;
    },

    putOneTrackOnDisplay : function (resultid) {
      this.results[resultid].putTrackOnDisplay();
      this.updateTrackNames();
    },

    removeOneTrackFromDisplay : function (resultid) {
      this.results[resultid].removeTrackFromDisplay();
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

    deleteResult : function (resultid) {
      var i;
      for (i = 0; i < this.results.length; i += 1) {
        if (resultid === this.results[i].resultid) {
          this.results.splice(i, 1);
          return true;
        }
      }
      return false;
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
        if (res.comments !== "") {
          // #304 make sure double quotes show up
          res.comments = res.comments.replace(/"/g, '&quot;');
          html += '<td><a href="#" title="' + res.comments + '">' + this.getNameHTML(res, i) + "</a></td><td>" + res.time + "</td>";
        } else {
          html += "<td>" + this.getNameHTML(res, i) + "</td><td>" + res.time + "</td>";
        }
        if (res.hasValidTrack) {
          tracksForThisCourse += 1;
          html += "<td><input class='showtrack showtrack-" + oldCourseID + "' id=" + i + " type=checkbox name=result></input></td>";
        } else {
          html += "<td></td>";
        }
        html += "<td><input class='showreplay showreplay-" + oldCourseID + "' id=" + i + " type=checkbox name=replay></input></td></tr>";
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
      html += "<table class='resulttable' data-role='table' id='movie-table'>";
      html += "<tr><th></th><th>" + rg2.t("Name") + "</th><th>" + rg2.t("Time") + "</th><th><i class='fa fa-pencil'></i></th><th><i class='fa fa-play'></i></th></tr>";
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

/*global rg2:false */
/*global rg2Config:false */
/*global console */
(function () {
  function reportJSONFail(errorText) {
    $("#rg2-load-progress").hide();
    $("#rg2-map-load-progress").hide();
    $('body').css('cursor', 'auto');
    rg2.utils.showWarningDialog('Configuration error', errorText);
  }

  function getEvents() {
    var eventID;
    $.getJSON(rg2Config.json_url, {
      type : "events",
      cache : false
    }).done(function (json) {
      console.log("Events: " + json.data.events.length);
      rg2.events.deleteAllEvents();
      $.each(json.data.events, function () {
        rg2.events.addEvent(new rg2.Event(this));
      });
      rg2.ui.createEventMenu();
      // load requested event if set
      // input is kartat ID so need to find internal ID first
      if (rg2.requestedHash.getID()) {
        eventID = rg2.events.getEventIDForKartatID(rg2.requestedHash.getID());
        if (eventID !== undefined) {
          rg2.loadEvent(eventID);
        }
      }
      if (rg2.config.managing) {
        rg2.manager.eventListLoaded();
      }
    }).fail(function (jqxhr, textStatus, error) {
      /*jslint unparam:true*/
      reportJSONFail("Events request failed: " + error);
    });
  }
  function getGPSTracks() {
    $("#rg2-load-progress-label").text(rg2.t("Loading routes"));
    $.getJSON(rg2Config.json_url, {
      id : rg2.events.getKartatEventID(),
      type : "tracks",
      cache : false
    }).done(function (json) {
      var active, i, event, routes, crs;
      $("#rg2-load-progress-label").text(rg2.t("Loading routes"));
      console.log("Tracks: " + json.data.routes.length);
      // TODO remove temporary (?) fix to get round RG1 events with no courses defined: see #179
      if (rg2.courses.getNumberOfCourses() > 0) {
        rg2.results.addTracks(json.data.routes);
      }
      rg2.ui.createCourseMenu();
      rg2.ui.createResultMenu();
      rg2.animation.updateAnimationDetails();
      $('body').css('cursor', 'auto');
      if (rg2.config.managing) {
        rg2.manager.eventFinishedLoading();
      } else {
        $("#rg2-info-panel").tabs("enable", rg2.config.TAB_COURSES);
        $("#rg2-info-panel").tabs("enable", rg2.config.TAB_RESULTS);
        $("#rg2-info-panel").tabs("enable", rg2.config.TAB_DRAW);
        // open courses tab for new event: else stay on draw tab
        active = $("#rg2-info-panel").tabs("option", "active");
        // don't change tab if we have come from DRAW since it means
        // we have just reloaded following a save
        if (active !== rg2.config.TAB_DRAW) {
          $("#rg2-info-panel").tabs("option", "active", rg2.requestedHash.getTab());
        }
        $("#rg2-info-panel").tabs("refresh");
        $("#btn-show-splits").show();
        if ((rg2Config.enable_splitsbrowser) && (rg2.events.hasResults())) {
          $("#rg2-splitsbrowser").off().click(function () {
            window.open(rg2Config.json_url + "?type=splitsbrowser&id=" + rg2.events.getKartatEventID());
          }).show();
        } else {
          $("#rg2-splitsbrowser").off().hide();
        }
        // set up screen as requested in hash
        event = $.Event('click');
        event.target = {};
        event.target.checked = true;
        routes = rg2.requestedHash.getRoutes();
        for (i = 0; i < routes.length; i += 1) {
          event.target.id = routes[i];
          $(".showtrack").filter("#" + routes[i]).trigger(event).prop('checked', true);
        }
        crs = rg2.requestedHash.getCourses();
        for (i = 0; i < crs.length; i += 1) {
          event.target.id = crs[i];
          $(".showcourse").filter("#" + crs[i]).trigger(event).prop('checked', true);
        }
      }
      $("#rg2-load-progress-label").text("");
      $("#rg2-load-progress").hide();
      rg2.redraw(false);
    }).fail(function (jqxhr, textStatus, error) {
      /*jslint unparam:true*/
      reportJSONFail("Routes request failed for event " + rg2.events.getKartatEventID() + ": " + error);
    });
  }

  function getResults() {
    var isScoreEvent;
    $("#rg2-load-progress-label").text(rg2.t("Loading results"));
    $.getJSON(rg2Config.json_url, {
      id : rg2.events.getKartatEventID(),
      type : "results",
      cache : false
    }).done(function (json) {
      console.log("Results: " + json.data.results.length);
      $("#rg2-load-progress-label").text(rg2.t("Saving results"));
      isScoreEvent = rg2.events.isScoreEvent();
      // TODO remove temporary (?) fix to get round RG1 events with no courses defined: see #179
      if (rg2.courses.getNumberOfCourses() > 0) {
        rg2.results.addResults(json.data.results, isScoreEvent);
      }
      rg2.courses.setResultsCount();
      if (isScoreEvent) {
        rg2.controls.deleteAllControls();
        rg2.results.generateScoreCourses();
        rg2.courses.generateControlList(rg2.controls);
      }
      $("#rg2-result-table").accordion("refresh");
      getGPSTracks();
    }).fail(function (jqxhr, textStatus, error) {
      /*jslint unparam:true*/
      reportJSONFail("Results request failed for event " + rg2.events.getKartatEventID() + ": " + error);
    });
  }

  function getCourses() {
    // get courses for event
    $.getJSON(rg2Config.json_url, {
      id : rg2.events.getKartatEventID(),
      type : "courses",
      cache : false
    }).done(function (json) {
      $("#rg2-load-progress-label").text(rg2.t("Saving courses"));
      console.log("Courses: " + json.data.courses.length);
      $.each(json.data.courses, function () {
        rg2.courses.addCourse(new rg2.Course(this, rg2.events.isScoreEvent()));
      });
      rg2.courses.updateCourseDropdown();
      rg2.courses.generateControlList(rg2.controls);
      $("#btn-toggle-controls").show();
      $("#btn-toggle-names").show();
      getResults();
    }).fail(function (jqxhr, textStatus, error) {
      /*jslint unparam:true*/
      reportJSONFail("Courses request failed for event " + rg2.events.getKartatEventID() + ": " + error);
    });
  }

  function getNewLanguage(lang) {
    $.getJSON(rg2Config.json_url, {
      id : lang,
      type : 'lang',
      cache : false
    }).done(function (json) {
      rg2.ui.setNewLanguage(json.data.dict);
    }).fail(function (jqxhr, textStatus, error) {
      /*jslint unparam:true*/
      reportJSONFail("Language request failed: " + error);
    });
  }

  rg2.getEvents = getEvents;
  rg2.getCourses = getCourses;
  rg2.getResults = getResults;
  rg2.getGPSTracks = getGPSTracks;
  rg2.getNewLanguage = getNewLanguage;
}());

/*global rg2:false */
(function () {
  var input = {
    dragStart: null,
    // looks odd but this works for initialisation
    dragged: true,
    infoPanelMaximised: true,
    scaleFactor: 1.1
  };

  function handleInputDown(evt) {
    input.dragStart = rg2.ctx.transformedPoint(input.lastX, input.lastY);
    input.dragged = false;
    // need to cache this here since IE and FF don't set it for mousemove events
    input.whichButton = evt.which;
    //console.log ("InputDown " + input.lastX + " " + input.lastY + " " + input.dragStart.x + " " + input.dragStart.y);
  }

  function handleInputMove() {
    var pt;
    if (input.dragStart) {
      pt = rg2.ctx.transformedPoint(input.lastX, input.lastY);
      Math.round(pt.x);
      Math.round(pt.y);
      // console.log ("Mousemove after " + pt.x + ": " + pt.y);
      // simple debounce so that very small drags are treated as clicks instead
      if ((Math.abs(pt.x - input.dragStart.x) + Math.abs(pt.y - input.dragStart.y)) > 5) {
        if (rg2.drawing.gpsFileLoaded()) {
          rg2.drawing.adjustTrack({x: Math.round(input.dragStart.x), y: Math.round(input.dragStart.y)}, pt, input.whichButton);
        } else {
          if ($("#rg2-info-panel").tabs("option", "active") === rg2.config.TAB_CREATE) {
            rg2.manager.adjustControls({x: Math.round(input.dragStart.x), y: Math.round(input.dragStart.y)}, pt, input.whichButton);
          } else {
            rg2.ctx.translate(pt.x - input.dragStart.x, pt.y - input.dragStart.y);
          }
        }
        input.dragged = true;
        rg2.redraw(false);
      }
    }
  }

  function handleInputUp(evt) {
    // console.log("Input up " + input.dragged);
    var active = $("#rg2-info-panel").tabs("option", "active");
    if (!input.dragged) {
      if (active === rg2.config.TAB_CREATE) {
        rg2.manager.mouseUp(Math.round(input.dragStart.x), Math.round(input.dragStart.y));
      } else {
        // pass button that was clicked
        rg2.drawing.mouseUp(Math.round(input.dragStart.x), Math.round(input.dragStart.y), evt.which);
      }
    } else {
      if (active === rg2.config.TAB_CREATE) {
        rg2.manager.dragEnded();
      } else {
        rg2.drawing.dragEnded();
      }
    }
    input.dragStart = null;
    rg2.redraw(false);
  }

  function savePinchInfo(evt) {
    input.pinchStart0 = rg2.ctx.transformedPoint(evt.touches[0].pageX, evt.touches[0].pageY);
    input.pinchStart1 = rg2.ctx.transformedPoint(evt.touches[1].pageX, evt.touches[1].pageY);
    input.pinched = true;
  }

  // homegrown touch handling: seems no worse than adding some other library in
  // pinch zoom is primitive but works
  function handleTouchStart(evt) {
    evt.preventDefault();
    if (evt.touches.length > 1) {
      savePinchInfo(evt);
    }
    input.lastX = evt.touches[0].pageX;
    input.lastY = evt.touches[0].pageY;
    handleInputDown(evt);
  }

  function handleTouchMove(evt) {
    var oldDistance, newDistance;
    if (evt.touches.length > 1) {
      if (!input.pinched) {
        savePinchInfo(evt);
      }
    } else {
      input.pinched = false;
    }
    if (input.pinched && (evt.touches.length > 1)) {
      input.pinchEnd0 = rg2.ctx.transformedPoint(evt.touches[0].pageX, evt.touches[0].pageY);
      input.pinchEnd1 = rg2.ctx.transformedPoint(evt.touches[1].pageX, evt.touches[1].pageY);
      oldDistance = rg2.utils.getDistanceBetweenPoints(input.pinchStart0.x, input.pinchStart0.y, input.pinchStart1.x, input.pinchStart1.y);
      newDistance = rg2.utils.getDistanceBetweenPoints(input.pinchEnd0.x, input.pinchEnd0.y, input.pinchEnd1.x, input.pinchEnd1.y);
      if ((oldDistance / newDistance) > 1.1) {
        rg2.zoom(-1);
        input.pinchStart0 = input.pinchEnd0;
        input.pinchStart1 = input.pinchEnd1;
      } else if ((oldDistance / newDistance) < 0.9) {
        rg2.zoom(1);
        input.pinchStart0 = input.pinchEnd0;
        input.pinchStart1 = input.pinchEnd1;
      }
    } else {
      input.lastX = evt.touches[0].pageX;
      input.lastY = evt.touches[0].pageY;
      handleInputMove(evt);
    }
  }

  function handleTouchEnd(evt) {
    handleInputUp(evt);
    input.pinched = false;
  }

  function handleScroll(evt) {
    var delta = evt.wheelDelta ? evt.wheelDelta / 40 : evt.detail ? -evt.detail : 0;
    if (delta) {
      rg2.zoom(delta);
    }
    evt.stopPropagation();
    return evt.preventDefault() && false;
  }

  function saveMouseEvent(evt) {
    input.lastX = evt.offsetX || (evt.layerX - rg2.canvas.offsetLeft);
    input.lastY = evt.offsetY || (evt.layerY - rg2.canvas.offsetTop);
  }

  function handleMouseDown(evt) {
    saveMouseEvent(evt);
    handleInputDown(evt);
    evt.stopPropagation();
    return evt.preventDefault() && false;
  }

  function handleMouseMove(evt) {
    saveMouseEvent(evt);
    handleInputMove(evt);
    evt.stopPropagation();
    return evt.preventDefault() && false;
  }

  function handleMouseUp(evt) {
    handleInputUp(evt);
    evt.stopPropagation();
    return evt.preventDefault() && false;
  }
  rg2.input = input;
  rg2.handleMouseDown = handleMouseDown;
  rg2.handleMouseUp = handleMouseUp;
  rg2.handleMouseMove = handleMouseMove;
  rg2.handleTouchEnd = handleTouchEnd;
  rg2.handleTouchStart = handleTouchStart;
  rg2.handleTouchMove = handleTouchMove;
  rg2.handleScroll = handleScroll;
}());

/*global rg2:false */
/*global rg2Config:false */
(function () {
  var ui = {

    setTitleBar: function () {
      var title;
      if (window.innerWidth >= rg2.config.BIG_SCREEN_BREAK_POINT) {
        title = rg2.events.getActiveEventName() + " " + rg2.events.getActiveEventDate();
        $("#rg2-event-title").html(title).show();
      } else if (window.innerWidth > rg2.config.SMALL_SCREEN_BREAK_POINT) {
        title = rg2.events.getActiveEventName();
        $("#rg2-event-title").html(title).show();
      } else {
        $("#rg2-event-title").hide();
      }
      if (rg2.events.mapIsGeoreferenced()) {
        $("#rg2-event-title-icon").addClass("fa fa-globe");
      } else {
        $("#rg2-event-title-icon").removeClass("fa fa-globe");
      }
    },

    setNewLanguage : function (dict) {
      var eventid;
      $("#rg2-event-ul").menu("destroy");
      rg2.setDictionary(dict);
      this.createEventMenu();
      eventid = rg2.events.getActiveEventID();
      if (eventid !== null) {
        rg2.courses.removeAllFromDisplay();
        rg2.results.updateTrackDisplay(rg2.config.DISPLAY_ALL_COURSES, false);
        rg2.animation.resetAnimation();
        rg2.drawing.initialiseDrawing(rg2.events.hasResults(eventid));
        this.createCourseMenu();
        this.createResultMenu();
      }
      $("#rg2-info-panel").tabs("refresh");
      rg2.redraw(false);
    },

  // called whenever the active tab changes to tidy up as necessary
    tabActivated : function () {
      var active = $("#rg2-info-panel").tabs("option", "active");
      switch (active) {
      case rg2.config.TAB_DRAW:
        rg2.courses.removeAllFromDisplay();
        rg2.drawing.showCourseInProgress();
        break;
      default:
        break;
      }
      rg2.redraw(false);
    },

    displayAboutDialog : function () {
      $("#rg2-event-stats").empty().html(rg2.getEventStats());
      $("#rg2-about-dialog").dialog({
        width : Math.min(1000, (rg2.canvas.width * 0.8)),
        maxHeight : Math.min(1000, (rg2.canvas.height * 0.9)),
        title : "RG2 Version " + rg2.config.RG2VERSION,
        dialogClass : "rg2-about-dialog",
        resizable : false,
        buttons : {
          Ok : function () {
            $(this).dialog("close");
          }
        }
      });
    },

    displayOptionsDialog : function () {
      $("#rg2-option-controls").dialog({
        minWidth : 400,
        title :  rg2.t("Configuration options"),
        dialogClass : "rg2-options-dialog",
        close : function () {
          rg2.saveConfigOptions();
        },
        buttons : {
          Ok : function () {
            $(this).dialog("close");
          }
        }
      });
    },

    initialiseButtons : function () {
      var self;
      self = this;
      $("#btn-about").click(function () {
        self.displayAboutDialog();
      });
      $("#btn-faster").click(function () {
        rg2.animation.goFaster();
      });
      $("#btn-full-tails").prop('checked', false).click(function (event) {
        if (event.target.checked) {
          rg2.animation.setFullTails(true);
          $("#spn-tail-length").spinner("disable");
        } else {
          rg2.animation.setFullTails(false);
          $("#spn-tail-length").spinner("enable");
        }
      });
      $("#btn-move-all").prop('checked', false);
      $("#btn-align-map").prop('checked', rg2.options.alignMap).click(function (event) {
        if (event.target.checked) {
          rg2.options.alignMap = true;
        } else {
          rg2.options.alignMap = false;
        }
        rg2.saveConfigOptions();
      });
      $("#btn-options").click(function () {
        self.displayOptionsDialog();
      });
      $("#btn-real-time").click(function () {
        rg2.animation.setReplayType();
      });
      $("#btn-reset").click(function () {
        rg2.resetMapState();
      });
      $("#btn-reset-drawing").button().button("disable").click(function () {
        rg2.drawing.resetDrawing();
      });
      $("#btn-save-gps-route").button().button("disable").click(function () {
        rg2.drawing.saveGPSRoute();
      });
      $("#btn-save-route").button().button("disable").click(function () {
        rg2.drawing.saveRoute();
      });
      $("#btn-show-splits").click(function () {
        $("#rg2-splits-table").empty().append(rg2.animation.getSplitsTable()).dialog({
          width : 'auto',
          dialogClass : "rg2-splits-table",
          buttons : {
            Ok : function () {
              $("#rg2-splits-table").dialog('close');
            }
          }
        });
      }).hide();
      $("#btn-slower").click(function () {
        rg2.animation.goSlower();
      });
      $("#btn-start-stop").click(function () {
        rg2.animation.toggleAnimation();
      });
      $("#btn-three-seconds").button().click(function () {
        rg2.drawing.waitThreeSeconds();
      }).button("disable");
      $("#btn-toggle-controls").click(function () {
        rg2.controls.toggleControlDisplay();
        rg2.redraw(false);
      }).hide();
      $("#btn-toggle-names").click(function () {
        rg2.animation.toggleNameDisplay();
        rg2.redraw(false);
      }).hide();
      $("#btn-undo").button().button("disable").click(function () {
        rg2.drawing.undoLastPoint();
      });
      $("#btn-undo-gps-adjust").button().button("disable").click(function () {
        rg2.drawing.undoGPSAdjust();
      });
      $("#btn-autofit-gps").button().button("disable").click(function () {
        rg2.drawing.autofitGPSTrack();
      });
      $("#btn-zoom-in").click(function () {
        rg2.zoom(1);
      });
      $("#btn-zoom-out").click(function () {
        rg2.zoom(-1);
      });
      $("#btn-rotate-left").click(function () {
        rg2.rotateMap(-1);
      });
      $("#btn-rotate-right").click(function () {
        rg2.rotateMap(1);
      });
      $("#rg2-load-gps-file").val('').button().button("disable");
    },

    setResultCheckboxes : function () {
      // checkbox to show a course
      $(".showcourse").click(function (event) {
        var id;
        //Prevent opening accordion when check box is clicked
        event.stopPropagation();
        id = event.target.id;
        if (event.target.checked) {
          rg2.courses.putOnDisplay(id);
          // check box on courses tab
          $(".courselist").filter("#" + id).prop('checked', true);
        } else {
          rg2.courses.removeFromDisplay(id);
          // uncheck box on courses tab
          $(".courselist").filter("#" + id).prop('checked', false);
          // make sure the all checkbox is not checked
          $(".allcourses").prop('checked', false);
        }
        rg2.requestedHash.setCourses();
        rg2.redraw(false);
      });
      // checkbox to show an individual score course
      $(".showscorecourse").click(function (event) {
        rg2.results.displayScoreCourse(parseInt(event.target.id, 10), event.target.checked);
        rg2.redraw(false);
      });
      // checkbox to show a result
      $(".showtrack").click(function (event) {
        if (event.target.checked) {
          rg2.results.putOneTrackOnDisplay(event.target.id);
        } else {
          rg2.results.removeOneTrackFromDisplay(event.target.id);
        }
        rg2.requestedHash.setRoutes();
        rg2.redraw(false);
      });
      // checkbox to animate a result
      $(".showreplay").click(function (event) {
        if (event.target.checked) {
          rg2.animation.addRunner(new rg2.Runner(parseInt(event.target.id, 10)), true);
        } else {
          rg2.animation.removeRunner(parseInt(event.target.id, 10), true);
        }
        rg2.redraw(false);
      });
      // checkbox to display all tracks for course
      $(".allcoursetracks").click(function (event) {
        var runners, selector, i;
        runners = rg2.results.getAllRunnersForCourse(parseInt(event.target.id, 10));
        for (i = 0; i < runners.length; i += 1) {
          if (event.target.checked) {
            rg2.results.putOneTrackOnDisplay(runners[i]);
          } else {
            rg2.results.removeOneTrackFromDisplay(runners[i]);
          }
        }
        selector = ".showtrack-" + event.target.id;
        if (event.target.checked) {
          // select all the individual checkboxes for the course
          $(selector).prop('checked', true);
        } else {
          $(selector).prop('checked', false);
        }
        rg2.requestedHash.setRoutes();
        rg2.redraw(false);
      });
      // checkbox to animate all results for course
      $(".allcoursereplay").click(function (event) {
        var courseresults, selector;
        courseresults = rg2.results.getAllRunnersForCourse(parseInt(event.target.id, 10));
        rg2.animation.animateRunners(courseresults, event.target.checked);
        selector = ".showreplay-" + event.target.id;
        if (event.target.checked) {
          // select all the individual checkboxes for each course
          $(selector).prop('checked', true);
        } else {
          $(selector).prop('checked', false);
        }
        rg2.redraw(false);
      });
    },

    createResultMenu : function () {
      //loads menu from populated result array
      var html = rg2.results.formatResultListAsAccordion();
      // #177 not pretty but gets round problems of double encoding
      html = html.replace(/&amp;/g, '&');
      $("#rg2-result-table").empty().append(html);
      $("#rg2-result-table").accordion("refresh");
      $("#rg2-info-panel").tabs("refresh");
      this.setResultCheckboxes();
      // disable control dropdown if we have no controls
      if (rg2.courses.getHighestControlNumber() === 0) {
        $("#rg2-control-select").prop('disabled', true);
      } else {
        $("#rg2-control-select").prop('disabled', false);
      }
    },

    createCourseMenu : function () {
      //loads menu from populated courses array
      $("#rg2-course-table").empty().append(rg2.courses.formatCoursesAsTable());

      // checkbox on course tab to show a course
      $(".courselist").click(function (event) {
        var id = parseInt(event.currentTarget.id, 10);
        if (event.target.checked) {
          rg2.courses.putOnDisplay(id);
          // check box on results tab
          $(".showcourse").filter("#" + id).prop('checked', true);
        } else {
          rg2.courses.removeFromDisplay(id);
          // make sure the all checkbox is not checked
          $(".allcourses").prop('checked', false);
          // uncheck box on results tab
          $(".showcourse").filter("#" + id).prop('checked', false);
        }
        rg2.requestedHash.setCourses();
        rg2.redraw(false);
      });
      // checkbox on course tab to show all courses
      $(".allcourses").click(function (event) {
        if (event.target.checked) {
          rg2.courses.putAllOnDisplay();
          // select all the individual checkboxes for each course
          $(".courselist").prop('checked', true);
          // check all boxes on results tab
          $(".showcourse").prop('checked', true);
        } else {
          rg2.courses.removeAllFromDisplay();
          $(".courselist").prop('checked', false);
          // uncheck all boxes on results tab
          $(".showcourse").prop('checked', false);
        }
        rg2.requestedHash.setCourses();
        rg2.redraw(false);
      });
      // checkbox on course tab to show tracks for one course
      $(".tracklist").click(function (event) {
        var courseid = event.target.id;
        if (event.target.checked) {
          rg2.results.updateTrackDisplay(parseInt(courseid, 10), true);
        } else {
          rg2.results.updateTrackDisplay(parseInt(courseid, 10), false);
          // make sure the all checkbox is not checked
          $(".alltracks").prop('checked', false);
        }
        rg2.requestedHash.setRoutes();
        rg2.redraw(false);
      });
      // checkbox on course tab to show all tracks
      $(".alltracks").click(function (event) {
        if (event.target.checked) {
          rg2.results.updateTrackDisplay(rg2.config.DISPLAY_ALL_COURSES, true);
          // select all the individual checkboxes for each course
          $(".tracklist").prop('checked', true);
        } else {
          rg2.results.updateTrackDisplay(rg2.config.DISPLAY_ALL_COURSES, false);
          // deselect all the individual checkboxes for each course
          $(".tracklist").prop('checked', false);
        }
        rg2.requestedHash.setRoutes();
        rg2.redraw(false);
      });
    },

    initialiseSpinners : function () {
      $("#spn-control-circle").spinner({
        max : 50,
        min : 3,
        step : 1,
        spin : function (event, ui) {
          /*jslint unparam:true*/
          rg2.setConfigOption("circleSize", ui.value);
          rg2.redraw(false);
        }
      }).val(rg2.options.circleSize);
      $("#spn-course-width").spinner({
        max : 10,
        min : 1,
        step : 0.5,
        spin : function (event, ui) {
          /*jslint unparam:true*/
          rg2.setConfigOption("courseWidth", ui.value);
          rg2.redraw(false);
        }
      }).val(rg2.options.courseWidth);
      $("#spn-map-intensity").spinner({
        // spinner uses 0 to 100%: stored and used as 0 to 1
        max : 100,
        min : 0,
        step : 10,
        numberFormat : "n",
        spin : function (event, ui) {
          /*jslint unparam:true*/
          rg2.setConfigOption("mapIntensity", ui.value / 100);
          rg2.redraw(false);
        }
      }).val(rg2.options.mapIntensity * 100);
      $("#spn-name-font-size").spinner({
        max : 30,
        min : 5,
        step : 1,
        numberFormat : "n",
        spin : function (event, ui) {
          /*jslint unparam:true*/
          rg2.setConfigOption("replayFontSize", ui.value);
          rg2.redraw(false);
        }
      }).val(rg2.options.replayFontSize);
      $("#spn-route-intensity").spinner({
        // spinner uses 0 to 100%: stored and used as 0 to 1
        max : 100,
        min : 0,
        step : 10,
        numberFormat : "n",
        spin : function (event, ui) {
          /*jslint unparam:true*/
          rg2.setConfigOption("routeIntensity", ui.value / 100);
          rg2.redraw(false);
        }
      }).val(rg2.options.routeIntensity * 100);
      $("#spn-route-width").spinner({
        max : 10,
        min : 1,
        step : 0.5,
        spin : function (event, ui) {
          /*jslint unparam:true*/
          rg2.setConfigOption("routeWidth", ui.value);
          rg2.redraw(false);
        }
      }).val(rg2.options.routeWidth);
      // set default to 0 secs = no tails
      $("#spn-tail-length").spinner({
        max : 600,
        min : 0,
        spin : function (event, ui) {
          /*jslint unparam:true*/
          rg2.animation.setTailLength(ui.value);
        }
      }).val(0);
      $("#spn-offset").spinner({
        max : 900,
        min : -900,
        disabled: true,
        spin : function (event, ui) {
          /*jslint unparam:true*/
          rg2.drawing.adjustOffset(ui.value);
        }
      }).val(0);
    },

    setAutofitSpinner : function (offset) {
      $("#spn-offset").spinner("value", offset).spinner("enable");
    },

    event_list_li : [],
    createEventMenu : function () {
      //loads menu from populated events array
      var html = rg2.events.formatEventsAsMenu();
      $("#rg2-event-ul").empty().append(html).menu({
        select : function (event, ui) {
          /*jslint unparam:true*/
          rg2.loadEvent(ui.item[0].id);
          rg2.requestedHash.setNewEvent(rg2.events.getKartatEventID());
        }
      });
      this.event_list_li = $('#rg2-event-ul > li').clone();
    },

    setUIEventHandlers : function () {
      var text, newlang, self;
      self = this;
      $("#rg2-resize-info").click(function () {
        rg2.resizeInfoDisplay();
      });
      $("#rg2-hide-info-panel-control").click(function () {
        rg2.resizeInfoDisplay();
      });
      $("#rg2-control-select").prop('disabled', true).change(function () {
        rg2.animation.setStartControl($("#rg2-control-select").val());
      });
      $("#rg2-name-select").prop('disabled', true).change(function () {
        rg2.drawing.setName(parseInt($("#rg2-name-select").val(), 10));
      });
      $("#rg2-course-select").change(function () {
        rg2.drawing.setCourse(parseInt($("#rg2-course-select").val(), 10));
      });
      $("#rg2-enter-name").click(function () {
        rg2.drawing.setNameAndTime();
      }).keyup(function () {
        rg2.drawing.setNameAndTime();
      });
      $('#rg2-new-comments').focus(function () {
        // Clear comment box if user focuses on it and it still contains default text
        text = $("#rg2-new-comments").val();
        if (text === rg2.t(rg2.config.DEFAULT_NEW_COMMENT)) {
          $('#rg2-new-comments').val("");
        }
      });
      $("#chk-snap-toggle").prop('checked', rg2.options.snap).click(function (event) {
        if (event.target.checked) {
          rg2.options.snap = true;
        } else {
          rg2.options.snap = false;
        }
      });
      $("#chk-show-three-seconds").prop('checked', rg2.options.showThreeSeconds).click(function (event) {
        if (event.target.checked) {
          rg2.options.showThreeSeconds = true;
        } else {
          rg2.options.showThreeSeconds = false;
        }
        rg2.redraw(false);
      });
      $("#chk-show-GPS-speed").prop('checked', rg2.options.showGPSSpeed).click(function (event) {
        if (event.target.checked) {
          rg2.options.showGPSSpeed = true;
        } else {
          rg2.options.showGPSSpeed = false;
        }
        rg2.redraw(false);
      });
      $("#rg2-select-language").click(function () {
        newlang = $("#rg2-select-language").val();
        if (newlang !== rg2.getDictionaryCode()) {
          if (newlang === 'en') {
            self.setNewLanguage({code: "en"});
          } else {
            rg2.getNewLanguage(newlang);
          }
        }
      });
      $("#rg2-load-gps-file").change(function (evt) {
        rg2.drawing.uploadGPS(evt);
      });
      $('#filter-events-input').keyup(function () {
        $('#rg2-event-ul').empty();
        var valThis = $(this).val().toLowerCase();
        if (valThis === "") {
          rg2.ui.event_list_li.appendTo("#rg2-event-ul");
        } else {
          rg2.ui.event_list_li.each(function () {
            text = $(this).text().toLowerCase();
            if (text.indexOf(valThis) >= 0) {
              $(this).appendTo('#rg2-event-ul');
            }
          });
        }
      });
      $('#filter-result-input').keyup(function () {
        var valThis = $(this).val().toLowerCase();
        if (valThis === "") {
          $('#rg2-result-table tr').show();
        } else {
          $('#rg2-result-table tr').each(function () {
            text = $(this).find('td').eq(1).text().toLowerCase();
            if (text.indexOf(valThis) >= 0) {
              $(this).show();
            } else {
              $(this).hide();
            }
          });
        }
      });
    },

    configureUI : function () {
      // disable right click menu: may add our own later
      $(document).bind("contextmenu", function (evt) {
        evt.preventDefault();
      });
      // disable tabs until we have loaded something
      var self;
      self = this;
      $("#rg2-info-panel").tabs({
        disabled : [rg2.config.TAB_COURSES, rg2.config.TAB_RESULTS, rg2.config.TAB_DRAW],
        active : rg2.config.TAB_EVENTS,
        heightStyle : "content",
        activate : function () {
          self.tabActivated();
        }
      });
      $("#rg2-result-table").accordion({
        collapsible : true,
        heightStyle : "content"
      });
      $("#rg2-clock").text("00:00:00");
      $("#rg2-clock-slider").slider({
        slide : function (event, ui) {
          /*jslint unparam:true*/
          // passes slider value as new time
          rg2.animation.clockSliderMoved(ui.value);
        }
      });
      $("#rg2-header-container").css("color", rg2Config.header_text_colour).css("background", rg2Config.header_colour);
      $("#rg2-about-dialog").hide();
      $("#rg2-splits-display").hide();
      $("#rg2-track-names").hide();
      $("#rg2-add-new-event").hide();
      $("#rg2-load-progress-bar").progressbar({
        value : false
      });
      $("#rg2-load-progress-label").text("");
      $("#rg2-load-progress").hide();
      $("#rg2-map-load-progress-bar").progressbar({
        value : false
      });
      $("#rg2-map-load-progress-label").text("");
      $("#rg2-map-load-progress").hide();
      $("#rg2-option-controls").hide();
      $("#rg2-animation-controls").hide();
      $("#rg2-splitsbrowser").hide();
      this.setUIEventHandlers();
      this.initialiseButtons();
      this.initialiseSpinners();

    }
  };
  rg2.ui = ui;
}());

/*global rg2:false */
/*exported Runner */
// animated runner details
(function () {
  function Runner(resultid) {
    var res, course;
    res = rg2.results.getFullResult(resultid);
    this.name = res.name;
    this.initials = res.initials;
    // careful: we need the index into results, not the resultid from the text file
    this.runnerid = resultid;
    this.starttime = res.starttime;
    this.splits = res.splits;
    this.legpos = res.legpos;
    this.colour = rg2.colours.getNextColour();
    // get course details
    if (res.isScoreEvent) {
      course = {};
      course.name = res.coursename;
      course.x = res.scorex;
      course.y = res.scorey;
      course.codes = res.scorecodes;
    } else {
      course = rg2.courses.getCourseDetails(res.courseid);
    }
    this.coursename = course.name;
    // used to stop runners when doing replay by control
    this.nextStopTime = rg2.config.VERY_HIGH_TIME_IN_SECS;
    this.x = [];
    this.y = [];
    // x,y are indexed by time in seconds
    this.legTrackDistance = [];
    this.cumulativeTrackDistance = [];
    this.cumulativeDistance = [];
    this.cumulativeDistance[0] = 0;
    this.legTrackDistance[0] = 0;
    this.cumulativeTrackDistance[0] = 0;
    if (res.hasValidTrack) {
      this.expandTrack(res.trackx, res.tracky, res.xysecs);
    } else {
      // no track so use straight line between controls
      this.expandTrack(course.x, course.y, res.splits);
    }
    this.addTrackDistances(course, res);
    res = 0;
    course = 0;
  }
  Runner.prototype = {
    Constructor : Runner,

    addTrackDistances : function (course, res) {
      // add track distances for each leg
      var control, ind, lastPointIndex;
      lastPointIndex = this.cumulativeDistance.length - 1;
      if (course.codes !== undefined) {
        // if we got no splits then there will just be a finish time
        if (res.splits.length > 1) {
          for (control = 1; control < course.codes.length; control += 1) {
            // avoid NaN values for GPS tracks that are shorter than the result time
            if (res.splits[control] <= lastPointIndex) {
              ind = res.splits[control];
            } else {
              ind = lastPointIndex;
            }
            this.cumulativeTrackDistance[control] = Math.round(this.cumulativeDistance[ind]);
            this.legTrackDistance[control] = this.cumulativeTrackDistance[control] - this.cumulativeTrackDistance[control - 1];
          }
        } else {
          // allows for tracks at events with no results so no splits: just use start and finish
          this.legTrackDistance[1] = Math.round(this.cumulativeDistance[lastPointIndex]);
          this.cumulativeTrackDistance[1] = Math.round(this.cumulativeDistance[lastPointIndex]);
        }
      }
    },

    expandTrack : function (itemsx, itemsy, itemstime) {
      // gets passed arrays of x, y and time
      // iterate over item which will be xy or controls
      var item, diffx, diffy, difft, t, diffdist, tox, toy, dist, timeatprevitem, timeatitem, fromx, fromy, fromdist;
      timeatprevitem = 0;
      timeatitem = 0;
      fromx = itemsx[0];
      fromy = itemsy[0];
      fromdist = 0;
      dist = 0;
      this.x[0] = itemsx[0];
      this.y[0] = itemsy[0];
      for (item = 1; item < itemstime.length; item += 1) {
        tox = itemsx[item];
        toy = itemsy[item];
        diffx = tox - fromx;
        diffy = toy - fromy;
        dist = dist + rg2.utils.getDistanceBetweenPoints(tox, toy, fromx, fromy);
        diffdist = dist - fromdist;
        timeatitem = itemstime[item];
        // allow for 0 splits indicating a missed control
        // just assume a 1 second split for now: probably harmless
        if (timeatitem === 0) {
          timeatitem = timeatprevitem + 1;
        }
        difft = timeatitem - timeatprevitem;
        for (t = timeatprevitem + 1; t < timeatitem; t += 1) {
          this.x[t] = Math.round(fromx + ((t - timeatprevitem) * diffx / difft));
          this.y[t] = Math.round(fromy + ((t - timeatprevitem) * diffy / difft));
          this.cumulativeDistance[t] = Math.round(fromdist + ((t - timeatprevitem) * diffdist / difft));
        }
        this.x[timeatitem] = tox;
        this.y[timeatitem] = toy;
        this.cumulativeDistance[timeatitem] = dist;
        fromx = tox;
        fromy = toy;
        fromdist = dist;
        timeatprevitem = timeatitem;
      }
    }
  };
  rg2.Runner = Runner;
}());

/*global rg2:false */
(function () {
  var utils =  {
    rotatePoint : function (x, y, angle) {
      // rotation matrix: see http://en.wikipedia.org/wiki/Rotation_matrix
      var pt = {};
      pt.x = (Math.cos(angle) * x) - (Math.sin(angle) * y);
      pt.y = (Math.sin(angle) * x) + (Math.cos(angle) * y);
      return pt;
    },

    getDistanceBetweenPoints : function (x1, y1, x2, y2) {
      // Pythagoras
      return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));
    },

    getAngle : function (x1, y1, x2, y2) {
      var angle = Math.atan2((y2 - y1), (x2 - x1));
      if (angle < 0) {
        angle = angle + (2 * Math.PI);
      }
      return angle;
    },

    getLatLonDistance : function (lat1, lon1, lat2, lon2) {
      // Haversine formula (http://www.codecodex.com/wiki/Calculate_distance_between_two_points_on_a_globe)
      var dLat, dLon, a;
      dLat = (lat2 - lat1).toRad();
      dLon = (lon2 - lon1).toRad();
      a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      // multiply by IUUG earth mean radius (http://en.wikipedia.org/wiki/Earth_radius) in metres
      return 6371009 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },

    // converts MM:SS or HH:MM:SS to seconds based on number of :
    getSecsFromHHMMSS : function (time) {
      var bits, secs;
      if (!time) {
        return 0;
      }
      secs = 0;
      // force format to use : if it came in with .
      bits = time.replace(/\./g, ":").split(":");
      if (bits.length === 2) {
        secs = (parseInt(bits[0], 10) * 60) + parseInt(bits[1], 10);
      } else {
        if (bits.length === 3) {
          secs = (parseInt(bits[0], 10) * 3600) + (parseInt(bits[1], 10) * 60) + parseInt(bits[2], 10);
        }
      }
      if (isNaN(secs)) {
        return 0;
      }
      return secs;
    },

    getSecsFromHHMM : function (time) {
      var bits, secs;
      if (!time) {
        return 0;
      }
      secs = 0;
      bits = time.split(":");
      secs = (parseInt(bits[0], 10) * 3600) + (parseInt(bits[1], 10) * 60);
      if (isNaN(secs)) {
        return 0;
      }
      return secs;
    },

    // converts seconds to MM:SS
    formatSecsAsMMSS : function (secs) {
      var formattedtime, minutes, seconds;
      minutes = Math.floor(secs / 60);
      formattedtime = minutes;
      seconds = secs - (minutes * 60);
      if (seconds < 10) {
        formattedtime += ":0" + seconds;
      } else {
        formattedtime += ":" + seconds;
      }
      return formattedtime;
    },

    // returns seconds as hh:mm:ss
    formatSecsAsHHMMSS : function (secs) {
      var formattedtime, hours, minutes;
      hours = Math.floor(secs / 3600);
      if (hours < 10) {
        formattedtime = "0" + hours + ":";
      } else {
        formattedtime = hours + ":";
      }
      secs = secs - (hours * 3600);
      minutes = Math.floor(secs / 60);
      if (minutes < 10) {
        formattedtime += "0" + minutes;
      } else {
        formattedtime += minutes;
      }
      secs = secs - (minutes * 60);
      if (secs < 10) {
        formattedtime += ":0" + secs;
      } else {
        formattedtime += ":" + secs;
      }
      return formattedtime;
    },

    showWarningDialog : function (title, text) {
      var msg = '<div id=rg2-warning-dialog>' + text + '</div>';
      $(msg).dialog({
        title : title,
        dialogClass : "rg2-warning-dialog",
        close : function () {
          $('#rg2-warning-dialog').dialog('destroy').remove();
        },
        buttons : {
          Ok : function () {
            $(this).dialog("close");
          }
        }
      });
    },

    setButtonState : function (state, buttonArray) {
      // bulk enable/disable for buttons
      var i;
      for (i = 0; i < buttonArray.length; i += 1) {
        $(buttonArray[i]).button(state);
      }
    },

    generateOption : function (value, text, selected) {
      var opt;
      opt = document.createElement("option");
      opt.value = value;
      opt.text = text;
      if (selected) {
        opt.selected = true;
      }
      return opt;
    },

    extractAttributeZero : function (nodelist, attribute, defaultValue) {
      if (nodelist.length > 0) {
        return nodelist[0].getAttribute(attribute).trim();
      }
      return defaultValue;
    },

    extractTextContentZero : function (nodelist, defaultValue) {
      if (nodelist.length > 0) {
        return nodelist[0].textContent.trim();
      }
      return defaultValue;
    },

    createModalDialog : function (dlg) {
      var self;
      self = this;
      self.onDo = dlg.onDo;
      self.onCancel = dlg.onCancel;
      $(dlg.selector).dialog({
        title : dlg.title,
        modal : true,
        dialogClass : "no-close " + dlg.classes,
        closeOnEscape : false,
        buttons : [{
          text : dlg.doText,
          click : function () {
            self.onDo();
          }
        }, {
          text : "Cancel",
          click : function () {
            self.onCancel();
          }
        }]
      });
    }
  };

  Number.prototype.toRad = function () {
    return this * Math.PI / 180;
  };

  function Colours() {
    // used to generate track colours: add extra colours as necessary
    this.colours = ["#ff0000", "#ff8000", "#ff00ff", "#ff0080", "#008080", "#008000", "#0080ff", "#0000ff", "#8000ff", "#808080"];
    //this.colours = ["#ff0000", "#ff8000",  "#ff00ff", "#ff0080", "#008080", "#008000", "#00ff00", "#0080ff", "#0000ff", "#8000ff", "#00ffff", "#808080"];

    this.colourIndex = 0;
  }

  Colours.prototype = {
    Constructor : Colours,

    getNextColour : function () {
      this.colourIndex = (this.colourIndex + 1) % this.colours.length;
      return this.colours[this.colourIndex];
    }
  };

  function User(keksi) {
    this.x = "";
    this.y = keksi;
    this.name = null;
    this.password = null;
  }

  User.prototype = {
    Constructor : User,

    setDetails : function (name, password) {
      if ((name.length > 4) && (password.length > 4)) {
        this.name = name;
        this.password = password;
        return true;
      }
      return false;
    },

    alterString : function (input, pattern) {
      var i, str;
      str = "";
      for (i = 0; i < input.length; i += 1) {
        str += input.charAt(i) + pattern.charAt(i);
      }
      return str;
    },

    encodeUser : function () {
      return {x: this.alterString(this.name + this.password, this.y), y: this.y};
    }
  };

  function RouteData() {
    this.courseid = null;
    this.coursename = null;
    this.resultid = null;
    this.isScoreCourse = false;
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
    this.splits = [];
  }

  function RequestedHash() {
    this.id = 0;
    this.courses = [];
    this.routes = [];
  }

  RequestedHash.prototype = {
    Constructor : RequestedHash,

    parseHash : function (hash) {
      var fields, i;
      // input looks like #id&course=a,b,c&result=x,y,z
      fields = hash.split('&');
      for (i = 0; i < fields.length; i += 1) {
        fields[i] = fields[i].toLowerCase();
        if (fields[i].search('#') !== -1) {
          this.id = parseInt(fields[i].replace("#", ""), 10);
        }
        if (fields[i].search('course=') !== -1) {
          this.courses = fields[i].replace("course=", "").split(',');
        }
        if (fields[i].search('route=') !== -1) {
          this.routes = fields[i].replace("route=", "").split(',');
        }
      }
      // convert to integers: NaNs sort themselves out on display so don't check here
      this.courses = this.courses.map(Number);
      this.routes = this.routes.map(Number);

      if (isNaN(this.id)) {
        this.id = 0;
        this.courses.length = 0;
        this.routes.length = 0;
      }
    },

    getRoutes : function () {
      return this.routes;
    },

    getCourses : function () {
      return this.courses;
    },

    getID : function () {
      return this.id;
    },

    getTab : function () {
      if (this.routes.length > 0) {
        return rg2.config.TAB_RESULTS;
      }
      return rg2.config.TAB_COURSES;
    },

    setCourses : function () {
      this.courses = rg2.courses.getCoursesOnDisplay();
      window.history.pushState('', '', this.getHash());
    },

    setRoutes : function () {
      this.routes = rg2.results.getTracksOnDisplay();
      window.history.pushState('', '', this.getHash());
    },

    setNewEvent : function (id) {
      this.id = id;
      this.courses.length = 0;
      this.routes.length = 0;
      window.history.pushState('', '', this.getHash());
    },

    getHash : function () {
      var hash;
      if (this.id === 0) {
        return '#0';
      }
      hash = '#' + this.id;
      hash += this.extractItems(this.courses, "&course=");
      hash += this.extractItems(this.routes, "&route=");
      return hash;
    },

    extractItems : function (items, text) {
      var i, extrahash;
      extrahash = "";
      if (items.length > 0) {
        extrahash += text;
        for (i = 0; i < items.length; i += 1) {
          if (i > 0) {
            extrahash += ',';
          }
          extrahash += items[i];
        }
      }
      return extrahash;
    }
  };
  rg2.utils = utils;
  rg2.RouteData = RouteData;
  rg2.RequestedHash = RequestedHash;
  rg2.Colours = Colours;
  rg2.User = User;
}());

/*! https://mths.be/he v0.5.0 by @mathias | MIT license */
;(function() {
  /*--------------------------------------------------------------------------*/
  // All astral symbols.
  var regexAstralSymbols = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
  // All ASCII symbols (not just printable ASCII) except those listed in the
  // first column of the overrides table.
  // http://whatwg.org/html/tokenization.html#table-charref-overrides
  var regexAsciiWhitelist = /[\x01-\x7F]/g;
  // All BMP symbols that are not ASCII newlines, printable ASCII symbols, or
  // code points listed in the first column of the overrides table on
  // http://whatwg.org/html/tokenization.html#table-charref-overrides.
  var regexBmpWhitelist = /[\x01-\t\x0B\f\x0E-\x1F\x7F\x81\x8D\x8F\x90\x9D\xA0-\uFFFF]/g;
  var regexEncodeNonAscii = /<\u20D2|=\u20E5|>\u20D2|\u205F\u200A|\u219D\u0338|\u2202\u0338|\u2220\u20D2|\u2229\uFE00|\u222A\uFE00|\u223C\u20D2|\u223D\u0331|\u223E\u0333|\u2242\u0338|\u224B\u0338|\u224D\u20D2|\u224E\u0338|\u224F\u0338|\u2250\u0338|\u2261\u20E5|\u2264\u20D2|\u2265\u20D2|\u2266\u0338|\u2267\u0338|\u2268\uFE00|\u2269\uFE00|\u226A\u0338|\u226A\u20D2|\u226B\u0338|\u226B\u20D2|\u227F\u0338|\u2282\u20D2|\u2283\u20D2|\u228A\uFE00|\u228B\uFE00|\u228F\u0338|\u2290\u0338|\u2293\uFE00|\u2294\uFE00|\u22B4\u20D2|\u22B5\u20D2|\u22D8\u0338|\u22D9\u0338|\u22DA\uFE00|\u22DB\uFE00|\u22F5\u0338|\u22F9\u0338|\u2933\u0338|\u29CF\u0338|\u29D0\u0338|\u2A6D\u0338|\u2A70\u0338|\u2A7D\u0338|\u2A7E\u0338|\u2AA1\u0338|\u2AA2\u0338|\u2AAC\uFE00|\u2AAD\uFE00|\u2AAF\u0338|\u2AB0\u0338|\u2AC5\u0338|\u2AC6\u0338|\u2ACB\uFE00|\u2ACC\uFE00|\u2AFD\u20E5|[\xA0-\u0113\u0116-\u0122\u0124-\u012B\u012E-\u014D\u0150-\u017E\u0192\u01B5\u01F5\u0237\u02C6\u02C7\u02D8-\u02DD\u0311\u0391-\u03A1\u03A3-\u03A9\u03B1-\u03C9\u03D1\u03D2\u03D5\u03D6\u03DC\u03DD\u03F0\u03F1\u03F5\u03F6\u0401-\u040C\u040E-\u044F\u0451-\u045C\u045E\u045F\u2002-\u2005\u2007-\u2010\u2013-\u2016\u2018-\u201A\u201C-\u201E\u2020-\u2022\u2025\u2026\u2030-\u2035\u2039\u203A\u203E\u2041\u2043\u2044\u204F\u2057\u205F-\u2063\u20AC\u20DB\u20DC\u2102\u2105\u210A-\u2113\u2115-\u211E\u2122\u2124\u2127-\u2129\u212C\u212D\u212F-\u2131\u2133-\u2138\u2145-\u2148\u2153-\u215E\u2190-\u219B\u219D-\u21A7\u21A9-\u21AE\u21B0-\u21B3\u21B5-\u21B7\u21BA-\u21DB\u21DD\u21E4\u21E5\u21F5\u21FD-\u2205\u2207-\u2209\u220B\u220C\u220F-\u2214\u2216-\u2218\u221A\u221D-\u2238\u223A-\u2257\u2259\u225A\u225C\u225F-\u2262\u2264-\u228B\u228D-\u229B\u229D-\u22A5\u22A7-\u22B0\u22B2-\u22BB\u22BD-\u22DB\u22DE-\u22E3\u22E6-\u22F7\u22F9-\u22FE\u2305\u2306\u2308-\u2310\u2312\u2313\u2315\u2316\u231C-\u231F\u2322\u2323\u232D\u232E\u2336\u233D\u233F\u237C\u23B0\u23B1\u23B4-\u23B6\u23DC-\u23DF\u23E2\u23E7\u2423\u24C8\u2500\u2502\u250C\u2510\u2514\u2518\u251C\u2524\u252C\u2534\u253C\u2550-\u256C\u2580\u2584\u2588\u2591-\u2593\u25A1\u25AA\u25AB\u25AD\u25AE\u25B1\u25B3-\u25B5\u25B8\u25B9\u25BD-\u25BF\u25C2\u25C3\u25CA\u25CB\u25EC\u25EF\u25F8-\u25FC\u2605\u2606\u260E\u2640\u2642\u2660\u2663\u2665\u2666\u266A\u266D-\u266F\u2713\u2717\u2720\u2736\u2758\u2772\u2773\u27C8\u27C9\u27E6-\u27ED\u27F5-\u27FA\u27FC\u27FF\u2902-\u2905\u290C-\u2913\u2916\u2919-\u2920\u2923-\u292A\u2933\u2935-\u2939\u293C\u293D\u2945\u2948-\u294B\u294E-\u2976\u2978\u2979\u297B-\u297F\u2985\u2986\u298B-\u2996\u299A\u299C\u299D\u29A4-\u29B7\u29B9\u29BB\u29BC\u29BE-\u29C5\u29C9\u29CD-\u29D0\u29DC-\u29DE\u29E3-\u29E5\u29EB\u29F4\u29F6\u2A00-\u2A02\u2A04\u2A06\u2A0C\u2A0D\u2A10-\u2A17\u2A22-\u2A27\u2A29\u2A2A\u2A2D-\u2A31\u2A33-\u2A3C\u2A3F\u2A40\u2A42-\u2A4D\u2A50\u2A53-\u2A58\u2A5A-\u2A5D\u2A5F\u2A66\u2A6A\u2A6D-\u2A75\u2A77-\u2A9A\u2A9D-\u2AA2\u2AA4-\u2AB0\u2AB3-\u2AC8\u2ACB\u2ACC\u2ACF-\u2ADB\u2AE4\u2AE6-\u2AE9\u2AEB-\u2AF3\u2AFD\uFB00-\uFB04]|\uD835[\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDCCF\uDD04\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDD6B]/g;
  var encodeMap = {
    '\xC1' : 'Aacute',
    '\xE1' : 'aacute',
    '\u0102' : 'Abreve',
    '\u0103' : 'abreve',
    '\u223E' : 'ac',
    '\u223F' : 'acd',
    '\u223E\u0333' : 'acE',
    '\xC2' : 'Acirc',
    '\xE2' : 'acirc',
    '\xB4' : 'acute',
    '\u0410' : 'Acy',
    '\u0430' : 'acy',
    '\xC6' : 'AElig',
    '\xE6' : 'aelig',
    '\u2061' : 'af',
    '\uD835\uDD04' : 'Afr',
    '\uD835\uDD1E' : 'afr',
    '\xC0' : 'Agrave',
    '\xE0' : 'agrave',
    '\u2135' : 'aleph',
    '\u0391' : 'Alpha',
    '\u03B1' : 'alpha',
    '\u0100' : 'Amacr',
    '\u0101' : 'amacr',
    '\u2A3F' : 'amalg',
    '&' : 'amp',
    '\u2A55' : 'andand',
    '\u2A53' : 'And',
    '\u2227' : 'and',
    '\u2A5C' : 'andd',
    '\u2A58' : 'andslope',
    '\u2A5A' : 'andv',
    '\u2220' : 'ang',
    '\u29A4' : 'ange',
    '\u29A8' : 'angmsdaa',
    '\u29A9' : 'angmsdab',
    '\u29AA' : 'angmsdac',
    '\u29AB' : 'angmsdad',
    '\u29AC' : 'angmsdae',
    '\u29AD' : 'angmsdaf',
    '\u29AE' : 'angmsdag',
    '\u29AF' : 'angmsdah',
    '\u2221' : 'angmsd',
    '\u221F' : 'angrt',
    '\u22BE' : 'angrtvb',
    '\u299D' : 'angrtvbd',
    '\u2222' : 'angsph',
    '\xC5' : 'angst',
    '\u237C' : 'angzarr',
    '\u0104' : 'Aogon',
    '\u0105' : 'aogon',
    '\uD835\uDD38' : 'Aopf',
    '\uD835\uDD52' : 'aopf',
    '\u2A6F' : 'apacir',
    '\u2248' : 'ap',
    '\u2A70' : 'apE',
    '\u224A' : 'ape',
    '\u224B' : 'apid',
    '\'' : 'apos',
    '\xE5' : 'aring',
    '\uD835\uDC9C' : 'Ascr',
    '\uD835\uDCB6' : 'ascr',
    '\u2254' : 'colone',
    '*' : 'ast',
    '\u224D' : 'CupCap',
    '\xC3' : 'Atilde',
    '\xE3' : 'atilde',
    '\xC4' : 'Auml',
    '\xE4' : 'auml',
    '\u2233' : 'awconint',
    '\u2A11' : 'awint',
    '\u224C' : 'bcong',
    '\u03F6' : 'bepsi',
    '\u2035' : 'bprime',
    '\u223D' : 'bsim',
    '\u22CD' : 'bsime',
    '\u2216' : 'setmn',
    '\u2AE7' : 'Barv',
    '\u22BD' : 'barvee',
    '\u2305' : 'barwed',
    '\u2306' : 'Barwed',
    '\u23B5' : 'bbrk',
    '\u23B6' : 'bbrktbrk',
    '\u0411' : 'Bcy',
    '\u0431' : 'bcy',
    '\u201E' : 'bdquo',
    '\u2235' : 'becaus',
    '\u29B0' : 'bemptyv',
    '\u212C' : 'Bscr',
    '\u0392' : 'Beta',
    '\u03B2' : 'beta',
    '\u2136' : 'beth',
    '\u226C' : 'twixt',
    '\uD835\uDD05' : 'Bfr',
    '\uD835\uDD1F' : 'bfr',
    '\u22C2' : 'xcap',
    '\u25EF' : 'xcirc',
    '\u22C3' : 'xcup',
    '\u2A00' : 'xodot',
    '\u2A01' : 'xoplus',
    '\u2A02' : 'xotime',
    '\u2A06' : 'xsqcup',
    '\u2605' : 'starf',
    '\u25BD' : 'xdtri',
    '\u25B3' : 'xutri',
    '\u2A04' : 'xuplus',
    '\u22C1' : 'Vee',
    '\u22C0' : 'Wedge',
    '\u290D' : 'rbarr',
    '\u29EB' : 'lozf',
    '\u25AA' : 'squf',
    '\u25B4' : 'utrif',
    '\u25BE' : 'dtrif',
    '\u25C2' : 'ltrif',
    '\u25B8' : 'rtrif',
    '\u2423' : 'blank',
    '\u2592' : 'blk12',
    '\u2591' : 'blk14',
    '\u2593' : 'blk34',
    '\u2588' : 'block',
    '=\u20E5' : 'bne',
    '\u2261\u20E5' : 'bnequiv',
    '\u2AED' : 'bNot',
    '\u2310' : 'bnot',
    '\uD835\uDD39' : 'Bopf',
    '\uD835\uDD53' : 'bopf',
    '\u22A5' : 'bot',
    '\u22C8' : 'bowtie',
    '\u29C9' : 'boxbox',
    '\u2510' : 'boxdl',
    '\u2555' : 'boxdL',
    '\u2556' : 'boxDl',
    '\u2557' : 'boxDL',
    '\u250C' : 'boxdr',
    '\u2552' : 'boxdR',
    '\u2553' : 'boxDr',
    '\u2554' : 'boxDR',
    '\u2500' : 'boxh',
    '\u2550' : 'boxH',
    '\u252C' : 'boxhd',
    '\u2564' : 'boxHd',
    '\u2565' : 'boxhD',
    '\u2566' : 'boxHD',
    '\u2534' : 'boxhu',
    '\u2567' : 'boxHu',
    '\u2568' : 'boxhU',
    '\u2569' : 'boxHU',
    '\u229F' : 'minusb',
    '\u229E' : 'plusb',
    '\u22A0' : 'timesb',
    '\u2518' : 'boxul',
    '\u255B' : 'boxuL',
    '\u255C' : 'boxUl',
    '\u255D' : 'boxUL',
    '\u2514' : 'boxur',
    '\u2558' : 'boxuR',
    '\u2559' : 'boxUr',
    '\u255A' : 'boxUR',
    '\u2502' : 'boxv',
    '\u2551' : 'boxV',
    '\u253C' : 'boxvh',
    '\u256A' : 'boxvH',
    '\u256B' : 'boxVh',
    '\u256C' : 'boxVH',
    '\u2524' : 'boxvl',
    '\u2561' : 'boxvL',
    '\u2562' : 'boxVl',
    '\u2563' : 'boxVL',
    '\u251C' : 'boxvr',
    '\u255E' : 'boxvR',
    '\u255F' : 'boxVr',
    '\u2560' : 'boxVR',
    '\u02D8' : 'breve',
    '\xA6' : 'brvbar',
    '\uD835\uDCB7' : 'bscr',
    '\u204F' : 'bsemi',
    '\u29C5' : 'bsolb',
    '\\' : 'bsol',
    '\u27C8' : 'bsolhsub',
    '\u2022' : 'bull',
    '\u224E' : 'bump',
    '\u2AAE' : 'bumpE',
    '\u224F' : 'bumpe',
    '\u0106' : 'Cacute',
    '\u0107' : 'cacute',
    '\u2A44' : 'capand',
    '\u2A49' : 'capbrcup',
    '\u2A4B' : 'capcap',
    '\u2229' : 'cap',
    '\u22D2' : 'Cap',
    '\u2A47' : 'capcup',
    '\u2A40' : 'capdot',
    '\u2145' : 'DD',
    '\u2229\uFE00' : 'caps',
    '\u2041' : 'caret',
    '\u02C7' : 'caron',
    '\u212D' : 'Cfr',
    '\u2A4D' : 'ccaps',
    '\u010C' : 'Ccaron',
    '\u010D' : 'ccaron',
    '\xC7' : 'Ccedil',
    '\xE7' : 'ccedil',
    '\u0108' : 'Ccirc',
    '\u0109' : 'ccirc',
    '\u2230' : 'Cconint',
    '\u2A4C' : 'ccups',
    '\u2A50' : 'ccupssm',
    '\u010A' : 'Cdot',
    '\u010B' : 'cdot',
    '\xB8' : 'cedil',
    '\u29B2' : 'cemptyv',
    '\xA2' : 'cent',
    '\xB7' : 'middot',
    '\uD835\uDD20' : 'cfr',
    '\u0427' : 'CHcy',
    '\u0447' : 'chcy',
    '\u2713' : 'check',
    '\u03A7' : 'Chi',
    '\u03C7' : 'chi',
    '\u02C6' : 'circ',
    '\u2257' : 'cire',
    '\u21BA' : 'olarr',
    '\u21BB' : 'orarr',
    '\u229B' : 'oast',
    '\u229A' : 'ocir',
    '\u229D' : 'odash',
    '\u2299' : 'odot',
    '\xAE' : 'reg',
    '\u24C8' : 'oS',
    '\u2296' : 'ominus',
    '\u2295' : 'oplus',
    '\u2297' : 'otimes',
    '\u25CB' : 'cir',
    '\u29C3' : 'cirE',
    '\u2A10' : 'cirfnint',
    '\u2AEF' : 'cirmid',
    '\u29C2' : 'cirscir',
    '\u2232' : 'cwconint',
    '\u201D' : 'rdquo',
    '\u2019' : 'rsquo',
    '\u2663' : 'clubs',
    ':' : 'colon',
    '\u2237' : 'Colon',
    '\u2A74' : 'Colone',
    ',' : 'comma',
    '@' : 'commat',
    '\u2201' : 'comp',
    '\u2218' : 'compfn',
    '\u2102' : 'Copf',
    '\u2245' : 'cong',
    '\u2A6D' : 'congdot',
    '\u2261' : 'equiv',
    '\u222E' : 'oint',
    '\u222F' : 'Conint',
    '\uD835\uDD54' : 'copf',
    '\u2210' : 'coprod',
    '\xA9' : 'copy',
    '\u2117' : 'copysr',
    '\u21B5' : 'crarr',
    '\u2717' : 'cross',
    '\u2A2F' : 'Cross',
    '\uD835\uDC9E' : 'Cscr',
    '\uD835\uDCB8' : 'cscr',
    '\u2ACF' : 'csub',
    '\u2AD1' : 'csube',
    '\u2AD0' : 'csup',
    '\u2AD2' : 'csupe',
    '\u22EF' : 'ctdot',
    '\u2938' : 'cudarrl',
    '\u2935' : 'cudarrr',
    '\u22DE' : 'cuepr',
    '\u22DF' : 'cuesc',
    '\u21B6' : 'cularr',
    '\u293D' : 'cularrp',
    '\u2A48' : 'cupbrcap',
    '\u2A46' : 'cupcap',
    '\u222A' : 'cup',
    '\u22D3' : 'Cup',
    '\u2A4A' : 'cupcup',
    '\u228D' : 'cupdot',
    '\u2A45' : 'cupor',
    '\u222A\uFE00' : 'cups',
    '\u21B7' : 'curarr',
    '\u293C' : 'curarrm',
    '\u22CE' : 'cuvee',
    '\u22CF' : 'cuwed',
    '\xA4' : 'curren',
    '\u2231' : 'cwint',
    '\u232D' : 'cylcty',
    '\u2020' : 'dagger',
    '\u2021' : 'Dagger',
    '\u2138' : 'daleth',
    '\u2193' : 'darr',
    '\u21A1' : 'Darr',
    '\u21D3' : 'dArr',
    '\u2010' : 'dash',
    '\u2AE4' : 'Dashv',
    '\u22A3' : 'dashv',
    '\u290F' : 'rBarr',
    '\u02DD' : 'dblac',
    '\u010E' : 'Dcaron',
    '\u010F' : 'dcaron',
    '\u0414' : 'Dcy',
    '\u0434' : 'dcy',
    '\u21CA' : 'ddarr',
    '\u2146' : 'dd',
    '\u2911' : 'DDotrahd',
    '\u2A77' : 'eDDot',
    '\xB0' : 'deg',
    '\u2207' : 'Del',
    '\u0394' : 'Delta',
    '\u03B4' : 'delta',
    '\u29B1' : 'demptyv',
    '\u297F' : 'dfisht',
    '\uD835\uDD07' : 'Dfr',
    '\uD835\uDD21' : 'dfr',
    '\u2965' : 'dHar',
    '\u21C3' : 'dharl',
    '\u21C2' : 'dharr',
    '\u02D9' : 'dot',
    '`' : 'grave',
    '\u02DC' : 'tilde',
    '\u22C4' : 'diam',
    '\u2666' : 'diams',
    '\xA8' : 'die',
    '\u03DD' : 'gammad',
    '\u22F2' : 'disin',
    '\xF7' : 'div',
    '\u22C7' : 'divonx',
    '\u0402' : 'DJcy',
    '\u0452' : 'djcy',
    '\u231E' : 'dlcorn',
    '\u230D' : 'dlcrop',
    '$' : 'dollar',
    '\uD835\uDD3B' : 'Dopf',
    '\uD835\uDD55' : 'dopf',
    '\u20DC' : 'DotDot',
    '\u2250' : 'doteq',
    '\u2251' : 'eDot',
    '\u2238' : 'minusd',
    '\u2214' : 'plusdo',
    '\u22A1' : 'sdotb',
    '\u21D0' : 'lArr',
    '\u21D4' : 'iff',
    '\u27F8' : 'xlArr',
    '\u27FA' : 'xhArr',
    '\u27F9' : 'xrArr',
    '\u21D2' : 'rArr',
    '\u22A8' : 'vDash',
    '\u21D1' : 'uArr',
    '\u21D5' : 'vArr',
    '\u2225' : 'par',
    '\u2913' : 'DownArrowBar',
    '\u21F5' : 'duarr',
    '\u0311' : 'DownBreve',
    '\u2950' : 'DownLeftRightVector',
    '\u295E' : 'DownLeftTeeVector',
    '\u2956' : 'DownLeftVectorBar',
    '\u21BD' : 'lhard',
    '\u295F' : 'DownRightTeeVector',
    '\u2957' : 'DownRightVectorBar',
    '\u21C1' : 'rhard',
    '\u21A7' : 'mapstodown',
    '\u22A4' : 'top',
    '\u2910' : 'RBarr',
    '\u231F' : 'drcorn',
    '\u230C' : 'drcrop',
    '\uD835\uDC9F' : 'Dscr',
    '\uD835\uDCB9' : 'dscr',
    '\u0405' : 'DScy',
    '\u0455' : 'dscy',
    '\u29F6' : 'dsol',
    '\u0110' : 'Dstrok',
    '\u0111' : 'dstrok',
    '\u22F1' : 'dtdot',
    '\u25BF' : 'dtri',
    '\u296F' : 'duhar',
    '\u29A6' : 'dwangle',
    '\u040F' : 'DZcy',
    '\u045F' : 'dzcy',
    '\u27FF' : 'dzigrarr',
    '\xC9' : 'Eacute',
    '\xE9' : 'eacute',
    '\u2A6E' : 'easter',
    '\u011A' : 'Ecaron',
    '\u011B' : 'ecaron',
    '\xCA' : 'Ecirc',
    '\xEA' : 'ecirc',
    '\u2256' : 'ecir',
    '\u2255' : 'ecolon',
    '\u042D' : 'Ecy',
    '\u044D' : 'ecy',
    '\u0116' : 'Edot',
    '\u0117' : 'edot',
    '\u2147' : 'ee',
    '\u2252' : 'efDot',
    '\uD835\uDD08' : 'Efr',
    '\uD835\uDD22' : 'efr',
    '\u2A9A' : 'eg',
    '\xC8' : 'Egrave',
    '\xE8' : 'egrave',
    '\u2A96' : 'egs',
    '\u2A98' : 'egsdot',
    '\u2A99' : 'el',
    '\u2208' : 'in',
    '\u23E7' : 'elinters',
    '\u2113' : 'ell',
    '\u2A95' : 'els',
    '\u2A97' : 'elsdot',
    '\u0112' : 'Emacr',
    '\u0113' : 'emacr',
    '\u2205' : 'empty',
    '\u25FB' : 'EmptySmallSquare',
    '\u25AB' : 'EmptyVerySmallSquare',
    '\u2004' : 'emsp13',
    '\u2005' : 'emsp14',
    '\u2003' : 'emsp',
    '\u014A' : 'ENG',
    '\u014B' : 'eng',
    '\u2002' : 'ensp',
    '\u0118' : 'Eogon',
    '\u0119' : 'eogon',
    '\uD835\uDD3C' : 'Eopf',
    '\uD835\uDD56' : 'eopf',
    '\u22D5' : 'epar',
    '\u29E3' : 'eparsl',
    '\u2A71' : 'eplus',
    '\u03B5' : 'epsi',
    '\u0395' : 'Epsilon',
    '\u03F5' : 'epsiv',
    '\u2242' : 'esim',
    '\u2A75' : 'Equal',
    '=' : 'equals',
    '\u225F' : 'equest',
    '\u21CC' : 'rlhar',
    '\u2A78' : 'equivDD',
    '\u29E5' : 'eqvparsl',
    '\u2971' : 'erarr',
    '\u2253' : 'erDot',
    '\u212F' : 'escr',
    '\u2130' : 'Escr',
    '\u2A73' : 'Esim',
    '\u0397' : 'Eta',
    '\u03B7' : 'eta',
    '\xD0' : 'ETH',
    '\xF0' : 'eth',
    '\xCB' : 'Euml',
    '\xEB' : 'euml',
    '\u20AC' : 'euro',
    '!' : 'excl',
    '\u2203' : 'exist',
    '\u0424' : 'Fcy',
    '\u0444' : 'fcy',
    '\u2640' : 'female',
    '\uFB03' : 'ffilig',
    '\uFB00' : 'fflig',
    '\uFB04' : 'ffllig',
    '\uD835\uDD09' : 'Ffr',
    '\uD835\uDD23' : 'ffr',
    '\uFB01' : 'filig',
    '\u25FC' : 'FilledSmallSquare',
    'fj' : 'fjlig',
    '\u266D' : 'flat',
    '\uFB02' : 'fllig',
    '\u25B1' : 'fltns',
    '\u0192' : 'fnof',
    '\uD835\uDD3D' : 'Fopf',
    '\uD835\uDD57' : 'fopf',
    '\u2200' : 'forall',
    '\u22D4' : 'fork',
    '\u2AD9' : 'forkv',
    '\u2131' : 'Fscr',
    '\u2A0D' : 'fpartint',
    '\xBD' : 'half',
    '\u2153' : 'frac13',
    '\xBC' : 'frac14',
    '\u2155' : 'frac15',
    '\u2159' : 'frac16',
    '\u215B' : 'frac18',
    '\u2154' : 'frac23',
    '\u2156' : 'frac25',
    '\xBE' : 'frac34',
    '\u2157' : 'frac35',
    '\u215C' : 'frac38',
    '\u2158' : 'frac45',
    '\u215A' : 'frac56',
    '\u215D' : 'frac58',
    '\u215E' : 'frac78',
    '\u2044' : 'frasl',
    '\u2322' : 'frown',
    '\uD835\uDCBB' : 'fscr',
    '\u01F5' : 'gacute',
    '\u0393' : 'Gamma',
    '\u03B3' : 'gamma',
    '\u03DC' : 'Gammad',
    '\u2A86' : 'gap',
    '\u011E' : 'Gbreve',
    '\u011F' : 'gbreve',
    '\u0122' : 'Gcedil',
    '\u011C' : 'Gcirc',
    '\u011D' : 'gcirc',
    '\u0413' : 'Gcy',
    '\u0433' : 'gcy',
    '\u0120' : 'Gdot',
    '\u0121' : 'gdot',
    '\u2265' : 'ge',
    '\u2267' : 'gE',
    '\u2A8C' : 'gEl',
    '\u22DB' : 'gel',
    '\u2A7E' : 'ges',
    '\u2AA9' : 'gescc',
    '\u2A80' : 'gesdot',
    '\u2A82' : 'gesdoto',
    '\u2A84' : 'gesdotol',
    '\u22DB\uFE00' : 'gesl',
    '\u2A94' : 'gesles',
    '\uD835\uDD0A' : 'Gfr',
    '\uD835\uDD24' : 'gfr',
    '\u226B' : 'gg',
    '\u22D9' : 'Gg',
    '\u2137' : 'gimel',
    '\u0403' : 'GJcy',
    '\u0453' : 'gjcy',
    '\u2AA5' : 'gla',
    '\u2277' : 'gl',
    '\u2A92' : 'glE',
    '\u2AA4' : 'glj',
    '\u2A8A' : 'gnap',
    '\u2A88' : 'gne',
    '\u2269' : 'gnE',
    '\u22E7' : 'gnsim',
    '\uD835\uDD3E' : 'Gopf',
    '\uD835\uDD58' : 'gopf',
    '\u2AA2' : 'GreaterGreater',
    '\u2273' : 'gsim',
    '\uD835\uDCA2' : 'Gscr',
    '\u210A' : 'gscr',
    '\u2A8E' : 'gsime',
    '\u2A90' : 'gsiml',
    '\u2AA7' : 'gtcc',
    '\u2A7A' : 'gtcir',
    '>' : 'gt',
    '\u22D7' : 'gtdot',
    '\u2995' : 'gtlPar',
    '\u2A7C' : 'gtquest',
    '\u2978' : 'gtrarr',
    '\u2269\uFE00' : 'gvnE',
    '\u200A' : 'hairsp',
    '\u210B' : 'Hscr',
    '\u042A' : 'HARDcy',
    '\u044A' : 'hardcy',
    '\u2948' : 'harrcir',
    '\u2194' : 'harr',
    '\u21AD' : 'harrw',
    '^' : 'Hat',
    '\u210F' : 'hbar',
    '\u0124' : 'Hcirc',
    '\u0125' : 'hcirc',
    '\u2665' : 'hearts',
    '\u2026' : 'mldr',
    '\u22B9' : 'hercon',
    '\uD835\uDD25' : 'hfr',
    '\u210C' : 'Hfr',
    '\u2925' : 'searhk',
    '\u2926' : 'swarhk',
    '\u21FF' : 'hoarr',
    '\u223B' : 'homtht',
    '\u21A9' : 'larrhk',
    '\u21AA' : 'rarrhk',
    '\uD835\uDD59' : 'hopf',
    '\u210D' : 'Hopf',
    '\u2015' : 'horbar',
    '\uD835\uDCBD' : 'hscr',
    '\u0126' : 'Hstrok',
    '\u0127' : 'hstrok',
    '\u2043' : 'hybull',
    '\xCD' : 'Iacute',
    '\xED' : 'iacute',
    '\u2063' : 'ic',
    '\xCE' : 'Icirc',
    '\xEE' : 'icirc',
    '\u0418' : 'Icy',
    '\u0438' : 'icy',
    '\u0130' : 'Idot',
    '\u0415' : 'IEcy',
    '\u0435' : 'iecy',
    '\xA1' : 'iexcl',
    '\uD835\uDD26' : 'ifr',
    '\u2111' : 'Im',
    '\xCC' : 'Igrave',
    '\xEC' : 'igrave',
    '\u2148' : 'ii',
    '\u2A0C' : 'qint',
    '\u222D' : 'tint',
    '\u29DC' : 'iinfin',
    '\u2129' : 'iiota',
    '\u0132' : 'IJlig',
    '\u0133' : 'ijlig',
    '\u012A' : 'Imacr',
    '\u012B' : 'imacr',
    '\u2110' : 'Iscr',
    '\u0131' : 'imath',
    '\u22B7' : 'imof',
    '\u01B5' : 'imped',
    '\u2105' : 'incare',
    '\u221E' : 'infin',
    '\u29DD' : 'infintie',
    '\u22BA' : 'intcal',
    '\u222B' : 'int',
    '\u222C' : 'Int',
    '\u2124' : 'Zopf',
    '\u2A17' : 'intlarhk',
    '\u2A3C' : 'iprod',
    '\u2062' : 'it',
    '\u0401' : 'IOcy',
    '\u0451' : 'iocy',
    '\u012E' : 'Iogon',
    '\u012F' : 'iogon',
    '\uD835\uDD40' : 'Iopf',
    '\uD835\uDD5A' : 'iopf',
    '\u0399' : 'Iota',
    '\u03B9' : 'iota',
    '\xBF' : 'iquest',
    '\uD835\uDCBE' : 'iscr',
    '\u22F5' : 'isindot',
    '\u22F9' : 'isinE',
    '\u22F4' : 'isins',
    '\u22F3' : 'isinsv',
    '\u0128' : 'Itilde',
    '\u0129' : 'itilde',
    '\u0406' : 'Iukcy',
    '\u0456' : 'iukcy',
    '\xCF' : 'Iuml',
    '\xEF' : 'iuml',
    '\u0134' : 'Jcirc',
    '\u0135' : 'jcirc',
    '\u0419' : 'Jcy',
    '\u0439' : 'jcy',
    '\uD835\uDD0D' : 'Jfr',
    '\uD835\uDD27' : 'jfr',
    '\u0237' : 'jmath',
    '\uD835\uDD41' : 'Jopf',
    '\uD835\uDD5B' : 'jopf',
    '\uD835\uDCA5' : 'Jscr',
    '\uD835\uDCBF' : 'jscr',
    '\u0408' : 'Jsercy',
    '\u0458' : 'jsercy',
    '\u0404' : 'Jukcy',
    '\u0454' : 'jukcy',
    '\u039A' : 'Kappa',
    '\u03BA' : 'kappa',
    '\u03F0' : 'kappav',
    '\u0136' : 'Kcedil',
    '\u0137' : 'kcedil',
    '\u041A' : 'Kcy',
    '\u043A' : 'kcy',
    '\uD835\uDD0E' : 'Kfr',
    '\uD835\uDD28' : 'kfr',
    '\u0138' : 'kgreen',
    '\u0425' : 'KHcy',
    '\u0445' : 'khcy',
    '\u040C' : 'KJcy',
    '\u045C' : 'kjcy',
    '\uD835\uDD42' : 'Kopf',
    '\uD835\uDD5C' : 'kopf',
    '\uD835\uDCA6' : 'Kscr',
    '\uD835\uDCC0' : 'kscr',
    '\u21DA' : 'lAarr',
    '\u0139' : 'Lacute',
    '\u013A' : 'lacute',
    '\u29B4' : 'laemptyv',
    '\u2112' : 'Lscr',
    '\u039B' : 'Lambda',
    '\u03BB' : 'lambda',
    '\u27E8' : 'lang',
    '\u27EA' : 'Lang',
    '\u2991' : 'langd',
    '\u2A85' : 'lap',
    '\xAB' : 'laquo',
    '\u21E4' : 'larrb',
    '\u291F' : 'larrbfs',
    '\u2190' : 'larr',
    '\u219E' : 'Larr',
    '\u291D' : 'larrfs',
    '\u21AB' : 'larrlp',
    '\u2939' : 'larrpl',
    '\u2973' : 'larrsim',
    '\u21A2' : 'larrtl',
    '\u2919' : 'latail',
    '\u291B' : 'lAtail',
    '\u2AAB' : 'lat',
    '\u2AAD' : 'late',
    '\u2AAD\uFE00' : 'lates',
    '\u290C' : 'lbarr',
    '\u290E' : 'lBarr',
    '\u2772' : 'lbbrk',
    '{' : 'lcub',
    '[' : 'lsqb',
    '\u298B' : 'lbrke',
    '\u298F' : 'lbrksld',
    '\u298D' : 'lbrkslu',
    '\u013D' : 'Lcaron',
    '\u013E' : 'lcaron',
    '\u013B' : 'Lcedil',
    '\u013C' : 'lcedil',
    '\u2308' : 'lceil',
    '\u041B' : 'Lcy',
    '\u043B' : 'lcy',
    '\u2936' : 'ldca',
    '\u201C' : 'ldquo',
    '\u2967' : 'ldrdhar',
    '\u294B' : 'ldrushar',
    '\u21B2' : 'ldsh',
    '\u2264' : 'le',
    '\u2266' : 'lE',
    '\u21C6' : 'lrarr',
    '\u27E6' : 'lobrk',
    '\u2961' : 'LeftDownTeeVector',
    '\u2959' : 'LeftDownVectorBar',
    '\u230A' : 'lfloor',
    '\u21BC' : 'lharu',
    '\u21C7' : 'llarr',
    '\u21CB' : 'lrhar',
    '\u294E' : 'LeftRightVector',
    '\u21A4' : 'mapstoleft',
    '\u295A' : 'LeftTeeVector',
    '\u22CB' : 'lthree',
    '\u29CF' : 'LeftTriangleBar',
    '\u22B2' : 'vltri',
    '\u22B4' : 'ltrie',
    '\u2951' : 'LeftUpDownVector',
    '\u2960' : 'LeftUpTeeVector',
    '\u2958' : 'LeftUpVectorBar',
    '\u21BF' : 'uharl',
    '\u2952' : 'LeftVectorBar',
    '\u2A8B' : 'lEg',
    '\u22DA' : 'leg',
    '\u2A7D' : 'les',
    '\u2AA8' : 'lescc',
    '\u2A7F' : 'lesdot',
    '\u2A81' : 'lesdoto',
    '\u2A83' : 'lesdotor',
    '\u22DA\uFE00' : 'lesg',
    '\u2A93' : 'lesges',
    '\u22D6' : 'ltdot',
    '\u2276' : 'lg',
    '\u2AA1' : 'LessLess',
    '\u2272' : 'lsim',
    '\u297C' : 'lfisht',
    '\uD835\uDD0F' : 'Lfr',
    '\uD835\uDD29' : 'lfr',
    '\u2A91' : 'lgE',
    '\u2962' : 'lHar',
    '\u296A' : 'lharul',
    '\u2584' : 'lhblk',
    '\u0409' : 'LJcy',
    '\u0459' : 'ljcy',
    '\u226A' : 'll',
    '\u22D8' : 'Ll',
    '\u296B' : 'llhard',
    '\u25FA' : 'lltri',
    '\u013F' : 'Lmidot',
    '\u0140' : 'lmidot',
    '\u23B0' : 'lmoust',
    '\u2A89' : 'lnap',
    '\u2A87' : 'lne',
    '\u2268' : 'lnE',
    '\u22E6' : 'lnsim',
    '\u27EC' : 'loang',
    '\u21FD' : 'loarr',
    '\u27F5' : 'xlarr',
    '\u27F7' : 'xharr',
    '\u27FC' : 'xmap',
    '\u27F6' : 'xrarr',
    '\u21AC' : 'rarrlp',
    '\u2985' : 'lopar',
    '\uD835\uDD43' : 'Lopf',
    '\uD835\uDD5D' : 'lopf',
    '\u2A2D' : 'loplus',
    '\u2A34' : 'lotimes',
    '\u2217' : 'lowast',
    '_' : 'lowbar',
    '\u2199' : 'swarr',
    '\u2198' : 'searr',
    '\u25CA' : 'loz',
    '(' : 'lpar',
    '\u2993' : 'lparlt',
    '\u296D' : 'lrhard',
    '\u200E' : 'lrm',
    '\u22BF' : 'lrtri',
    '\u2039' : 'lsaquo',
    '\uD835\uDCC1' : 'lscr',
    '\u21B0' : 'lsh',
    '\u2A8D' : 'lsime',
    '\u2A8F' : 'lsimg',
    '\u2018' : 'lsquo',
    '\u201A' : 'sbquo',
    '\u0141' : 'Lstrok',
    '\u0142' : 'lstrok',
    '\u2AA6' : 'ltcc',
    '\u2A79' : 'ltcir',
    '<' : 'lt',
    '\u22C9' : 'ltimes',
    '\u2976' : 'ltlarr',
    '\u2A7B' : 'ltquest',
    '\u25C3' : 'ltri',
    '\u2996' : 'ltrPar',
    '\u294A' : 'lurdshar',
    '\u2966' : 'luruhar',
    '\u2268\uFE00' : 'lvnE',
    '\xAF' : 'macr',
    '\u2642' : 'male',
    '\u2720' : 'malt',
    '\u2905' : 'Map',
    '\u21A6' : 'map',
    '\u21A5' : 'mapstoup',
    '\u25AE' : 'marker',
    '\u2A29' : 'mcomma',
    '\u041C' : 'Mcy',
    '\u043C' : 'mcy',
    '\u2014' : 'mdash',
    '\u223A' : 'mDDot',
    '\u205F' : 'MediumSpace',
    '\u2133' : 'Mscr',
    '\uD835\uDD10' : 'Mfr',
    '\uD835\uDD2A' : 'mfr',
    '\u2127' : 'mho',
    '\xB5' : 'micro',
    '\u2AF0' : 'midcir',
    '\u2223' : 'mid',
    '\u2212' : 'minus',
    '\u2A2A' : 'minusdu',
    '\u2213' : 'mp',
    '\u2ADB' : 'mlcp',
    '\u22A7' : 'models',
    '\uD835\uDD44' : 'Mopf',
    '\uD835\uDD5E' : 'mopf',
    '\uD835\uDCC2' : 'mscr',
    '\u039C' : 'Mu',
    '\u03BC' : 'mu',
    '\u22B8' : 'mumap',
    '\u0143' : 'Nacute',
    '\u0144' : 'nacute',
    '\u2220\u20D2' : 'nang',
    '\u2249' : 'nap',
    '\u2A70\u0338' : 'napE',
    '\u224B\u0338' : 'napid',
    '\u0149' : 'napos',
    '\u266E' : 'natur',
    '\u2115' : 'Nopf',
    '\xA0' : 'nbsp',
    '\u224E\u0338' : 'nbump',
    '\u224F\u0338' : 'nbumpe',
    '\u2A43' : 'ncap',
    '\u0147' : 'Ncaron',
    '\u0148' : 'ncaron',
    '\u0145' : 'Ncedil',
    '\u0146' : 'ncedil',
    '\u2247' : 'ncong',
    '\u2A6D\u0338' : 'ncongdot',
    '\u2A42' : 'ncup',
    '\u041D' : 'Ncy',
    '\u043D' : 'ncy',
    '\u2013' : 'ndash',
    '\u2924' : 'nearhk',
    '\u2197' : 'nearr',
    '\u21D7' : 'neArr',
    '\u2260' : 'ne',
    '\u2250\u0338' : 'nedot',
    '\u200B' : 'ZeroWidthSpace',
    '\u2262' : 'nequiv',
    '\u2928' : 'toea',
    '\u2242\u0338' : 'nesim',
    '\n' : 'NewLine',
    '\u2204' : 'nexist',
    '\uD835\uDD11' : 'Nfr',
    '\uD835\uDD2B' : 'nfr',
    '\u2267\u0338' : 'ngE',
    '\u2271' : 'nge',
    '\u2A7E\u0338' : 'nges',
    '\u22D9\u0338' : 'nGg',
    '\u2275' : 'ngsim',
    '\u226B\u20D2' : 'nGt',
    '\u226F' : 'ngt',
    '\u226B\u0338' : 'nGtv',
    '\u21AE' : 'nharr',
    '\u21CE' : 'nhArr',
    '\u2AF2' : 'nhpar',
    '\u220B' : 'ni',
    '\u22FC' : 'nis',
    '\u22FA' : 'nisd',
    '\u040A' : 'NJcy',
    '\u045A' : 'njcy',
    '\u219A' : 'nlarr',
    '\u21CD' : 'nlArr',
    '\u2025' : 'nldr',
    '\u2266\u0338' : 'nlE',
    '\u2270' : 'nle',
    '\u2A7D\u0338' : 'nles',
    '\u226E' : 'nlt',
    '\u22D8\u0338' : 'nLl',
    '\u2274' : 'nlsim',
    '\u226A\u20D2' : 'nLt',
    '\u22EA' : 'nltri',
    '\u22EC' : 'nltrie',
    '\u226A\u0338' : 'nLtv',
    '\u2224' : 'nmid',
    '\u2060' : 'NoBreak',
    '\uD835\uDD5F' : 'nopf',
    '\u2AEC' : 'Not',
    '\xAC' : 'not',
    '\u226D' : 'NotCupCap',
    '\u2226' : 'npar',
    '\u2209' : 'notin',
    '\u2279' : 'ntgl',
    '\u22F5\u0338' : 'notindot',
    '\u22F9\u0338' : 'notinE',
    '\u22F7' : 'notinvb',
    '\u22F6' : 'notinvc',
    '\u29CF\u0338' : 'NotLeftTriangleBar',
    '\u2278' : 'ntlg',
    '\u2AA2\u0338' : 'NotNestedGreaterGreater',
    '\u2AA1\u0338' : 'NotNestedLessLess',
    '\u220C' : 'notni',
    '\u22FE' : 'notnivb',
    '\u22FD' : 'notnivc',
    '\u2280' : 'npr',
    '\u2AAF\u0338' : 'npre',
    '\u22E0' : 'nprcue',
    '\u29D0\u0338' : 'NotRightTriangleBar',
    '\u22EB' : 'nrtri',
    '\u22ED' : 'nrtrie',
    '\u228F\u0338' : 'NotSquareSubset',
    '\u22E2' : 'nsqsube',
    '\u2290\u0338' : 'NotSquareSuperset',
    '\u22E3' : 'nsqsupe',
    '\u2282\u20D2' : 'vnsub',
    '\u2288' : 'nsube',
    '\u2281' : 'nsc',
    '\u2AB0\u0338' : 'nsce',
    '\u22E1' : 'nsccue',
    '\u227F\u0338' : 'NotSucceedsTilde',
    '\u2283\u20D2' : 'vnsup',
    '\u2289' : 'nsupe',
    '\u2241' : 'nsim',
    '\u2244' : 'nsime',
    '\u2AFD\u20E5' : 'nparsl',
    '\u2202\u0338' : 'npart',
    '\u2A14' : 'npolint',
    '\u2933\u0338' : 'nrarrc',
    '\u219B' : 'nrarr',
    '\u21CF' : 'nrArr',
    '\u219D\u0338' : 'nrarrw',
    '\uD835\uDCA9' : 'Nscr',
    '\uD835\uDCC3' : 'nscr',
    '\u2284' : 'nsub',
    '\u2AC5\u0338' : 'nsubE',
    '\u2285' : 'nsup',
    '\u2AC6\u0338' : 'nsupE',
    '\xD1' : 'Ntilde',
    '\xF1' : 'ntilde',
    '\u039D' : 'Nu',
    '\u03BD' : 'nu',
    '#' : 'num',
    '\u2116' : 'numero',
    '\u2007' : 'numsp',
    '\u224D\u20D2' : 'nvap',
    '\u22AC' : 'nvdash',
    '\u22AD' : 'nvDash',
    '\u22AE' : 'nVdash',
    '\u22AF' : 'nVDash',
    '\u2265\u20D2' : 'nvge',
    '>\u20D2' : 'nvgt',
    '\u2904' : 'nvHarr',
    '\u29DE' : 'nvinfin',
    '\u2902' : 'nvlArr',
    '\u2264\u20D2' : 'nvle',
    '<\u20D2' : 'nvlt',
    '\u22B4\u20D2' : 'nvltrie',
    '\u2903' : 'nvrArr',
    '\u22B5\u20D2' : 'nvrtrie',
    '\u223C\u20D2' : 'nvsim',
    '\u2923' : 'nwarhk',
    '\u2196' : 'nwarr',
    '\u21D6' : 'nwArr',
    '\u2927' : 'nwnear',
    '\xD3' : 'Oacute',
    '\xF3' : 'oacute',
    '\xD4' : 'Ocirc',
    '\xF4' : 'ocirc',
    '\u041E' : 'Ocy',
    '\u043E' : 'ocy',
    '\u0150' : 'Odblac',
    '\u0151' : 'odblac',
    '\u2A38' : 'odiv',
    '\u29BC' : 'odsold',
    '\u0152' : 'OElig',
    '\u0153' : 'oelig',
    '\u29BF' : 'ofcir',
    '\uD835\uDD12' : 'Ofr',
    '\uD835\uDD2C' : 'ofr',
    '\u02DB' : 'ogon',
    '\xD2' : 'Ograve',
    '\xF2' : 'ograve',
    '\u29C1' : 'ogt',
    '\u29B5' : 'ohbar',
    '\u03A9' : 'ohm',
    '\u29BE' : 'olcir',
    '\u29BB' : 'olcross',
    '\u203E' : 'oline',
    '\u29C0' : 'olt',
    '\u014C' : 'Omacr',
    '\u014D' : 'omacr',
    '\u03C9' : 'omega',
    '\u039F' : 'Omicron',
    '\u03BF' : 'omicron',
    '\u29B6' : 'omid',
    '\uD835\uDD46' : 'Oopf',
    '\uD835\uDD60' : 'oopf',
    '\u29B7' : 'opar',
    '\u29B9' : 'operp',
    '\u2A54' : 'Or',
    '\u2228' : 'or',
    '\u2A5D' : 'ord',
    '\u2134' : 'oscr',
    '\xAA' : 'ordf',
    '\xBA' : 'ordm',
    '\u22B6' : 'origof',
    '\u2A56' : 'oror',
    '\u2A57' : 'orslope',
    '\u2A5B' : 'orv',
    '\uD835\uDCAA' : 'Oscr',
    '\xD8' : 'Oslash',
    '\xF8' : 'oslash',
    '\u2298' : 'osol',
    '\xD5' : 'Otilde',
    '\xF5' : 'otilde',
    '\u2A36' : 'otimesas',
    '\u2A37' : 'Otimes',
    '\xD6' : 'Ouml',
    '\xF6' : 'ouml',
    '\u233D' : 'ovbar',
    '\u23DE' : 'OverBrace',
    '\u23B4' : 'tbrk',
    '\u23DC' : 'OverParenthesis',
    '\xB6' : 'para',
    '\u2AF3' : 'parsim',
    '\u2AFD' : 'parsl',
    '\u2202' : 'part',
    '\u041F' : 'Pcy',
    '\u043F' : 'pcy',
    '%' : 'percnt',
    '.' : 'period',
    '\u2030' : 'permil',
    '\u2031' : 'pertenk',
    '\uD835\uDD13' : 'Pfr',
    '\uD835\uDD2D' : 'pfr',
    '\u03A6' : 'Phi',
    '\u03C6' : 'phi',
    '\u03D5' : 'phiv',
    '\u260E' : 'phone',
    '\u03A0' : 'Pi',
    '\u03C0' : 'pi',
    '\u03D6' : 'piv',
    '\u210E' : 'planckh',
    '\u2A23' : 'plusacir',
    '\u2A22' : 'pluscir',
    '+' : 'plus',
    '\u2A25' : 'plusdu',
    '\u2A72' : 'pluse',
    '\xB1' : 'pm',
    '\u2A26' : 'plussim',
    '\u2A27' : 'plustwo',
    '\u2A15' : 'pointint',
    '\uD835\uDD61' : 'popf',
    '\u2119' : 'Popf',
    '\xA3' : 'pound',
    '\u2AB7' : 'prap',
    '\u2ABB' : 'Pr',
    '\u227A' : 'pr',
    '\u227C' : 'prcue',
    '\u2AAF' : 'pre',
    '\u227E' : 'prsim',
    '\u2AB9' : 'prnap',
    '\u2AB5' : 'prnE',
    '\u22E8' : 'prnsim',
    '\u2AB3' : 'prE',
    '\u2032' : 'prime',
    '\u2033' : 'Prime',
    '\u220F' : 'prod',
    '\u232E' : 'profalar',
    '\u2312' : 'profline',
    '\u2313' : 'profsurf',
    '\u221D' : 'prop',
    '\u22B0' : 'prurel',
    '\uD835\uDCAB' : 'Pscr',
    '\uD835\uDCC5' : 'pscr',
    '\u03A8' : 'Psi',
    '\u03C8' : 'psi',
    '\u2008' : 'puncsp',
    '\uD835\uDD14' : 'Qfr',
    '\uD835\uDD2E' : 'qfr',
    '\uD835\uDD62' : 'qopf',
    '\u211A' : 'Qopf',
    '\u2057' : 'qprime',
    '\uD835\uDCAC' : 'Qscr',
    '\uD835\uDCC6' : 'qscr',
    '\u2A16' : 'quatint',
    '?' : 'quest',
    '"' : 'quot',
    '\u21DB' : 'rAarr',
    '\u223D\u0331' : 'race',
    '\u0154' : 'Racute',
    '\u0155' : 'racute',
    '\u221A' : 'Sqrt',
    '\u29B3' : 'raemptyv',
    '\u27E9' : 'rang',
    '\u27EB' : 'Rang',
    '\u2992' : 'rangd',
    '\u29A5' : 'range',
    '\xBB' : 'raquo',
    '\u2975' : 'rarrap',
    '\u21E5' : 'rarrb',
    '\u2920' : 'rarrbfs',
    '\u2933' : 'rarrc',
    '\u2192' : 'rarr',
    '\u21A0' : 'Rarr',
    '\u291E' : 'rarrfs',
    '\u2945' : 'rarrpl',
    '\u2974' : 'rarrsim',
    '\u2916' : 'Rarrtl',
    '\u21A3' : 'rarrtl',
    '\u219D' : 'rarrw',
    '\u291A' : 'ratail',
    '\u291C' : 'rAtail',
    '\u2236' : 'ratio',
    '\u2773' : 'rbbrk',
    '}' : 'rcub',
    ']' : 'rsqb',
    '\u298C' : 'rbrke',
    '\u298E' : 'rbrksld',
    '\u2990' : 'rbrkslu',
    '\u0158' : 'Rcaron',
    '\u0159' : 'rcaron',
    '\u0156' : 'Rcedil',
    '\u0157' : 'rcedil',
    '\u2309' : 'rceil',
    '\u0420' : 'Rcy',
    '\u0440' : 'rcy',
    '\u2937' : 'rdca',
    '\u2969' : 'rdldhar',
    '\u21B3' : 'rdsh',
    '\u211C' : 'Re',
    '\u211B' : 'Rscr',
    '\u211D' : 'Ropf',
    '\u25AD' : 'rect',
    '\u297D' : 'rfisht',
    '\u230B' : 'rfloor',
    '\uD835\uDD2F' : 'rfr',
    '\u2964' : 'rHar',
    '\u21C0' : 'rharu',
    '\u296C' : 'rharul',
    '\u03A1' : 'Rho',
    '\u03C1' : 'rho',
    '\u03F1' : 'rhov',
    '\u21C4' : 'rlarr',
    '\u27E7' : 'robrk',
    '\u295D' : 'RightDownTeeVector',
    '\u2955' : 'RightDownVectorBar',
    '\u21C9' : 'rrarr',
    '\u22A2' : 'vdash',
    '\u295B' : 'RightTeeVector',
    '\u22CC' : 'rthree',
    '\u29D0' : 'RightTriangleBar',
    '\u22B3' : 'vrtri',
    '\u22B5' : 'rtrie',
    '\u294F' : 'RightUpDownVector',
    '\u295C' : 'RightUpTeeVector',
    '\u2954' : 'RightUpVectorBar',
    '\u21BE' : 'uharr',
    '\u2953' : 'RightVectorBar',
    '\u02DA' : 'ring',
    '\u200F' : 'rlm',
    '\u23B1' : 'rmoust',
    '\u2AEE' : 'rnmid',
    '\u27ED' : 'roang',
    '\u21FE' : 'roarr',
    '\u2986' : 'ropar',
    '\uD835\uDD63' : 'ropf',
    '\u2A2E' : 'roplus',
    '\u2A35' : 'rotimes',
    '\u2970' : 'RoundImplies',
    ')' : 'rpar',
    '\u2994' : 'rpargt',
    '\u2A12' : 'rppolint',
    '\u203A' : 'rsaquo',
    '\uD835\uDCC7' : 'rscr',
    '\u21B1' : 'rsh',
    '\u22CA' : 'rtimes',
    '\u25B9' : 'rtri',
    '\u29CE' : 'rtriltri',
    '\u29F4' : 'RuleDelayed',
    '\u2968' : 'ruluhar',
    '\u211E' : 'rx',
    '\u015A' : 'Sacute',
    '\u015B' : 'sacute',
    '\u2AB8' : 'scap',
    '\u0160' : 'Scaron',
    '\u0161' : 'scaron',
    '\u2ABC' : 'Sc',
    '\u227B' : 'sc',
    '\u227D' : 'sccue',
    '\u2AB0' : 'sce',
    '\u2AB4' : 'scE',
    '\u015E' : 'Scedil',
    '\u015F' : 'scedil',
    '\u015C' : 'Scirc',
    '\u015D' : 'scirc',
    '\u2ABA' : 'scnap',
    '\u2AB6' : 'scnE',
    '\u22E9' : 'scnsim',
    '\u2A13' : 'scpolint',
    '\u227F' : 'scsim',
    '\u0421' : 'Scy',
    '\u0441' : 'scy',
    '\u22C5' : 'sdot',
    '\u2A66' : 'sdote',
    '\u21D8' : 'seArr',
    '\xA7' : 'sect',
    ';' : 'semi',
    '\u2929' : 'tosa',
    '\u2736' : 'sext',
    '\uD835\uDD16' : 'Sfr',
    '\uD835\uDD30' : 'sfr',
    '\u266F' : 'sharp',
    '\u0429' : 'SHCHcy',
    '\u0449' : 'shchcy',
    '\u0428' : 'SHcy',
    '\u0448' : 'shcy',
    '\u2191' : 'uarr',
    '\xAD' : 'shy',
    '\u03A3' : 'Sigma',
    '\u03C3' : 'sigma',
    '\u03C2' : 'sigmaf',
    '\u223C' : 'sim',
    '\u2A6A' : 'simdot',
    '\u2243' : 'sime',
    '\u2A9E' : 'simg',
    '\u2AA0' : 'simgE',
    '\u2A9D' : 'siml',
    '\u2A9F' : 'simlE',
    '\u2246' : 'simne',
    '\u2A24' : 'simplus',
    '\u2972' : 'simrarr',
    '\u2A33' : 'smashp',
    '\u29E4' : 'smeparsl',
    '\u2323' : 'smile',
    '\u2AAA' : 'smt',
    '\u2AAC' : 'smte',
    '\u2AAC\uFE00' : 'smtes',
    '\u042C' : 'SOFTcy',
    '\u044C' : 'softcy',
    '\u233F' : 'solbar',
    '\u29C4' : 'solb',
    '/' : 'sol',
    '\uD835\uDD4A' : 'Sopf',
    '\uD835\uDD64' : 'sopf',
    '\u2660' : 'spades',
    '\u2293' : 'sqcap',
    '\u2293\uFE00' : 'sqcaps',
    '\u2294' : 'sqcup',
    '\u2294\uFE00' : 'sqcups',
    '\u228F' : 'sqsub',
    '\u2291' : 'sqsube',
    '\u2290' : 'sqsup',
    '\u2292' : 'sqsupe',
    '\u25A1' : 'squ',
    '\uD835\uDCAE' : 'Sscr',
    '\uD835\uDCC8' : 'sscr',
    '\u22C6' : 'Star',
    '\u2606' : 'star',
    '\u2282' : 'sub',
    '\u22D0' : 'Sub',
    '\u2ABD' : 'subdot',
    '\u2AC5' : 'subE',
    '\u2286' : 'sube',
    '\u2AC3' : 'subedot',
    '\u2AC1' : 'submult',
    '\u2ACB' : 'subnE',
    '\u228A' : 'subne',
    '\u2ABF' : 'subplus',
    '\u2979' : 'subrarr',
    '\u2AC7' : 'subsim',
    '\u2AD5' : 'subsub',
    '\u2AD3' : 'subsup',
    '\u2211' : 'sum',
    '\u266A' : 'sung',
    '\xB9' : 'sup1',
    '\xB2' : 'sup2',
    '\xB3' : 'sup3',
    '\u2283' : 'sup',
    '\u22D1' : 'Sup',
    '\u2ABE' : 'supdot',
    '\u2AD8' : 'supdsub',
    '\u2AC6' : 'supE',
    '\u2287' : 'supe',
    '\u2AC4' : 'supedot',
    '\u27C9' : 'suphsol',
    '\u2AD7' : 'suphsub',
    '\u297B' : 'suplarr',
    '\u2AC2' : 'supmult',
    '\u2ACC' : 'supnE',
    '\u228B' : 'supne',
    '\u2AC0' : 'supplus',
    '\u2AC8' : 'supsim',
    '\u2AD4' : 'supsub',
    '\u2AD6' : 'supsup',
    '\u21D9' : 'swArr',
    '\u292A' : 'swnwar',
    '\xDF' : 'szlig',
    '\t' : 'Tab',
    '\u2316' : 'target',
    '\u03A4' : 'Tau',
    '\u03C4' : 'tau',
    '\u0164' : 'Tcaron',
    '\u0165' : 'tcaron',
    '\u0162' : 'Tcedil',
    '\u0163' : 'tcedil',
    '\u0422' : 'Tcy',
    '\u0442' : 'tcy',
    '\u20DB' : 'tdot',
    '\u2315' : 'telrec',
    '\uD835\uDD17' : 'Tfr',
    '\uD835\uDD31' : 'tfr',
    '\u2234' : 'there4',
    '\u0398' : 'Theta',
    '\u03B8' : 'theta',
    '\u03D1' : 'thetav',
    '\u205F\u200A' : 'ThickSpace',
    '\u2009' : 'thinsp',
    '\xDE' : 'THORN',
    '\xFE' : 'thorn',
    '\u2A31' : 'timesbar',
    '\xD7' : 'times',
    '\u2A30' : 'timesd',
    '\u2336' : 'topbot',
    '\u2AF1' : 'topcir',
    '\uD835\uDD4B' : 'Topf',
    '\uD835\uDD65' : 'topf',
    '\u2ADA' : 'topfork',
    '\u2034' : 'tprime',
    '\u2122' : 'trade',
    '\u25B5' : 'utri',
    '\u225C' : 'trie',
    '\u25EC' : 'tridot',
    '\u2A3A' : 'triminus',
    '\u2A39' : 'triplus',
    '\u29CD' : 'trisb',
    '\u2A3B' : 'tritime',
    '\u23E2' : 'trpezium',
    '\uD835\uDCAF' : 'Tscr',
    '\uD835\uDCC9' : 'tscr',
    '\u0426' : 'TScy',
    '\u0446' : 'tscy',
    '\u040B' : 'TSHcy',
    '\u045B' : 'tshcy',
    '\u0166' : 'Tstrok',
    '\u0167' : 'tstrok',
    '\xDA' : 'Uacute',
    '\xFA' : 'uacute',
    '\u219F' : 'Uarr',
    '\u2949' : 'Uarrocir',
    '\u040E' : 'Ubrcy',
    '\u045E' : 'ubrcy',
    '\u016C' : 'Ubreve',
    '\u016D' : 'ubreve',
    '\xDB' : 'Ucirc',
    '\xFB' : 'ucirc',
    '\u0423' : 'Ucy',
    '\u0443' : 'ucy',
    '\u21C5' : 'udarr',
    '\u0170' : 'Udblac',
    '\u0171' : 'udblac',
    '\u296E' : 'udhar',
    '\u297E' : 'ufisht',
    '\uD835\uDD18' : 'Ufr',
    '\uD835\uDD32' : 'ufr',
    '\xD9' : 'Ugrave',
    '\xF9' : 'ugrave',
    '\u2963' : 'uHar',
    '\u2580' : 'uhblk',
    '\u231C' : 'ulcorn',
    '\u230F' : 'ulcrop',
    '\u25F8' : 'ultri',
    '\u016A' : 'Umacr',
    '\u016B' : 'umacr',
    '\u23DF' : 'UnderBrace',
    '\u23DD' : 'UnderParenthesis',
    '\u228E' : 'uplus',
    '\u0172' : 'Uogon',
    '\u0173' : 'uogon',
    '\uD835\uDD4C' : 'Uopf',
    '\uD835\uDD66' : 'uopf',
    '\u2912' : 'UpArrowBar',
    '\u2195' : 'varr',
    '\u03C5' : 'upsi',
    '\u03D2' : 'Upsi',
    '\u03A5' : 'Upsilon',
    '\u21C8' : 'uuarr',
    '\u231D' : 'urcorn',
    '\u230E' : 'urcrop',
    '\u016E' : 'Uring',
    '\u016F' : 'uring',
    '\u25F9' : 'urtri',
    '\uD835\uDCB0' : 'Uscr',
    '\uD835\uDCCA' : 'uscr',
    '\u22F0' : 'utdot',
    '\u0168' : 'Utilde',
    '\u0169' : 'utilde',
    '\xDC' : 'Uuml',
    '\xFC' : 'uuml',
    '\u29A7' : 'uwangle',
    '\u299C' : 'vangrt',
    '\u228A\uFE00' : 'vsubne',
    '\u2ACB\uFE00' : 'vsubnE',
    '\u228B\uFE00' : 'vsupne',
    '\u2ACC\uFE00' : 'vsupnE',
    '\u2AE8' : 'vBar',
    '\u2AEB' : 'Vbar',
    '\u2AE9' : 'vBarv',
    '\u0412' : 'Vcy',
    '\u0432' : 'vcy',
    '\u22A9' : 'Vdash',
    '\u22AB' : 'VDash',
    '\u2AE6' : 'Vdashl',
    '\u22BB' : 'veebar',
    '\u225A' : 'veeeq',
    '\u22EE' : 'vellip',
    '|' : 'vert',
    '\u2016' : 'Vert',
    '\u2758' : 'VerticalSeparator',
    '\u2240' : 'wr',
    '\uD835\uDD19' : 'Vfr',
    '\uD835\uDD33' : 'vfr',
    '\uD835\uDD4D' : 'Vopf',
    '\uD835\uDD67' : 'vopf',
    '\uD835\uDCB1' : 'Vscr',
    '\uD835\uDCCB' : 'vscr',
    '\u22AA' : 'Vvdash',
    '\u299A' : 'vzigzag',
    '\u0174' : 'Wcirc',
    '\u0175' : 'wcirc',
    '\u2A5F' : 'wedbar',
    '\u2259' : 'wedgeq',
    '\u2118' : 'wp',
    '\uD835\uDD1A' : 'Wfr',
    '\uD835\uDD34' : 'wfr',
    '\uD835\uDD4E' : 'Wopf',
    '\uD835\uDD68' : 'wopf',
    '\uD835\uDCB2' : 'Wscr',
    '\uD835\uDCCC' : 'wscr',
    '\uD835\uDD1B' : 'Xfr',
    '\uD835\uDD35' : 'xfr',
    '\u039E' : 'Xi',
    '\u03BE' : 'xi',
    '\u22FB' : 'xnis',
    '\uD835\uDD4F' : 'Xopf',
    '\uD835\uDD69' : 'xopf',
    '\uD835\uDCB3' : 'Xscr',
    '\uD835\uDCCD' : 'xscr',
    '\xDD' : 'Yacute',
    '\xFD' : 'yacute',
    '\u042F' : 'YAcy',
    '\u044F' : 'yacy',
    '\u0176' : 'Ycirc',
    '\u0177' : 'ycirc',
    '\u042B' : 'Ycy',
    '\u044B' : 'ycy',
    '\xA5' : 'yen',
    '\uD835\uDD1C' : 'Yfr',
    '\uD835\uDD36' : 'yfr',
    '\u0407' : 'YIcy',
    '\u0457' : 'yicy',
    '\uD835\uDD50' : 'Yopf',
    '\uD835\uDD6A' : 'yopf',
    '\uD835\uDCB4' : 'Yscr',
    '\uD835\uDCCE' : 'yscr',
    '\u042E' : 'YUcy',
    '\u044E' : 'yucy',
    '\xFF' : 'yuml',
    '\u0178' : 'Yuml',
    '\u0179' : 'Zacute',
    '\u017A' : 'zacute',
    '\u017D' : 'Zcaron',
    '\u017E' : 'zcaron',
    '\u0417' : 'Zcy',
    '\u0437' : 'zcy',
    '\u017B' : 'Zdot',
    '\u017C' : 'zdot',
    '\u2128' : 'Zfr',
    '\u0396' : 'Zeta',
    '\u03B6' : 'zeta',
    '\uD835\uDD37' : 'zfr',
    '\u0416' : 'ZHcy',
    '\u0436' : 'zhcy',
    '\u21DD' : 'zigrarr',
    '\uD835\uDD6B' : 'zopf',
    '\uD835\uDCB5' : 'Zscr',
    '\uD835\uDCCF' : 'zscr',
    '\u200D' : 'zwj',
    '\u200C' : 'zwnj'
  };
  var regexEscape = /["&'<>`]/g;
  var escapeMap = {
    '"' : '&quot;',
    '&' : '&amp;',
    '\'' : '&#x27;',
    '<' : '&lt;',
    // See https://mathiasbynens.be/notes/ambiguous-ampersands: in HTML, the
    // following is not strictly necessary unless it’s part of a tag or an
    // unquoted attribute value. We’re only escaping it to support those
    // situations, and for XML support.
    '>' : '&gt;',
    // In Internet Explorer ≤ 8, the backtick character can be used
    // to break out of (un)quoted attribute values or HTML comments.
    // See http://html5sec.org/#102, http://html5sec.org/#108, and
    // http://html5sec.org/#133.
    '`' : '&#x60;'
  };
  var regexInvalidEntity = /&#(?:[xX][^a-fA-F0-9]|[^0-9xX])/;
  var regexInvalidRawCodePoint = /[\0-\x08\x0B\x0E-\x1F\x7F-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]|[\uD83F\uD87F\uD8BF\uD8FF\uD93F\uD97F\uD9BF\uD9FF\uDA3F\uDA7F\uDABF\uDAFF\uDB3F\uDB7F\uDBBF\uDBFF][\uDFFE\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
  var regexDecode = /&#([0-9]+)(;?)|&#[xX]([a-fA-F0-9]+)(;?)|&([0-9a-zA-Z]+);|&(Aacute|iacute|Uacute|plusmn|otilde|Otilde|Agrave|agrave|yacute|Yacute|oslash|Oslash|Atilde|atilde|brvbar|Ccedil|ccedil|ograve|curren|divide|Eacute|eacute|Ograve|oacute|Egrave|egrave|ugrave|frac12|frac14|frac34|Ugrave|Oacute|Iacute|ntilde|Ntilde|uacute|middot|Igrave|igrave|iquest|aacute|laquo|THORN|micro|iexcl|icirc|Icirc|Acirc|ucirc|ecirc|Ocirc|ocirc|Ecirc|Ucirc|aring|Aring|aelig|AElig|acute|pound|raquo|acirc|times|thorn|szlig|cedil|COPY|Auml|ordf|ordm|uuml|macr|Uuml|auml|Ouml|ouml|para|nbsp|Euml|quot|QUOT|euml|yuml|cent|sect|copy|sup1|sup2|sup3|Iuml|iuml|shy|eth|reg|not|yen|amp|AMP|REG|uml|ETH|deg|gt|GT|LT|lt)([=a-zA-Z0-9])?/g;
  var decodeMap = {
    'Aacute' : '\xC1',
    'aacute' : '\xE1',
    'Abreve' : '\u0102',
    'abreve' : '\u0103',
    'ac' : '\u223E',
    'acd' : '\u223F',
    'acE' : '\u223E\u0333',
    'Acirc' : '\xC2',
    'acirc' : '\xE2',
    'acute' : '\xB4',
    'Acy' : '\u0410',
    'acy' : '\u0430',
    'AElig' : '\xC6',
    'aelig' : '\xE6',
    'af' : '\u2061',
    'Afr' : '\uD835\uDD04',
    'afr' : '\uD835\uDD1E',
    'Agrave' : '\xC0',
    'agrave' : '\xE0',
    'alefsym' : '\u2135',
    'aleph' : '\u2135',
    'Alpha' : '\u0391',
    'alpha' : '\u03B1',
    'Amacr' : '\u0100',
    'amacr' : '\u0101',
    'amalg' : '\u2A3F',
    'amp' : '&',
    'AMP' : '&',
    'andand' : '\u2A55',
    'And' : '\u2A53',
    'and' : '\u2227',
    'andd' : '\u2A5C',
    'andslope' : '\u2A58',
    'andv' : '\u2A5A',
    'ang' : '\u2220',
    'ange' : '\u29A4',
    'angle' : '\u2220',
    'angmsdaa' : '\u29A8',
    'angmsdab' : '\u29A9',
    'angmsdac' : '\u29AA',
    'angmsdad' : '\u29AB',
    'angmsdae' : '\u29AC',
    'angmsdaf' : '\u29AD',
    'angmsdag' : '\u29AE',
    'angmsdah' : '\u29AF',
    'angmsd' : '\u2221',
    'angrt' : '\u221F',
    'angrtvb' : '\u22BE',
    'angrtvbd' : '\u299D',
    'angsph' : '\u2222',
    'angst' : '\xC5',
    'angzarr' : '\u237C',
    'Aogon' : '\u0104',
    'aogon' : '\u0105',
    'Aopf' : '\uD835\uDD38',
    'aopf' : '\uD835\uDD52',
    'apacir' : '\u2A6F',
    'ap' : '\u2248',
    'apE' : '\u2A70',
    'ape' : '\u224A',
    'apid' : '\u224B',
    'apos' : '\'',
    'ApplyFunction' : '\u2061',
    'approx' : '\u2248',
    'approxeq' : '\u224A',
    'Aring' : '\xC5',
    'aring' : '\xE5',
    'Ascr' : '\uD835\uDC9C',
    'ascr' : '\uD835\uDCB6',
    'Assign' : '\u2254',
    'ast' : '*',
    'asymp' : '\u2248',
    'asympeq' : '\u224D',
    'Atilde' : '\xC3',
    'atilde' : '\xE3',
    'Auml' : '\xC4',
    'auml' : '\xE4',
    'awconint' : '\u2233',
    'awint' : '\u2A11',
    'backcong' : '\u224C',
    'backepsilon' : '\u03F6',
    'backprime' : '\u2035',
    'backsim' : '\u223D',
    'backsimeq' : '\u22CD',
    'Backslash' : '\u2216',
    'Barv' : '\u2AE7',
    'barvee' : '\u22BD',
    'barwed' : '\u2305',
    'Barwed' : '\u2306',
    'barwedge' : '\u2305',
    'bbrk' : '\u23B5',
    'bbrktbrk' : '\u23B6',
    'bcong' : '\u224C',
    'Bcy' : '\u0411',
    'bcy' : '\u0431',
    'bdquo' : '\u201E',
    'becaus' : '\u2235',
    'because' : '\u2235',
    'Because' : '\u2235',
    'bemptyv' : '\u29B0',
    'bepsi' : '\u03F6',
    'bernou' : '\u212C',
    'Bernoullis' : '\u212C',
    'Beta' : '\u0392',
    'beta' : '\u03B2',
    'beth' : '\u2136',
    'between' : '\u226C',
    'Bfr' : '\uD835\uDD05',
    'bfr' : '\uD835\uDD1F',
    'bigcap' : '\u22C2',
    'bigcirc' : '\u25EF',
    'bigcup' : '\u22C3',
    'bigodot' : '\u2A00',
    'bigoplus' : '\u2A01',
    'bigotimes' : '\u2A02',
    'bigsqcup' : '\u2A06',
    'bigstar' : '\u2605',
    'bigtriangledown' : '\u25BD',
    'bigtriangleup' : '\u25B3',
    'biguplus' : '\u2A04',
    'bigvee' : '\u22C1',
    'bigwedge' : '\u22C0',
    'bkarow' : '\u290D',
    'blacklozenge' : '\u29EB',
    'blacksquare' : '\u25AA',
    'blacktriangle' : '\u25B4',
    'blacktriangledown' : '\u25BE',
    'blacktriangleleft' : '\u25C2',
    'blacktriangleright' : '\u25B8',
    'blank' : '\u2423',
    'blk12' : '\u2592',
    'blk14' : '\u2591',
    'blk34' : '\u2593',
    'block' : '\u2588',
    'bne' : '=\u20E5',
    'bnequiv' : '\u2261\u20E5',
    'bNot' : '\u2AED',
    'bnot' : '\u2310',
    'Bopf' : '\uD835\uDD39',
    'bopf' : '\uD835\uDD53',
    'bot' : '\u22A5',
    'bottom' : '\u22A5',
    'bowtie' : '\u22C8',
    'boxbox' : '\u29C9',
    'boxdl' : '\u2510',
    'boxdL' : '\u2555',
    'boxDl' : '\u2556',
    'boxDL' : '\u2557',
    'boxdr' : '\u250C',
    'boxdR' : '\u2552',
    'boxDr' : '\u2553',
    'boxDR' : '\u2554',
    'boxh' : '\u2500',
    'boxH' : '\u2550',
    'boxhd' : '\u252C',
    'boxHd' : '\u2564',
    'boxhD' : '\u2565',
    'boxHD' : '\u2566',
    'boxhu' : '\u2534',
    'boxHu' : '\u2567',
    'boxhU' : '\u2568',
    'boxHU' : '\u2569',
    'boxminus' : '\u229F',
    'boxplus' : '\u229E',
    'boxtimes' : '\u22A0',
    'boxul' : '\u2518',
    'boxuL' : '\u255B',
    'boxUl' : '\u255C',
    'boxUL' : '\u255D',
    'boxur' : '\u2514',
    'boxuR' : '\u2558',
    'boxUr' : '\u2559',
    'boxUR' : '\u255A',
    'boxv' : '\u2502',
    'boxV' : '\u2551',
    'boxvh' : '\u253C',
    'boxvH' : '\u256A',
    'boxVh' : '\u256B',
    'boxVH' : '\u256C',
    'boxvl' : '\u2524',
    'boxvL' : '\u2561',
    'boxVl' : '\u2562',
    'boxVL' : '\u2563',
    'boxvr' : '\u251C',
    'boxvR' : '\u255E',
    'boxVr' : '\u255F',
    'boxVR' : '\u2560',
    'bprime' : '\u2035',
    'breve' : '\u02D8',
    'Breve' : '\u02D8',
    'brvbar' : '\xA6',
    'bscr' : '\uD835\uDCB7',
    'Bscr' : '\u212C',
    'bsemi' : '\u204F',
    'bsim' : '\u223D',
    'bsime' : '\u22CD',
    'bsolb' : '\u29C5',
    'bsol' : '\\',
    'bsolhsub' : '\u27C8',
    'bull' : '\u2022',
    'bullet' : '\u2022',
    'bump' : '\u224E',
    'bumpE' : '\u2AAE',
    'bumpe' : '\u224F',
    'Bumpeq' : '\u224E',
    'bumpeq' : '\u224F',
    'Cacute' : '\u0106',
    'cacute' : '\u0107',
    'capand' : '\u2A44',
    'capbrcup' : '\u2A49',
    'capcap' : '\u2A4B',
    'cap' : '\u2229',
    'Cap' : '\u22D2',
    'capcup' : '\u2A47',
    'capdot' : '\u2A40',
    'CapitalDifferentialD' : '\u2145',
    'caps' : '\u2229\uFE00',
    'caret' : '\u2041',
    'caron' : '\u02C7',
    'Cayleys' : '\u212D',
    'ccaps' : '\u2A4D',
    'Ccaron' : '\u010C',
    'ccaron' : '\u010D',
    'Ccedil' : '\xC7',
    'ccedil' : '\xE7',
    'Ccirc' : '\u0108',
    'ccirc' : '\u0109',
    'Cconint' : '\u2230',
    'ccups' : '\u2A4C',
    'ccupssm' : '\u2A50',
    'Cdot' : '\u010A',
    'cdot' : '\u010B',
    'cedil' : '\xB8',
    'Cedilla' : '\xB8',
    'cemptyv' : '\u29B2',
    'cent' : '\xA2',
    'centerdot' : '\xB7',
    'CenterDot' : '\xB7',
    'cfr' : '\uD835\uDD20',
    'Cfr' : '\u212D',
    'CHcy' : '\u0427',
    'chcy' : '\u0447',
    'check' : '\u2713',
    'checkmark' : '\u2713',
    'Chi' : '\u03A7',
    'chi' : '\u03C7',
    'circ' : '\u02C6',
    'circeq' : '\u2257',
    'circlearrowleft' : '\u21BA',
    'circlearrowright' : '\u21BB',
    'circledast' : '\u229B',
    'circledcirc' : '\u229A',
    'circleddash' : '\u229D',
    'CircleDot' : '\u2299',
    'circledR' : '\xAE',
    'circledS' : '\u24C8',
    'CircleMinus' : '\u2296',
    'CirclePlus' : '\u2295',
    'CircleTimes' : '\u2297',
    'cir' : '\u25CB',
    'cirE' : '\u29C3',
    'cire' : '\u2257',
    'cirfnint' : '\u2A10',
    'cirmid' : '\u2AEF',
    'cirscir' : '\u29C2',
    'ClockwiseContourIntegral' : '\u2232',
    'CloseCurlyDoubleQuote' : '\u201D',
    'CloseCurlyQuote' : '\u2019',
    'clubs' : '\u2663',
    'clubsuit' : '\u2663',
    'colon' : ':',
    'Colon' : '\u2237',
    'Colone' : '\u2A74',
    'colone' : '\u2254',
    'coloneq' : '\u2254',
    'comma' : ',',
    'commat' : '@',
    'comp' : '\u2201',
    'compfn' : '\u2218',
    'complement' : '\u2201',
    'complexes' : '\u2102',
    'cong' : '\u2245',
    'congdot' : '\u2A6D',
    'Congruent' : '\u2261',
    'conint' : '\u222E',
    'Conint' : '\u222F',
    'ContourIntegral' : '\u222E',
    'copf' : '\uD835\uDD54',
    'Copf' : '\u2102',
    'coprod' : '\u2210',
    'Coproduct' : '\u2210',
    'copy' : '\xA9',
    'COPY' : '\xA9',
    'copysr' : '\u2117',
    'CounterClockwiseContourIntegral' : '\u2233',
    'crarr' : '\u21B5',
    'cross' : '\u2717',
    'Cross' : '\u2A2F',
    'Cscr' : '\uD835\uDC9E',
    'cscr' : '\uD835\uDCB8',
    'csub' : '\u2ACF',
    'csube' : '\u2AD1',
    'csup' : '\u2AD0',
    'csupe' : '\u2AD2',
    'ctdot' : '\u22EF',
    'cudarrl' : '\u2938',
    'cudarrr' : '\u2935',
    'cuepr' : '\u22DE',
    'cuesc' : '\u22DF',
    'cularr' : '\u21B6',
    'cularrp' : '\u293D',
    'cupbrcap' : '\u2A48',
    'cupcap' : '\u2A46',
    'CupCap' : '\u224D',
    'cup' : '\u222A',
    'Cup' : '\u22D3',
    'cupcup' : '\u2A4A',
    'cupdot' : '\u228D',
    'cupor' : '\u2A45',
    'cups' : '\u222A\uFE00',
    'curarr' : '\u21B7',
    'curarrm' : '\u293C',
    'curlyeqprec' : '\u22DE',
    'curlyeqsucc' : '\u22DF',
    'curlyvee' : '\u22CE',
    'curlywedge' : '\u22CF',
    'curren' : '\xA4',
    'curvearrowleft' : '\u21B6',
    'curvearrowright' : '\u21B7',
    'cuvee' : '\u22CE',
    'cuwed' : '\u22CF',
    'cwconint' : '\u2232',
    'cwint' : '\u2231',
    'cylcty' : '\u232D',
    'dagger' : '\u2020',
    'Dagger' : '\u2021',
    'daleth' : '\u2138',
    'darr' : '\u2193',
    'Darr' : '\u21A1',
    'dArr' : '\u21D3',
    'dash' : '\u2010',
    'Dashv' : '\u2AE4',
    'dashv' : '\u22A3',
    'dbkarow' : '\u290F',
    'dblac' : '\u02DD',
    'Dcaron' : '\u010E',
    'dcaron' : '\u010F',
    'Dcy' : '\u0414',
    'dcy' : '\u0434',
    'ddagger' : '\u2021',
    'ddarr' : '\u21CA',
    'DD' : '\u2145',
    'dd' : '\u2146',
    'DDotrahd' : '\u2911',
    'ddotseq' : '\u2A77',
    'deg' : '\xB0',
    'Del' : '\u2207',
    'Delta' : '\u0394',
    'delta' : '\u03B4',
    'demptyv' : '\u29B1',
    'dfisht' : '\u297F',
    'Dfr' : '\uD835\uDD07',
    'dfr' : '\uD835\uDD21',
    'dHar' : '\u2965',
    'dharl' : '\u21C3',
    'dharr' : '\u21C2',
    'DiacriticalAcute' : '\xB4',
    'DiacriticalDot' : '\u02D9',
    'DiacriticalDoubleAcute' : '\u02DD',
    'DiacriticalGrave' : '`',
    'DiacriticalTilde' : '\u02DC',
    'diam' : '\u22C4',
    'diamond' : '\u22C4',
    'Diamond' : '\u22C4',
    'diamondsuit' : '\u2666',
    'diams' : '\u2666',
    'die' : '\xA8',
    'DifferentialD' : '\u2146',
    'digamma' : '\u03DD',
    'disin' : '\u22F2',
    'div' : '\xF7',
    'divide' : '\xF7',
    'divideontimes' : '\u22C7',
    'divonx' : '\u22C7',
    'DJcy' : '\u0402',
    'djcy' : '\u0452',
    'dlcorn' : '\u231E',
    'dlcrop' : '\u230D',
    'dollar' : '$',
    'Dopf' : '\uD835\uDD3B',
    'dopf' : '\uD835\uDD55',
    'Dot' : '\xA8',
    'dot' : '\u02D9',
    'DotDot' : '\u20DC',
    'doteq' : '\u2250',
    'doteqdot' : '\u2251',
    'DotEqual' : '\u2250',
    'dotminus' : '\u2238',
    'dotplus' : '\u2214',
    'dotsquare' : '\u22A1',
    'doublebarwedge' : '\u2306',
    'DoubleContourIntegral' : '\u222F',
    'DoubleDot' : '\xA8',
    'DoubleDownArrow' : '\u21D3',
    'DoubleLeftArrow' : '\u21D0',
    'DoubleLeftRightArrow' : '\u21D4',
    'DoubleLeftTee' : '\u2AE4',
    'DoubleLongLeftArrow' : '\u27F8',
    'DoubleLongLeftRightArrow' : '\u27FA',
    'DoubleLongRightArrow' : '\u27F9',
    'DoubleRightArrow' : '\u21D2',
    'DoubleRightTee' : '\u22A8',
    'DoubleUpArrow' : '\u21D1',
    'DoubleUpDownArrow' : '\u21D5',
    'DoubleVerticalBar' : '\u2225',
    'DownArrowBar' : '\u2913',
    'downarrow' : '\u2193',
    'DownArrow' : '\u2193',
    'Downarrow' : '\u21D3',
    'DownArrowUpArrow' : '\u21F5',
    'DownBreve' : '\u0311',
    'downdownarrows' : '\u21CA',
    'downharpoonleft' : '\u21C3',
    'downharpoonright' : '\u21C2',
    'DownLeftRightVector' : '\u2950',
    'DownLeftTeeVector' : '\u295E',
    'DownLeftVectorBar' : '\u2956',
    'DownLeftVector' : '\u21BD',
    'DownRightTeeVector' : '\u295F',
    'DownRightVectorBar' : '\u2957',
    'DownRightVector' : '\u21C1',
    'DownTeeArrow' : '\u21A7',
    'DownTee' : '\u22A4',
    'drbkarow' : '\u2910',
    'drcorn' : '\u231F',
    'drcrop' : '\u230C',
    'Dscr' : '\uD835\uDC9F',
    'dscr' : '\uD835\uDCB9',
    'DScy' : '\u0405',
    'dscy' : '\u0455',
    'dsol' : '\u29F6',
    'Dstrok' : '\u0110',
    'dstrok' : '\u0111',
    'dtdot' : '\u22F1',
    'dtri' : '\u25BF',
    'dtrif' : '\u25BE',
    'duarr' : '\u21F5',
    'duhar' : '\u296F',
    'dwangle' : '\u29A6',
    'DZcy' : '\u040F',
    'dzcy' : '\u045F',
    'dzigrarr' : '\u27FF',
    'Eacute' : '\xC9',
    'eacute' : '\xE9',
    'easter' : '\u2A6E',
    'Ecaron' : '\u011A',
    'ecaron' : '\u011B',
    'Ecirc' : '\xCA',
    'ecirc' : '\xEA',
    'ecir' : '\u2256',
    'ecolon' : '\u2255',
    'Ecy' : '\u042D',
    'ecy' : '\u044D',
    'eDDot' : '\u2A77',
    'Edot' : '\u0116',
    'edot' : '\u0117',
    'eDot' : '\u2251',
    'ee' : '\u2147',
    'efDot' : '\u2252',
    'Efr' : '\uD835\uDD08',
    'efr' : '\uD835\uDD22',
    'eg' : '\u2A9A',
    'Egrave' : '\xC8',
    'egrave' : '\xE8',
    'egs' : '\u2A96',
    'egsdot' : '\u2A98',
    'el' : '\u2A99',
    'Element' : '\u2208',
    'elinters' : '\u23E7',
    'ell' : '\u2113',
    'els' : '\u2A95',
    'elsdot' : '\u2A97',
    'Emacr' : '\u0112',
    'emacr' : '\u0113',
    'empty' : '\u2205',
    'emptyset' : '\u2205',
    'EmptySmallSquare' : '\u25FB',
    'emptyv' : '\u2205',
    'EmptyVerySmallSquare' : '\u25AB',
    'emsp13' : '\u2004',
    'emsp14' : '\u2005',
    'emsp' : '\u2003',
    'ENG' : '\u014A',
    'eng' : '\u014B',
    'ensp' : '\u2002',
    'Eogon' : '\u0118',
    'eogon' : '\u0119',
    'Eopf' : '\uD835\uDD3C',
    'eopf' : '\uD835\uDD56',
    'epar' : '\u22D5',
    'eparsl' : '\u29E3',
    'eplus' : '\u2A71',
    'epsi' : '\u03B5',
    'Epsilon' : '\u0395',
    'epsilon' : '\u03B5',
    'epsiv' : '\u03F5',
    'eqcirc' : '\u2256',
    'eqcolon' : '\u2255',
    'eqsim' : '\u2242',
    'eqslantgtr' : '\u2A96',
    'eqslantless' : '\u2A95',
    'Equal' : '\u2A75',
    'equals' : '=',
    'EqualTilde' : '\u2242',
    'equest' : '\u225F',
    'Equilibrium' : '\u21CC',
    'equiv' : '\u2261',
    'equivDD' : '\u2A78',
    'eqvparsl' : '\u29E5',
    'erarr' : '\u2971',
    'erDot' : '\u2253',
    'escr' : '\u212F',
    'Escr' : '\u2130',
    'esdot' : '\u2250',
    'Esim' : '\u2A73',
    'esim' : '\u2242',
    'Eta' : '\u0397',
    'eta' : '\u03B7',
    'ETH' : '\xD0',
    'eth' : '\xF0',
    'Euml' : '\xCB',
    'euml' : '\xEB',
    'euro' : '\u20AC',
    'excl' : '!',
    'exist' : '\u2203',
    'Exists' : '\u2203',
    'expectation' : '\u2130',
    'exponentiale' : '\u2147',
    'ExponentialE' : '\u2147',
    'fallingdotseq' : '\u2252',
    'Fcy' : '\u0424',
    'fcy' : '\u0444',
    'female' : '\u2640',
    'ffilig' : '\uFB03',
    'fflig' : '\uFB00',
    'ffllig' : '\uFB04',
    'Ffr' : '\uD835\uDD09',
    'ffr' : '\uD835\uDD23',
    'filig' : '\uFB01',
    'FilledSmallSquare' : '\u25FC',
    'FilledVerySmallSquare' : '\u25AA',
    'fjlig' : 'fj',
    'flat' : '\u266D',
    'fllig' : '\uFB02',
    'fltns' : '\u25B1',
    'fnof' : '\u0192',
    'Fopf' : '\uD835\uDD3D',
    'fopf' : '\uD835\uDD57',
    'forall' : '\u2200',
    'ForAll' : '\u2200',
    'fork' : '\u22D4',
    'forkv' : '\u2AD9',
    'Fouriertrf' : '\u2131',
    'fpartint' : '\u2A0D',
    'frac12' : '\xBD',
    'frac13' : '\u2153',
    'frac14' : '\xBC',
    'frac15' : '\u2155',
    'frac16' : '\u2159',
    'frac18' : '\u215B',
    'frac23' : '\u2154',
    'frac25' : '\u2156',
    'frac34' : '\xBE',
    'frac35' : '\u2157',
    'frac38' : '\u215C',
    'frac45' : '\u2158',
    'frac56' : '\u215A',
    'frac58' : '\u215D',
    'frac78' : '\u215E',
    'frasl' : '\u2044',
    'frown' : '\u2322',
    'fscr' : '\uD835\uDCBB',
    'Fscr' : '\u2131',
    'gacute' : '\u01F5',
    'Gamma' : '\u0393',
    'gamma' : '\u03B3',
    'Gammad' : '\u03DC',
    'gammad' : '\u03DD',
    'gap' : '\u2A86',
    'Gbreve' : '\u011E',
    'gbreve' : '\u011F',
    'Gcedil' : '\u0122',
    'Gcirc' : '\u011C',
    'gcirc' : '\u011D',
    'Gcy' : '\u0413',
    'gcy' : '\u0433',
    'Gdot' : '\u0120',
    'gdot' : '\u0121',
    'ge' : '\u2265',
    'gE' : '\u2267',
    'gEl' : '\u2A8C',
    'gel' : '\u22DB',
    'geq' : '\u2265',
    'geqq' : '\u2267',
    'geqslant' : '\u2A7E',
    'gescc' : '\u2AA9',
    'ges' : '\u2A7E',
    'gesdot' : '\u2A80',
    'gesdoto' : '\u2A82',
    'gesdotol' : '\u2A84',
    'gesl' : '\u22DB\uFE00',
    'gesles' : '\u2A94',
    'Gfr' : '\uD835\uDD0A',
    'gfr' : '\uD835\uDD24',
    'gg' : '\u226B',
    'Gg' : '\u22D9',
    'ggg' : '\u22D9',
    'gimel' : '\u2137',
    'GJcy' : '\u0403',
    'gjcy' : '\u0453',
    'gla' : '\u2AA5',
    'gl' : '\u2277',
    'glE' : '\u2A92',
    'glj' : '\u2AA4',
    'gnap' : '\u2A8A',
    'gnapprox' : '\u2A8A',
    'gne' : '\u2A88',
    'gnE' : '\u2269',
    'gneq' : '\u2A88',
    'gneqq' : '\u2269',
    'gnsim' : '\u22E7',
    'Gopf' : '\uD835\uDD3E',
    'gopf' : '\uD835\uDD58',
    'grave' : '`',
    'GreaterEqual' : '\u2265',
    'GreaterEqualLess' : '\u22DB',
    'GreaterFullEqual' : '\u2267',
    'GreaterGreater' : '\u2AA2',
    'GreaterLess' : '\u2277',
    'GreaterSlantEqual' : '\u2A7E',
    'GreaterTilde' : '\u2273',
    'Gscr' : '\uD835\uDCA2',
    'gscr' : '\u210A',
    'gsim' : '\u2273',
    'gsime' : '\u2A8E',
    'gsiml' : '\u2A90',
    'gtcc' : '\u2AA7',
    'gtcir' : '\u2A7A',
    'gt' : '>',
    'GT' : '>',
    'Gt' : '\u226B',
    'gtdot' : '\u22D7',
    'gtlPar' : '\u2995',
    'gtquest' : '\u2A7C',
    'gtrapprox' : '\u2A86',
    'gtrarr' : '\u2978',
    'gtrdot' : '\u22D7',
    'gtreqless' : '\u22DB',
    'gtreqqless' : '\u2A8C',
    'gtrless' : '\u2277',
    'gtrsim' : '\u2273',
    'gvertneqq' : '\u2269\uFE00',
    'gvnE' : '\u2269\uFE00',
    'Hacek' : '\u02C7',
    'hairsp' : '\u200A',
    'half' : '\xBD',
    'hamilt' : '\u210B',
    'HARDcy' : '\u042A',
    'hardcy' : '\u044A',
    'harrcir' : '\u2948',
    'harr' : '\u2194',
    'hArr' : '\u21D4',
    'harrw' : '\u21AD',
    'Hat' : '^',
    'hbar' : '\u210F',
    'Hcirc' : '\u0124',
    'hcirc' : '\u0125',
    'hearts' : '\u2665',
    'heartsuit' : '\u2665',
    'hellip' : '\u2026',
    'hercon' : '\u22B9',
    'hfr' : '\uD835\uDD25',
    'Hfr' : '\u210C',
    'HilbertSpace' : '\u210B',
    'hksearow' : '\u2925',
    'hkswarow' : '\u2926',
    'hoarr' : '\u21FF',
    'homtht' : '\u223B',
    'hookleftarrow' : '\u21A9',
    'hookrightarrow' : '\u21AA',
    'hopf' : '\uD835\uDD59',
    'Hopf' : '\u210D',
    'horbar' : '\u2015',
    'HorizontalLine' : '\u2500',
    'hscr' : '\uD835\uDCBD',
    'Hscr' : '\u210B',
    'hslash' : '\u210F',
    'Hstrok' : '\u0126',
    'hstrok' : '\u0127',
    'HumpDownHump' : '\u224E',
    'HumpEqual' : '\u224F',
    'hybull' : '\u2043',
    'hyphen' : '\u2010',
    'Iacute' : '\xCD',
    'iacute' : '\xED',
    'ic' : '\u2063',
    'Icirc' : '\xCE',
    'icirc' : '\xEE',
    'Icy' : '\u0418',
    'icy' : '\u0438',
    'Idot' : '\u0130',
    'IEcy' : '\u0415',
    'iecy' : '\u0435',
    'iexcl' : '\xA1',
    'iff' : '\u21D4',
    'ifr' : '\uD835\uDD26',
    'Ifr' : '\u2111',
    'Igrave' : '\xCC',
    'igrave' : '\xEC',
    'ii' : '\u2148',
    'iiiint' : '\u2A0C',
    'iiint' : '\u222D',
    'iinfin' : '\u29DC',
    'iiota' : '\u2129',
    'IJlig' : '\u0132',
    'ijlig' : '\u0133',
    'Imacr' : '\u012A',
    'imacr' : '\u012B',
    'image' : '\u2111',
    'ImaginaryI' : '\u2148',
    'imagline' : '\u2110',
    'imagpart' : '\u2111',
    'imath' : '\u0131',
    'Im' : '\u2111',
    'imof' : '\u22B7',
    'imped' : '\u01B5',
    'Implies' : '\u21D2',
    'incare' : '\u2105',
    'in' : '\u2208',
    'infin' : '\u221E',
    'infintie' : '\u29DD',
    'inodot' : '\u0131',
    'intcal' : '\u22BA',
    'int' : '\u222B',
    'Int' : '\u222C',
    'integers' : '\u2124',
    'Integral' : '\u222B',
    'intercal' : '\u22BA',
    'Intersection' : '\u22C2',
    'intlarhk' : '\u2A17',
    'intprod' : '\u2A3C',
    'InvisibleComma' : '\u2063',
    'InvisibleTimes' : '\u2062',
    'IOcy' : '\u0401',
    'iocy' : '\u0451',
    'Iogon' : '\u012E',
    'iogon' : '\u012F',
    'Iopf' : '\uD835\uDD40',
    'iopf' : '\uD835\uDD5A',
    'Iota' : '\u0399',
    'iota' : '\u03B9',
    'iprod' : '\u2A3C',
    'iquest' : '\xBF',
    'iscr' : '\uD835\uDCBE',
    'Iscr' : '\u2110',
    'isin' : '\u2208',
    'isindot' : '\u22F5',
    'isinE' : '\u22F9',
    'isins' : '\u22F4',
    'isinsv' : '\u22F3',
    'isinv' : '\u2208',
    'it' : '\u2062',
    'Itilde' : '\u0128',
    'itilde' : '\u0129',
    'Iukcy' : '\u0406',
    'iukcy' : '\u0456',
    'Iuml' : '\xCF',
    'iuml' : '\xEF',
    'Jcirc' : '\u0134',
    'jcirc' : '\u0135',
    'Jcy' : '\u0419',
    'jcy' : '\u0439',
    'Jfr' : '\uD835\uDD0D',
    'jfr' : '\uD835\uDD27',
    'jmath' : '\u0237',
    'Jopf' : '\uD835\uDD41',
    'jopf' : '\uD835\uDD5B',
    'Jscr' : '\uD835\uDCA5',
    'jscr' : '\uD835\uDCBF',
    'Jsercy' : '\u0408',
    'jsercy' : '\u0458',
    'Jukcy' : '\u0404',
    'jukcy' : '\u0454',
    'Kappa' : '\u039A',
    'kappa' : '\u03BA',
    'kappav' : '\u03F0',
    'Kcedil' : '\u0136',
    'kcedil' : '\u0137',
    'Kcy' : '\u041A',
    'kcy' : '\u043A',
    'Kfr' : '\uD835\uDD0E',
    'kfr' : '\uD835\uDD28',
    'kgreen' : '\u0138',
    'KHcy' : '\u0425',
    'khcy' : '\u0445',
    'KJcy' : '\u040C',
    'kjcy' : '\u045C',
    'Kopf' : '\uD835\uDD42',
    'kopf' : '\uD835\uDD5C',
    'Kscr' : '\uD835\uDCA6',
    'kscr' : '\uD835\uDCC0',
    'lAarr' : '\u21DA',
    'Lacute' : '\u0139',
    'lacute' : '\u013A',
    'laemptyv' : '\u29B4',
    'lagran' : '\u2112',
    'Lambda' : '\u039B',
    'lambda' : '\u03BB',
    'lang' : '\u27E8',
    'Lang' : '\u27EA',
    'langd' : '\u2991',
    'langle' : '\u27E8',
    'lap' : '\u2A85',
    'Laplacetrf' : '\u2112',
    'laquo' : '\xAB',
    'larrb' : '\u21E4',
    'larrbfs' : '\u291F',
    'larr' : '\u2190',
    'Larr' : '\u219E',
    'lArr' : '\u21D0',
    'larrfs' : '\u291D',
    'larrhk' : '\u21A9',
    'larrlp' : '\u21AB',
    'larrpl' : '\u2939',
    'larrsim' : '\u2973',
    'larrtl' : '\u21A2',
    'latail' : '\u2919',
    'lAtail' : '\u291B',
    'lat' : '\u2AAB',
    'late' : '\u2AAD',
    'lates' : '\u2AAD\uFE00',
    'lbarr' : '\u290C',
    'lBarr' : '\u290E',
    'lbbrk' : '\u2772',
    'lbrace' : '{',
    'lbrack' : '[',
    'lbrke' : '\u298B',
    'lbrksld' : '\u298F',
    'lbrkslu' : '\u298D',
    'Lcaron' : '\u013D',
    'lcaron' : '\u013E',
    'Lcedil' : '\u013B',
    'lcedil' : '\u013C',
    'lceil' : '\u2308',
    'lcub' : '{',
    'Lcy' : '\u041B',
    'lcy' : '\u043B',
    'ldca' : '\u2936',
    'ldquo' : '\u201C',
    'ldquor' : '\u201E',
    'ldrdhar' : '\u2967',
    'ldrushar' : '\u294B',
    'ldsh' : '\u21B2',
    'le' : '\u2264',
    'lE' : '\u2266',
    'LeftAngleBracket' : '\u27E8',
    'LeftArrowBar' : '\u21E4',
    'leftarrow' : '\u2190',
    'LeftArrow' : '\u2190',
    'Leftarrow' : '\u21D0',
    'LeftArrowRightArrow' : '\u21C6',
    'leftarrowtail' : '\u21A2',
    'LeftCeiling' : '\u2308',
    'LeftDoubleBracket' : '\u27E6',
    'LeftDownTeeVector' : '\u2961',
    'LeftDownVectorBar' : '\u2959',
    'LeftDownVector' : '\u21C3',
    'LeftFloor' : '\u230A',
    'leftharpoondown' : '\u21BD',
    'leftharpoonup' : '\u21BC',
    'leftleftarrows' : '\u21C7',
    'leftrightarrow' : '\u2194',
    'LeftRightArrow' : '\u2194',
    'Leftrightarrow' : '\u21D4',
    'leftrightarrows' : '\u21C6',
    'leftrightharpoons' : '\u21CB',
    'leftrightsquigarrow' : '\u21AD',
    'LeftRightVector' : '\u294E',
    'LeftTeeArrow' : '\u21A4',
    'LeftTee' : '\u22A3',
    'LeftTeeVector' : '\u295A',
    'leftthreetimes' : '\u22CB',
    'LeftTriangleBar' : '\u29CF',
    'LeftTriangle' : '\u22B2',
    'LeftTriangleEqual' : '\u22B4',
    'LeftUpDownVector' : '\u2951',
    'LeftUpTeeVector' : '\u2960',
    'LeftUpVectorBar' : '\u2958',
    'LeftUpVector' : '\u21BF',
    'LeftVectorBar' : '\u2952',
    'LeftVector' : '\u21BC',
    'lEg' : '\u2A8B',
    'leg' : '\u22DA',
    'leq' : '\u2264',
    'leqq' : '\u2266',
    'leqslant' : '\u2A7D',
    'lescc' : '\u2AA8',
    'les' : '\u2A7D',
    'lesdot' : '\u2A7F',
    'lesdoto' : '\u2A81',
    'lesdotor' : '\u2A83',
    'lesg' : '\u22DA\uFE00',
    'lesges' : '\u2A93',
    'lessapprox' : '\u2A85',
    'lessdot' : '\u22D6',
    'lesseqgtr' : '\u22DA',
    'lesseqqgtr' : '\u2A8B',
    'LessEqualGreater' : '\u22DA',
    'LessFullEqual' : '\u2266',
    'LessGreater' : '\u2276',
    'lessgtr' : '\u2276',
    'LessLess' : '\u2AA1',
    'lesssim' : '\u2272',
    'LessSlantEqual' : '\u2A7D',
    'LessTilde' : '\u2272',
    'lfisht' : '\u297C',
    'lfloor' : '\u230A',
    'Lfr' : '\uD835\uDD0F',
    'lfr' : '\uD835\uDD29',
    'lg' : '\u2276',
    'lgE' : '\u2A91',
    'lHar' : '\u2962',
    'lhard' : '\u21BD',
    'lharu' : '\u21BC',
    'lharul' : '\u296A',
    'lhblk' : '\u2584',
    'LJcy' : '\u0409',
    'ljcy' : '\u0459',
    'llarr' : '\u21C7',
    'll' : '\u226A',
    'Ll' : '\u22D8',
    'llcorner' : '\u231E',
    'Lleftarrow' : '\u21DA',
    'llhard' : '\u296B',
    'lltri' : '\u25FA',
    'Lmidot' : '\u013F',
    'lmidot' : '\u0140',
    'lmoustache' : '\u23B0',
    'lmoust' : '\u23B0',
    'lnap' : '\u2A89',
    'lnapprox' : '\u2A89',
    'lne' : '\u2A87',
    'lnE' : '\u2268',
    'lneq' : '\u2A87',
    'lneqq' : '\u2268',
    'lnsim' : '\u22E6',
    'loang' : '\u27EC',
    'loarr' : '\u21FD',
    'lobrk' : '\u27E6',
    'longleftarrow' : '\u27F5',
    'LongLeftArrow' : '\u27F5',
    'Longleftarrow' : '\u27F8',
    'longleftrightarrow' : '\u27F7',
    'LongLeftRightArrow' : '\u27F7',
    'Longleftrightarrow' : '\u27FA',
    'longmapsto' : '\u27FC',
    'longrightarrow' : '\u27F6',
    'LongRightArrow' : '\u27F6',
    'Longrightarrow' : '\u27F9',
    'looparrowleft' : '\u21AB',
    'looparrowright' : '\u21AC',
    'lopar' : '\u2985',
    'Lopf' : '\uD835\uDD43',
    'lopf' : '\uD835\uDD5D',
    'loplus' : '\u2A2D',
    'lotimes' : '\u2A34',
    'lowast' : '\u2217',
    'lowbar' : '_',
    'LowerLeftArrow' : '\u2199',
    'LowerRightArrow' : '\u2198',
    'loz' : '\u25CA',
    'lozenge' : '\u25CA',
    'lozf' : '\u29EB',
    'lpar' : '(',
    'lparlt' : '\u2993',
    'lrarr' : '\u21C6',
    'lrcorner' : '\u231F',
    'lrhar' : '\u21CB',
    'lrhard' : '\u296D',
    'lrm' : '\u200E',
    'lrtri' : '\u22BF',
    'lsaquo' : '\u2039',
    'lscr' : '\uD835\uDCC1',
    'Lscr' : '\u2112',
    'lsh' : '\u21B0',
    'Lsh' : '\u21B0',
    'lsim' : '\u2272',
    'lsime' : '\u2A8D',
    'lsimg' : '\u2A8F',
    'lsqb' : '[',
    'lsquo' : '\u2018',
    'lsquor' : '\u201A',
    'Lstrok' : '\u0141',
    'lstrok' : '\u0142',
    'ltcc' : '\u2AA6',
    'ltcir' : '\u2A79',
    'lt' : '<',
    'LT' : '<',
    'Lt' : '\u226A',
    'ltdot' : '\u22D6',
    'lthree' : '\u22CB',
    'ltimes' : '\u22C9',
    'ltlarr' : '\u2976',
    'ltquest' : '\u2A7B',
    'ltri' : '\u25C3',
    'ltrie' : '\u22B4',
    'ltrif' : '\u25C2',
    'ltrPar' : '\u2996',
    'lurdshar' : '\u294A',
    'luruhar' : '\u2966',
    'lvertneqq' : '\u2268\uFE00',
    'lvnE' : '\u2268\uFE00',
    'macr' : '\xAF',
    'male' : '\u2642',
    'malt' : '\u2720',
    'maltese' : '\u2720',
    'Map' : '\u2905',
    'map' : '\u21A6',
    'mapsto' : '\u21A6',
    'mapstodown' : '\u21A7',
    'mapstoleft' : '\u21A4',
    'mapstoup' : '\u21A5',
    'marker' : '\u25AE',
    'mcomma' : '\u2A29',
    'Mcy' : '\u041C',
    'mcy' : '\u043C',
    'mdash' : '\u2014',
    'mDDot' : '\u223A',
    'measuredangle' : '\u2221',
    'MediumSpace' : '\u205F',
    'Mellintrf' : '\u2133',
    'Mfr' : '\uD835\uDD10',
    'mfr' : '\uD835\uDD2A',
    'mho' : '\u2127',
    'micro' : '\xB5',
    'midast' : '*',
    'midcir' : '\u2AF0',
    'mid' : '\u2223',
    'middot' : '\xB7',
    'minusb' : '\u229F',
    'minus' : '\u2212',
    'minusd' : '\u2238',
    'minusdu' : '\u2A2A',
    'MinusPlus' : '\u2213',
    'mlcp' : '\u2ADB',
    'mldr' : '\u2026',
    'mnplus' : '\u2213',
    'models' : '\u22A7',
    'Mopf' : '\uD835\uDD44',
    'mopf' : '\uD835\uDD5E',
    'mp' : '\u2213',
    'mscr' : '\uD835\uDCC2',
    'Mscr' : '\u2133',
    'mstpos' : '\u223E',
    'Mu' : '\u039C',
    'mu' : '\u03BC',
    'multimap' : '\u22B8',
    'mumap' : '\u22B8',
    'nabla' : '\u2207',
    'Nacute' : '\u0143',
    'nacute' : '\u0144',
    'nang' : '\u2220\u20D2',
    'nap' : '\u2249',
    'napE' : '\u2A70\u0338',
    'napid' : '\u224B\u0338',
    'napos' : '\u0149',
    'napprox' : '\u2249',
    'natural' : '\u266E',
    'naturals' : '\u2115',
    'natur' : '\u266E',
    'nbsp' : '\xA0',
    'nbump' : '\u224E\u0338',
    'nbumpe' : '\u224F\u0338',
    'ncap' : '\u2A43',
    'Ncaron' : '\u0147',
    'ncaron' : '\u0148',
    'Ncedil' : '\u0145',
    'ncedil' : '\u0146',
    'ncong' : '\u2247',
    'ncongdot' : '\u2A6D\u0338',
    'ncup' : '\u2A42',
    'Ncy' : '\u041D',
    'ncy' : '\u043D',
    'ndash' : '\u2013',
    'nearhk' : '\u2924',
    'nearr' : '\u2197',
    'neArr' : '\u21D7',
    'nearrow' : '\u2197',
    'ne' : '\u2260',
    'nedot' : '\u2250\u0338',
    'NegativeMediumSpace' : '\u200B',
    'NegativeThickSpace' : '\u200B',
    'NegativeThinSpace' : '\u200B',
    'NegativeVeryThinSpace' : '\u200B',
    'nequiv' : '\u2262',
    'nesear' : '\u2928',
    'nesim' : '\u2242\u0338',
    'NestedGreaterGreater' : '\u226B',
    'NestedLessLess' : '\u226A',
    'NewLine' : '\n',
    'nexist' : '\u2204',
    'nexists' : '\u2204',
    'Nfr' : '\uD835\uDD11',
    'nfr' : '\uD835\uDD2B',
    'ngE' : '\u2267\u0338',
    'nge' : '\u2271',
    'ngeq' : '\u2271',
    'ngeqq' : '\u2267\u0338',
    'ngeqslant' : '\u2A7E\u0338',
    'nges' : '\u2A7E\u0338',
    'nGg' : '\u22D9\u0338',
    'ngsim' : '\u2275',
    'nGt' : '\u226B\u20D2',
    'ngt' : '\u226F',
    'ngtr' : '\u226F',
    'nGtv' : '\u226B\u0338',
    'nharr' : '\u21AE',
    'nhArr' : '\u21CE',
    'nhpar' : '\u2AF2',
    'ni' : '\u220B',
    'nis' : '\u22FC',
    'nisd' : '\u22FA',
    'niv' : '\u220B',
    'NJcy' : '\u040A',
    'njcy' : '\u045A',
    'nlarr' : '\u219A',
    'nlArr' : '\u21CD',
    'nldr' : '\u2025',
    'nlE' : '\u2266\u0338',
    'nle' : '\u2270',
    'nleftarrow' : '\u219A',
    'nLeftarrow' : '\u21CD',
    'nleftrightarrow' : '\u21AE',
    'nLeftrightarrow' : '\u21CE',
    'nleq' : '\u2270',
    'nleqq' : '\u2266\u0338',
    'nleqslant' : '\u2A7D\u0338',
    'nles' : '\u2A7D\u0338',
    'nless' : '\u226E',
    'nLl' : '\u22D8\u0338',
    'nlsim' : '\u2274',
    'nLt' : '\u226A\u20D2',
    'nlt' : '\u226E',
    'nltri' : '\u22EA',
    'nltrie' : '\u22EC',
    'nLtv' : '\u226A\u0338',
    'nmid' : '\u2224',
    'NoBreak' : '\u2060',
    'NonBreakingSpace' : '\xA0',
    'nopf' : '\uD835\uDD5F',
    'Nopf' : '\u2115',
    'Not' : '\u2AEC',
    'not' : '\xAC',
    'NotCongruent' : '\u2262',
    'NotCupCap' : '\u226D',
    'NotDoubleVerticalBar' : '\u2226',
    'NotElement' : '\u2209',
    'NotEqual' : '\u2260',
    'NotEqualTilde' : '\u2242\u0338',
    'NotExists' : '\u2204',
    'NotGreater' : '\u226F',
    'NotGreaterEqual' : '\u2271',
    'NotGreaterFullEqual' : '\u2267\u0338',
    'NotGreaterGreater' : '\u226B\u0338',
    'NotGreaterLess' : '\u2279',
    'NotGreaterSlantEqual' : '\u2A7E\u0338',
    'NotGreaterTilde' : '\u2275',
    'NotHumpDownHump' : '\u224E\u0338',
    'NotHumpEqual' : '\u224F\u0338',
    'notin' : '\u2209',
    'notindot' : '\u22F5\u0338',
    'notinE' : '\u22F9\u0338',
    'notinva' : '\u2209',
    'notinvb' : '\u22F7',
    'notinvc' : '\u22F6',
    'NotLeftTriangleBar' : '\u29CF\u0338',
    'NotLeftTriangle' : '\u22EA',
    'NotLeftTriangleEqual' : '\u22EC',
    'NotLess' : '\u226E',
    'NotLessEqual' : '\u2270',
    'NotLessGreater' : '\u2278',
    'NotLessLess' : '\u226A\u0338',
    'NotLessSlantEqual' : '\u2A7D\u0338',
    'NotLessTilde' : '\u2274',
    'NotNestedGreaterGreater' : '\u2AA2\u0338',
    'NotNestedLessLess' : '\u2AA1\u0338',
    'notni' : '\u220C',
    'notniva' : '\u220C',
    'notnivb' : '\u22FE',
    'notnivc' : '\u22FD',
    'NotPrecedes' : '\u2280',
    'NotPrecedesEqual' : '\u2AAF\u0338',
    'NotPrecedesSlantEqual' : '\u22E0',
    'NotReverseElement' : '\u220C',
    'NotRightTriangleBar' : '\u29D0\u0338',
    'NotRightTriangle' : '\u22EB',
    'NotRightTriangleEqual' : '\u22ED',
    'NotSquareSubset' : '\u228F\u0338',
    'NotSquareSubsetEqual' : '\u22E2',
    'NotSquareSuperset' : '\u2290\u0338',
    'NotSquareSupersetEqual' : '\u22E3',
    'NotSubset' : '\u2282\u20D2',
    'NotSubsetEqual' : '\u2288',
    'NotSucceeds' : '\u2281',
    'NotSucceedsEqual' : '\u2AB0\u0338',
    'NotSucceedsSlantEqual' : '\u22E1',
    'NotSucceedsTilde' : '\u227F\u0338',
    'NotSuperset' : '\u2283\u20D2',
    'NotSupersetEqual' : '\u2289',
    'NotTilde' : '\u2241',
    'NotTildeEqual' : '\u2244',
    'NotTildeFullEqual' : '\u2247',
    'NotTildeTilde' : '\u2249',
    'NotVerticalBar' : '\u2224',
    'nparallel' : '\u2226',
    'npar' : '\u2226',
    'nparsl' : '\u2AFD\u20E5',
    'npart' : '\u2202\u0338',
    'npolint' : '\u2A14',
    'npr' : '\u2280',
    'nprcue' : '\u22E0',
    'nprec' : '\u2280',
    'npreceq' : '\u2AAF\u0338',
    'npre' : '\u2AAF\u0338',
    'nrarrc' : '\u2933\u0338',
    'nrarr' : '\u219B',
    'nrArr' : '\u21CF',
    'nrarrw' : '\u219D\u0338',
    'nrightarrow' : '\u219B',
    'nRightarrow' : '\u21CF',
    'nrtri' : '\u22EB',
    'nrtrie' : '\u22ED',
    'nsc' : '\u2281',
    'nsccue' : '\u22E1',
    'nsce' : '\u2AB0\u0338',
    'Nscr' : '\uD835\uDCA9',
    'nscr' : '\uD835\uDCC3',
    'nshortmid' : '\u2224',
    'nshortparallel' : '\u2226',
    'nsim' : '\u2241',
    'nsime' : '\u2244',
    'nsimeq' : '\u2244',
    'nsmid' : '\u2224',
    'nspar' : '\u2226',
    'nsqsube' : '\u22E2',
    'nsqsupe' : '\u22E3',
    'nsub' : '\u2284',
    'nsubE' : '\u2AC5\u0338',
    'nsube' : '\u2288',
    'nsubset' : '\u2282\u20D2',
    'nsubseteq' : '\u2288',
    'nsubseteqq' : '\u2AC5\u0338',
    'nsucc' : '\u2281',
    'nsucceq' : '\u2AB0\u0338',
    'nsup' : '\u2285',
    'nsupE' : '\u2AC6\u0338',
    'nsupe' : '\u2289',
    'nsupset' : '\u2283\u20D2',
    'nsupseteq' : '\u2289',
    'nsupseteqq' : '\u2AC6\u0338',
    'ntgl' : '\u2279',
    'Ntilde' : '\xD1',
    'ntilde' : '\xF1',
    'ntlg' : '\u2278',
    'ntriangleleft' : '\u22EA',
    'ntrianglelefteq' : '\u22EC',
    'ntriangleright' : '\u22EB',
    'ntrianglerighteq' : '\u22ED',
    'Nu' : '\u039D',
    'nu' : '\u03BD',
    'num' : '#',
    'numero' : '\u2116',
    'numsp' : '\u2007',
    'nvap' : '\u224D\u20D2',
    'nvdash' : '\u22AC',
    'nvDash' : '\u22AD',
    'nVdash' : '\u22AE',
    'nVDash' : '\u22AF',
    'nvge' : '\u2265\u20D2',
    'nvgt' : '>\u20D2',
    'nvHarr' : '\u2904',
    'nvinfin' : '\u29DE',
    'nvlArr' : '\u2902',
    'nvle' : '\u2264\u20D2',
    'nvlt' : '<\u20D2',
    'nvltrie' : '\u22B4\u20D2',
    'nvrArr' : '\u2903',
    'nvrtrie' : '\u22B5\u20D2',
    'nvsim' : '\u223C\u20D2',
    'nwarhk' : '\u2923',
    'nwarr' : '\u2196',
    'nwArr' : '\u21D6',
    'nwarrow' : '\u2196',
    'nwnear' : '\u2927',
    'Oacute' : '\xD3',
    'oacute' : '\xF3',
    'oast' : '\u229B',
    'Ocirc' : '\xD4',
    'ocirc' : '\xF4',
    'ocir' : '\u229A',
    'Ocy' : '\u041E',
    'ocy' : '\u043E',
    'odash' : '\u229D',
    'Odblac' : '\u0150',
    'odblac' : '\u0151',
    'odiv' : '\u2A38',
    'odot' : '\u2299',
    'odsold' : '\u29BC',
    'OElig' : '\u0152',
    'oelig' : '\u0153',
    'ofcir' : '\u29BF',
    'Ofr' : '\uD835\uDD12',
    'ofr' : '\uD835\uDD2C',
    'ogon' : '\u02DB',
    'Ograve' : '\xD2',
    'ograve' : '\xF2',
    'ogt' : '\u29C1',
    'ohbar' : '\u29B5',
    'ohm' : '\u03A9',
    'oint' : '\u222E',
    'olarr' : '\u21BA',
    'olcir' : '\u29BE',
    'olcross' : '\u29BB',
    'oline' : '\u203E',
    'olt' : '\u29C0',
    'Omacr' : '\u014C',
    'omacr' : '\u014D',
    'Omega' : '\u03A9',
    'omega' : '\u03C9',
    'Omicron' : '\u039F',
    'omicron' : '\u03BF',
    'omid' : '\u29B6',
    'ominus' : '\u2296',
    'Oopf' : '\uD835\uDD46',
    'oopf' : '\uD835\uDD60',
    'opar' : '\u29B7',
    'OpenCurlyDoubleQuote' : '\u201C',
    'OpenCurlyQuote' : '\u2018',
    'operp' : '\u29B9',
    'oplus' : '\u2295',
    'orarr' : '\u21BB',
    'Or' : '\u2A54',
    'or' : '\u2228',
    'ord' : '\u2A5D',
    'order' : '\u2134',
    'orderof' : '\u2134',
    'ordf' : '\xAA',
    'ordm' : '\xBA',
    'origof' : '\u22B6',
    'oror' : '\u2A56',
    'orslope' : '\u2A57',
    'orv' : '\u2A5B',
    'oS' : '\u24C8',
    'Oscr' : '\uD835\uDCAA',
    'oscr' : '\u2134',
    'Oslash' : '\xD8',
    'oslash' : '\xF8',
    'osol' : '\u2298',
    'Otilde' : '\xD5',
    'otilde' : '\xF5',
    'otimesas' : '\u2A36',
    'Otimes' : '\u2A37',
    'otimes' : '\u2297',
    'Ouml' : '\xD6',
    'ouml' : '\xF6',
    'ovbar' : '\u233D',
    'OverBar' : '\u203E',
    'OverBrace' : '\u23DE',
    'OverBracket' : '\u23B4',
    'OverParenthesis' : '\u23DC',
    'para' : '\xB6',
    'parallel' : '\u2225',
    'par' : '\u2225',
    'parsim' : '\u2AF3',
    'parsl' : '\u2AFD',
    'part' : '\u2202',
    'PartialD' : '\u2202',
    'Pcy' : '\u041F',
    'pcy' : '\u043F',
    'percnt' : '%',
    'period' : '.',
    'permil' : '\u2030',
    'perp' : '\u22A5',
    'pertenk' : '\u2031',
    'Pfr' : '\uD835\uDD13',
    'pfr' : '\uD835\uDD2D',
    'Phi' : '\u03A6',
    'phi' : '\u03C6',
    'phiv' : '\u03D5',
    'phmmat' : '\u2133',
    'phone' : '\u260E',
    'Pi' : '\u03A0',
    'pi' : '\u03C0',
    'pitchfork' : '\u22D4',
    'piv' : '\u03D6',
    'planck' : '\u210F',
    'planckh' : '\u210E',
    'plankv' : '\u210F',
    'plusacir' : '\u2A23',
    'plusb' : '\u229E',
    'pluscir' : '\u2A22',
    'plus' : '+',
    'plusdo' : '\u2214',
    'plusdu' : '\u2A25',
    'pluse' : '\u2A72',
    'PlusMinus' : '\xB1',
    'plusmn' : '\xB1',
    'plussim' : '\u2A26',
    'plustwo' : '\u2A27',
    'pm' : '\xB1',
    'Poincareplane' : '\u210C',
    'pointint' : '\u2A15',
    'popf' : '\uD835\uDD61',
    'Popf' : '\u2119',
    'pound' : '\xA3',
    'prap' : '\u2AB7',
    'Pr' : '\u2ABB',
    'pr' : '\u227A',
    'prcue' : '\u227C',
    'precapprox' : '\u2AB7',
    'prec' : '\u227A',
    'preccurlyeq' : '\u227C',
    'Precedes' : '\u227A',
    'PrecedesEqual' : '\u2AAF',
    'PrecedesSlantEqual' : '\u227C',
    'PrecedesTilde' : '\u227E',
    'preceq' : '\u2AAF',
    'precnapprox' : '\u2AB9',
    'precneqq' : '\u2AB5',
    'precnsim' : '\u22E8',
    'pre' : '\u2AAF',
    'prE' : '\u2AB3',
    'precsim' : '\u227E',
    'prime' : '\u2032',
    'Prime' : '\u2033',
    'primes' : '\u2119',
    'prnap' : '\u2AB9',
    'prnE' : '\u2AB5',
    'prnsim' : '\u22E8',
    'prod' : '\u220F',
    'Product' : '\u220F',
    'profalar' : '\u232E',
    'profline' : '\u2312',
    'profsurf' : '\u2313',
    'prop' : '\u221D',
    'Proportional' : '\u221D',
    'Proportion' : '\u2237',
    'propto' : '\u221D',
    'prsim' : '\u227E',
    'prurel' : '\u22B0',
    'Pscr' : '\uD835\uDCAB',
    'pscr' : '\uD835\uDCC5',
    'Psi' : '\u03A8',
    'psi' : '\u03C8',
    'puncsp' : '\u2008',
    'Qfr' : '\uD835\uDD14',
    'qfr' : '\uD835\uDD2E',
    'qint' : '\u2A0C',
    'qopf' : '\uD835\uDD62',
    'Qopf' : '\u211A',
    'qprime' : '\u2057',
    'Qscr' : '\uD835\uDCAC',
    'qscr' : '\uD835\uDCC6',
    'quaternions' : '\u210D',
    'quatint' : '\u2A16',
    'quest' : '?',
    'questeq' : '\u225F',
    'quot' : '"',
    'QUOT' : '"',
    'rAarr' : '\u21DB',
    'race' : '\u223D\u0331',
    'Racute' : '\u0154',
    'racute' : '\u0155',
    'radic' : '\u221A',
    'raemptyv' : '\u29B3',
    'rang' : '\u27E9',
    'Rang' : '\u27EB',
    'rangd' : '\u2992',
    'range' : '\u29A5',
    'rangle' : '\u27E9',
    'raquo' : '\xBB',
    'rarrap' : '\u2975',
    'rarrb' : '\u21E5',
    'rarrbfs' : '\u2920',
    'rarrc' : '\u2933',
    'rarr' : '\u2192',
    'Rarr' : '\u21A0',
    'rArr' : '\u21D2',
    'rarrfs' : '\u291E',
    'rarrhk' : '\u21AA',
    'rarrlp' : '\u21AC',
    'rarrpl' : '\u2945',
    'rarrsim' : '\u2974',
    'Rarrtl' : '\u2916',
    'rarrtl' : '\u21A3',
    'rarrw' : '\u219D',
    'ratail' : '\u291A',
    'rAtail' : '\u291C',
    'ratio' : '\u2236',
    'rationals' : '\u211A',
    'rbarr' : '\u290D',
    'rBarr' : '\u290F',
    'RBarr' : '\u2910',
    'rbbrk' : '\u2773',
    'rbrace' : '}',
    'rbrack' : ']',
    'rbrke' : '\u298C',
    'rbrksld' : '\u298E',
    'rbrkslu' : '\u2990',
    'Rcaron' : '\u0158',
    'rcaron' : '\u0159',
    'Rcedil' : '\u0156',
    'rcedil' : '\u0157',
    'rceil' : '\u2309',
    'rcub' : '}',
    'Rcy' : '\u0420',
    'rcy' : '\u0440',
    'rdca' : '\u2937',
    'rdldhar' : '\u2969',
    'rdquo' : '\u201D',
    'rdquor' : '\u201D',
    'rdsh' : '\u21B3',
    'real' : '\u211C',
    'realine' : '\u211B',
    'realpart' : '\u211C',
    'reals' : '\u211D',
    'Re' : '\u211C',
    'rect' : '\u25AD',
    'reg' : '\xAE',
    'REG' : '\xAE',
    'ReverseElement' : '\u220B',
    'ReverseEquilibrium' : '\u21CB',
    'ReverseUpEquilibrium' : '\u296F',
    'rfisht' : '\u297D',
    'rfloor' : '\u230B',
    'rfr' : '\uD835\uDD2F',
    'Rfr' : '\u211C',
    'rHar' : '\u2964',
    'rhard' : '\u21C1',
    'rharu' : '\u21C0',
    'rharul' : '\u296C',
    'Rho' : '\u03A1',
    'rho' : '\u03C1',
    'rhov' : '\u03F1',
    'RightAngleBracket' : '\u27E9',
    'RightArrowBar' : '\u21E5',
    'rightarrow' : '\u2192',
    'RightArrow' : '\u2192',
    'Rightarrow' : '\u21D2',
    'RightArrowLeftArrow' : '\u21C4',
    'rightarrowtail' : '\u21A3',
    'RightCeiling' : '\u2309',
    'RightDoubleBracket' : '\u27E7',
    'RightDownTeeVector' : '\u295D',
    'RightDownVectorBar' : '\u2955',
    'RightDownVector' : '\u21C2',
    'RightFloor' : '\u230B',
    'rightharpoondown' : '\u21C1',
    'rightharpoonup' : '\u21C0',
    'rightleftarrows' : '\u21C4',
    'rightleftharpoons' : '\u21CC',
    'rightrightarrows' : '\u21C9',
    'rightsquigarrow' : '\u219D',
    'RightTeeArrow' : '\u21A6',
    'RightTee' : '\u22A2',
    'RightTeeVector' : '\u295B',
    'rightthreetimes' : '\u22CC',
    'RightTriangleBar' : '\u29D0',
    'RightTriangle' : '\u22B3',
    'RightTriangleEqual' : '\u22B5',
    'RightUpDownVector' : '\u294F',
    'RightUpTeeVector' : '\u295C',
    'RightUpVectorBar' : '\u2954',
    'RightUpVector' : '\u21BE',
    'RightVectorBar' : '\u2953',
    'RightVector' : '\u21C0',
    'ring' : '\u02DA',
    'risingdotseq' : '\u2253',
    'rlarr' : '\u21C4',
    'rlhar' : '\u21CC',
    'rlm' : '\u200F',
    'rmoustache' : '\u23B1',
    'rmoust' : '\u23B1',
    'rnmid' : '\u2AEE',
    'roang' : '\u27ED',
    'roarr' : '\u21FE',
    'robrk' : '\u27E7',
    'ropar' : '\u2986',
    'ropf' : '\uD835\uDD63',
    'Ropf' : '\u211D',
    'roplus' : '\u2A2E',
    'rotimes' : '\u2A35',
    'RoundImplies' : '\u2970',
    'rpar' : ')',
    'rpargt' : '\u2994',
    'rppolint' : '\u2A12',
    'rrarr' : '\u21C9',
    'Rrightarrow' : '\u21DB',
    'rsaquo' : '\u203A',
    'rscr' : '\uD835\uDCC7',
    'Rscr' : '\u211B',
    'rsh' : '\u21B1',
    'Rsh' : '\u21B1',
    'rsqb' : ']',
    'rsquo' : '\u2019',
    'rsquor' : '\u2019',
    'rthree' : '\u22CC',
    'rtimes' : '\u22CA',
    'rtri' : '\u25B9',
    'rtrie' : '\u22B5',
    'rtrif' : '\u25B8',
    'rtriltri' : '\u29CE',
    'RuleDelayed' : '\u29F4',
    'ruluhar' : '\u2968',
    'rx' : '\u211E',
    'Sacute' : '\u015A',
    'sacute' : '\u015B',
    'sbquo' : '\u201A',
    'scap' : '\u2AB8',
    'Scaron' : '\u0160',
    'scaron' : '\u0161',
    'Sc' : '\u2ABC',
    'sc' : '\u227B',
    'sccue' : '\u227D',
    'sce' : '\u2AB0',
    'scE' : '\u2AB4',
    'Scedil' : '\u015E',
    'scedil' : '\u015F',
    'Scirc' : '\u015C',
    'scirc' : '\u015D',
    'scnap' : '\u2ABA',
    'scnE' : '\u2AB6',
    'scnsim' : '\u22E9',
    'scpolint' : '\u2A13',
    'scsim' : '\u227F',
    'Scy' : '\u0421',
    'scy' : '\u0441',
    'sdotb' : '\u22A1',
    'sdot' : '\u22C5',
    'sdote' : '\u2A66',
    'searhk' : '\u2925',
    'searr' : '\u2198',
    'seArr' : '\u21D8',
    'searrow' : '\u2198',
    'sect' : '\xA7',
    'semi' : ';',
    'seswar' : '\u2929',
    'setminus' : '\u2216',
    'setmn' : '\u2216',
    'sext' : '\u2736',
    'Sfr' : '\uD835\uDD16',
    'sfr' : '\uD835\uDD30',
    'sfrown' : '\u2322',
    'sharp' : '\u266F',
    'SHCHcy' : '\u0429',
    'shchcy' : '\u0449',
    'SHcy' : '\u0428',
    'shcy' : '\u0448',
    'ShortDownArrow' : '\u2193',
    'ShortLeftArrow' : '\u2190',
    'shortmid' : '\u2223',
    'shortparallel' : '\u2225',
    'ShortRightArrow' : '\u2192',
    'ShortUpArrow' : '\u2191',
    'shy' : '\xAD',
    'Sigma' : '\u03A3',
    'sigma' : '\u03C3',
    'sigmaf' : '\u03C2',
    'sigmav' : '\u03C2',
    'sim' : '\u223C',
    'simdot' : '\u2A6A',
    'sime' : '\u2243',
    'simeq' : '\u2243',
    'simg' : '\u2A9E',
    'simgE' : '\u2AA0',
    'siml' : '\u2A9D',
    'simlE' : '\u2A9F',
    'simne' : '\u2246',
    'simplus' : '\u2A24',
    'simrarr' : '\u2972',
    'slarr' : '\u2190',
    'SmallCircle' : '\u2218',
    'smallsetminus' : '\u2216',
    'smashp' : '\u2A33',
    'smeparsl' : '\u29E4',
    'smid' : '\u2223',
    'smile' : '\u2323',
    'smt' : '\u2AAA',
    'smte' : '\u2AAC',
    'smtes' : '\u2AAC\uFE00',
    'SOFTcy' : '\u042C',
    'softcy' : '\u044C',
    'solbar' : '\u233F',
    'solb' : '\u29C4',
    'sol' : '/',
    'Sopf' : '\uD835\uDD4A',
    'sopf' : '\uD835\uDD64',
    'spades' : '\u2660',
    'spadesuit' : '\u2660',
    'spar' : '\u2225',
    'sqcap' : '\u2293',
    'sqcaps' : '\u2293\uFE00',
    'sqcup' : '\u2294',
    'sqcups' : '\u2294\uFE00',
    'Sqrt' : '\u221A',
    'sqsub' : '\u228F',
    'sqsube' : '\u2291',
    'sqsubset' : '\u228F',
    'sqsubseteq' : '\u2291',
    'sqsup' : '\u2290',
    'sqsupe' : '\u2292',
    'sqsupset' : '\u2290',
    'sqsupseteq' : '\u2292',
    'square' : '\u25A1',
    'Square' : '\u25A1',
    'SquareIntersection' : '\u2293',
    'SquareSubset' : '\u228F',
    'SquareSubsetEqual' : '\u2291',
    'SquareSuperset' : '\u2290',
    'SquareSupersetEqual' : '\u2292',
    'SquareUnion' : '\u2294',
    'squarf' : '\u25AA',
    'squ' : '\u25A1',
    'squf' : '\u25AA',
    'srarr' : '\u2192',
    'Sscr' : '\uD835\uDCAE',
    'sscr' : '\uD835\uDCC8',
    'ssetmn' : '\u2216',
    'ssmile' : '\u2323',
    'sstarf' : '\u22C6',
    'Star' : '\u22C6',
    'star' : '\u2606',
    'starf' : '\u2605',
    'straightepsilon' : '\u03F5',
    'straightphi' : '\u03D5',
    'strns' : '\xAF',
    'sub' : '\u2282',
    'Sub' : '\u22D0',
    'subdot' : '\u2ABD',
    'subE' : '\u2AC5',
    'sube' : '\u2286',
    'subedot' : '\u2AC3',
    'submult' : '\u2AC1',
    'subnE' : '\u2ACB',
    'subne' : '\u228A',
    'subplus' : '\u2ABF',
    'subrarr' : '\u2979',
    'subset' : '\u2282',
    'Subset' : '\u22D0',
    'subseteq' : '\u2286',
    'subseteqq' : '\u2AC5',
    'SubsetEqual' : '\u2286',
    'subsetneq' : '\u228A',
    'subsetneqq' : '\u2ACB',
    'subsim' : '\u2AC7',
    'subsub' : '\u2AD5',
    'subsup' : '\u2AD3',
    'succapprox' : '\u2AB8',
    'succ' : '\u227B',
    'succcurlyeq' : '\u227D',
    'Succeeds' : '\u227B',
    'SucceedsEqual' : '\u2AB0',
    'SucceedsSlantEqual' : '\u227D',
    'SucceedsTilde' : '\u227F',
    'succeq' : '\u2AB0',
    'succnapprox' : '\u2ABA',
    'succneqq' : '\u2AB6',
    'succnsim' : '\u22E9',
    'succsim' : '\u227F',
    'SuchThat' : '\u220B',
    'sum' : '\u2211',
    'Sum' : '\u2211',
    'sung' : '\u266A',
    'sup1' : '\xB9',
    'sup2' : '\xB2',
    'sup3' : '\xB3',
    'sup' : '\u2283',
    'Sup' : '\u22D1',
    'supdot' : '\u2ABE',
    'supdsub' : '\u2AD8',
    'supE' : '\u2AC6',
    'supe' : '\u2287',
    'supedot' : '\u2AC4',
    'Superset' : '\u2283',
    'SupersetEqual' : '\u2287',
    'suphsol' : '\u27C9',
    'suphsub' : '\u2AD7',
    'suplarr' : '\u297B',
    'supmult' : '\u2AC2',
    'supnE' : '\u2ACC',
    'supne' : '\u228B',
    'supplus' : '\u2AC0',
    'supset' : '\u2283',
    'Supset' : '\u22D1',
    'supseteq' : '\u2287',
    'supseteqq' : '\u2AC6',
    'supsetneq' : '\u228B',
    'supsetneqq' : '\u2ACC',
    'supsim' : '\u2AC8',
    'supsub' : '\u2AD4',
    'supsup' : '\u2AD6',
    'swarhk' : '\u2926',
    'swarr' : '\u2199',
    'swArr' : '\u21D9',
    'swarrow' : '\u2199',
    'swnwar' : '\u292A',
    'szlig' : '\xDF',
    'Tab' : '\t',
    'target' : '\u2316',
    'Tau' : '\u03A4',
    'tau' : '\u03C4',
    'tbrk' : '\u23B4',
    'Tcaron' : '\u0164',
    'tcaron' : '\u0165',
    'Tcedil' : '\u0162',
    'tcedil' : '\u0163',
    'Tcy' : '\u0422',
    'tcy' : '\u0442',
    'tdot' : '\u20DB',
    'telrec' : '\u2315',
    'Tfr' : '\uD835\uDD17',
    'tfr' : '\uD835\uDD31',
    'there4' : '\u2234',
    'therefore' : '\u2234',
    'Therefore' : '\u2234',
    'Theta' : '\u0398',
    'theta' : '\u03B8',
    'thetasym' : '\u03D1',
    'thetav' : '\u03D1',
    'thickapprox' : '\u2248',
    'thicksim' : '\u223C',
    'ThickSpace' : '\u205F\u200A',
    'ThinSpace' : '\u2009',
    'thinsp' : '\u2009',
    'thkap' : '\u2248',
    'thksim' : '\u223C',
    'THORN' : '\xDE',
    'thorn' : '\xFE',
    'tilde' : '\u02DC',
    'Tilde' : '\u223C',
    'TildeEqual' : '\u2243',
    'TildeFullEqual' : '\u2245',
    'TildeTilde' : '\u2248',
    'timesbar' : '\u2A31',
    'timesb' : '\u22A0',
    'times' : '\xD7',
    'timesd' : '\u2A30',
    'tint' : '\u222D',
    'toea' : '\u2928',
    'topbot' : '\u2336',
    'topcir' : '\u2AF1',
    'top' : '\u22A4',
    'Topf' : '\uD835\uDD4B',
    'topf' : '\uD835\uDD65',
    'topfork' : '\u2ADA',
    'tosa' : '\u2929',
    'tprime' : '\u2034',
    'trade' : '\u2122',
    'TRADE' : '\u2122',
    'triangle' : '\u25B5',
    'triangledown' : '\u25BF',
    'triangleleft' : '\u25C3',
    'trianglelefteq' : '\u22B4',
    'triangleq' : '\u225C',
    'triangleright' : '\u25B9',
    'trianglerighteq' : '\u22B5',
    'tridot' : '\u25EC',
    'trie' : '\u225C',
    'triminus' : '\u2A3A',
    'TripleDot' : '\u20DB',
    'triplus' : '\u2A39',
    'trisb' : '\u29CD',
    'tritime' : '\u2A3B',
    'trpezium' : '\u23E2',
    'Tscr' : '\uD835\uDCAF',
    'tscr' : '\uD835\uDCC9',
    'TScy' : '\u0426',
    'tscy' : '\u0446',
    'TSHcy' : '\u040B',
    'tshcy' : '\u045B',
    'Tstrok' : '\u0166',
    'tstrok' : '\u0167',
    'twixt' : '\u226C',
    'twoheadleftarrow' : '\u219E',
    'twoheadrightarrow' : '\u21A0',
    'Uacute' : '\xDA',
    'uacute' : '\xFA',
    'uarr' : '\u2191',
    'Uarr' : '\u219F',
    'uArr' : '\u21D1',
    'Uarrocir' : '\u2949',
    'Ubrcy' : '\u040E',
    'ubrcy' : '\u045E',
    'Ubreve' : '\u016C',
    'ubreve' : '\u016D',
    'Ucirc' : '\xDB',
    'ucirc' : '\xFB',
    'Ucy' : '\u0423',
    'ucy' : '\u0443',
    'udarr' : '\u21C5',
    'Udblac' : '\u0170',
    'udblac' : '\u0171',
    'udhar' : '\u296E',
    'ufisht' : '\u297E',
    'Ufr' : '\uD835\uDD18',
    'ufr' : '\uD835\uDD32',
    'Ugrave' : '\xD9',
    'ugrave' : '\xF9',
    'uHar' : '\u2963',
    'uharl' : '\u21BF',
    'uharr' : '\u21BE',
    'uhblk' : '\u2580',
    'ulcorn' : '\u231C',
    'ulcorner' : '\u231C',
    'ulcrop' : '\u230F',
    'ultri' : '\u25F8',
    'Umacr' : '\u016A',
    'umacr' : '\u016B',
    'uml' : '\xA8',
    'UnderBar' : '_',
    'UnderBrace' : '\u23DF',
    'UnderBracket' : '\u23B5',
    'UnderParenthesis' : '\u23DD',
    'Union' : '\u22C3',
    'UnionPlus' : '\u228E',
    'Uogon' : '\u0172',
    'uogon' : '\u0173',
    'Uopf' : '\uD835\uDD4C',
    'uopf' : '\uD835\uDD66',
    'UpArrowBar' : '\u2912',
    'uparrow' : '\u2191',
    'UpArrow' : '\u2191',
    'Uparrow' : '\u21D1',
    'UpArrowDownArrow' : '\u21C5',
    'updownarrow' : '\u2195',
    'UpDownArrow' : '\u2195',
    'Updownarrow' : '\u21D5',
    'UpEquilibrium' : '\u296E',
    'upharpoonleft' : '\u21BF',
    'upharpoonright' : '\u21BE',
    'uplus' : '\u228E',
    'UpperLeftArrow' : '\u2196',
    'UpperRightArrow' : '\u2197',
    'upsi' : '\u03C5',
    'Upsi' : '\u03D2',
    'upsih' : '\u03D2',
    'Upsilon' : '\u03A5',
    'upsilon' : '\u03C5',
    'UpTeeArrow' : '\u21A5',
    'UpTee' : '\u22A5',
    'upuparrows' : '\u21C8',
    'urcorn' : '\u231D',
    'urcorner' : '\u231D',
    'urcrop' : '\u230E',
    'Uring' : '\u016E',
    'uring' : '\u016F',
    'urtri' : '\u25F9',
    'Uscr' : '\uD835\uDCB0',
    'uscr' : '\uD835\uDCCA',
    'utdot' : '\u22F0',
    'Utilde' : '\u0168',
    'utilde' : '\u0169',
    'utri' : '\u25B5',
    'utrif' : '\u25B4',
    'uuarr' : '\u21C8',
    'Uuml' : '\xDC',
    'uuml' : '\xFC',
    'uwangle' : '\u29A7',
    'vangrt' : '\u299C',
    'varepsilon' : '\u03F5',
    'varkappa' : '\u03F0',
    'varnothing' : '\u2205',
    'varphi' : '\u03D5',
    'varpi' : '\u03D6',
    'varpropto' : '\u221D',
    'varr' : '\u2195',
    'vArr' : '\u21D5',
    'varrho' : '\u03F1',
    'varsigma' : '\u03C2',
    'varsubsetneq' : '\u228A\uFE00',
    'varsubsetneqq' : '\u2ACB\uFE00',
    'varsupsetneq' : '\u228B\uFE00',
    'varsupsetneqq' : '\u2ACC\uFE00',
    'vartheta' : '\u03D1',
    'vartriangleleft' : '\u22B2',
    'vartriangleright' : '\u22B3',
    'vBar' : '\u2AE8',
    'Vbar' : '\u2AEB',
    'vBarv' : '\u2AE9',
    'Vcy' : '\u0412',
    'vcy' : '\u0432',
    'vdash' : '\u22A2',
    'vDash' : '\u22A8',
    'Vdash' : '\u22A9',
    'VDash' : '\u22AB',
    'Vdashl' : '\u2AE6',
    'veebar' : '\u22BB',
    'vee' : '\u2228',
    'Vee' : '\u22C1',
    'veeeq' : '\u225A',
    'vellip' : '\u22EE',
    'verbar' : '|',
    'Verbar' : '\u2016',
    'vert' : '|',
    'Vert' : '\u2016',
    'VerticalBar' : '\u2223',
    'VerticalLine' : '|',
    'VerticalSeparator' : '\u2758',
    'VerticalTilde' : '\u2240',
    'VeryThinSpace' : '\u200A',
    'Vfr' : '\uD835\uDD19',
    'vfr' : '\uD835\uDD33',
    'vltri' : '\u22B2',
    'vnsub' : '\u2282\u20D2',
    'vnsup' : '\u2283\u20D2',
    'Vopf' : '\uD835\uDD4D',
    'vopf' : '\uD835\uDD67',
    'vprop' : '\u221D',
    'vrtri' : '\u22B3',
    'Vscr' : '\uD835\uDCB1',
    'vscr' : '\uD835\uDCCB',
    'vsubnE' : '\u2ACB\uFE00',
    'vsubne' : '\u228A\uFE00',
    'vsupnE' : '\u2ACC\uFE00',
    'vsupne' : '\u228B\uFE00',
    'Vvdash' : '\u22AA',
    'vzigzag' : '\u299A',
    'Wcirc' : '\u0174',
    'wcirc' : '\u0175',
    'wedbar' : '\u2A5F',
    'wedge' : '\u2227',
    'Wedge' : '\u22C0',
    'wedgeq' : '\u2259',
    'weierp' : '\u2118',
    'Wfr' : '\uD835\uDD1A',
    'wfr' : '\uD835\uDD34',
    'Wopf' : '\uD835\uDD4E',
    'wopf' : '\uD835\uDD68',
    'wp' : '\u2118',
    'wr' : '\u2240',
    'wreath' : '\u2240',
    'Wscr' : '\uD835\uDCB2',
    'wscr' : '\uD835\uDCCC',
    'xcap' : '\u22C2',
    'xcirc' : '\u25EF',
    'xcup' : '\u22C3',
    'xdtri' : '\u25BD',
    'Xfr' : '\uD835\uDD1B',
    'xfr' : '\uD835\uDD35',
    'xharr' : '\u27F7',
    'xhArr' : '\u27FA',
    'Xi' : '\u039E',
    'xi' : '\u03BE',
    'xlarr' : '\u27F5',
    'xlArr' : '\u27F8',
    'xmap' : '\u27FC',
    'xnis' : '\u22FB',
    'xodot' : '\u2A00',
    'Xopf' : '\uD835\uDD4F',
    'xopf' : '\uD835\uDD69',
    'xoplus' : '\u2A01',
    'xotime' : '\u2A02',
    'xrarr' : '\u27F6',
    'xrArr' : '\u27F9',
    'Xscr' : '\uD835\uDCB3',
    'xscr' : '\uD835\uDCCD',
    'xsqcup' : '\u2A06',
    'xuplus' : '\u2A04',
    'xutri' : '\u25B3',
    'xvee' : '\u22C1',
    'xwedge' : '\u22C0',
    'Yacute' : '\xDD',
    'yacute' : '\xFD',
    'YAcy' : '\u042F',
    'yacy' : '\u044F',
    'Ycirc' : '\u0176',
    'ycirc' : '\u0177',
    'Ycy' : '\u042B',
    'ycy' : '\u044B',
    'yen' : '\xA5',
    'Yfr' : '\uD835\uDD1C',
    'yfr' : '\uD835\uDD36',
    'YIcy' : '\u0407',
    'yicy' : '\u0457',
    'Yopf' : '\uD835\uDD50',
    'yopf' : '\uD835\uDD6A',
    'Yscr' : '\uD835\uDCB4',
    'yscr' : '\uD835\uDCCE',
    'YUcy' : '\u042E',
    'yucy' : '\u044E',
    'yuml' : '\xFF',
    'Yuml' : '\u0178',
    'Zacute' : '\u0179',
    'zacute' : '\u017A',
    'Zcaron' : '\u017D',
    'zcaron' : '\u017E',
    'Zcy' : '\u0417',
    'zcy' : '\u0437',
    'Zdot' : '\u017B',
    'zdot' : '\u017C',
    'zeetrf' : '\u2128',
    'ZeroWidthSpace' : '\u200B',
    'Zeta' : '\u0396',
    'zeta' : '\u03B6',
    'zfr' : '\uD835\uDD37',
    'Zfr' : '\u2128',
    'ZHcy' : '\u0416',
    'zhcy' : '\u0436',
    'zigrarr' : '\u21DD',
    'zopf' : '\uD835\uDD6B',
    'Zopf' : '\u2124',
    'Zscr' : '\uD835\uDCB5',
    'zscr' : '\uD835\uDCCF',
    'zwj' : '\u200D',
    'zwnj' : '\u200C'
  };
  var decodeMapLegacy = {
    'Aacute' : '\xC1',
    'aacute' : '\xE1',
    'Acirc' : '\xC2',
    'acirc' : '\xE2',
    'acute' : '\xB4',
    'AElig' : '\xC6',
    'aelig' : '\xE6',
    'Agrave' : '\xC0',
    'agrave' : '\xE0',
    'amp' : '&',
    'AMP' : '&',
    'Aring' : '\xC5',
    'aring' : '\xE5',
    'Atilde' : '\xC3',
    'atilde' : '\xE3',
    'Auml' : '\xC4',
    'auml' : '\xE4',
    'brvbar' : '\xA6',
    'Ccedil' : '\xC7',
    'ccedil' : '\xE7',
    'cedil' : '\xB8',
    'cent' : '\xA2',
    'copy' : '\xA9',
    'COPY' : '\xA9',
    'curren' : '\xA4',
    'deg' : '\xB0',
    'divide' : '\xF7',
    'Eacute' : '\xC9',
    'eacute' : '\xE9',
    'Ecirc' : '\xCA',
    'ecirc' : '\xEA',
    'Egrave' : '\xC8',
    'egrave' : '\xE8',
    'ETH' : '\xD0',
    'eth' : '\xF0',
    'Euml' : '\xCB',
    'euml' : '\xEB',
    'frac12' : '\xBD',
    'frac14' : '\xBC',
    'frac34' : '\xBE',
    'gt' : '>',
    'GT' : '>',
    'Iacute' : '\xCD',
    'iacute' : '\xED',
    'Icirc' : '\xCE',
    'icirc' : '\xEE',
    'iexcl' : '\xA1',
    'Igrave' : '\xCC',
    'igrave' : '\xEC',
    'iquest' : '\xBF',
    'Iuml' : '\xCF',
    'iuml' : '\xEF',
    'laquo' : '\xAB',
    'lt' : '<',
    'LT' : '<',
    'macr' : '\xAF',
    'micro' : '\xB5',
    'middot' : '\xB7',
    'nbsp' : '\xA0',
    'not' : '\xAC',
    'Ntilde' : '\xD1',
    'ntilde' : '\xF1',
    'Oacute' : '\xD3',
    'oacute' : '\xF3',
    'Ocirc' : '\xD4',
    'ocirc' : '\xF4',
    'Ograve' : '\xD2',
    'ograve' : '\xF2',
    'ordf' : '\xAA',
    'ordm' : '\xBA',
    'Oslash' : '\xD8',
    'oslash' : '\xF8',
    'Otilde' : '\xD5',
    'otilde' : '\xF5',
    'Ouml' : '\xD6',
    'ouml' : '\xF6',
    'para' : '\xB6',
    'plusmn' : '\xB1',
    'pound' : '\xA3',
    'quot' : '"',
    'QUOT' : '"',
    'raquo' : '\xBB',
    'reg' : '\xAE',
    'REG' : '\xAE',
    'sect' : '\xA7',
    'shy' : '\xAD',
    'sup1' : '\xB9',
    'sup2' : '\xB2',
    'sup3' : '\xB3',
    'szlig' : '\xDF',
    'THORN' : '\xDE',
    'thorn' : '\xFE',
    'times' : '\xD7',
    'Uacute' : '\xDA',
    'uacute' : '\xFA',
    'Ucirc' : '\xDB',
    'ucirc' : '\xFB',
    'Ugrave' : '\xD9',
    'ugrave' : '\xF9',
    'uml' : '\xA8',
    'Uuml' : '\xDC',
    'uuml' : '\xFC',
    'Yacute' : '\xDD',
    'yacute' : '\xFD',
    'yen' : '\xA5',
    'yuml' : '\xFF'
  };
  var decodeMapNumeric = {
    '0' : '\uFFFD',
    '128' : '\u20AC',
    '130' : '\u201A',
    '131' : '\u0192',
    '132' : '\u201E',
    '133' : '\u2026',
    '134' : '\u2020',
    '135' : '\u2021',
    '136' : '\u02C6',
    '137' : '\u2030',
    '138' : '\u0160',
    '139' : '\u2039',
    '140' : '\u0152',
    '142' : '\u017D',
    '145' : '\u2018',
    '146' : '\u2019',
    '147' : '\u201C',
    '148' : '\u201D',
    '149' : '\u2022',
    '150' : '\u2013',
    '151' : '\u2014',
    '152' : '\u02DC',
    '153' : '\u2122',
    '154' : '\u0161',
    '155' : '\u203A',
    '156' : '\u0153',
    '158' : '\u017E',
    '159' : '\u0178'
  };
  var invalidReferenceCodePoints = [1, 2, 3, 4, 5, 6, 7, 8, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 64976, 64977, 64978, 64979, 64980, 64981, 64982, 64983, 64984, 64985, 64986, 64987, 64988, 64989, 64990, 64991, 64992, 64993, 64994, 64995, 64996, 64997, 64998, 64999, 65000, 65001, 65002, 65003, 65004, 65005, 65006, 65007, 65534, 65535, 131070, 131071, 196606, 196607, 262142, 262143, 327678, 327679, 393214, 393215, 458750, 458751, 524286, 524287, 589822, 589823, 655358, 655359, 720894, 720895, 786430, 786431, 851966, 851967, 917502, 917503, 983038, 983039, 1048574, 1048575, 1114110, 1114111];
  /*--------------------------------------------------------------------------*/
  var stringFromCharCode = String.fromCharCode;
  var object = {};
  var hasOwnProperty = object.hasOwnProperty;
  var has = function(object, propertyName) {
    return hasOwnProperty.call(object, propertyName);
  };
  var contains = function(array, value) {
    var index = -1;
    var length = array.length;
    while (++index < length) {
      if (array[index] == value) {
        return true;
      }
    }
    return false;
  };
  var merge = function(options, defaults) {
    if (!options) {
      return defaults;
    }
    var result = {};
    var key;
    for (key in defaults) {
      // A `hasOwnProperty` check is not needed here, since only recognized
      // option names are used anyway. Any others are ignored.
      result[key] = has(options, key) ? options[key] : defaults[key];
    }
    return result;
  };
  // Modified version of `ucs2encode`; see https://mths.be/punycode.
  var codePointToSymbol = function(codePoint, strict) {
    var output = '';
    if ((codePoint >= 0xD800 && codePoint <= 0xDFFF) || codePoint > 0x10FFFF) {
      // See issue #4:
      // “Otherwise, if the number is in the range 0xD800 to 0xDFFF or is
      // greater than 0x10FFFF, then this is a parse error. Return a U+FFFD
      // REPLACEMENT CHARACTER.”
      if (strict) {
        parseError('character reference outside the permissible Unicode range');
      }
      return '\uFFFD';
    }
    if (has(decodeMapNumeric, codePoint)) {
      if (strict) {
        parseError('disallowed character reference');
      }
      return decodeMapNumeric[codePoint];
    }
    if (strict && contains(invalidReferenceCodePoints, codePoint)) {
      parseError('disallowed character reference');
    }
    if (codePoint > 0xFFFF) {
      codePoint -= 0x10000;
      output += stringFromCharCode(codePoint >>> 10 & 0x3FF | 0xD800);
      codePoint = 0xDC00 | codePoint & 0x3FF;
    }
    output += stringFromCharCode(codePoint);
    return output;
  };
  var hexEscape = function(symbol) {
    return '&#x' + symbol.charCodeAt(0).toString(16).toUpperCase() + ';';
  };
  var parseError = function(message) {
    throw Error('Parse error: ' + message);
  };
  /*--------------------------------------------------------------------------*/
  var encode = function(string, options) {
    options = merge(options, encode.options);
    var strict = options.strict;
    if (strict && regexInvalidRawCodePoint.test(string)) {
      parseError('forbidden code point');
    }
    var encodeEverything = options.encodeEverything;
    var useNamedReferences = options.useNamedReferences;
    var allowUnsafeSymbols = options.allowUnsafeSymbols;
    if (encodeEverything) {
      // Encode ASCII symbols.
      string = string.replace(regexAsciiWhitelist, function(symbol) {
        // Use named references if requested & possible.
        if (useNamedReferences && has(encodeMap, symbol)) {
          return '&' + encodeMap[symbol] + ';';
        }
        return hexEscape(symbol);
      });
      // Shorten a few escapes that represent two symbols, of which at least one
      // is within the ASCII range.
      if (useNamedReferences) {
        string = string.replace(/&gt;\u20D2/g, '&nvgt;').replace(/&lt;\u20D2/g, '&nvlt;').replace(/&#x66;&#x6A;/g, '&fjlig;');
      }
      // Encode non-ASCII symbols.
      if (useNamedReferences) {
        // Encode non-ASCII symbols that can be replaced with a named reference.
        string = string.replace(regexEncodeNonAscii, function(string) {
          // Note: there is no need to check `has(encodeMap, string)` here.
          return '&' + encodeMap[string] + ';';
        });
      }
      // Note: any remaining non-ASCII symbols are handled outside of the `if`.
    } else if (useNamedReferences) {
      // Apply named character references.
      // Encode `<>"'&` using named character references.
      if (!allowUnsafeSymbols) {
        string = string.replace(regexEscape, function(string) {
          return '&' + encodeMap[string] + ';';
          // no need to check `has()` here
        });
      }
      // Shorten escapes that represent two symbols, of which at least one is
      // `<>"'&`.
      string = string.replace(/&gt;\u20D2/g, '&nvgt;').replace(/&lt;\u20D2/g, '&nvlt;');
      // Encode non-ASCII symbols that can be replaced with a named reference.
      string = string.replace(regexEncodeNonAscii, function(string) {
        // Note: there is no need to check `has(encodeMap, string)` here.
        return '&' + encodeMap[string] + ';';
      });
    } else if (!allowUnsafeSymbols) {
      // Encode `<>"'&` using hexadecimal escapes, now that they’re not handled
      // using named character references.
      string = string.replace(regexEscape, hexEscape);
    }
    return string
    // Encode astral symbols.
    .replace(regexAstralSymbols, function($0) {
      // https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
      var high = $0.charCodeAt(0);
      var low = $0.charCodeAt(1);
      var codePoint = (high - 0xD800) * 0x400 + low - 0xDC00 + 0x10000;
      return '&#x' + codePoint.toString(16).toUpperCase() + ';';
    })
    // Encode any remaining BMP symbols that are not printable ASCII symbols
    // using a hexadecimal escape.
    .replace(regexBmpWhitelist, hexEscape);
  };
  // Expose default options (so they can be overridden globally).
  encode.options = {
    'allowUnsafeSymbols' : false,
    'encodeEverything' : false,
    'strict' : false,
    'useNamedReferences' : false
  };
  var decode = function(html, options) {
    options = merge(options, decode.options);
    var strict = options.strict;
    if (strict && regexInvalidEntity.test(html)) {
      parseError('malformed character reference');
    }
    return html.replace(regexDecode, function($0, $1, $2, $3, $4, $5, $6, $7) {
      var codePoint;
      var semicolon;
      var hexDigits;
      var reference;
      var next;
      if ($1) {
        // Decode decimal escapes, e.g. `&#119558;`.
        codePoint = $1;
        semicolon = $2;
        if (strict && !semicolon) {
          parseError('character reference was not terminated by a semicolon');
        }
        return codePointToSymbol(codePoint, strict);
      }
      if ($3) {
        // Decode hexadecimal escapes, e.g. `&#x1D306;`.
        hexDigits = $3;
        semicolon = $4;
        if (strict && !semicolon) {
          parseError('character reference was not terminated by a semicolon');
        }
        codePoint = parseInt(hexDigits, 16);
        return codePointToSymbol(codePoint, strict);
      }
      if ($5) {
        // Decode named character references with trailing `;`, e.g. `&copy;`.
        reference = $5;
        if (has(decodeMap, reference)) {
          return decodeMap[reference];
        } else {
          // Ambiguous ampersand. https://mths.be/notes/ambiguous-ampersands
          if (strict) {
            parseError('named character reference was not terminated by a semicolon');
          }
          return $0;
        }
      }
      // If we’re still here, it’s a legacy reference for sure. No need for an
      // extra `if` check.
      // Decode named character references without trailing `;`, e.g. `&amp`
      // This is only a parse error if it gets converted to `&`, or if it is
      // followed by `=` in an attribute context.
      reference = $6;
      next = $7;
      if (next && options.isAttributeValue) {
        if (strict && next == '=') {
          parseError('`&` did not start a character reference');
        }
        return $0;
      } else {
        if (strict) {
          parseError('named character reference was not terminated by a semicolon');
        }
        // Note: there is no need to check `has(decodeMapLegacy, reference)`.
        return decodeMapLegacy[reference] + (next || '');
      }
    });
  };
  // Expose default options (so they can be overridden globally).
  decode.options = {
    'isAttributeValue' : false,
    'strict' : false
  };
  var escape = function(string) {
    return string.replace(regexEscape, function($0) {
      // Note: there is no need to check `has(escapeMap, $0)` here.
      return escapeMap[$0];
    });
  };
  /*--------------------------------------------------------------------------*/
  var he = {
    'version' : '0.5.0',
    'encode' : encode,
    'decode' : decode,
    'escape' : escape,
    'unescape' : decode
  };
  rg2.he = he;

}());