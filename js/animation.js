(function () {
  function Animation() {
    'use strict';
    this.runners = [];
    // possible time increment values in milliseconds when timer expires
    this.deltas = [100, 200, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 50000, 100000];
    // value in milliseconds
    this.timerInterval = 100;
    this.resetAnimation();
  }


  Animation.prototype = {
    Constructor : Animation,

    resetAnimation : function () {
      this.units = rg2.events.getLengthUnits();
      this.runners.length = 0;
      clearInterval(this.timer);
      this.timer = null;
      // current time of animation
      this.animationSecs = 0;
      // animation time in millisecs to avoid rounding problems at very slow speed
      // animationSecs is always int(milliSecs/1000)
      this.milliSecs = 0;
      this.deltaIndex = 3;
      $("#rg2-animation-speed").empty().text("x " + (this.deltas[this.deltaIndex] / 100));
      // if not real time then mass start
      this.realTime = false;
      this.earliestStartSecs = 0;
      this.latestFinishSecs = 0;
      this.tailLength = 0;
      this.tailStartTimeSecs = 0;
      this.useFullTails = false;
      // control to start from if this option selected
      this.massStartControl = 0;
      // run each leg as a mass start if true
      this.massStartByControl = false;
      this.displayNames = true;
      this.displayInitials = false;
      this.updateAnimationDetails();
      $("#btn-start-stop").removeClass('fa-pause').addClass('fa-play').prop('title', rg2.t('Run'));
      $("#btn-real-time").removeClass().addClass('fa fa-users').prop('title', rg2.t('Real time') + ' > ' + rg2.t('Mass start'));
      $("#btn-toggle-names").prop('title', rg2.t('Show initials'));
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
      var html;
      if (this.runners.length > 0) {
        html = this.getAnimationNames(this.animationSecs);
        $("#rg2-track-names").empty().append(html).show();
        $("#rg2-animation-controls").show();
      } else {
        $("#rg2-track-names").hide();
        $("#rg2-animation-controls").hide();
      }
      this.calculateAnimationRange();
      $("#rg2-clock").text(rg2.utils.formatSecsAsHHMMSS(this.animationSecs));
    },

    updateNameDetails : function (time) {
      var html = this.getAnimationNames(time);
      if (html !== "") {
        $("#rg2-track-names").empty().append(html).show();
      } else {
        $("#rg2-track-names").hide();
      }
    },

    // slider callback
    clockSliderMoved : function (time) {
      this.resetAnimationTime(time);
      rg2.redraw(false);
    },

    getAnimationNames : function (time) {
      var i, html, tracks, info, oldCourse;
      // major refactoring for #400
      // get all tracks displayed so we can add them if they are not animated as well
      tracks = rg2.results.getDisplayedTrackDetails();
      for (i = 0; i < this.runners.length; i += 1) {
        // people can be in both lists: just accept it
        info = {};
        info.colour = this.runners[i].colour;
        info.course = this.runners[i].coursename;
        info.name = this.runners[i].name.trim();
        if (this.realTime) {
          info.distance = this.getDistanceAtTime(i, this.animationSecs - this.runners[i].starttime);
        } else {
          info.distance = this.getDistanceAtTime(i, time);
        }
        tracks.push(info);
      }
      if (tracks.length === 0) {
        return "";
      }
      // need to do this to allow a stable (deterministic) sort
      // otherwise people with same colour can end up next to each other in name list
      // still not perfect but better than it was
      for (i = 0; i < tracks.length; i += 1) {
        tracks[i].index = i;
      }
      tracks.sort(function (a, b) {
        if (a.course !== b.course) {
          if (a.course > b.course) {
            return 1;
          }
          return -1;
        }
        if (a.index > b.index) {
          return 1;
        }
        if (a.index < b.index) {
          return -1;
        }
        return 0;
      });
      html = "<table>";
      oldCourse = "";
      for (i = 0; i < tracks.length; i += 1) {
        if (oldCourse !== tracks[i].course) {
          html += "<tr><th colspan='3'>" + tracks[i].course + "</th></tr>";
          oldCourse = tracks[i].course;
        }
        html += "<tr><td style='color:" + tracks[i].colour + ";'><i class='fa fa-circle'></i></td><td class='align-left'>" + tracks[i].name + "</td>";
        // eslint-disable-next-line no-prototype-builtins
        if (tracks[i].hasOwnProperty('distance')) {
          html +=  "<td class='align-right'>" + tracks[i].distance + this.units;
        } else {
          html += "<td>";
        }
        html +=  "</td></tr>";
      }
      html += "</table>";
      return html;
    },

    getDistanceAtTime : function (idx, time) {
      var dist, cumDist;
      cumDist = this.runners[idx].cumulativeDistance;
      dist = (time > (cumDist.length - 1)) ? cumDist[cumDist.length - 1] : cumDist[time];
      if (dist === undefined) {
        dist = 0;
      }
      return dist;
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
      var html, i, j, run, maxControls, legSplit, prevControlSecs;
      if (this.runners.length < 1) {
        return "<p>" + rg2.t("Select runners on Results tab") + ".</p>";
      }
      legSplit = [];
      prevControlSecs = 0;
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
          html += "</tr><tr class='splitsdistance-row'><td></td><td>" + run.cumulativeTrackDistance[run.cumulativeTrackDistance.length - 1] + " " + this.units + "</td>";
        }
        for (j = 1; j < run.splits.length; j += 1) {
          if (isNaN(run.legTrackDistance[j])) {
            // handle various problems with missing splits
            html += "<td>--</td>";
          } else {
            html += "<td>" + run.legTrackDistance[j] + "</td>";
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
      // a bit convoluted, but time expiry calls redraw, and redraw then calls runAnimation
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
        $("#btn-real-time").removeClass().addClass('fa fa-users').prop('title', rg2.t('Mass start') + ' > ' + rg2.t('Real time'));
        if (rg2.courses.getHighestControlNumber() > 0) {
          $("#rg2-control-select").prop('disabled', false);
        }
      } else {
        this.realTime = true;
        $("#btn-real-time").removeClass().addClass('fa fa-clock').prop('title', rg2.t('Real time') + ' > ' + rg2.t('Mass start'));
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
      this.milliSecs = this.animationSecs * 1000;
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

    incrementAnimationTime : function () {
      // only increment time if we haven't got to the end already
      if (this.realTime) {
        if (this.animationSecs < this.latestFinishSecs) {
          this.milliSecs += this.deltas[this.deltaIndex];
        }
      } else {
        if (this.animationSecs < this.slowestTimeSecs) {
          this.milliSecs += this.deltas[this.deltaIndex];
        }
      }
      this.animationSecs = parseInt((this.milliSecs / 1000), 10);
      // find earliest time we need to worry about when drawing screen
      if (this.useFullTails) {
        this.tailStartTimeSecs = this.startSecs + 1;
      } else {
        this.tailStartTimeSecs = Math.max(this.animationSecs - this.tailLength, this.startSecs + 1);
      }
    },

    drawAnimation : function () {
      // This function draws the current state of the animation.
      var runner, timeOffset, i, t;
      $("#rg2-clock-slider").slider("value", this.animationSecs);
      $("#rg2-clock").text(rg2.utils.formatSecsAsHHMMSS(this.animationSecs));
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
        rg2.ctx.moveTo(runner.x[this.tailStartTimeSecs - timeOffset], runner.y[this.tailStartTimeSecs - timeOffset]);

        // t runs as real time seconds or 0-based seconds depending on this.realTime
        //runner.x[] is always indexed in 0-based time so needs to be adjusted for starttime offset
        for (t = this.tailStartTimeSecs; t < this.animationSecs; t += 1) {
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
      this.updateNameDetails(t);
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
      if (this.deltaIndex > 0) {
        this.deltaIndex -= 1;
      }
      $("#rg2-animation-speed").empty().text("x " + (this.deltas[this.deltaIndex] / 100));
    },

    goFaster : function () {
      if (this.deltaIndex < (this.deltas.length - 1)) {
        this.deltaIndex += 1;
      }
      $("#rg2-animation-speed").empty().text("x " + (this.deltas[this.deltaIndex] / 100));
    }
  };
  rg2.Animation = Animation;
}());
