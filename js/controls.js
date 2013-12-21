'use strict';

	function Controls() {
		this.controls = [];
		this.displayControls = false;
	}


	Controls.prototype = {
		Constructor : Controls,

		addControl : function(code, x, y) {
			var newCode = true;
			for (var i = 0; i < this.controls.length; i++) {
				if (this.controls[i].code === code) {
					newCode = false;
					break;
				}
			}
			if (newCode) {
				this.controls.push(new Control(code, x, y));
			}
		},

		deleteAllControls : function() {
			this.controls.length = 0;
		},

		drawControls : function() {
			if (this.displayControls) {
        var x;
        var y;        
				rg2.ctx.lineWidth = rg2.config.OVERPRINT_LINE_THICKNESS;
				rg2.ctx.strokeStyle = rg2.config.PURPLE;
				rg2.ctx.font = '20pt Arial';
				rg2.ctx.fillStyle = rg2.config.PURPLE;				
				rg2.ctx.globalAlpha = 1.0;				
        for (var i = 0; i < this.controls.length; i++) {
          // Assume things starting with 'F' are a Finish
          if (this.controls[i].code.indexOf('F') == 0){
            this.drawFinish(this.controls[i].x, this.controls[i].y, this.controls[i].code);                   
          } else {
            // Assume things starting with 'S' are a Start             
            if (this.controls[i].code.indexOf('S') == 0){
              this.drawStart(this.controls[i].x, this.controls[i].y, this.controls[i].code, (6* Math.PI/4));                                     
            } else {
              // Else it's a normal control
              this.drawSingleControl(this.controls[i].x, this.controls[i].y, this.controls[i].code); 
                           
            }
          }
        }
      }
		},
    drawSingleControl : function (x, y, code) {
      //Draw the white halo around the controls
      rg2.ctx.beginPath();            
      rg2.ctx.strokeStyle = "white";
      rg2.ctx.lineWidth = rg2.config.OVERPRINT_LINE_THICKNESS + 2;
      rg2.ctx.arc(x, y, 20, 0, 2 * Math.PI, false);             
      rg2.ctx.stroke();
      //Draw the white halo around the control code                
      rg2.ctx.beginPath();
      rg2.ctx.textAlign = "left";
      rg2.ctx.font = "20pt Arial";
      rg2.ctx.strokeStyle = "white";
      rg2.ctx.miterLimit = 2;
      rg2.ctx.lineJoin = "circle";
      rg2.ctx.lineWidth = 1.5;
      rg2.ctx.strokeText(code, x + 25,y + 20);            
      //Draw the purple control
      rg2.ctx.beginPath();
      rg2.ctx.font = "20pt Arial";
      rg2.ctx.fillStyle = rg2.config.PURPLE;
      rg2.ctx.strokeStyle = rg2.config.PURPLE;
      rg2.ctx.lineWidth = rg2.config.OVERPRINT_LINE_THICKNESS;
      rg2.ctx.arc(x, y, 20, 0, 2 * Math.PI, false);
      rg2.ctx.fillText(code, x + 25, y + 20);
      rg2.ctx.stroke();
    },
		drawFinish : function (x, y, code) {
		  //Draw the white halo around the finish control
		  rg2.ctx.strokeStyle = "white";
		  rg2.ctx.lineWidth = rg2.config.OVERPRINT_LINE_THICKNESS + 2;
		  rg2.ctx.beginPath();		  		  
		  rg2.ctx.arc(x, y, rg2.config.FINISH_INNER_RADIUS, 0, 2 * Math.PI, false);
      rg2.ctx.stroke();
		  rg2.ctx.beginPath();
      rg2.ctx.arc(x, y, rg2.config.FINISH_OUTER_RADIUS, 0, 2 * Math.PI, false);
		  rg2.ctx.stroke();
		  //Draw the white halo around the finish code
		  rg2.ctx.beginPath();
      rg2.ctx.font = "20pt Arial";
      rg2.ctx.textAlign = "left";
      rg2.ctx.strokeStyle = "white";
      rg2.ctx.miterLimit = 2;
      rg2.ctx.lineJoin = "circle";
      rg2.ctx.lineWidth = 1.5;
      rg2.ctx.strokeText(code, x + 30,y + 20);
		  rg2.ctx.stroke();
		  //Draw the purple finish control
		  rg2.ctx.beginPath();     
      rg2.ctx.fillStyle = rg2.config.PURPLE;
      rg2.ctx.strokeStyle = rg2.config.PURPLE;
      rg2.ctx.lineWidth = rg2.config.OVERPRINT_LINE_THICKNESS;
      rg2.ctx.arc(x, y, rg2.config.FINISH_INNER_RADIUS, 0, 2 * Math.PI, false);
      rg2.ctx.stroke();
      rg2.ctx.beginPath();
      rg2.ctx.arc(x, y, rg2.config.FINISH_OUTER_RADIUS, 0, 2 * Math.PI, false);
      rg2.ctx.fillText(code, x + 30, y + 20);
      rg2.ctx.stroke();		
		},
		drawStart : function(startx, starty, code, angle) {
		  //Draw the white halo around the start triangle
		  var x = [];
		  var y = [];
		  var DEGREES_120 = (2 * Math.PI/3);
		  angle = angle + (Math.PI /2);
		  rg2.ctx.lineCap = 'round';
		  rg2.ctx.strokeStyle = "white";
		  rg2.ctx.lineWidth = rg2.config.OVERPRINT_LINE_THICKNESS + 2;
		  rg2.ctx.beginPath();
		  x[0] = startx + (rg2.config.START_TRIANGLE_LENGTH * Math.sin(angle));
		  y[0] = starty - (rg2.config.START_TRIANGLE_LENGTH * Math.cos(angle));
		  rg2.ctx.moveTo(x[0], y[0]);            
      x[1] = startx + (rg2.config.START_TRIANGLE_LENGTH * Math.sin(angle + DEGREES_120));
      y[1] = starty - (rg2.config.START_TRIANGLE_LENGTH * Math.cos(angle + DEGREES_120));
      rg2.ctx.lineTo(x[1], y[1]);
      rg2.ctx.stroke();
      rg2.ctx.beginPath();
      rg2.ctx.moveTo(x[1],y[1]);      
      x[2] = startx + (rg2.config.START_TRIANGLE_LENGTH * Math.sin(angle - DEGREES_120));
      y[2] = starty - (rg2.config.START_TRIANGLE_LENGTH * Math.cos(angle - DEGREES_120));
      rg2.ctx.lineTo(x[2], y[2]);
      rg2.ctx.stroke();
      rg2.ctx.beginPath();
      rg2.ctx.moveTo(x[2],y[2]);     
      rg2.ctx.lineTo(x[0], y[0]);                                 
      rg2.ctx.stroke();
		  //Draw the white halo around the start code
		  rg2.ctx.beginPath();
      rg2.ctx.font = "20pt Arial";
      rg2.ctx.textAlign = "left";
      rg2.ctx.strokeStyle = "white";
      rg2.ctx.miterLimit = 2;
      rg2.ctx.lineJoin = "circle";
      rg2.ctx.lineWidth = 1.5;
      rg2.ctx.strokeText(code, x[0] + 25, y[0] + 25);
      rg2.ctx.stroke();
      //Draw the purple start control
      rg2.ctx.strokeStyle = rg2.config.PURPLE;
      rg2.ctx.lineWidth = rg2.config.OVERPRINT_LINE_THICKNESS;
      rg2.ctx.font = "20pt Arial";
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
      rg2.ctx.moveTo(x[2],y[2]);
      rg2.ctx.lineTo(x[0], y[0]);                                 
      rg2.ctx.fillText(code, x[0] +25, y[0] + 25);
      rg2.ctx.stroke();
		},
		toggleControlDisplay : function() {
			if (this.displayControls) {
				jQuery("#btn-toggle-controls").removeClass("fa-ban").addClass("fa-circle-o");
				jQuery("#btn-toggle-controls").prop("title", "Show all controls map");
			} else {
				jQuery("#btn-toggle-controls").removeClass("fa-circle-o").addClass("fa-ban");
				jQuery("#btn-toggle-controls").prop("title", "Hide all controls map");
			}
			this.displayControls = !this.displayControls;
		}
	 
	}

	function Control(code, x, y) {
		this.code = code;
		this.x = x;
		this.y = y;
	}


	Control.prototype = {
		Constructor : Control,
	}
