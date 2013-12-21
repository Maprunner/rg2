'use strict';

  // handle drawing of a new route
  function Draw() {
    this.trackColor = '#ff0000';
    this.HANDLE_DOT_RADIUS = 10;
    this.CLOSE_ENOUGH = 10;
    this.gpstrack = new GPSTrack();
    rg2.gpstrack = this.gpstrack;
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
  }
  
	Draw.prototype = {
		Constructor : Draw,

    gpsFileLoaded : function() {
    	return this.gpstrack.fileLoaded;
    },
    
    uploadGPS: function(evt) {
    	this.gpstrack.uploadGPS(evt);
    },
    
    mouseUp: function (x, y) {
  	  var active = jQuery("#rg2-info-panel").tabs( "option", "active" );
  	  if (active != rg2.config.TAB_DRAW) {
  	  	return;
  	  }
  	  if (this.gpstrack.fileLoaded) {
  	  	// adjusting the track
  	  	if (this.handleX === null) {
  		    this.handleX = x;
  		    this.handleY = y;
  	    } else {
    		  this.handleX = null;
  	  	  this.handleY = null;
  	    }
  	  } else {
  	  	// drawing new track
			  // only allow drawing if we have valid name and course
		    if ((this.routeData.resultid !== null) && (this.routeData.courseid !== null)) {
  	  	  this.addNewPoint(x, y);
  	  	} else {
          var msg = "<div id='drawing-reset-dialog'>Please select course and name before you start drawing a route or upload a file.</div>";
         jQuery(msg).dialog({title: "Select course and name"});
        }
  	  }
    },
    
    dragEnded: function () {
     	if (this.gpstrack.fileLoaded) {
     	  // rebaseline GPS track
     	  this.gpstrack.baseX = this.routeData.x.slice(0);
     	  this.gpstrack.baseY = this.routeData.y.slice(0);
     	  rg2.redraw(false);
     	}	
    }, 
     
    // locks or unlocks background when adjusting map
		toggleMoveAll: function (checkedState) {
		  this.backgroundLocked = checkedState;
		},
		
		initialiseDrawing: function () {
      this.routeData = new RouteData();
      this.handleX = null;
      this.handleY = null;
      this.backgroundLocked = false;
      this.pendingCourseID = null;
      // the RouteData versions of these have the start control removed for saving
      this.controlx = [];
      this.controly = [];
      this.nextControl = 0;
      this.gpstrack.initialiseGPS();
      jQuery("#rg2-name-select").prop('disabled', true);	
      jQuery("#rg2-undo").prop('disabled', true);	
      jQuery("#btn-save-route").button("disable");
      jQuery("#btn-save-gps-route").button("disable");
   	  jQuery("#btn-undo").button("disable");
   	  jQuery("#btn-three-seconds").button("disable");
			jQuery("#rg2-name-select").empty();
      jQuery("#rg2-new-comments").empty().val(rg2.config.DEFAULT_NEW_COMMENT);
      jQuery("#rg2-event-comments").empty().val(rg2.config.DEFAULT_EVENT_COMMENT);
      jQuery("rg2-move-all").prop('checked', false);
 	    jQuery("#rg2-load-gps-file").button('disable');
      rg2.redraw(false);
    },
		
		setCourse : function(courseid) {
			if (!isNaN(courseid)) {
				if (this.routeData.courseid !== null) {
					// already have a course so we are trying to change it
					if (this.routeData.x.length > 1) {
						// drawing started so ask to confirm change
						this.pendingCourseid = courseid;
						this.confirmCourseChange();
					} else {
						// nothing done yet so just change course
			      rg2.removeFromDisplay(this.routeData.courseid);
            this.initialiseCourse(courseid);					
					}
				} else {
					// first time course has been selected
          this.initialiseCourse(courseid);
 	      }			
		  }
		},
	
	  initialiseCourse : function(courseid) {
			this.routeData.eventid = rg2.getKartatEventID();
			this.routeData.courseid = courseid;
			rg2.putOnDisplay(courseid);
		  var course = rg2.getCourseDetails(courseid);
		  this.routeData.coursename = course.name;
			this.controlx = course.x;
			this.controly = course.y;
			this.routeData.x.length = 0;
			this.routeData.y.length = 0;
			this.routeData.x[0] = this.controlx[0];
			this.routeData.y[0] = this.controly[0];
			this.nextControl = 1;  
			rg2.createNameDropdown(courseid);
 	    jQuery("#rg2-name-select").prop('disabled', false);	  	
			rg2.redraw(false);
	  },
	    
	  confirmCourseChange : function() {

      var msg = "<div id='course-change-dialog'>The route you have started to draw will be discarded. Are you sure you want to change the course?</div>";
      var me = this;
      jQuery(msg).dialog({
        title: "Confirm course change",
        modal: true,
        dialogClass: "no-close",
        closeOnEscape: false,
        buttons: [ {
        	text: "Change course",
        	click: function() {
        		me.doChangeCourse();
        	}}, {
        	text: "Cancel",
          click: function () {
            me.doCancelChangeCourse();    
          } 
        }]
      });			  	
	  },

	  resetDrawing : function () {
      var msg = "<div id='drawing-reset-dialog'>All information you have entered will be removed. Are you sure you want to reset?</div>";
      var me = this;
      jQuery(msg).dialog({
        title: "Confirm reset",
        modal: true,
        dialogClass: "no-close",
        closeOnEscape: false,
        buttons: [ {
        	text: "Reset",
        	click: function() {
        		me.doDrawingReset();
        	}}, {
        	text: "Cancel",
          click: function () {
            me.doCancelDrawingReset();    
          } 
        }]
      });			  	
	  	
	  },
	  
	  doChangeCourse : function () {
      jQuery('#course-change-dialog').dialog("destroy");
 			rg2.removeFromDisplay(this.routeData.courseid);
      this.initialiseCourse(this.pendingCourseid);
    },
     		
	  doCancelChangeCourse : function () {
      // reset course dropdown
     	jQuery("#rg2-course-select").val(this.routeData.courseid);
      this.pendingCourseid = null;
      jQuery('#course-change-dialog').dialog("destroy");
    },

	  doDrawingReset : function () {
      jQuery('#drawing-reset-dialog').dialog("destroy");
      this.pendingCourseid = null;
      this.initialiseDrawing();
    },
     		
	  doCancelDrawingReset : function () {
      jQuery('#drawing-reset-dialog').dialog("destroy");
    },

    showCourseInProgress : function () {
      if (this.routeData.courseid !== null) {
        rg2.putOnDisplay(this.routeData.courseid);
      }
    },
    
		setName : function(resultid) {
			if (!isNaN(resultid)) {
			  this.routeData.resultid = rg2.getKartatResultID(resultid);
			  this.routeData.name = rg2.getRunnerName(resultid);
   	    jQuery("#btn-three-seconds").button('enable');
 	      jQuery("#rg2-load-gps-file").button('enable');
		 }
		},
		
		addNewPoint: function (x, y) {

      // enable here for testing
      //jQuery("#btn-save-route").button("enable");
			  
			if (this.closeEnough(x, y)) {
			  this.routeData.x.push(this.controlx[this.nextControl]);
			  this.routeData.y.push(this.controly[this.nextControl]);				
			  this.nextControl++;
			  if (this.nextControl === this.controlx.length) {
   	      jQuery("#btn-save-route").button("enable");
   	    }
   	  } else {
			  this.routeData.x.push(Math.round(x));
			  this.routeData.y.push(Math.round(y));
			}
			if (this.routeData.x.length > 1) {
   	    jQuery("#btn-undo").button("enable");
   	  } else {
   	    jQuery("#btn-undo").button("disable");   	  	
   	  }
      rg2.redraw(false);
		},
		
		undoLastPoint: function () {
			// remove last point if we have one
			var points = this.routeData.x.length; 
			if (points > 1) {
				// are we undoing from a control?
				if ((this.controlx[this.nextControl - 1] === this.routeData.x[points - 1]) &&
				    (this.controly[this.nextControl - 1] === this.routeData.y[points - 1])) {
			    // are we undoing from the finish?
			    if (this.nextControl === this.controlx.length) {
   	        jQuery("#btn-save-route").button("disable");
   	      } 					
					// don't go back past first control
					if (this.nextControl > 1) {
						this.nextControl--;
					}
				}
        this.routeData.x.pop();
        this.routeData.y.pop();   	    
   	  }
   	  // note that array length has changed so can't use points
			if (this.routeData.x.length > 1) {
   	    jQuery("#btn-undo").button("enable");
   	  } else {
   	    jQuery("#btn-undo").button("enable");   	  	
   	  }
   	  rg2.redraw(false);
		},

		saveGPSRoute: function () {
			// called to save GPS file route
      // tidy up route details
      var i;
      var pt;
      var t;
      this.routeData.startsecs = this.routeData.time[0];
      for (i = 0; i < this.routeData.x.length; i++) {
      	this.routeData.x[i] = parseInt(this.routeData.x[i], 10);
      	this.routeData.y[i] = parseInt(this.routeData.y[i], 10);
      	// convert real time seconds to offset seconds from start time
      	this.routeData.time[i] -= this.routeData.startsecs;
      }
      // allow for already having a GPS route for this runner
      this.routeData.resultid += rg2.config.GPS_RESULT_OFFSET;
      while (rg2.resultIDExists(this.routeData.resultid)) {
        this.routeData.resultid += rg2.config.GPS_RESULT_OFFSET;
        // add marker(s) to name to show it is a duplicate
        this.routeData.name += '*';    	
      }
      this.routeData.comments = jQuery("#rg2-new-comments").val();

      this.postRoute();
		},

		saveRoute: function () {
			// called to save manually entered route
      this.routeData.comments = jQuery("#rg2-new-comments").val();
			this.routeData.controlx = this.controlx;
			this.routeData.controly = this.controly;
			// don't need start control so remove it		
      this.routeData.controlx.splice(0,1);
      this.routeData.controly.splice(0,1);
      this.postRoute();
  },
  
    postRoute: function () {  
      var $url = json_url + '?type=addroute&id=' + this.routeData.eventid;
      // create JSON data
      var json = JSON.stringify(this.routeData);
      jQuery.ajax({
        data: json,
        type: 'POST',
        url: $url,
        dataType: 'json',
        success: function(data, textStatus, jqXHR) {
        	if (data.ok) {
        		draw.routeSaved(data.status_msg);
        	} else {
        		draw.saveError(data.status_msg);
        	}
        },
        error: function(jqXHR, textStatus, errorThrown) {
          draw.saveError(errorThrown);
        }        
      })
		},
		
		saveError : function(text) {
      var msg = "<div>Your route was not saved. Please try again. " + text + "</div>";
      jQuery(msg).dialog({
        title: draw.routeData.name
      });			
		},
		
		routeSaved : function(text) {
      var msg = "<div>Your route has been saved.</div>";
      jQuery(msg).dialog({
        title: draw.routeData.name
      });
			events.loadEvent(events.getActiveEventID());		
		},
				
		waitThreeSeconds: function() {
      // insert a new point in the same place as the last point
			this.routeData.x.push(this.routeData.x[this.routeData.x.length - 1]);
		  this.routeData.y.push(this.routeData.y[this.routeData.y.length - 1]);	
		  rg2.redraw(false);		
		},
		
		// snapto: test if drawn route is close enough to control
		closeEnough: function (x, y) {
      if (Math.abs(x - this.controlx[this.nextControl]) < this.CLOSE_ENOUGH) {
        if (Math.abs(y - this.controly[this.nextControl]) < this.CLOSE_ENOUGH) {      	
          return true;
        }
      }
      return false;
		},	
		
		trackLocked : function () {
		  return (this.handleX !== null);	
		}, 
		
		adjustTrack : function (x1, y1, x2 , y2, shiftKeyPressed, ctrlKeyPressed) {

		  if (this.backgroundLocked) {
		    // drag track and background
		    rg2.ctx.translate(x2 - x1, y2 - y1);  
		  } else {
  	    if (this.handleX !== null) {
  	  	  // scale and rotate track
  		    var scaleX = (x2 - this.handleX) / (x1 - this.handleX);
  		    var scaleY = (y2 - this.handleY) / (y1 - this.handleY);
          var oldAngle = getAngle(x1, y1, this.handleX, this.handleY);
          var newAngle = getAngle(x2, y2, this.handleX, this.handleY);
          var angle = newAngle - oldAngle;
	        //console.log (x1, y1, x2, y2, this.handleX, this.handleY, scaleX, scaleY, oldAngle, newAngle, angle);        
          if (!shiftKeyPressed) {
            scaleY = scaleX;
          }         
          for (var i = 0; i < draw.routeData.x.length; i++) {
            var x = this.gpstrack.baseX[i] - this.handleX;
            var y = this.gpstrack.baseY[i] - this.handleY;
            draw.routeData.x[i] = (((Math.cos(angle) * x) - (Math.sin(angle) * y)) * scaleX) + this.handleX;
            draw.routeData.y[i] = (((Math.sin(angle) * x) + (Math.cos(angle) * y)) * scaleY) + this.handleY;
          }
   		  } else {
		      // drag track
          var dx = x2 - x1;
          var dy = y2 - y1;
          for (var i = 0; i < this.routeData.x.length; i++) {
            draw.routeData.x[i] = this.gpstrack.baseX[i] + dx;
            draw.routeData.y[i] = this.gpstrack.baseY[i] + dy;
          }
		    }
   		}

		},

		drawNewTrack : function() {
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
			  rg2.ctx.fillRect(this.controlx[this.nextControl] - 1, this.controly[this.nextControl] - 1, 3, 3)
			  rg2.ctx.stroke();
			  // dot at start of route
			  rg2.ctx.beginPath();
			  rg2.ctx.arc(this.routeData.x[0] + (rg2.config.RUNNER_DOT_RADIUS/2), this.routeData.y[0], rg2.config.RUNNER_DOT_RADIUS, 0, 2 * Math.PI, false);
			  rg2.ctx.fill();
			}
		  // locked point for GPS route edit
      if (this.handleX !== null) {
		   	rg2.ctx.beginPath();
			  rg2.ctx.arc(this.handleX, this.handleY, this.HANDLE_DOT_RADIUS, 0, 2 * Math.PI, false);
			  rg2.ctx.fill();
			  rg2.ctx.beginPath()		  
			  rg2.ctx.arc(this.handleX, this.handleY, 2 * this.HANDLE_DOT_RADIUS, 0, 2 * Math.PI, false);
			  rg2.ctx.stroke();
			}

			// route itself
			if (this.routeData.x.length > 1) {
				rg2.ctx.beginPath();
				rg2.ctx.moveTo(this.routeData.x[0], this.routeData.y[0]);
				var oldx = this.routeData.x[0];
				var oldy = this.routeData.y[0];
				var stopCount = 0;
				for (var i = 1; i < this.routeData.x.length; i++) {
					// lines
					rg2.ctx.lineTo(this.routeData.x[i], this.routeData.y[i]);
					if ((this.routeData.x[i] == oldx) && (this.routeData.y[i] == oldy)) {
						// we haven't moved
						stopCount++;
			      // only output at current position if this is the last entry
			      if (i === (this.routeData.x.length - 1)) {
			      	rg2.ctx.fillText((3 * stopCount) + " secs", this.routeData.x[i] + 5, this.routeData.y[i] + 5);
			      }						
					} else {
			      // we have started moving again
			      if (stopCount > 0) {
			      	rg2.ctx.fillText((3 * stopCount) + " secs", oldx + 5, oldy + 5);	
              stopCount = 0;
            }
				  }
					oldx = this.routeData.x[i];
					oldy = this.routeData.y[i];
				}
				rg2.ctx.stroke();
			}
		}
	}
