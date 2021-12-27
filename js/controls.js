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
      rg2.ctx.lineJoin = "circle";
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
      rg2.ctx.lineJoin = "circle";
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
      rg2.ctx.lineCap = 'round';
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
      rg2.ctx.lineJoin = "circle";
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