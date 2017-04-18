/*global rg2:false */
(function () {
  function Controls() {
    this.controls = [];
    this.displayControls = false;
  }


  Controls.prototype = {
    Constructor : Controls,

    addControl : function (control) {
      var i, newCode;
      newCode = true;
      for (i = 0; i < this.controls.length; i += 1) {
        if (this.controls[i].code === control.code) {
          newCode = false;
          break;
        }
      }
      if (newCode) {
        this.controls.push(new rg2.Control(control.code, control.x, control.y));
      }
    },

    deleteAllControls : function () {
      this.controls.length = 0;
    },

    drawControls : function (drawDot) {
      var i, opt, control;

      if (this.displayControls) {
        opt = rg2.getOverprintDetails();
        //rg2.ctx.globalAlpha = 1.0;
        for (i = 0; i < this.controls.length; i++) {
          control = this.controls[i];
          // Assume things starting with 'F' or 'M' are Finish or Mal
          if ((control.code.indexOf('F') === 0) || (control.code.indexOf('M') === 0)) {
            this.drawFinish(control, control.code, opt);
          } else {
            // Assume things starting with 'S' are a Start
            if (control.code.indexOf('S') === 0) {
              this.drawStart(control, control.code, opt);
            } else {
              // Else it's a normal control
              this.drawSingleControl(control, control.code, opt);
              if (drawDot) {
                rg2.ctx.fillRect(control.x - 1, control.y - 1, 3, 3);
              }
            }
          }
        }
      }
    },

    drawSingleControl : function (control, label, opt) {
      var x, y, angle, scale, metrics, xoffset, yoffset;

      x = control.x;
      y = control.y;
      angle = (control.textAngle === undefined) ? Math.PI * 0.25 : control.textAngle;

      //Draw the white halo around the controls
      rg2.utils.drawCircle(x, y, opt.controlRadius, opt, false);
      //Draw the white halo around the control code
      rg2.ctx.beginPath();
      rg2.ctx.textAlign = "center";
      rg2.ctx.font = opt.font;
      rg2.ctx.strokeStyle = "white";
      rg2.ctx.miterLimit = 2;
      rg2.ctx.lineJoin = "circle";
      rg2.ctx.lineWidth = 1.5;
      rg2.ctx.textBaseline = "middle";
      metrics = rg2.ctx.measureText(label);
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
      rg2.ctx.strokeText(label, x + (opt.controlRadius * scale * Math.sin(angle)) + xoffset, y + (opt.controlRadius * scale * Math.cos(angle)) + yoffset);
      //Draw the purple control
      rg2.utils.drawCircle(x, y, opt.controlRadius, opt, true);
      
      rg2.ctx.beginPath();
      rg2.ctx.fillStyle = rg2.config.PURPLE;
      rg2.ctx.fillText(label, x + (opt.controlRadius * scale * Math.sin(angle)) + xoffset, y + (opt.controlRadius * scale * Math.cos(angle)) + yoffset);
      rg2.ctx.stroke();
    },

    drawFinish : function (control, label, opt) {
      var x, y;

      x = control.x;
      y = control.y;
      //Draw the white halo around the finish control
      rg2.utils.drawCircle(x, y, opt.finishInnerRadius, opt, false);
      rg2.utils.drawCircle(x, y, opt.finishOuterRadius, opt, false);
      
      //Draw the white halo around the finish code
      rg2.ctx.beginPath();
      rg2.ctx.font = opt.font;
      rg2.ctx.textAlign = "left";
      rg2.ctx.strokeStyle = "white";
      rg2.ctx.miterLimit = 2;
      rg2.ctx.lineJoin = "circle";
      rg2.ctx.lineWidth = 1.5;
      rg2.ctx.strokeText(label, x + (opt.controlRadius * 1.5), y + opt.controlRadius);
      rg2.ctx.stroke();
      //Draw the purple finish control
      rg2.utils.drawCircle(x, y, opt.finishInnerRadius, opt, true);
      rg2.utils.drawCircle(x, y, opt.finishOuterRadius, opt, true);
      
      // Refactor to function
      rg2.ctx.beginPath();
      rg2.ctx.fillStyle = rg2.config.PURPLE;
      rg2.ctx.fillText(label, x + (opt.controlRadius * 1.5), y + opt.controlRadius);
      rg2.ctx.stroke();
    },

    drawStart : function (control, label, opt) {
      //Draw the white halo around the start triangle
      var x, y, startx, starty, angle, DEGREES_120;
      startx = control.x;
      starty = control.y;
      angle = control.angle;
      x = [];
      y = [];
      DEGREES_120 = (2 * Math.PI / 3);
      angle = angle + (Math.PI / 2);
      rg2.ctx.lineCap = 'round';
      rg2.ctx.strokeStyle = "white";
      rg2.ctx.lineWidth = opt.overprintWidth + 2;

      x[0] = startx + (opt.startTriangleLength * Math.sin(angle));
      y[0] = starty - (opt.startTriangleLength * Math.cos(angle));
      x[1] = startx + (opt.startTriangleLength * Math.sin(angle + DEGREES_120));
      y[1] = starty - (opt.startTriangleLength * Math.cos(angle + DEGREES_120));
      x[2] = startx + (opt.startTriangleLength * Math.sin(angle - DEGREES_120));
      y[2] = starty - (opt.startTriangleLength * Math.cos(angle - DEGREES_120));
      rg2.utils.drawLine(x[0], y[0], x[1], y[1]);
      rg2.utils.drawLine(x[1], y[1], x[2], y[2]);
      rg2.utils.drawLine(x[2], y[2], x[0], y[0]);

      //Draw the white halo around the start code
      rg2.ctx.beginPath();
      rg2.ctx.font = opt.font;
      rg2.ctx.textAlign = "left";
      rg2.ctx.strokeStyle = "white";
      rg2.ctx.miterLimit = 2;
      rg2.ctx.lineJoin = "circle";
      rg2.ctx.lineWidth = 1.5;
      rg2.ctx.strokeText(label, x[0] + (opt.controlRadius * 1.25), y[0] + (opt.controlRadius * 1.25));
      rg2.ctx.stroke();
      //Draw the purple start control
      rg2.ctx.lineWidth = opt.overprintWidth;
      rg2.ctx.font = opt.font;
      rg2.ctx.strokeStyle = rg2.config.PURPLE;
      rg2.utils.drawLine(x[0], y[0], x[1], y[1]);
      rg2.utils.drawLine(x[1], y[1], x[2], y[2]);
      rg2.utils.drawLine(x[2], y[2], x[0], y[0]);
      
      rg2.ctx.fillStyle = rg2.config.PURPLE;
      rg2.ctx.beginPath();
      rg2.ctx.fillText(label, x[0] + (opt.controlRadius * 1.25), y[0] + (opt.controlRadius * 1.25));
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