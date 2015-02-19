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
        $("#rg2-track-names").empty();
        $("#rg2-track-names").append(html);
        $("#rg2-track-names").show();
        $("#rg2-animation-controls").show();
      } else {
        $("#rg2-track-names").hide();
        $("#rg2-animation-controls").hide();
      }
      this.calculateAnimationRange();
      $("#rg2-clock").text(this.formatSecsAsHHMMSS(this.animationSecs));
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
        html += "<p style='color:" + this.runners[i].colour + ";'>" + this.runners[i].coursename + " " + this.runners[i].name + "</p>";
      }
      return html;
    },

    getSplitsTable : function () {
      var html, i, j, run, metresPerPixel, units, maxControls, legSplit, prevControlSecs;
      if (this.runners.length < 1) {
        return "<p>Select runners on Results tab.</p>";
      }

      if (rg2.events.mapIsGeoreferenced()) {
        metresPerPixel = rg2.events.getMetresPerPixel();
        units = "metres";
      } else {
        metresPerPixel = 1;
        units = "pixels";
      }
      maxControls = 0;
      legSplit = [];
      prevControlSecs = 0;
      // find maximum number of controls to set size of table
      for (i = 0; i < this.runners.length; i += 1) {
        if (this.runners[i].splits.length > maxControls) {
          maxControls = this.runners[i].splits.length;
        }
      }
      // allow for start and finish
      maxControls -= 2;

      html = "<table class='splitstable'><tr><th>Course</th><th>Name</th>";
      for (i = 1; i <= maxControls; i += 1) {
        html += "<th>" + i + "</th>";
      }
      html += "<th>F</th></tr>";
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
        $("#btn-start-stop").removeClass("fa-play").addClass("fa-pause");
        $("#btn-start-stop").prop("title", rg2.t("Pause"));
      } else {
        this.stopAnimation();
        $("#btn-start-stop").removeClass("fa-pause").addClass("fa-play");
        $("#btn-start-stop").prop("title", rg2.t("Run"));
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

    setReplayType : function (type) {
      if (type === rg2.config.MASS_START_REPLAY) {
        this.realTime = false;
        $("#btn-mass-start").addClass('active');
        $("#btn-real-time").removeClass('active');
        if (rg2.courses.getHighestControlNumber() > 0) {
          $("#rg2-control-select").prop('disabled', false);
        }
      } else {
        this.realTime = true;
        $("#btn-mass-start").removeClass('active');
        $("#btn-real-time").addClass('active');
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
      $("#rg2-clock").text(this.formatSecsAsHHMMSS(this.animationSecs));
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

    runAnimation : function (fromTimer) {
      var text, opt, runner, timeOffset, i, t, tailStartTimeSecs;
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
      opt = rg2.getReplayDetails();
      $("#rg2-clock-slider").slider("value", this.animationSecs);
      $("#rg2-clock").text(this.formatSecsAsHHMMSS(this.animationSecs));
      rg2.ctx.lineWidth = opt.routeWidth;
      rg2.ctx.globalAlpha = 1.0;
      if (this.useFullTails) {
        tailStartTimeSecs = this.startSecs + 1;
      } else {
        tailStartTimeSecs = Math.max(this.animationSecs - this.tailLength, this.startSecs + 1);
      }

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
        rg2.ctx.globalAlpha = opt.routeIntensity;
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
        rg2.ctx.fillStyle = runner.colour;
        rg2.ctx.beginPath();
        if ((t - timeOffset) < runner.nextStopTime) {
          t = t - timeOffset;
        } else {
          t = runner.nextStopTime;
        }
        rg2.ctx.arc(runner.x[t] + (rg2.config.RUNNER_DOT_RADIUS / 2), runner.y[t], rg2.config.RUNNER_DOT_RADIUS, 0, 2 * Math.PI, false);
        rg2.ctx.fill();
        if (this.displayNames) {
          rg2.ctx.fillStyle = "black";
          rg2.ctx.font = opt.replayFontSize + 'pt Arial';
          rg2.ctx.globalAlpha = rg2.config.FULL_INTENSITY;
          rg2.ctx.textAlign = "left";
          if (this.displayInitials) {
            text = runner.initials;
          } else {
            text = runner.name;
          }
          rg2.ctx.fillText(text, runner.x[t] + 15, runner.y[t] + 7);
        }
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
    },

    // returns seconds as hh:mm:ss
    formatSecsAsHHMMSS : function (time) {
      var formattedtime, minutes, seconds, hours;
      hours = Math.floor(time / 3600);
      if (hours < 10) {
        formattedtime = "0" + hours + ":";
      } else {
        formattedtime = hours + ":";
      }
      time = time - (hours * 3600);
      minutes = Math.floor(time / 60);
      if (minutes < 10) {
        formattedtime += "0" + minutes;
      } else {
        formattedtime += minutes;
      }
      seconds = time - (minutes * 60);
      if (seconds < 10) {
        formattedtime += ":0" + seconds;
      } else {
        formattedtime += ":" + seconds;
      }
      return formattedtime;
    }
  };
  rg2.Animation = Animation;
}());