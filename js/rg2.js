/**
 * @author Simon Errington
 *
 * Routegadget 2.0 Viewer
 *
 * Released under the MIT license
 *
 */
'use strict';
jQuery(document).ready(function() {

  function GPSTrack() {
    this.lat= [];
    this.lon= [];
    this.time = [];
    this.baseX = [];
    this.baseY = [];
    this.fileLoaded = false;
  }

  GPSTrack.prototype = {
  	
	Constructor : GPSTrack,
	
	initialiseGPS : function() {
    this.lat.length = 0;
    this.lon.length = 0;
    this.time.length = 0;
    this.baseX.length = 0;
    this.baseY.length = 0;
    this.fileLoaded = false;		
	},
	
	uploadGPS : function (evt) {
		//console.log ("File" + evt.target.files[0].name);
		var reader = new FileReader();
      
    reader.onerror = function(evt) {
      switch(evt.target.error.code) {
      case evt.target.error.NOT_FOUND_ERR:
        alert('File not found');
        break;
      case evt.target.error.NOT_READABLE_ERR:
        alert('File not readable');
        break;
      default:
        alert('An error occurred reading the file.');
      }
    };
      
    reader.onload = function(evt) {
      var trksegs;
      var trkpts;
      var xml;
      var i;
      var j;
      var timestring;
      xml = jQuery.parseXML(evt.target.result);
      trksegs = xml.getElementsByTagName('trkseg');
      for (i = 0; i < trksegs.length; i++) {
        trkpts = trksegs[i].getElementsByTagName('trkpt');
        for (j = 0; j < trkpts.length; j++) {
        	gpstrack.lat.push(trkpts[j].getAttribute('lat'));
        	gpstrack.lon.push(trkpts[j].getAttribute('lon'));
        	timestring = trkpts[j].childNodes[3].textContent;
        	gpstrack.time.push(gpstrack.getSecsFromTrackpoint(timestring)); 
        }
      }
      gpstrack.processGPSTrack();
 	    jQuery("#rg2-load-gps-file").button('disable');
      console.log ("File loaded");
    };
  
    // read the selected file
    reader.readAsText(evt.target.files[0]);
		
	},

  getSecsFromTrackpoint: function (timestring) {
  	// input is 2013-12-03T12:34:56Z
  	var hrs = parseInt(timestring.substr(11,2), 10);
  	var mins = parseInt(timestring.substr(14,2), 10);
    var secs = parseInt(timestring.substr(17,2), 10);
    return (hrs * 3600) + (mins * 60) + secs;
  },
		
	processGPSTrack : function () {
		var x;
		var y;
		
		if (events.mapIsGeoreferenced()) {
			// translate lat/lon to x,y based on world file info: see http://en.wikipedia.org/wiki/World_file
		  var w = events.getWorldFile();
		  // simplify calculation a little
		  var AEDB = (w.A * w.E) - (w.D * w.B);
		  var xCorrection = (w.B * w.F) - (w.E * w.C);
		  var yCorrection = (w.D * w.C) - (w.A * w.F);
		  var i;
		  for (i = 0; i < this.lat.length; i++) {
			  draw.routeData.x[i] = Math.round(((w.E * this.lon[i]) - (w.B * this.lat[i]) + xCorrection) / AEDB);
		    draw.routeData.y[i] = Math.round(((-1 * w.D * this.lon[i]) + (w.A * this.lat[i]) + yCorrection) / AEDB);
		  }		
		  // find bounding box for track
		  var minX = draw.routeData.x[0];
		  var maxX = draw.routeData.x[0];
		  var minY = draw.routeData.y[0];
		  var maxY = draw.routeData.y[0];
		  
		  for (i = 1; i < draw.routeData.x.length; i++) {
			  maxX = Math.max(maxX, draw.routeData.x[i]);
			  maxY = Math.max(maxY, draw.routeData.y[i]);
		 	  minX = Math.min(minX, draw.routeData.x[i]);
		 	  minY = Math.min(minY, draw.routeData.y[i]);
		  }
		  // check we are somewhere on the map
      if ((maxX < 0) || (minX > map.width) || (minY > map.height) || (maxY < 0)) {
        // warn and fit to track      	
        var msg = "<div id='GPS-problem-dialog'>Your GPS file does not match the map co-ordinates. Please check you have selected the correct file.</div>";
        jQuery(msg).dialog({title:"GPS file problem"});
        this.fitTrackInsideCourse();

      }
		} else {
      this.fitTrackInsideCourse();
    }
		this.baseX = draw.routeData.x.slice(0);
		this.baseY = draw.routeData.y.slice(0);
		draw.routeData.time = this.time; 
    this.fileLoaded = true;
    jQuery("#btn-save-gps-route").button("enable");
		redraw(false);
  }, 
  
  fitTrackInsideCourse: function() {
    // fit track to within limits of course
		// find bounding box for track
		var maxLat = this.lat[0];
		var maxLon = this.lon[0];
		var minLat = this.lat[0];
		var minLon = this.lon[0];
		var x;
		var y;
		for (var i = 1; i < this.lat.length; i++) {
		 	maxLat = Math.max(maxLat, this.lat[i]);
			maxLon = Math.max(maxLon, this.lon[i]);
			minLat = Math.min(minLat, this.lat[i]);
			minLon = Math.min(minLon, this.lon[i]);
		  x = this.lon[i] - this.lon[0];
		  y = this.lat[i] - this.lat[0];
		}

		// find bounding box for course
		var minControlX = draw.controlx[0];
		var maxControlX = draw.controlx[0];
		var minControlY = draw.controly[0];
		var maxControlY = draw.controly[0];
		  
		for (i = 1; i < draw.controlx.length; i++) {
			maxControlX = Math.max(maxControlX, draw.controlx[i]);
			maxControlY = Math.max(maxControlY, draw.controly[i]);
		 	minControlX = Math.min(minControlX, draw.controlx[i]);
		 	minControlY = Math.min(minControlY, draw.controly[i]);
		}
    //console.log (minControlX, maxControlX, minControlY, maxControlY);

    // scale GPS track to within bounding box of controls: a reasonable start
		var scaleX = (maxControlX - minControlX)/(maxLon - minLon);
		var scaleY = (maxControlY - minControlY)/(maxLat - minLat);
    var lonCorrection = getLatLonDistance(minLat, maxLon, minLat, minLon) / (maxLon - minLon);
		var latCorrection = getLatLonDistance(minLat, minLon, maxLat, minLon) / (maxLat - minLat);
		  
		// don't want to skew track so scale needs to be equal in each direction
		// so we need to account for differences between a degree of latitude and longitude	  
		if (scaleX > scaleY) {
			// pix/lat = pix/lon * m/lat * lon/m
			scaleY = scaleX * latCorrection / lonCorrection;
		} else {
			// pix/lon = pix/lat * m/lon * lat/m
			scaleX = scaleY * lonCorrection / latCorrection;  	
		}
    // extra offset to put start of track at start location 
		draw.routeData.x[0] = ((this.lon[0] - minLon) * scaleX) + minControlX;
		draw.routeData.y[0] = (-1 * (this.lat[0] - maxLat) * scaleY) + minControlY;
		  
		// translate lat/lon to x,y
		var deltaX = minControlX - (draw.routeData.x[0] - draw.controlx[0]); 
		var deltaY = minControlY - (draw.routeData.y[0] - draw.controly[0]);
	  
		for (i = 0; i < this.lat.length; i++) {
			draw.routeData.x[i] = ((this.lon[i] - minLon) * scaleX) + deltaX;
			draw.routeData.y[i] = (-1 * (this.lat[i] - maxLat) * scaleY) + deltaY;
    }
    
  },
}
  
  // handle drawing of a new route
  function Draw() {
    this.trackColor = '#ff0000';
    this.HANDLE_DOT_RADIUS = 10;
    this.CLOSE_ENOUGH = 10;
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

    mouseUp: function (x, y) {
  	  var active = jQuery("#rg2-info-panel").tabs( "option", "active" );
  	  if (active != TAB_DRAW) {
  	  	return;
  	  }
  	  if (gpstrack.fileLoaded) {
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
     	if (gpstrack.fileLoaded) {
     	  // rebaseline GPS track
     	  gpstrack.baseX = this.routeData.x.slice(0);
     	  gpstrack.baseY = this.routeData.y.slice(0);
     	  redraw(false);
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
      gpstrack.initialiseGPS();
      jQuery("#rg2-name-select").prop('disabled', true);	
      jQuery("#rg2-undo").prop('disabled', true);	
      jQuery("#btn-save-route").button("disable");
      jQuery("#btn-save-gps-route").button("disable");
   	  jQuery("#btn-undo").button("disable");
   	  jQuery("#btn-three-seconds").button("disable");
			jQuery("#rg2-name-select").empty();
      jQuery("#rg2-new-comments").empty().val(DEFAULT_NEW_COMMENT);
      jQuery("rg2-move-all").prop('checked', false);
 	    jQuery("#rg2-load-gps-file").button('disable');
      redraw(false);
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
			      courses.removeFromDisplay(this.routeData.courseid);
            this.initialiseCourse(courseid);					
					}
				} else {
					// first time course has been selected
          this.initialiseCourse(courseid);
 	      }			
		  }
		},
	
	  initialiseCourse : function(courseid) {
			this.routeData.eventid = events.getKartatEventID();
			this.routeData.courseid = courseid;
			courses.putOnDisplay(courseid);
		  var course = courses.getFullCourse(courseid);
		  this.routeData.coursename = course.name;
			this.controlx = course.x;
			this.controly = course.y;
			this.routeData.x.length = 0;
			this.routeData.y.length = 0;
			this.routeData.x[0] = this.controlx[0];
			this.routeData.y[0] = this.controly[0];
			this.nextControl = 1;  
			results.createNameDropdown(courseid);
 	    jQuery("#rg2-name-select").prop('disabled', false);	  	
			redraw(false);
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
 			courses.removeFromDisplay(this.routeData.courseid);
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
        courses.putOnDisplay(this.routeData.courseid);
      }
    },
    
		setName : function(resultid) {
			if (!isNaN(resultid)) {
			  this.routeData.resultid = results.getKartatResultID(resultid);
			  this.routeData.name = results.getRunnerName(resultid);
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
      redraw(false);
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
   	  redraw(false);
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
      this.routeData.resultid += GPS_RESULT_OFFSET;
      while (results.resultIDExists(this.routeData.resultid)) {
        this.routeData.resultid += GPS_RESULT_OFFSET;
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
		  redraw(false);		
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
		    ctx.translate(x2 - x1, y2 - y1);  
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
            var x = gpstrack.baseX[i] - this.handleX;
            var y = gpstrack.baseY[i] - this.handleY;
            draw.routeData.x[i] = (((Math.cos(angle) * x) - (Math.sin(angle) * y)) * scaleX) + this.handleX;
            draw.routeData.y[i] = (((Math.sin(angle) * x) + (Math.cos(angle) * y)) * scaleY) + this.handleY;
          }
   		  } else {
		      // drag track
          var dx = x2 - x1;
          var dy = y2 - y1;
          for (var i = 0; i < draw.routeData.x.length; i++) {
            draw.routeData.x[i] = gpstrack.baseX[i] + dx;
            draw.routeData.y[i] = gpstrack.baseY[i] + dy;
          }
		    }
   		}

		},

		drawNewTrack : function() {
			ctx.lineWidth = 2;
			ctx.strokeStyle = this.trackColor;
			ctx.fillStyle = this.trackColour;
			ctx.font = '10pt Arial';        
      ctx.textAlign = "left";
  		ctx.globalAlpha = 1.0;
      // highlight next control if we have a course selected
      if ((this.nextControl > 0) && (!gpstrack.fileLoaded)) {
        ctx.beginPath();
			  if (this.nextControl < (this.controlx.length - 1)) {
          // normal control
				  ctx.arc(this.controlx[this.nextControl], this.controly[this.nextControl], CONTROL_CIRCLE_RADIUS, 0, 2 * Math.PI, false);
			  } else {
				  // finish
				  ctx.arc(this.controlx[this.nextControl], this.controly[this.nextControl], FINISH_INNER_RADIUS, 0, 2 * Math.PI, false);				
				  ctx.stroke();
				  ctx.beginPath();
				  ctx.arc(this.controlx[this.nextControl], this.controly[this.nextControl], FINISH_OUTER_RADIUS, 0, 2 * Math.PI, false);				
			  }
			  // dot at centre of control circle
			  ctx.fillRect(this.controlx[this.nextControl] - 1, this.controly[this.nextControl] - 1, 3, 3)
			  ctx.stroke();
			  // dot at start of route
			  ctx.beginPath();
			  ctx.arc(this.routeData.x[0] + (RUNNER_DOT_RADIUS/2), this.routeData.y[0], RUNNER_DOT_RADIUS, 0, 2 * Math.PI, false);
			  ctx.fill();
			}
		  // locked point for GPS route edit
      if (this.handleX !== null) {
		   	ctx.beginPath();
			  ctx.arc(this.handleX, this.handleY, this.HANDLE_DOT_RADIUS, 0, 2 * Math.PI, false);
			  ctx.fill();
			  ctx.beginPath()		  
			  ctx.arc(this.handleX, this.handleY, 2 * this.HANDLE_DOT_RADIUS, 0, 2 * Math.PI, false);
			  ctx.stroke();
			}

			// route itself
			if (this.routeData.x.length > 1) {
				ctx.beginPath();
				ctx.moveTo(this.routeData.x[0], this.routeData.y[0]);
				var oldx = this.routeData.x[0];
				var oldy = this.routeData.y[0];
				var stopCount = 0;
				for (var i = 1; i < this.routeData.x.length; i++) {
					// lines
					ctx.lineTo(this.routeData.x[i], this.routeData.y[i]);
					if ((this.routeData.x[i] == oldx) && (this.routeData.y[i] == oldy)) {
						// we haven't moved
						stopCount++;
			      // only output at current position if this is the last entry
			      if (i === (this.routeData.x.length - 1)) {
			      	ctx.fillText((3 * stopCount) + " secs", this.routeData.x[i] + 5, this.routeData.y[i] + 5);
			      }						
					} else {
			      // we have started moving again
			      if (stopCount > 0) {
			      	ctx.fillText((3 * stopCount) + " secs", oldx + 5, oldy + 5);	
              stopCount = 0;
            }
				  }
					oldx = this.routeData.x[i];
					oldy = this.routeData.y[i];
				}
				ctx.stroke();
			}
		}
	}
	
	function Animation() {
		this.runners = [];
		this.timer = null;
		this.animationSecs = 0;
		this.deltaSecs = 5;
		// value in milliseconds
		this.timerInterval = 100;
		this.colours = new Colours();
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
	}

	Animation.prototype = {
		Constructor : Animation,

		resetAnimation : function() {
			this.runners.length = 0;
			clearInterval(this.timer);
			this.timer = null;
			this.updateAnimationDetails();
			jQuery("#btn-start-stop").removeClass("fa-pause").addClass("fa-play");
			jQuery("#btn-start-stop").prop("title", "Run");
		},

		addRunner : function(runner) {
			this.runners.push(runner);
			this.updateAnimationDetails();
		},

		updateAnimationDetails : function() {
			var html = this.getAnimationNames();
			if (html !== "") {
			  jQuery("#rg2-track-names").empty();
			  jQuery("#rg2-track-names").append(html);
				jQuery("#rg2-track-names").show();
			} else {
				jQuery("#rg2-track-names").hide();
			}
			this.calculateAnimationRange();
			jQuery("#rg2-clock").text(this.formatSecsAsHHMMSS(this.animationSecs));
		},

		// slider callback
		clockSliderMoved : function(time) {
			this.resetAnimationTime(time);
			redraw(false);
		},

		getAnimationNames : function() {
			var html = "";
			if (this.runners.length < 1) {
				return html;
			}
			for (var i = 0; i < this.runners.length; i++) {
				html += "<p style='color:" + this.runners[i].colour + ";'>" + this.runners[i].coursename + " " + this.runners[i].name + "</p>";
			}
			return html;
		},

		getSplitsTable : function() {
			var html;
			var i;
			var j;
			var run;
			if (this.runners.length < 1) {
				return "<p>Select runners on Results tab.</p>";
			}

			var maxControls = 0;
			var legSplit = [];
			var prevControlSecs = 0;
			// find maximum number of controls to set size of table
			for ( i = 0; i < this.runners.length; i++) {
				if (this.runners[i].splits.length > maxControls) {
					maxControls = this.runners[i].splits.length;
				}
			}
			// allow for start and finish
      maxControls -= 2;

			html = "<table class='splitstable'><tr><th>Course</th><th>Name</th>";
			for ( i = 1; i <= maxControls; i++) {
				html += "<th>" + i + "</th>";
			}
			html += "<th>F</th></tr>";
			for ( i = 0; i < this.runners.length; i++) {
				run = this.runners[i];
				prevControlSecs = 0;
				html += "<tr class='splitsname-row'><td>" + run.coursename + "</td><td>" + run.name + "</td>";
				for ( j = 1; j < run.splits.length; j++) {
					html += "<td>" + this.formatSecsAsMMSS(run.splits[j]) + "</td>";
					legSplit[j] = run.splits[j] - prevControlSecs;
					prevControlSecs = run.splits[j];
				}
				html += "</tr><tr class='splitstime-row'><td></td><td></td>";
				for ( j = 1; j < run.splits.length; j++) {
					html += "<td>" + this.formatSecsAsMMSS(legSplit[j]) + "</td>";
				}
				html += "</tr><tr class='splitsdistance-row'><td></td><td>pixels</td>";
				for ( j = 1; j < run.splits.length; j++) {
					html += "<td>" + run.legTrackDistance[j] + "</td>";
				}

			}
			html += "</tr></table>";
			return html;
		},

		formatSecsAsMMSS : function(secs) {
			var formattedtime;
			var minutes = Math.floor(secs / 60);
			formattedtime = minutes;
			var seconds = secs - (minutes * 60);
			if (seconds < 10) {
				formattedtime += ":0" + seconds;
			} else {
				formattedtime += ":" + seconds;
			}
			return formattedtime;

		},

		removeRunner : function(runnerid) {
			for (var i = 0; i < this.runners.length; i++) {
				if (this.runners[i].runnerid == runnerid) {
					// delete 1 runner at position i
					this.runners.splice(i, 1);
				}
			}
			this.updateAnimationDetails();
		},

		toggleAnimation : function() {
			if (this.timer === null) {
				this.startAnimation();
			  jQuery("#btn-start-stop").removeClass("fa-play").addClass("fa-pause");
			  jQuery("#btn-start-stop").prop("title", "Pause");
			} else {
				this.stopAnimation();
			  jQuery("#btn-start-stop").removeClass("fa-pause").addClass("fa-play");
			  jQuery("#btn-start-stop").prop("title", "Run");
			}
		},

		startAnimation : function() {
			if (this.timer === null) {
				this.timer = setInterval(this.timerExpired.bind(this), this.timerInterval);
			}
		},

		calculateAnimationRange : function() {
			// in theory start time will be less than 24:00
			// TODO: races over midnight: a few other things to sort out before we get to that
			this.earliestStartSecs = 86400;
			this.latestFinishSecs = 0;
			this.slowestTimeSecs = 0;
			for (var i = 0; i < this.runners.length; i++) {
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

		stopAnimation : function() {
			clearInterval(this.timer);
			this.timer = null;
		},

		// extra function level in for test purposes
		timerExpired : function() {
			redraw(true);
		},

		setFullTails : function(fullTails) {
			if (fullTails) {
				this.useFullTails = true;
			} else {
				this.useFullTails = false;
			}
			redraw(false);
		},

		setTailLength : function(minutes) {
			this.tailLength = 60 * minutes;
			redraw(false);
		},

		setStartControl : function(control) {
			this.massStartControl = parseInt(control, 10);
			if (this.massStartControl === MASS_START_BY_CONTROL) {
				this.massStartControl = 0;
				this.massStartByControl = true;
				// get split time at control 1
				for (var i = 0; i < this.runners.length; i++) {
					this.runners[i].nextStopTime = this.runners[i].splits[1];
				}
			} else {
				this.massStartByControl = false;
				for (var i = 0; i < this.runners.length; i++) {
					this.runners[i].nextStopTime = VERY_HIGH_TIME_IN_SECS;
				}
			}
			this.resetAnimationTime(0);
		},

		setReplayType : function(type) {
			if (type === MASS_START_REPLAY) {
				this.realTime = false;
		    jQuery("#btn-mass-start").addClass('active');
		    jQuery("#btn-real-time").removeClass('active');
				if (courses.getHighestControlNumber() > 0) {
					jQuery("#rg2-control-select").prop('disabled', false);
				}
			} else {
				this.realTime = true;
		    jQuery("#btn-mass-start").removeClass('active');
		    jQuery("#btn-real-time").addClass('active');
				jQuery("#rg2-control-select").prop('disabled', true);
			}
			// go back to start
			this.resetAnimationTime(0);
		},

		resetAnimationTime : function(time) {
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
				jQuery("#rg2-clock-slider").slider("option", "max", this.latestFinishSecs);
				jQuery("#rg2-clock-slider").slider("option", "min", this.earliestStartSecs);
			} else {
				if (time > 0) {
					this.animationSecs = time;
				} else {
					this.animationSecs = 0;
				}
				this.startSecs = 0;
				jQuery("#rg2-clock-slider").slider("option", "max", this.slowestTimeSecs);
				jQuery("#rg2-clock-slider").slider("option", "min", 0);
			}
			jQuery("#rg2-clock-slider").slider("value", this.animationSecs);
			jQuery("#rg2-clock").text(this.formatSecsAsHHMMSS(this.animationSecs));
		},
    
    toggleNameDisplay : function() {
      if (this.displayNames) {        
        jQuery("#btn-toggle-names").prop("title", "Show names");
      } else {
        jQuery("#btn-toggle-names").prop("title", "Hide names");
      }
      this.displayNames = !this.displayNames;
    },
		
		runAnimation : function(fromTimer) {

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
			jQuery("#rg2-clock-slider").slider("value", this.animationSecs);
			jQuery("#rg2-clock").text(this.formatSecsAsHHMMSS(this.animationSecs));
			ctx.lineWidth = REPLAY_LINE_THICKNESS;
			ctx.globalAlpha = 1.0;
			var runner;
			var timeOffset;
			var i;
			var t;
			var tailStartTimeSecs;
			if (this.useFullTails) {
				tailStartTimeSecs = this.startSecs + 1;
			} else {
				tailStartTimeSecs = Math.max(this.animationSecs - this.tailLength, this.startSecs + 1);
			}

			for ( i = 0; i < this.runners.length; i++) {
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
				ctx.strokeStyle = runner.colour;
				ctx.beginPath();
				ctx.moveTo(runner.x[tailStartTimeSecs - timeOffset], runner.y[tailStartTimeSecs - timeOffset]);

				// t runs as real time seconds or 0-based seconds depending on this.realTime
				//runner.x[] is always indexed in 0-based time so needs to be adjusted for starttime offset
				for ( t = tailStartTimeSecs; t <= this.animationSecs; t++) {
					if ((t > timeOffset) && ((t - timeOffset) < runner.nextStopTime)) {
						ctx.lineTo(runner.x[t - timeOffset], runner.y[t - timeOffset]);
					}
				}
				ctx.stroke();
				ctx.fillStyle = runner.colour;
				ctx.beginPath();
				if ((t - timeOffset) < runner.nextStopTime) {
					t = t - timeOffset;
				} else {
					t = runner.nextStopTime;
				}
				ctx.arc(runner.x[t] + (RUNNER_DOT_RADIUS / 2), runner.y[t], RUNNER_DOT_RADIUS, 0, 2 * Math.PI, false);
				ctx.fill();
			  if(this.displayNames) {     
			     ctx.fillStyle = "black";
			     ctx.font = '20pt Arial';        
           ctx.textAlign = "left";			     			     			     			     
			     ctx.fillText(runner.name, runner.x[t] + 15, runner.y[t] + 7); 
			  }			
			}
			if (this.massStartByControl) {
				this.checkForStopControl(this.animationSecs);
			}
		},

		// see if all runners have reached stop control and reset if they have
		checkForStopControl : function(currentTime) {
			var allAtControl = true;
			var i;
			var legTime;
			// work out if everybody has got to the next control
			for ( i = 0; i < this.runners.length; i++) {
				legTime = this.runners[i].splits[this.massStartControl + 1] - this.runners[i].splits[this.massStartControl];
				if (legTime > currentTime) {
					allAtControl = false;
					break;
				}
		  }
			if (allAtControl) {
				//move on to next control
			  this.massStartControl++;
				// find time at next control
				for (var i = 0; i < this.runners.length; i++) {
					if (this.massStartControl < (this.runners[i].splits.length)) {
						// splits includes a start time so index to control is + 1 
						this.runners[i].nextStopTime = this.runners[i].splits[this.massStartControl + 1];
					} else {
						this.runners[i].nextStopTime = VERY_HIGH_TIME_IN_SECS;
					}
        }
			  this.resetAnimationTime(0);
		  }
		},

		goSlower : function() {
			if (this.deltaSecs > 0) {
				this.deltaSecs -= 1;
			}
		},

		goFaster : function() {
			this.deltaSecs += 1;
		},

		// returns seconds as hh:mm:ss
		formatSecsAsHHMMSS : function(time) {
			var hours = Math.floor(time / 3600);
			var formattedtime;
			if (hours < 10) {
				formattedtime = "0" + hours + ":";
			} else {
				formattedtime = hours + ":";
			}
			time = time - (hours * 3600);
			var minutes = Math.floor(time / 60);
			if (minutes < 10) {
				formattedtime += "0" + minutes;
			} else {
				formattedtime += minutes;
			}
			var seconds = time - (minutes * 60);
			if (seconds < 10) {
				formattedtime += ":0" + seconds;
			} else {
				formattedtime += ":" + seconds;
			}
			return formattedtime;
		},

		// returns seconds as mm:ss
		formatSecsAsMinutes : function(time) {
			var minutes = Math.floor(time / 60);
			var seconds = time - (minutes * 60);
			if (seconds < 10) {
				return minutes + ":0" + seconds;
			} else {
				return minutes + ":" + seconds;
			}
		}
	}

	// animated runner details
	function Runner(resultid) {
		var res = results.getFullResult(resultid);
		this.name = res.name;
		// careful: we need the index into results, not the resultid from the text file
		this.runnerid = resultid;
		this.starttime = res.starttime;
    this.splits = res.splits;
		this.colour = animation.colours.getNextColour();
		// get course details
		var course = courses.getFullCourse(res.courseid);
		this.coursename = course.name;
		// used to stop runners when doing replay by control
		this.nextStopTime = VERY_HIGH_TIME_IN_SECS;
		this.x = [];
		this.y = [];
		// x,y are indexed by time in seconds	
		this.legTrackDistance = [];
		this.cumulativeTrackDistance = [];
		var cumulativeDistance = [];
		this.x[0] = course.x[0];
		this.y[0] = course.y[0];
		var timeatprevcontrol = 0;
		var timeatcontrol = 0;
		var distance = 0;
		var timeatxy = 0;
		var timeatprevxy = 0;
		var tox;
		var toy;
		var fromx = course.x[0];
		var fromy = course.y[0];
		var fromdist;
		var diffx;
		var diffy;
		var difft;
		var diffdist;
		var control;
		var t;
		var xy;
		var dist;
		var oldx = res.trackx[0];
		var oldy = res.tracky[0];
		var x = 0;
		var y = 0;			
		
		if (res.hasValidTrack) {
			// x,y are indexed by time in seconds
			this.x[0] = res.trackx[0];
			this.y[0] = res.tracky[0];
			cumulativeDistance[0] = 0;
			fromx = res.trackx[0];
			fromy = res.tracky[0];
			fromdist = 0;
			dist = 0;
			// for each point on track
			for ( xy = 1; xy < res.xysecs.length; xy++) {
				tox = res.trackx[xy];
				toy = res.tracky[xy];
				diffx = tox - fromx;
				diffy = toy - fromy;
				dist = dist + Math.sqrt(((tox - fromx) * (tox - fromx)) + ((toy - fromy) * (toy - fromy)));
				diffdist = dist - fromdist;
				timeatxy = res.xysecs[xy];
				difft = timeatxy - timeatprevxy;
				for ( t = timeatprevxy + 1; t < timeatxy; t++) {
					this.x[t] = Math.round(fromx + ((t - timeatprevxy) * diffx / difft));
					this.y[t] = Math.round(fromy + ((t - timeatprevxy) * diffy / difft));
					cumulativeDistance[t] = Math.round(fromdist + ((t - timeatprevxy) * diffdist / difft));
				}
				this.x[timeatxy] = tox;
				this.y[timeatxy] = toy;
				cumulativeDistance[timeatxy] = dist;
				fromx = tox;
				fromy = toy;
				fromdist = dist;
				timeatprevxy = timeatxy;
			}
		} else {
			// no track so use straight line between controls
			// for each control (0 was Start)
			this.x[0] = course.x[0];
			this.y[0] = course.y[0];
			cumulativeDistance[0] = 0;
			fromx = course.x[0];
			fromy = course.y[0];
			fromdist = 0;
			dist = 0;
			for ( control = 1; control < course.codes.length; control++) {
				tox = course.x[control];
				toy = course.y[control];
				diffx = tox - fromx;
				diffy = toy - fromy;
				dist = dist + Math.sqrt(((tox - fromx) * (tox - fromx)) + ((toy - fromy) * (toy - fromy)));
				diffdist = dist - fromdist;
				timeatcontrol = res.splits[control];
				difft = timeatcontrol - timeatprevcontrol;
				for ( t = timeatprevcontrol + 1; t < timeatcontrol; t++) {
					this.x[t] = Math.round(fromx + ((t - timeatprevcontrol) * diffx / difft));
					this.y[t] = Math.round(fromy + ((t - timeatprevcontrol) * diffy / difft));
					cumulativeDistance[t] = Math.round(fromdist + ((t - timeatprevxy) * diffdist / difft));
				}
				this.x[timeatcontrol] = tox;
				this.y[timeatcontrol] = toy;
				cumulativeDistance[timeatcontrol] = dist;
				fromx = tox;
				fromy = toy;
				fromdist = dist;
				timeatprevcontrol = timeatcontrol;
			}
		}

		// add track distances for each leg
		this.legTrackDistance[0] = 0;
		this.cumulativeTrackDistance[0] = 0;
		
		if (course.codes != undefined) {
  		for ( control = 1; control < course.codes.length; control++) {
	  		this.cumulativeTrackDistance[control] = Math.round(cumulativeDistance[res.splits[control]]);
		  	this.legTrackDistance[control] = this.cumulativeTrackDistance[control] - this.cumulativeTrackDistance[control - 1];
		  }
		}		

		res = 0;
		course = 0;
	}

	function Events() {
		this.events = [];
		this.activeEventID = null;
	}


	Events.prototype = {
		Constructor : Events,

		loadEvent : function (eventid) {  
			// new event selected: show we are waiting
			jQuery('body').css('cursor', 'wait');
			courses.deleteAllCourses();
			controls.deleteAllControls();
			animation.resetAnimation();
			draw.initialiseDrawing();
			results.deleteAllResults();
			mapLoadingText = "Map loading...";
			map.src = null;
			redraw(false);
   		this.activeEventID = eventid;
			// load chosen map: map gets redrawn automatically on load so that's it for here
			map.src = maps_url + "/" + events.getActiveMapID() + '.jpg';

			// set title bar
			if (window.innerWidth >= BIG_SCREEN_BREAK_POINT) {
				jQuery("#rg2-event-title").text(events.getActiveEventName() +" " + events.getActiveEventDate());
			  jQuery("#rg2-event-title").show();
			} else if (window.innerWidth > SMALL_SCREEN_BREAK_POINT) {
				jQuery("#rg2-event-title").text(events.getActiveEventName());				
				jQuery("#rg2-event-title").show();
			} else {
				jQuery("#rg2-event-title").hide();
			}
			// get courses for event
			jQuery.getJSON(json_url, {
				id : events.getKartatEventID(),
				type : "courses",
				cache: false
			}).done(function(json) {
  			console.log("Courses: " + json.data.length);
				jQuery.each(json.data, function() {
				  courses.addCourse(new Course(this));
			  });
			  courses.updateCourseDropdown();
			  courses.generateControlList();
			  jQuery("#btn-toggle-controls").show();
			  jQuery("#btn-toggle-names").show();
			  results.getResults();
			}).fail(function(jqxhr, textStatus, error) {
				jQuery('body').css('cursor', 'auto');
				var err = textStatus + ", " + error;
				console.log("Courses request failed: " + err);
			});
    },
    
		addEvent : function(eventObject) {
			this.events.push(eventObject);
		},

		getKartatEventID : function() {
			return this.events[this.activeEventID].kartatid;
		},

		getActiveMapID : function() {
			return this.events[this.activeEventID].mapid;
		},

		getActiveEventID : function() {
			return this.activeEventID;
		},
		
		getActiveEventDate : function() {
			if (this.activeEventID !== null) {
			  return this.events[this.activeEventID].date;
			} else {
				return "";
			}
		},

		getActiveEventName : function() {
			if (this.activeEventID !== null) {
			  return this.events[this.activeEventID].name;
			} else {
				return "Routegadget 2.0";
			}
		},

    isScoreEvent: function () {
      return (this.events[this.activeEventID].format	=== SCORE_EVENT);
    },
    
    mapIsGeoreferenced : function() {
      return this.events[this.activeEventID].georeferenced;
    },
    
    getWorldFile: function () {
    	return this.events[this.activeEventID].worldFile;
    },
    
		formatEventsAsMenu : function() {
      var title;
			var html = '';
			for (var i = this.events.length - 1; i >= 0; i--) {
        if (this.events[i].comment != "") {
          title = this.events[i].type + " event on " + this.events[i].date + ": " + this.events[i].comment;
        } else {
          title = this.events[i].type + " event on " + this.events[i].date;
        }				
				html += "<li title='" + title + "' id=" + i + "><a href='#" + i + "'>";
				if (this.events[i].comment != "") {
				  html += "<i class='fa fa-info-circle event-info-icon' id='info-" + i +"'></i>";
				}
				html +=  this.events[i].name + "</a></li>";
			}				
			return html;
		}    
	}

	function Event(data) {
		this.kartatid = data.id;
		this.mapid = data.mapid;
		this.format = parseInt(data.format, 10);
		this.name = data.name;
		this.date = data.date;
		this.club = data.club;
		this.worldFile = [];
		if (typeof (data.A) == 'undefined') {
		  this.georeferenced = false;
		} else {
			this.georeferenced = true;
			this.worldFile.A = data.A;
			this.worldFile.B = data.B;
			this.worldFile.C = data.C;
			this.worldFile.D = data.D;
			this.worldFile.E = data.E;
			this.worldFile.F = data.F;			
		}			
		switch(data.type) {
			case "I":
				this.type = "International";
				break;
			case "N":
				this.type = "National";
				break;
			case "R":
				this.type = "Regional";
				break;
			case "L":
				this.type = "Local";
				break;
			case "T":
				this.type = "Training";
				break;
			default:
				this.type = "Unknown";
				break;
		}
		this.comment = data.comment;
		this.courses = 0;

	}


	Event.prototype = {
		Constructor : Event,
	}

	function Colours() {
		// used to generate track colours: add extra colours as necessary
		this.colours = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"];
		this.colourIndex = 0;
	}


	Colours.prototype = {
		Constructor : Colours,

		getNextColour : function() {
			this.colourIndex++;
			if (this.colourIndex == this.colours.length) {
				this.colourIndex = 0;
			}
			return this.colours[this.colourIndex];
		},
	}

	function Results() {
		this.results = [];
		this.colours = new Colours();
	}


	Results.prototype = {
		Constructor : Results,
	  
	  getResults: function () {
		  jQuery.getJSON(json_url, {
		  	id : events.getKartatEventID(),
			  type : "results",
			  cache: false
		  }).done(function(json) {
			  console.log("Results: " + json.data.length);
			  jQuery.each(json.data, function() {
				  results.addResult(new Result(this));
			  });
			  jQuery("#rg2-result-list").accordion("refresh");
			  results.getGPSTracks();
		  }).fail(function(jqxhr, textStatus, error) {
			  jQuery('body').css('cursor', 'auto');
			  var err = textStatus + ", " + error;
			  console.log("Results request failed: " + err);
		  });
	  },
	  
	  getGPSTracks : function() {
		  jQuery.getJSON(json_url, {
			  id : events.getKartatEventID(),
			  type : "tracks",
			  cache: false
		  }).done(function(json) {
		  	console.log("Tracks: " + json.data.length);
			  results.addTracks(json.data);
			  createCourseMenu();
			  createResultMenu();
			  animation.updateAnimationDetails();
			  jQuery('body').css('cursor', 'auto');
			  jQuery("#rg2-info-panel").tabs("enable", TAB_COURSES);
			  jQuery("#rg2-info-panel").tabs("enable", TAB_RESULTS);
			  jQuery("#rg2-info-panel").tabs("enable", TAB_DRAW);
			  // open courses tab for new event: else stay on draw tab
  	    var active = jQuery("#rg2-info-panel").tabs( "option", "active" );
  	    // don't change tab if we have come from DRAW since it means
  	    // we have just relaoded following a save
  	    if (active !== TAB_DRAW) {
			    jQuery("#rg2-info-panel").tabs("option", "active", TAB_COURSES);
			  }
			  jQuery("#rg2-info-panel").tabs("refresh");
			  jQuery("#btn-show-splits").show();
			  redraw(false);
		  }).fail(function(jqxhr, textStatus, error) {
			  jQuery('body').css('cursor', 'auto');
			  var err = textStatus + ", " + error;
			  console.log("Tracks request failed: " + err);
		  });
	  },
		
		addResult : function(result) {
			this.results.push(result);
		},
    
    getResultsByCourseID : function(courseid) {
      var count = 0;
      for (var i = 0; i < this.results.length; i++) {
        if (this.results[i].courseid === courseid) {
          count++;
        }
      
      }
      return count;
    },
		
		getTotalResultsByCourseID : function(courseid) {
      return this.results.length;                       		
		},
		
		getCourseID : function(resultid) {
			return this.results[resultid].courseid;
		},

		getFullResult : function(resultid) {
			return this.results[resultid];
		},

    getKartatResultID : function(resultid) {
      return this.results[resultid].resultid;	
    },
    
		drawTracks : function() {
			for (var i = 0; i < this.results.length; i++) {
				this.results[i].drawTrack();
			}
		},
    
    updateTrackNames: function () {
			jQuery("#rg2-track-names").empty();
			var html = this.getDisplayedTrackNames();
			if (html !== "") {
				jQuery("#rg2-track-names").append(html);
				jQuery("#rg2-track-names").show();
			} else {
				jQuery("#rg2-track-names").hide();
			}
   	
    },
    
		putOneTrackOnDisplay : function(resultid) {
			this.results[resultid].putTrackOnDisplay();
      this.updateTrackNames();
		},

		removeOneTrackFromDisplay : function(resultid) {
			this.results[resultid].removeTrackFromDisplay();
      this.updateTrackNames();
		},

		// add all tracks for one course
		putTracksOnDisplay : function(courseid) {
			for (var i = 0; i < this.results.length; i++) {
				if (this.results[i].courseid == courseid) {
					this.results[i].putTrackOnDisplay();
				};
			}
      this.updateTrackNames();			
		},

		// put all tracks for all courses on display
		putAllTracksOnDisplay : function() {
			for (var i = 0; i < this.results.length; i++) {
				this.results[i].putTrackOnDisplay();
			}
      this.updateTrackNames();
		},

		getDisplayedTrackNames : function() {
			var html = "";
			for (var i = 0; i < this.results.length; i++) {
				if (this.results[i].displayTrack) {
					html += "<p style='color:" + this.results[i].trackColour + ";'>" + courses.getCourseName(this.results[i].courseid);
					html += ": " + this.results[i].name + "</p>";
				}
			}
			return html;
		},

		resultIDExists : function(resultid) {
			for (var i = 0; i < this.results.length; i++) {
				if (resultid === this.results[i].resultid) {
					return true;
				}
			}
			return false;
		},

		getSplitsForID : function(resultid) {
			for (var i = 0; i < this.results.length; i++) {
				if (resultid === this.results[i].resultid) {
					return this.results[i].splits;
				}
			}
			return 9999;
		},

		getTimeForID : function(resultid) {
			for (var i = 0; i < this.results.length; i++) {
				if (resultid === this.results[i].resultid) {
					return this.results[i].time;
				}
			}
			return 9999;
		},

		removeAllTracksFromDisplay : function() {
			for (var i = 0; i < this.results.length; i++) {
				this.results[i].removeTrackFromDisplay();
			}
      this.updateTrackNames();
		},

		removeTracksFromDisplay : function(courseid) {
			for (var i = 0; i < this.results.length; i++) {
				if (this.results[i].courseid == courseid) {
					this.results[i].removeTrackFromDisplay();
				};
			}
      this.updateTrackNames();
		},

		addTracks : function(tracks) {
			// this gets passed the json data array
			var resultIndex;
			var j;
			// for each track
			for (var i = 0; i < tracks.length; i++) {
				resultIndex = tracks[i].resultid;
				j = 0;
				// don't add GPS track since we got a better one in the original results
				if (resultIndex < GPS_RESULT_OFFSET) {
					// loop through all results and add it against the correct id
					while (j < this.results.length) {
						if (resultIndex == this.results[j].resultid) {
							if (this.results[j].addTrack(tracks[i].coords)) {
							  courses.incrementTracksCount(this.results[j].courseid);
							}
							break;
						}
						j++;
					}
				}
			}

		},

		deleteAllResults : function() {
			this.results.length = 0;
		},

		getRunnerName : function(runner) {
			return this.results[runner].name;
		},
		
		sortByCourseIDThenResultID: function (a, b) {
			if (a.courseid > b.courseid) {
				return 1;
			} else if (b.courseid > a.courseid) {
				return -1;
			} else {
			  return a.resultid - b.resultid;
			}
   },
    
		formatResultListAsAccordion : function() {
			// puts all GPS results at bottom of relevant course results
      this.results.sort(this.sortByCourseIDThenResultID);
		
			var html = "";
			var temp;
			var firstCourse = true;
			var oldCourseID = 0;
			for (var i = 0; i < this.results.length; i++) {
				temp = this.results[i];
				if (temp.courseid != oldCourseID) {
					// found a new course so add header
					if (firstCourse) {
						firstCourse = false;
					} else {
						html += "</table></div>";
					}
					html += "<h3>" + temp.coursename;
					html += "<input class='showcourse' id=" + temp.courseid + " type=checkbox name=course title='Show course'></input></h3><div>";
					html += "<table class='resulttable'><tr><th>Name</th><th>Time</th><th>Track</th><th>Replay</th></tr>";
					oldCourseID = temp.courseid;
				}
				if (temp.comments !== "") {
					html += "<tr><td><a href='#' title='" + temp.comments + "'>" + temp.name + "</a></td><td>" + temp.time + "</td>";
				} else {
					html += "<tr><td>" + temp.name + "</td><td>" + temp.time + "</td>";
				}
				if (temp.hasValidTrack) {
					html += "<td><input class='showtrack' id=" + i + " type=checkbox name=result></input></td>";
				} else {
					html += "<td></td>";
				}
				html += "<td><input class='replay' id=" + i + " type=checkbox name=replay></input></td></tr>";
			};
			if (html === "") {
				html = "<p>No results available.</p>"
			} else {
				html += "</table></div></div>";
			}
			return html;
		},
		
		createNameDropdown : function(courseid) {
			jQuery("#rg2-name-select").empty();
			var dropdown = document.getElementById("rg2-name-select");
		  var opt = document.createElement("option");
			opt.value = null;
			opt.text = 'Select name';
			dropdown.options.add(opt);
			for (var i = 0; i < this.results.length; i++) {
				// don't include result if it has a valid track already
				if ((this.results[i].courseid === courseid) && (!this.results[i].hasValidTrack)) {
				  var opt = document.createElement("option");
				  opt.value = i;
				  opt.text = this.results[i].name;
				  dropdown.options.add(opt);
				}
			}
			dropdown.options.add(opt);
		},
	};

	function Result(data) {
		// resultid is the kartat id value
		this.resultid = parseInt(data.resultid, 10);
		// GPS track ids are normal resultid + GPS_RESULT_OFFSET
		if (this.resultid >= GPS_RESULT_OFFSET) {
			//this.name = (data.name).replace("GPS ", "");
			this.isGPSTrack = true;
		} else {
			//this.name = data.name;
			this.isGPSTrack = false;
		}
		this.name = data.name;
		this.starttime = Math.round(data.starttime);
		this.time = data.time;
    // get round iconv problem in API for now
	  if (data.comments != null) {
      // escape single quotes so that tooltips show correctly
	    this.comments = data.comments.replace("'", "&apos;");
	  } else {
	  	this.comments = "";
	  }
		this.coursename = data.coursename;
		if (this.coursename === "") {
			this.coursename = data.courseid;
		}
		this.courseid = parseInt(data.courseid, 10);
		this.splits = data.splits.split(";");
		// force to integers to avoid doing it every time we read it
		for (var i = 0; i < this.splits.length; i++) {
			this.splits[i] = Math.round(this.splits[i]);
		}
		// insert a 0 split at the start to make life much easier elsewhere
		this.splits.splice(0, 0, 0);
		
		if (data.scoreref !== "") {
			// save control locations for score course result
			this.scorex = data.scorex;
			this.scorey = data.scorey;
		}
		
		// calculated cumulative distance in pixels
		this.cumulativeDistance = [];
		// set true if track includes all expected controls in correct order
		// or is a GPS track
		this.hasValidTrack = false;
		this.displayTrack = false;
		this.trackColour = 0;
		// raw track data
		this.trackx = [];
		this.tracky = [];
		// interpolated times
		this.xysecs = [];
		if (this.isGPSTrack) {
			// don't get time or splits so need to copy them in from (GPS_RESULT_OFFSET - resultid)
			this.time = results.getTimeForID(this.resultid - GPS_RESULT_OFFSET);
			this.splits = results.getSplitsForID(this.resultid - GPS_RESULT_OFFSET);

		}
		if (data.gpscoords.length > 0) {
			if (this.addTrack(data.gpscoords)) {
			  courses.incrementTracksCount(this.courseid);
			}
		}

	}


	Result.prototype = {
		Constructor : Result,

		putTrackOnDisplay : function() {
			if (this.hasValidTrack) {
				this.displayTrack = true;
				this.trackColour = results.colours.getNextColour();
			}
		},

		removeTrackFromDisplay : function() {
			if (this.hasValidTrack) {
				this.displayTrack = false;
			}
		},

		drawTrack : function() {
			if (this.displayTrack) {
				ctx.lineWidth = 2;
				ctx.strokeStyle = this.trackColour;
				ctx.globalAlpha = 1.0;
				// set transparency of overprint
				ctx.beginPath();
				ctx.moveTo(this.trackx[0], this.tracky[0]);
				for (var i = 1; i < this.trackx.length; i++) {
					// lines
					ctx.lineTo(this.trackx[i], this.tracky[i]);
				}
				ctx.stroke();

			}
		},
		
 	addTrack : function(trackcoords) {
			// gets passed in coords
			// coord sets are separated by "N"
			var temp = trackcoords.split("N");
			var xy = 0;
			// ignore first point hack for now
			for (var i = 1; i < temp.length; i++) {
				// coord sets are 2 items in csv format
				xy = temp[i].split(";");
				this.trackx.push(parseInt(xy[0], 10));
				this.tracky.push(-1 * parseInt(xy[1], 10));
			}
      var trackOK;
			if (this.isGPSTrack) {
				trackOK = this.expandGPSTrack();
			} else {
				trackOK = this.expandNormalTrack();
			}
			return trackOK;
		},
		
		expandNormalTrack : function() {
			// add times and distances at each position
			this.xysecs[0] = 0;
			this.cumulativeDistance[0] = 0;
			// get course details
			var course = new Object();
			// each person has their own defined score course
			if (events.isScoreEvent()) {
			  course.x = this.scorex;
			  course.y = this.scorey;
			} else {
			  course.x = courses.getFullCourse(this.courseid).x;
			  course.y = courses.getFullCourse(this.courseid).y;

			}
			// read through list of controls and copy in split times
			var nextcontrol = 1;
			var nextx = course.x[nextcontrol];
			var nexty = course.y[nextcontrol];
			var dist = 0;
			var oldx = this.trackx[0];
			var oldy = this.tracky[0];
			var i;
			var x = 0;
			var y = 0;
			var deltat = 0;
			var deltadist = 0;
			var olddist = 0;
			var oldt = 0;
			var previouscontrolindex = 0;
			// we are assuming the track starts at the start which is index 0...
			// look at each track point and see if it matches the next control location
			for ( i = 1; i < this.trackx.length; i++) {
				// calculate distance while we are looping through
				x = this.trackx[i];
				y = this.tracky[i];
				dist = dist + Math.sqrt(((x - oldx) * (x - oldx)) + ((y - oldy) * (y - oldy)));
				this.cumulativeDistance[i] = Math.round(dist);
				oldx = x;
				oldy = y;
				// track ends at control
				if ((nextx == x) && (nexty == y)) {
					this.xysecs[i] = parseInt(this.splits[nextcontrol], 10);
					// go back and add interpolated time at each point based on cumulative distance
					// this assumes uniform speed...
					oldt = this.xysecs[previouscontrolindex];
					deltat = this.xysecs[i] - oldt;
					olddist = this.cumulativeDistance[previouscontrolindex];
					deltadist = this.cumulativeDistance[i] - olddist;
					for (var j = previouscontrolindex; j <= i; j++) {
						this.xysecs[j] = oldt + Math.round(((this.cumulativeDistance[j] - olddist) * deltat / deltadist));
					}
					previouscontrolindex = i;
					nextcontrol++;
					if (nextcontrol === course.x.length) {
						// we have found all the controls
						this.hasValidTrack = true;
						break;
					} else {
						nextx = course.x[nextcontrol];
						nexty = course.y[nextcontrol];
					}
				}
			}
      // treat all score tracks as valid for now
      // may need a complete rethink on score course handling later
      if (events.isScoreEvent()) {
      	this.hasValidTrack = true;
      }
      return this.hasValidTrack;
		},

		expandGPSTrack : function() {
			var t;
			var dist = 0;
			var oldx = this.trackx[0];
			var oldy = this.tracky[0];
			var x = 0;
			var y = 0;			
			// in theory we get one point every three seconds
			for ( t = 0; t < this.trackx.length; t++) {
				this.xysecs[t] = 3 * t;
				x = this.trackx[t];
				y = this.tracky[t];
				dist = dist + Math.sqrt(((x - oldx) * (x - oldx)) + ((y - oldy) * (y - oldy)));
				this.cumulativeDistance[t] = Math.round(dist);
				oldx = x;
				oldy = y;
			}
			this.hasValidTrack = true;
			return this.hasValidTrack;

		},

		getCourseName : function() {
			if (this.coursename != "") {
				return this.coursename;
			} else {
				return "GPS tracks";
			}
		},
		getRunnerName : function() {
			return this.name;
		},
		getTime : function() {
			return this.time;
		}
	}

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
				ctx.lineWidth = OVERPRINT_LINE_THICKNESS;
				ctx.strokeStyle = PURPLE;
				ctx.font = '20pt Arial';
				ctx.fillStyle = PURPLE;				
				ctx.globalAlpha = 1.0;				
        for (var i = 0; i < this.controls.length; i++) {
          // Assume things starting with 'F' are a Finish
          if (this.controls[i].code.indexOf('F') == 0){
            this.drawFinishControl(this.controls[i].x, this.controls[i].y, this.controls[i].code);                   
          } else {
            // Assume things starting with 'S' are a Start             
            if (this.controls[i].code.indexOf('S') == 0){
              this.drawStartControl(this.controls[i].x, this.controls[i].y, this.controls[i].code, (6* Math.PI/4));                                     
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
      ctx.beginPath();            
      ctx.strokeStyle = "white";
      ctx.lineWidth = OVERPRINT_LINE_THICKNESS + 2;
      ctx.arc(x, y, 20, 0, 2 * Math.PI, false);             
      ctx.stroke();
      //Draw the white halo around the control code                
      ctx.beginPath();
      ctx.textAlign = "left";
      ctx.font = "20pt Arial";
      ctx.strokeStyle = "white";
      ctx.miterLimit = 2;
      ctx.lineJoin = "circle";
      ctx.lineWidth = 1.5;
      ctx.strokeText(code, x + 25,y + 20);            
      //Draw the purple control
      ctx.beginPath();
      ctx.font = "20pt Arial";
      ctx.fillStyle = PURPLE;
      ctx.strokeStyle = PURPLE;
      ctx.lineWidth = OVERPRINT_LINE_THICKNESS;
      ctx.arc(x, y, 20, 0, 2 * Math.PI, false);
      ctx.fillText(code, x + 25, y + 20);
      ctx.stroke();
    },
		drawFinishControl : function (x, y, code) {
		  //Draw the white halo around the finish control
		  ctx.strokeStyle = "white";
		  ctx.lineWidth = OVERPRINT_LINE_THICKNESS + 2;
		  ctx.beginPath();		  		  
		  ctx.arc(x, y, FINISH_INNER_RADIUS, 0, 2 * Math.PI, false);
      ctx.stroke();
		  ctx.beginPath();
      ctx.arc(x, y, FINISH_OUTER_RADIUS, 0, 2 * Math.PI, false);
		  ctx.stroke();
		  //Draw the white halo around the finish code
		  ctx.beginPath();
      ctx.font = "20pt Arial";
      ctx.textAlign = "left";
      ctx.strokeStyle = "white";
      ctx.miterLimit = 2;
      ctx.lineJoin = "circle";
      ctx.lineWidth = 1.5;
      ctx.strokeText(code, x + 30,y + 20);
		  ctx.stroke();
		  //Draw the purple finish control
		  ctx.beginPath();     
      ctx.fillStyle = PURPLE;
      ctx.strokeStyle = PURPLE;
      ctx.lineWidth = OVERPRINT_LINE_THICKNESS;
      ctx.arc(x, y, FINISH_INNER_RADIUS, 0, 2 * Math.PI, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, FINISH_OUTER_RADIUS, 0, 2 * Math.PI, false);
      ctx.fillText(code, x + 30, y + 20);
      ctx.stroke();		
		},
		drawStartControl : function(startx, starty, code, angle) {
		  //Draw the white halo around the start triangle
		  var x = [];
		  var y = [];
		  var DEGREES_120 = (2 * Math.PI/3);
		  angle = angle + (Math.PI /2);
		  ctx.lineCap = 'round';
		  ctx.strokeStyle = "white";
		  ctx.lineWidth = OVERPRINT_LINE_THICKNESS + 2;
		  ctx.beginPath();
		  x[0] = startx + (START_TRIANGLE_LENGTH * Math.sin(angle));
		  y[0] = starty - (START_TRIANGLE_LENGTH * Math.cos(angle));
		  ctx.moveTo(x[0], y[0]);            
      x[1] = startx + (START_TRIANGLE_LENGTH * Math.sin(angle + DEGREES_120));
      y[1] = starty - (START_TRIANGLE_LENGTH * Math.cos(angle + DEGREES_120));
      ctx.lineTo(x[1], y[1]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x[1],y[1]);      
      x[2] = startx + (START_TRIANGLE_LENGTH * Math.sin(angle - DEGREES_120));
      y[2] = starty - (START_TRIANGLE_LENGTH * Math.cos(angle - DEGREES_120));
      ctx.lineTo(x[2], y[2]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x[2],y[2]);     
      ctx.lineTo(x[0], y[0]);                                 
      ctx.stroke();
		  //Draw the white halo around the start code
		  ctx.beginPath();
      ctx.font = "20pt Arial";
      ctx.textAlign = "left";
      ctx.strokeStyle = "white";
      ctx.miterLimit = 2;
      ctx.lineJoin = "circle";
      ctx.lineWidth = 1.5;
      ctx.strokeText(code, x[0] + 25, y[0] + 25);
      ctx.stroke();
      //Draw the purple start control
      ctx.strokeStyle = PURPLE;
      ctx.lineWidth = OVERPRINT_LINE_THICKNESS;
      ctx.font = "20pt Arial";
      ctx.fillStyle = PURPLE;
      ctx.beginPath();
      ctx.moveTo(x[0], y[0]);          
      ctx.lineTo(x[1], y[1]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x[1], y[1]);
      ctx.lineTo(x[2], y[2]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x[2],y[2]);
      ctx.lineTo(x[0], y[0]);                                 
      ctx.fillText(code, x[0] +25, y[0] + 25);
      ctx.stroke();
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

		getCourseName : function(courseid) {
			return this.courses[courseid].name;
		},

		getHighestControlNumber : function() {
			return this.highestControlNumber;
		},

		getFullCourse : function(courseid) {
			return courses.courses[courseid];
		},

		incrementTracksCount : function(courseid) {
			this.courses[courseid].incrementTracksCount();
			this.totaltracks++;
		},

		gettrackcountCount : function(courseid) {
			return this.courses[courseid].trackcount;
		},

		getTotalTracksCount : function() {
			return this.totaltracks;
		},

		addCourse : function(courseObject) {
			this.courses[courseObject.courseid] = courseObject;
			this.numberofcourses++;
			// allow for courses with no defined controls
			// careful here: != catches null and undefined, but !== just catches undefined
			if (this.courses[courseObject.courseid].codes != undefined) {
				if (this.courses[courseObject.courseid].codes.length > this.highestControlNumber) {
					// the codes includes Start and Finish: we don't need F so subtract 1 to get controls
					this.highestControlNumber = this.courses[courseObject.courseid].codes.length - 1;
          this.updateControlDropdown();
				}
			}
		},
		
		updateCourseDropdown : function() {
			jQuery("#rg2-course-select").empty();
			var dropdown = document.getElementById("rg2-course-select");
			var opt = document.createElement("option");
			opt.value = null;
			opt.text = "Select course";
			dropdown.options.add(opt);

			for (var i = 0; i < this.courses.length; i++) {
				if (this.courses[i] != undefined) {
				  var opt = document.createElement("option");
				  opt.value = i;
				  opt.text = this.courses[i].name;
				  dropdown.options.add(opt);
				}
			}
			dropdown.options.add(opt);
		},
		
		updateControlDropdown : function() {
			jQuery("#rg2-control-select").empty();
			var dropdown = document.getElementById("rg2-control-select");
			for (var i = 0; i < this.highestControlNumber; i++) {
				var opt = document.createElement("option");
				opt.value = i;
				if (i === 0) {
					opt.text = "S";
				} else {
					opt.text = i;
				}
				dropdown.options.add(opt);
			}
			var opt = document.createElement("option");
			opt.value = MASS_START_BY_CONTROL;
			opt.text = "By control";
			dropdown.options.add(opt);
		},

		deleteAllCourses : function() {
			this.courses.length = 0;
			this.numberofcourses = 0;
			this.totaltracks = 0;
			this.highestControlNumber = 0;
		},

		drawCourses : function(intensity) {
			for (var i = 0; i < this.courses.length; i++) {
				if (this.courses[i] != undefined) {
					this.courses[i].drawCourse(intensity);
				}
			}
		},

		putOnDisplay : function(courseid) {
			if (this.courses[courseid] != undefined) {
				this.courses[courseid].display = true;
			}
		},

		putAllOnDisplay : function() {
			for (var i = 0; i < this.courses.length; i++) {
				if (this.courses[i] != undefined) {
					this.courses[i].display = true;
				}
			}
		},

		removeAllFromDisplay : function() {
			for (var i = 0; i < this.courses.length; i++) {
				if (this.courses[i] != undefined) {
					this.courses[i].display = false;
				}
			}
		},

		removeFromDisplay : function(courseid) {
			// remove selected course
			this.courses[courseid].display = false;

		},

		isOnDisplay : function(courseid) {
			return this.courses[courseid].display;
		},

		toggleDisplay : function(courseid) {
			this.courses[courseid].toggleDisplay();
		},

		getNumberOfCourses : function() {
			return this.numberofcourses;
		},

		// look through all courses and extract list of controls
		generateControlList : function() {
			var codes;
			var x;
			var y;
			// for all courses
			for (var i = 0; i < this.courses.length; i++) {
				if (this.courses[i] != undefined) {
					codes = this.courses[i].codes;
					x = this.courses[i].x;
					y = this.courses[i].y;
					// for all controls on course
					if (codes != undefined) {
						for (var j = 0; j < codes.length; j++) {
							controls.addControl(codes[j], x[j], y[j]);
						}
					}
				}
			}
		},

		formatCoursesAsTable : function() {
			var html = "<table class='coursemenutable'><tr><th>Course</th><th>Show</th><th>Runners</th><th>Tracks</th><th>Show</th></tr>";
			for (var i = 0; i < this.courses.length; i++) {
				if (this.courses[i] != undefined) {
					html += "<tr><td>" + this.courses[i].name + "</td>";
					html += "<td><input class='courselist' id=" + i + " type=checkbox name=course></input></td>";
					html += "<td>" + results.getResultsByCourseID(i) + "</td>";
					html += "<td>" + this.courses[i].trackcount + "</td>";
					if (this.courses[i].trackcount > 0) {
						html += "<td><input id=" + i + " class='tracklist' type=checkbox name=track></input></td>";
					} else {
						html += "<td></td>";
					}
					html += "</tr>";
				}
			}
			// add bottom row for all courses checkboxes
			html += "<tr><td>All</td>";
			html += "<td><input class='allcourses' id=" + i + " type=checkbox name=course></input></td>";
			html += "<td>" + results.getTotalResultsByCourseID() + "</td>";
			if (this.totaltracks > 0) {
				html += "<td>" + this.totaltracks + "</td><td><input id=" + i + " class='alltracks' type=checkbox name=track></input></td>";
			} else {
				html += "<td>" + this.totaltracks + "</td><td></td>";
			}
			html += "</tr></table>";
			return html;
		}
	}

	function Course(data) {
		this.name = data.name;
		this.trackcount = 0;
		this.display = false;
		this.courseid = data.courseid;
		this.codes = data.codes;
		this.x = data.xpos;
		this.y = data.ypos;
		this.temp = 0;
	}


	Course.prototype = {
		Constructor : Course,

		incrementTracksCount : function() {
			this.trackcount++;
		},
		getCourseID : function() {
			return this.courseid;
		},

		toggleDisplay : function() {
			this.display = !this.display;
		},			
		
  drawCourse : function(intensity) {
      if (this.display) {                                             
        var angle;
        var c1x;
        var c1y;
        var c2x;
        var c2y;       
        var isScoreEvent = events.isScoreEvent();
        ctx.globalAlpha = intensity;        
        if (isScoreEvent) {
        	// align score event start triangle upwards
        	angle = Math.PI * 3/2;
        } else {
          angle = getAngle (this.x[0], this.y[0], this.x[1], this.y[1]);
        }
        controls.drawStartControl(this.x[0], this.y[0], "", angle);
        for (i = 0; i < (this.x.length - 1); i++) {
          angle = getAngle (this.x[i], this.y[i], this.x[i + 1], this.y[i + 1]);
          if (i === 0) {
            c1x = this.x[i] + (START_TRIANGLE_LENGTH * Math.cos(angle));  
            c1y = this.y[i] + (START_TRIANGLE_LENGTH * Math.sin(angle));   
          } else {
            c1x = this.x[i] + (CONTROL_CIRCLE_RADIUS * Math.cos(angle));  
            c1y = this.y[i] + (CONTROL_CIRCLE_RADIUS * Math.sin(angle));
          }
          //Assume the last control in the array is a finish
          if (i === this.x.length - 2) {
           c2x = this.x[i + 1] - (FINISH_OUTER_RADIUS * Math.cos(angle));
           c2y = this.y[i + 1] - (FINISH_OUTER_RADIUS * Math.sin(angle));        
          } else {
            c2x = this.x[i + 1] - (CONTROL_CIRCLE_RADIUS * Math.cos(angle));
            c2y = this.y[i + 1] - (CONTROL_CIRCLE_RADIUS * Math.sin(angle)); 
          }
          // don't join up controls for score events
          if (!isScoreEvent) {
          	ctx.lineWidth = OVERPRINT_LINE_THICKNESS;
            ctx.strokeStyle = PURPLE;         
            ctx.beginPath();
            ctx.moveTo(c1x, c1y);
            ctx.lineTo(c2x, c2y);
            ctx.stroke();
          }
        
       }
        for (var i = 1; i < (this.x.length - 1); i++) {          
          controls.drawSingleControl(this.x[i], this.y[i], i);
        }
        controls.drawFinishControl(this.x[this.x.length - 1], this.y[this.y.length - 1], "");
     }
    }
	}

	var canvas = jQuery("#rg2-map-canvas")[0];
	var ctx = canvas.getContext('2d');
	var map = new Image();
	var mapLoadingText = "Select an event";
	var events = new Events();
	var courses = new Courses();
	var results = new Results();
	var controls = new Controls();
	var animation = new Animation();
	var gpstrack = new GPSTrack();;
	var draw;
	var timer = 0;
	// added to resultid when saving a GPS track
	var GPS_RESULT_OFFSET = 50000;
	var TAB_EVENTS = 0;
	var TAB_COURSES = 1;
	var TAB_RESULTS = 2;
	var TAB_DRAW = 3;
	var MASS_START_REPLAY = 1;
  var REAL_TIME_REPLAY = 2;
	// dropdown selection value
	var MASS_START_BY_CONTROL = 99999;
	var VERY_HIGH_TIME_IN_SECS = 99999;
	// screen sizes for different layouts
	var BIG_SCREEN_BREAK_POINT = 800;
	var SMALL_SCREEN_BREAK_POINT = 500;
	var PURPLE = '#b300ff';
	var CONTROL_CIRCLE_RADIUS = 20;
	var FINISH_INNER_RADIUS = 16.4;
	var FINISH_OUTER_RADIUS = 23.4;
  var RUNNER_DOT_RADIUS = 6;
  var DEFAULT_SCALE_FACTOR = 1.1;
  var DEFAULT_NEW_COMMENT = "Type your comment";
	var START_TRIANGLE_LENGTH = 30;
  var OVERPRINT_LINE_THICKNESS = 2;
  var REPLAY_LINE_THICKNESS = 3;
  var START_TRIANGLE_HEIGHT = 40;
  // parameters for call to draw courses
  var DIM = 0.5;
  var FULL_INTENSITY = 1.0;
  var SCORE_EVENT = 3;
	var infoPanelMaximised;
	var infoHideIconSrc;
	var infoShowIconSrc;
	var scaleFactor;
	var lastX;
	var lastY;	
	var dragStart = null;
	// looks odd but this works for initialisation
	var dragged = true;

	initialize();

	function initialize() {
    jQuery("#rg2-header-container").css("color", header_text_colour);
    jQuery("#rg2-header-container").css("background", header_colour);

		jQuery("#rg2-about-dialog").hide();
		jQuery("#rg2-splits-display").hide();
		jQuery("#rg2-track-names").hide();
		
		trackTransforms(ctx);
		resizeCanvas();

    // stick with native tooltops for now
    // since this caused trouble when changing titles
		//jQuery(document).tooltip();

		jQuery("#btn-about").click(function() {
			displayAboutDialog();
		});

		// initially loaded file has a close icon
		infoHideIconSrc = jQuery("#rg2-resize-info-icon").attr("src");
		infoShowIconSrc = infoHideIconSrc.replace("hide-info", "show-info");

		jQuery("#rg2-resize-info").click(function() {
			resizeInfoDisplay();
		});

		jQuery("#rg2-info-panel").tabs({
			active : TAB_EVENTS,
			heightStyle : "content",
      activate: function( event, ui ) {
        tabActivated();	
      }
		});

		infoPanelMaximised = true;

		// disable tabs until we have loaded something
		jQuery("#rg2-info-panel").tabs({
			disabled : [TAB_COURSES, TAB_RESULTS, TAB_DRAW]
		});

		jQuery("#rg2-result-list").accordion({
			collapsible : true,
			heightStyle : "content",
			select : function(event, ui) {
				console.log("Result index selected: " + ui.item[0].id);
			}
		});

		jQuery("#rg2-clock").text("00:00:00");
		jQuery("#rg2-clock-slider").slider({
			slide : function(event, ui) {
				// passes slider value as new time
				animation.clockSliderMoved(ui.value);
			}
		});

		jQuery("#btn-mass-start").addClass('active');
		jQuery("#btn-real-time").removeClass('active');
		
		jQuery("#btn-mass-start").click(function(event) {
			animation.setReplayType(MASS_START_REPLAY);
		});

		jQuery("#btn-real-time").click(function(event) {
			animation.setReplayType(REAL_TIME_REPLAY);
		});

		jQuery("#rg2-control-select").prop('disabled', true)
		  .click(function(event) {
			animation.setStartControl(jQuery("#rg2-control-select").val());
		});

		jQuery("#rg2-name-select").prop('disabled', true)
		  .click(function(event) {
			draw.setName(parseInt(jQuery("#rg2-name-select").val(), 10));
		});
		
		jQuery("#rg2-course-select").click(function(event) {
			draw.setCourse(parseInt(jQuery("#rg2-course-select").val(), 10));
		});
		
		jQuery('#rg2-new-comments').focus(function(){
      // Clear comment box if user focuses on it and it still contains default text
      var text = jQuery("#rg2-new-comments").val();
      if (text === DEFAULT_NEW_COMMENT){
         jQuery('#rg2-new-comments').val("");
      }
   });

		jQuery("#btn-save-route").button()
		  .click(function() {
			  draw.saveRoute();
		});

		jQuery("#btn-save-gps-route").button()
		  .click(function() {
			  draw.saveGPSRoute();
		});

		jQuery("#btn-move-all").click(function(evt) {
			  draw.toggleMoveAll(evt.target.checked);
		});
		jQuery("#btn-move-all").prop('checked', false);
		   	
   	jQuery("#btn-save-route").button("disable");
   	jQuery("#btn-save-gps-route").button("disable");
   	
		jQuery("#btn-undo").button()
		  .click(function() {
			  draw.undoLastPoint();
		});

		jQuery("#btn-reset-drawing").button()
		  .click(function() {
			  draw.resetDrawing();
		});

		jQuery("#btn-three-seconds").button()
		  .click(function() {
			  draw.waitThreeSeconds();
		});

		jQuery("#rg2-load-gps-file").button()
		  .change(function(evt) {
			  gpstrack.uploadGPS(evt);
		});		

   	jQuery("#btn-undo").button("disable");
   	jQuery("#rg2-load-gps-file").button("disable");
   	jQuery("#btn-three-seconds").button("disable");

		jQuery("#btn-zoom-in").click(function() {
			zoom(1);
		});		
		
		jQuery("#btn-reset").click(function() {
			resetMapState();
		});

		jQuery("#btn-zoom-out").click(function() {
			zoom(-1);
		});

		jQuery("#btn-start-stop").click(function() {
			animation.toggleAnimation();
		});

		jQuery("#btn-faster").click(function() {
			animation.goFaster();
		});

		jQuery("#btn-slower").click(function() {
			animation.goSlower();
		});

		jQuery("#btn-toggle-names").click(function() {
      animation.toggleNameDisplay();  
      redraw(false);
    });
    // enable once we have courses loaded
    jQuery("#btn-toggle-names").hide();
		
		jQuery("#btn-show-splits").click(function() {
			jQuery("#rg2-splits-table").empty();
			jQuery("#rg2-splits-table").append(animation.getSplitsTable());
			jQuery("#rg2-splits-table").dialog({
				width : 'auto',
				buttons : {
					Ok : function() {
						jQuery(this).dialog('close');
					}
				}
			})
		});
		// enable once we have courses loaded
		jQuery("#btn-show-splits").hide();

		jQuery("#btn-toggle-controls").click(function() {
			controls.toggleControlDisplay();
			redraw(false);
		});
		// enable once we have courses loaded
		jQuery("#btn-toggle-controls").hide();

		// set default to 0 secs = no tails
		jQuery("#spn-tail-length").spinner({
			max : 600,
			min : 0,
			spin : function(event, ui) {
				animation.setTailLength(ui.value);
			}
		}).val(0);

		jQuery("#btn-full-tails").prop('checked', false);
		jQuery("#btn-full-tails").click(function(event) {
			if (event.target.checked) {
				animation.setFullTails(true);
				jQuery("#spn-tail-length").spinner("disable");
			} else {
				animation.setFullTails(false);
				jQuery("#spn-tail-length").spinner("enable");

			}
		});

		window.addEventListener('resize', resizeCanvas, false);

		// load event details
		jQuery.getJSON(json_url, {
			type : "events",
			cache: false
		}).done(function(json) {
			console.log("Events: " + json.data.length);
			jQuery.each(json.data, function() {
				events.addEvent(new Event(this));
			});
			createEventMenu();
		}).fail(function(jqxhr, textStatus, error) {
			var err = textStatus + ", " + error;
			console.log("Events request failed: " + err);
		});

		// force redraw once map has loaded
		map.addEventListener("load", function() {
			resetMapState();
		}, false);
		
		draw = new Draw();

	}

	function resetMapState() {
		// place map in centre of canvas and scale it down to fit
		var heightscale = canvas.height / map.height;
		lastX = canvas.width / 2;
		lastY = canvas.height / 2;
		dragStart = null;
		// looks odd but this works for initialisation
		dragged = true;
		var mapscale;
		// don't stretch map: just shrink to fit
		if (heightscale < 1) {
			mapscale = heightscale;
		} else {
			mapscale = 1;
		}
		// move map into view on small screens
		// avoid annoying jumps on larger screens
		if ((infoPanelMaximised) || (window.innerWidth >= BIG_SCREEN_BREAK_POINT)) {
			ctx.setTransform(mapscale, 0, 0, mapscale, jQuery("#rg2-info-panel").outerWidth(), 0);
		} else {
			ctx.setTransform(mapscale, 0, 0, mapscale, 0, 0);
		}
		ctx.save();
		redraw(false);
	}

	function resizeCanvas() {
		scaleFactor = DEFAULT_SCALE_FACTOR;
		var winwidth = window.innerWidth;
		var winheight = window.innerHeight;
		// allow for header
		jQuery("#rg2-container").css("height", winheight - 36);
		canvas.width = winwidth;
		// allow for header
		canvas.height = winheight - 36;
		// set title bar
		if (window.innerWidth >= BIG_SCREEN_BREAK_POINT) {
			jQuery("#rg2-event-title").text(events.getActiveEventName() + " " + events.getActiveEventDate());
			jQuery("#rg2-event-title").show();
		} else if (window.innerWidth > SMALL_SCREEN_BREAK_POINT) {
			jQuery("#rg2-event-title").text(events.getActiveEventName());				
			jQuery("#rg2-event-title").show();
		} else {
			jQuery("#rg2-event-title").hide();
		}
		resetMapState();
	}

  // called whenever the active tab changes to tidy up as necessary
  function tabActivated() {
  	var active = jQuery("#rg2-info-panel").tabs( "option", "active" );
  	switch (active) {
  	case TAB_DRAW:
		  courses.removeAllFromDisplay();  		
			draw.showCourseInProgress();
  	  break;
  	default:
  	  break;
  	}
  	redraw(false);
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
		// clear the canvas
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		// go back to where we started
		ctx.restore();
		// set transparency of map to none
		ctx.globalAlpha = 1.0;

		if (map.height > 0) {
      // using non-zero map height to show we have a map loaded
			ctx.drawImage(map, 0, 0);
  	  var active = jQuery("#rg2-info-panel").tabs( "option", "active" );
  	  if (active === TAB_DRAW) {
				courses.drawCourses(DIM);			
			  controls.drawControls();
			  draw.drawNewTrack();
			} else {
				courses.drawCourses(FULL_INTENSITY);
			  results.drawTracks();
			  controls.drawControls();
			  // parameter determines if animation time is updated or not
			  if (fromTimer) {
			  	animation.runAnimation(true);
			  } else {
				  animation.runAnimation(false);
		  	}
		  }
		} else {
			ctx.font = '30pt Arial';
			ctx.textAlign = 'center';
			ctx.fillStyle = "black";
			ctx.fillText(mapLoadingText, canvas.width / 2, canvas.height / 2);
		}

	}

	function displayAboutDialog() {
		jQuery("#rg2-about-dialog").dialog({
			//modal : true,
			minWidth : 400,
			buttons : {
				Ok : function() {
					jQuery(this).dialog("close");
				}
			}
		})
	}

	function resizeInfoDisplay() {
		if (infoPanelMaximised) {
			infoPanelMaximised = false;
			jQuery("#rg2-resize-info-icon").attr("src", infoShowIconSrc);
			jQuery("#rg2-resize-info").prop("title", "Show info panel");
			jQuery("#rg2-info-panel").hide();
		} else {
			infoPanelMaximised = true;
			jQuery("#rg2-resize-info-icon").attr("src", infoHideIconSrc);
			jQuery("#rg2-resize-info").prop("title", "Hide info panel");
			jQuery("#rg2-info-panel").show();
		}
		// move map around if necesssary
		resetMapState();
	}

	canvas.addEventListener('mousedown', function(evt) {
		lastX = evt.offsetX || (evt.layerX - canvas.offsetLeft);
		lastY = evt.offsetY || (evt.layerY - canvas.offsetTop);
		dragStart = ctx.transformedPoint(lastX, lastY);
		dragged = false;
		//console.log ("Mousedown " + lastX + " " + lastY + " " + dragStart.x + " " + dragStart.y);	
		}, false)

	canvas.addEventListener('mousemove', function(evt) {
		lastX = evt.offsetX || (evt.layerX - canvas.offsetLeft);
		lastY = evt.offsetY || (evt.layerY - canvas.offsetTop);
		if (dragStart) {
			var pt = ctx.transformedPoint(lastX, lastY);
	    //console.log ("Mousemove after" + pt.x + ": " + pt.y);
			// allow for Webkit which gives us mousemove events with no movement!
			if ((pt.x !== dragStart.x) || (pt.y !== dragStart.y)) {
			  if (gpstrack.fileLoaded) {
		      draw.adjustTrack(parseInt(dragStart.x, 10), parseInt(dragStart.y, 10), parseInt(pt.x, 10), parseInt(pt.y, 10), evt.shiftKey, evt.ctrlKey);	  	
			  } else {
			    ctx.translate(pt.x - dragStart.x, pt.y - dragStart.y);
			  }
		    dragged = true;
		    redraw(false);
			}
		}	
	}, false)

  canvas.addEventListener('mouseup', function(evt) {
		//console.log ("Mouseup" + dragStart.x + ": " + dragStart.y);
    if (!dragged) {
    	draw.mouseUp(parseInt(dragStart.x, 10), parseInt(dragStart.y, 10));
    } else {
	    draw.dragEnded();
	  }	  	
		dragStart = null;
		redraw(false);	
	}, false)
	
	var zoom = function(zoomDirection) {
		var factor = Math.pow(scaleFactor, zoomDirection);

		var pt = ctx.transformedPoint(lastX, lastY);
		ctx.translate(pt.x, pt.y);
		ctx.scale(factor, factor);
		ctx.translate(-pt.x, -pt.y);
    ctx.save();
		redraw(false);
	}

	var handleScroll = function(evt) {
		var delta = evt.wheelDelta ? evt.wheelDelta / 40 : evt.detail ? -evt.detail : 0;
		if (delta) {
			zoom(delta);
		}
		return evt.preventDefault() && false;
	}
	
	canvas.addEventListener('DOMMouseScroll', handleScroll, false);
	canvas.addEventListener('mousewheel', handleScroll, false);
	
	function createEventMenu() {
		//loads menu from populated events array
		var html = events.formatEventsAsMenu();
		jQuery("#rg2-event-list").append(html);

		jQuery("#rg2-event-list").menu({
			select : function(event, ui) {
				events.loadEvent(ui.item[0].id);
			}
		});
	}

	function createCourseMenu() {
		//loads menu from populated courses array
		jQuery("#rg2-course-table").empty();
		jQuery("#rg2-course-table").append(courses.formatCoursesAsTable());

		// checkbox on course tab to show a course
		jQuery(".courselist").click(function(event) {
			if (event.target.checked) {
				courses.putOnDisplay(parseInt(event.currentTarget.id, 10));
			} else {
				courses.removeFromDisplay(parseInt(event.currentTarget.id, 10));
				// make sure the all checkbox is not checked
				jQuery(".allcourses").prop('checked', false);
			}
			redraw(false);
		})

		// checkbox on course tab to show all courses
		jQuery(".allcourses").click(function(event) {
			if (event.target.checked) {
				courses.putAllOnDisplay();
				// select all the individual checkboxes for each course
				jQuery(".courselist").prop('checked', true);
			} else {
				courses.removeAllFromDisplay();
				jQuery(".courselist").prop('checked', false);
			}
			redraw(false);
		})
		// checkbox on course tab to show tracks for one course
		jQuery(".tracklist").click(function(event) {
			var courseid = event.target.id;
			if (event.target.checked) {
				results.putTracksOnDisplay(courseid);
			} else {
				results.removeTracksFromDisplay(courseid);
				// make sure the all checkbox is not checked
				jQuery(".alltracks").prop('checked', false);
			}
			redraw(false);
		})
		// checkbox on course tab to show all tracks
		jQuery(".alltracks").click(function(event) {
			if (event.target.checked) {
				results.putAllTracksOnDisplay();
				// select all the individual checkboxes for each course
				jQuery(".tracklist").prop('checked', true);
			} else {
				results.removeAllTracksFromDisplay();
				// deselect all the individual checkboxes for each course
				jQuery(".tracklist").prop('checked', false);
			}
			redraw(false);
		})
	}

	function createResultMenu() {
		//loads menu from populated result array
		var html = results.formatResultListAsAccordion();
    // checkbox on course tab to show a course
    jQuery(".courselist").unbind('click').click(function(event) {
      if (event.target.checked) {
        courses.putOnDisplay(parseInt(event.currentTarget.id, 10));
      } else {
        courses.removeFromDisplay(parseInt(event.currentTarget.id, 10));
        // make sure the all checkbox is not checked
        jQuery(".allcourses").prop('checked', false);
      }
      redraw();

    })
		jQuery("#rg2-result-list").empty();
		jQuery("#rg2-result-list").append(html);

		jQuery("#rg2-result-list").accordion("refresh");

		jQuery("#rg2-info-panel").tabs("refresh");

		// checkbox to show a course
		jQuery(".showcourse").click(function(event) {
			//Prevent opening accordion when check box is clicked
			event.stopPropagation();
			if (event.target.checked) {
				courses.putOnDisplay(event.target.id);
			} else {
				courses.removeFromDisplay(event.target.id);
			}
			redraw(false);
		})
		// checkbox to show a result
		jQuery(".showtrack").click(function(event) {
			if (event.target.checked) {
				results.putOneTrackOnDisplay(event.target.id);
			} else {
				results.removeOneTrackFromDisplay(event.target.id);
			}
			redraw(false);
		})
		// checkbox to animate a result
		jQuery(".replay").click(function(event) {
			if (event.target.checked) {
				animation.addRunner(new Runner(event.target.id));
			} else {
				animation.removeRunner(event.target.id);
			}
			
			redraw(false);
		})
		// disable control dropdown if we have no controls
		if (courses.getHighestControlNumber() === 0) {
			jQuery("#rg2-control-select").prop('disabled', true);
		} else {
			jQuery("#rg2-control-select").prop('disabled', false);
		}
	}


});
