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
      // not worried about angle for finish
      this.angle[this.x.length - 1] = 0;
      this.textAngle[this.x.length - 1] = 0;
    },

    drawCourse : function (intensity) {
      var i, opt;
      if (this.display) {
        opt = rg2.getOverprintDetails();
        rg2.ctx.globalAlpha = intensity;
        rg2.controls.drawStart(this.x[0], this.y[0], "", this.angle[0], opt);
        // don't join up controls for score events
        if (!this.isScoreCourse) {
          this.drawLinesBetweenControls(this.x, this.y, this.angle, opt);
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
    drawLinesBetweenControls : function (x, y, angle, opt) {
      var c1x, c1y, c2x, c2y, i, dist;
      for (i = 0; i < (x.length - 1); i += 1) {
        if (i === 0) {
          dist = opt.startTriangleLength;
        } else {
          dist = opt.controlRadius;
        }
        c1x = x[i] + (dist * Math.cos(angle[i]));
        c1y = y[i] + (dist * Math.sin(angle[i]));
        //Assume the last control in the array is a finish
        if (i === this.x.length - 2) {
          dist = opt.finishOuterRadius;
        } else {
          dist = opt.controlRadius;
        }
        c2x = x[i + 1] - (dist * Math.cos(angle[i]));
        c2y = y[i + 1] - (dist * Math.sin(angle[i]));
        rg2.ctx.beginPath();
        rg2.ctx.moveTo(c1x, c1y);
        rg2.ctx.lineTo(c2x, c2y);
        rg2.ctx.stroke();
      }
    }
  };
  rg2.Course = Course;
}());