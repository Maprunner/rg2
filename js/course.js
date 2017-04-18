/*global rg2:false */
(function () {
  function Course(data, isScoreCourse) {
    this.name = data.name;
    this.isScoreCourse = isScoreCourse;
    this.trackcount = 0;
    this.display = false;
    this.courseid = data.courseid;
    this.controls = this.generateControls(data);
    this.resultcount = 0;
  }

  Course.prototype = {
    Constructor : Course,

    getCodes : function () {
      var codes, i;
      codes = [];
      for (i = 0; i < this.controls.length; i++) {
        codes[i] = this.controls[i].code;
      }
      return codes;
    },

    getXArray : function () {
      var xs, i;

      xs = [];
      for(i = 0; i < this.controls.length; i++) {
        xs[i] = this.controls[i].x;
      }
      return xs;
    },

    getYArray : function () {
      var ys, i;

      ys = [];
      for(i = 0; i < this.controls.length; i++) {
        ys[i] = this.controls[i].y;
      }
      return ys;
    },

    generateControls : function (data) {
      var controls, control, i, ang, textAng;
      if (this.isScoreCourse) {
        // align score event start triangle and controls upwards
        ang = Math.PI * 1.5;
        textAng = Math.PI * 0.25;
      } else {
        ang = 0;
        textAng = 0;
      }
      controls = [];
      // Set the x, y and code of the controls
      if(data.xpos !== undefined) {
        
        for (i = 0; i < data.xpos.length; i++) {
          control = {};
          control.x = data.xpos[i];
          control.y = data.ypos[i];
          control.code = data.codes[i];
          control.angle = ang;
          control.textAngle = textAng;
          controls.push(control);
        }
        // Set the actual angles
        if (this.isScoreCourse !== true) {
          controls = this.setAngles(controls);
        }
      }
      return controls;
    },
     // TODO: Review this function
    setAngles : function(controls) {
      var i, control, prevControl, nextControl, c1x, c1y, c2x, c2y, c3x, c3y;
      
      // Calculate the start angle
      controls[0].angle = rg2.utils.getAngle(controls[0].x, controls[0].y, controls[1].x, controls[1].y);
      for (i = 1; i < controls.length; i++) {
        prevControl = controls[i - 1];
        nextControl = controls[i + 1];
        if (prevControl !== undefined && nextControl !== undefined) {
          control = controls[i];
          // angle of line to next control
          control.angle = rg2.utils.getAngle(control.x, control.y, nextControl.x, nextControl.y);
          // create bisector of angle to position number
          c1x = Math.sin(prevControl.angle);
          c1y = Math.cos(prevControl.angle);
          c2x = Math.sin(control.angle) + c1x;
          c2y = Math.cos(control.angle) + c1y;
          c3x = c2x / 2;
          c3y = c2y / 2;
          control.textAngle = rg2.utils.getAngle(c3x, c3y, c1x, c1y);
        }
      }
      return controls;
    },
    /*
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
    */
    drawCourse : function (intensity) {
      var i, opt, control, startDraw, endDraw;
      
      if (this.display) {
        opt = rg2.getOverprintDetails();
        rg2.ctx.globalAlpha = intensity;
        startDraw = 0;
        endDraw = this.controls.length - 1;
        for (i = startDraw; i <= endDraw; i++) {
          control = this.controls[i];
          if (i === 0) {
            rg2.controls.drawStart(control, "", opt);
          } else if (i === this.controls.length - 1) {
            rg2.controls.drawFinish(control, "", opt);
          } else {
            rg2.controls.drawSingleControl(control, i, opt);
          }
        }
        // Only link up controls on non-score courses
        if (this.isScoreCourse !== true) {
            this.drawLinesBetweenControls(opt);
        }
        /*
        rg2.controls.drawStart(this.controls[0], "", opt);
        if (this.isScoreCourse) {
          for (i = 1; i < this.controls.length; i++) {
            control = this.controls[i];
            if(control.code === 'F' || control.code === 'M') {
              // Draw finish
            } else {
              // Draw single control
            }
          }
        } else {
          this.drawLinesBetweenControls(opt);
          for (i = 1; i < this.controls.length - 1; i++) {
            control = this.controls[i];
            rg2.controls.drawSingleControl(control, i, opt);
          }
          rg2.controls.drawFinish(this.controls[this.controls.length - 1], "", opt);
        }
        */
      }
    },
    /*
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
    */
    drawLineFromControl : function (index, opt) {
      var control, cos, sin, c1x, c1y, c2x, c2y, dist;
      
      dist = (index === 0) ? opt.startTriangleLength : opt.controlRadius;
      control = this.controls[index];
      cos = Math.cos(control.angle);
      sin = Math.sin(control.angle);
      
      c1x = control.x + dist * cos;
      c1y = control.y + dist * sin;
      
      dist = (index === this.controls.length - 2) ? opt.finishOuterRadius : opt.controlRadius;
      control = this.controls[index + 1];
      
      c2x = control.x - dist * cos;
      c2y = control.y - dist * sin;

      rg2.utils.drawLine(c1x, c1y, c2x, c2y);
    },

    drawLinesBetweenControls : function (opt) {
      var i;
      
      for (i = 0; i < this.controls.length - 1; i++) {
        this.drawLineFromControl(i, opt);
      }
    },
    /*
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
    },
    */
    incrementTracksCount : function () {
      this.trackcount += 1;
    }
  };
  rg2.Course = Course;
}());
