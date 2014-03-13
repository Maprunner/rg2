// Version 0.6.2 2014-03-13T08:04:21;
/*
* Routegadget 2
* https://github.com/Maprunner/rg2
*
* Copyright (c) 2014 Simon Errington and contributors
* Licensed under the MIT license.
* https://github.com/Maprunner/rg2/blob/master/LICENSE
*/
/*global $:false */
/*global header_colour:false */
/*global header_text_colour:false */
/*global json_url:false */
/*global maps_url:false */
/*global keksi: false */
/*global Image:false */
/*global Events:false */
/*global Event:false */
/*global Courses:false */
/*global Controls:false */
/*global Results:false */
/*global Animation:false */
/*global Draw:false */
/*global Manager:false */
/*global Runner:false */
/*global Course:false */
/*global trackTransforms:false */
/*global getDistanceBetweenPoints:false */
/*global setTimeout:false */
var rg2 = ( function() {
    'use strict';
    var canvas = $("#rg2-map-canvas")[0];
    var ctx = canvas.getContext('2d');
    var map;
    var mapIntensity;
    var mapLoadingText;
    var overprintWidth;
    var routeWidth;
    var replayFontSize;
    var events;
    var courses;
    var results;
    var controls;
    var animation;
    var manager;
    var drawing;
    var infoPanelMaximised;
    var scaleFactor;
    var lastX;
    var lastY;
    var zoomSize;
    var dragStart;
    var dragged;
    var whichButton;
    var pinched;
    var pinchStart0;
    var pinchStart1;
    var pinchEnd0;
    var pinchEnd1;
    var requestedHash;
    var requestedEventID;
    var managing;

    // jQuery cache items
    var $rg2infopanel;
    var $rg2eventtitle;

    var config = {
      DEFAULT_SCALE_FACTOR : 1.1,
      TAB_EVENTS : 0,
      TAB_COURSES : 1,
      TAB_RESULTS : 2,
      TAB_DRAW : 3,
      TAB_LOGIN : 4,
      TAB_CREATE : 5,
      TAB_EDIT : 6,
      TAB_MAP : 7,
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
      WHITE : '#ffffff',
      BLACK : '#ffoooo',
      CONTROL_CIRCLE_RADIUS : 20,
      FINISH_INNER_RADIUS : 16.4,
      FINISH_OUTER_RADIUS : 23.4,
      RUNNER_DOT_RADIUS : 6,
      START_TRIANGLE_LENGTH : 30,
      DEFAULT_OVERPRINT_LINE_THICKNESS : 3,
      DEFAULT_ROUTE_THICKNESS : 4,
      DEFAULT_REPLAY_FONT_SIZE: 12,
      START_TRIANGLE_HEIGHT : 40,
      // parameters for call to draw courses
      DIM : 0.75,
      FULL_INTENSITY : 1.0,
      // values of event format
      NORMAL_EVENT : 1,
      EVENT_WITHOUT_RESULTS : 2,
      SCORE_EVENT : 3,
      // version gets set automatically by grunt file during build process
      RG2VERSION: '0.6.2',
      TIME_NOT_FOUND : 9999,
      SPLITS_NOT_FOUND : 9999,
      // values for evt.which 
      RIGHT_CLICK : 3
    };

    function init() {
      $("#rg2-container").hide();
      
      // cache jQuery things we use a lot
      $rg2infopanel = $("#rg2-info-panel");
      $rg2eventtitle = $("#rg2-event-title");
      
      $.ajaxSetup({ cache: false });

      if ($('#rg2-manage-login').length !== 0) {
        managing = true;
      } else {
        managing = false;
      }

      // check if a specific event has been requested
      requestedHash = window.location.hash;
      if ((requestedHash) && (!managing)) {
        requestedEventID = parseInt(requestedHash.replace("#", ""), 10);
      }

      $("#btn-save-route").button().button("disable");
      $("#btn-save-gps-route").button().button("disable");
      $("#btn-reset-drawing").button().button("disable");
      $("#btn-undo").button().button("disable");
      $("#btn-undo-gps-adjust").button().button("disable");
      $("#rg2-load-gps-file").button().button("disable");
      $("#btn-three-seconds").button().button("disable");

      // disable tabs until we have loaded something
      $rg2infopanel.tabs({
        disabled : [config.TAB_COURSES, config.TAB_RESULTS, config.TAB_DRAW],
        active : config.TAB_EVENTS,
        heightStyle : "content",
        activate : function(event, ui) {
          tabActivated();
        }
      });

      $("#rg2-result-list").accordion({
        collapsible : true,
        heightStyle : "content",
        select : function(event, ui) {
          console.log("Result index selected: " + ui.item[0].id);
        }
      });

      $("#rg2-clock").text("00:00:00");
      $("#rg2-clock-slider").slider({
        slide : function(event, ui) {
          // passes slider value as new time
          animation.clockSliderMoved(ui.value);
        }
      });

      $("#btn-mass-start").addClass('active');
      $("#btn-real-time").removeClass('active');

      map = new Image();
      mapIntensity = config.FULL_INTENSITY;
      overprintWidth = config.DEFAULT_OVERPRINT_LINE_THICKNESS;
      routeWidth = config.DEFAULT_ROUTE_THICKNESS;
      replayFontSize = config.DEFAULT_REPLAY_FONT_SIZE;
      events = new Events();
      courses = new Courses();
      results = new Results();
      controls = new Controls();
      animation = new Animation();
      drawing = new Draw();
      dragStart = null;
      // looks odd but this works for initialisation
      dragged = true;
      infoPanelMaximised = true;

      $("#rg2-header-container").css("color", header_text_colour);
      $("#rg2-header-container").css("background", header_colour);
      $("#rg2-about-dialog").hide();
      $("#rg2-splits-display").hide();
      $("#rg2-track-names").hide();
      $("#rg2-add-new-event").hide();

      $("#btn-about").click(function() {
        displayAboutDialog();
      });

      $("#btn-options").click(function() {
        displayOptionsDialog();
      });

      $("#rg2-resize-info").click(function() {
        resizeInfoDisplay();
      });

      $("#rg2-hide-info-panel-control").click(function() {
        resizeInfoDisplay();
      });

      $("#btn-mass-start").click(function(event) {
        animation.setReplayType(config.MASS_START_REPLAY);
      });

      $("#btn-real-time").click(function(event) {
        animation.setReplayType(config.REAL_TIME_REPLAY);
      });

      $("#rg2-control-select").prop('disabled', true).click(function(event) {
        animation.setStartControl($("#rg2-control-select").val());
      });

      $("#rg2-name-select").prop('disabled', true).click(function(event) {
        drawing.setName($("#rg2-name-select").val());
      });

      $("#rg2-course-select").click(function(event) {
        drawing.setCourse(parseInt($("#rg2-course-select").val(), 10));
      });

      $("#rg2-enter-name").click(function(event) {
        drawing.setNameAndTime();
      })
      .keyup(function(event) {
        drawing.setNameAndTime();
      });

      $('#rg2-new-comments').focus(function() {
        // Clear comment box if user focuses on it and it still contains default text
        var text = $("#rg2-new-comments").val();
        if (text === config.DEFAULT_NEW_COMMENT) {
          $('#rg2-new-comments').val("");
        }
      });
      
      $("#rg2-option-controls").hide();

      // set default to 100% = full intensity
      $("#spn-map-intensity").spinner({
        max : 100,
        min : 0,
        step: 10,
        numberFormat: "n",
        spin : function(event, ui) {
          mapIntensity = (ui.value / 100);
          redraw(false);
        }
      }).val(100);

      $("#spn-name-font-size").spinner({
        max : 20,
        min : 5,
        step: 1,
        numberFormat: "n",
        spin : function(event, ui) {
          replayFontSize = ui.value;
          redraw(false);
        }
      }).val(config.DEFAULT_REPLAY_FONT_SIZE);

      $("#spn-course-width").spinner({
        max : 10,
        min : 1,
        step: 0.5,
        spin : function(event, ui) {
          overprintWidth = ui.value;
          redraw(false);
        }
      }).val(config.DEFAULT_OVERPRINT_LINE_THICKNESS);

      $("#spn-route-width").spinner({
        max : 10,
        min : 1,
        step: 0.5,
        spin : function(event, ui) {
          routeWidth = ui.value;
          redraw(false);
        }
      }).val(config.DEFAULT_ROUTE_THICKNESS);
      
      $("#chk-show-three-seconds").prop('checked', false).click(function() {
        redraw(false);
      });
      
      $("#rg2-animation-controls").hide();

      $("#btn-save-route").button().click(function() {
        drawing.saveRoute();
      });

      $("#btn-save-gps-route").button().click(function() {
        drawing.saveGPSRoute();
      });

      $("#btn-move-all").prop('checked', false).click(function(evt) {
        drawing.toggleMoveAll(evt.target.checked);
      });

      $("#btn-undo").click(function() {
        drawing.undoLastPoint();
      });

      $("#btn-undo-gps-adjust").click(function() {
        drawing.undoGPSAdjust();
      });

      $("#btn-reset-drawing").click(function() {
        drawing.resetDrawing();
      });

      $("#btn-three-seconds").click(function() {
        drawing.waitThreeSeconds();
      });

      $("#rg2-load-gps-file").change(function(evt) {
        drawing.uploadGPS(evt);
      });

      $("#btn-zoom-in").click(function() {
        zoom(1);
      });

      $("#btn-reset").click(function() {
        resetMapState();
      });

      $("#btn-zoom-out").click(function() {
        zoom(-1);
      });

      $("#btn-start-stop").click(function() {
        animation.toggleAnimation();
      });

      $("#btn-faster").click(function() {
        animation.goFaster();
      });

      $("#btn-slower").click(function() {
        animation.goSlower();
      });

      $("#btn-toggle-names").click(function() {
        animation.toggleNameDisplay();
        redraw(false);
      }).hide();

      $("#btn-show-splits").click(function() {
        $("#rg2-splits-table")
        .empty()
        .append(animation.getSplitsTable())
        .dialog({
          width : 'auto',
          buttons : {
            Ok : function() {
              $(this).dialog('close');
            }
          }
        });
      });
      // enable once we have courses loaded
      $("#btn-show-splits").hide();

      // enable once we have courses loaded
      $("#btn-toggle-controls").click(function() {
        controls.toggleControlDisplay();
        redraw(false);
      }).hide();

      // set default to 0 secs = no tails
      $("#spn-tail-length").spinner({
        max : 600,
        min : 0,
        spin : function(event, ui) {
          animation.setTailLength(ui.value);
        }
      }).val(0);

      $("#btn-full-tails").prop('checked', false).click(function(event) {
        if (event.target.checked) {
          animation.setFullTails(true);
          $("#spn-tail-length").spinner("disable");
        } else {
          animation.setFullTails(false);
          $("#spn-tail-length").spinner("enable");
        }
      });

      if (managing) {
        manager = new Manager(keksi);
        $("#rg2-animation-controls").hide();
        $("#rg2-create-tab").hide();
        $("#rg2-edit-tab").hide();
        $("#rg2-map-tab").hide();
        $("#rg2-manage-login").show();
        $rg2infopanel.tabs("disable", config.TAB_EVENTS);
        $("#rg2-draw-tab").hide();
        $("#rg2-results-tab").hide();
        $("#rg2-courses-tab").hide();
        $("#rg2-events-tab").hide();
        $rg2infopanel.tabs("option", "active", config.TAB_LOGIN);
        mapLoadingText = "";
      } else {
        mapLoadingText = "Select an event";
      }
     
      canvas.addEventListener('touchstart', handleTouchStart, false);
      canvas.addEventListener('touchmove', handleTouchMove, false);
      canvas.addEventListener('touchend', handleTouchEnd, false);

      trackTransforms(ctx);
      resizeCanvas();

      window.addEventListener('resize', resizeCanvas, false);

      canvas.addEventListener('DOMMouseScroll', handleScroll, false);
      canvas.addEventListener('mousewheel', handleScroll, false);
      canvas.addEventListener('mousedown', handleMouseDown, false);
      canvas.addEventListener('mousemove', handleMouseMove, false);
      canvas.addEventListener('mouseup', handleMouseUp, false);

      // force redraw once map has loaded
      map.addEventListener("load", function() {
        mapLoadedCallback();
      }, false);

      // disable right click menu: may add our own later
      $(document).bind("contextmenu", function(evt) {
        evt.preventDefault();
      });

      // load event details
      loadEventList();

      // slight delay looks better than going straight in....
      setTimeout(function() {$("#rg2-container").show();}, 500);
    }
    
    function loadEventList() {
      $.getJSON(json_url, {
        type : "events",
        cache : false
      }).done(function(json) {
        console.log("Events: " + json.data.length);
        events.deleteAllEvents();
        $.each(json.data, function() {
          events.addEvent(new Event(this));
        });
        createEventMenu();
        if (managing) {
          manager.eventListLoaded();
        }
      }).fail(function(jqxhr, textStatus, error) {
        var err = textStatus + ", " + error;
        console.log("Events request failed: " + err);
      });
    }
 
    function mapLoadedCallback() {
      resetMapState();
      if (managing) {
        manager.mapLoadCallback();
      }
    }
 
    function resetMapState() {
      // place map in centre of canvas and scale it down to fit
      var mapscale;
      var heightscale = canvas.height / map.height;
      lastX = canvas.width / 2;
      lastY = canvas.height / 2;
      zoomSize = 1;
      dragStart = null;
      // looks odd but this works for initialisation
      dragged = true;
      // don't stretch map: just shrink to fit
      if (heightscale < 1) {
        mapscale = heightscale;
      } else {
        mapscale = 1;
      }
      // move map into view on small screens
      // avoid annoying jumps on larger screens
      if ((infoPanelMaximised) || (window.innerWidth >= config.BIG_SCREEN_BREAK_POINT)) {
        ctx.setTransform(mapscale, 0, 0, mapscale, $rg2infopanel.outerWidth(), 0);
      } else {
        ctx.setTransform(mapscale, 0, 0, mapscale, 0, 0);
      }
      ctx.save();
      redraw(false);
    }

    function resizeCanvas() {
      scaleFactor = config.DEFAULT_SCALE_FACTOR;
      var winwidth = window.innerWidth;
      var winheight = window.innerHeight;
      // allow for header
      $("#rg2-container").css("height", winheight - 36);
      canvas.width = winwidth;
      // allow for header
      canvas.height = winheight - 36;
      // set title bar
      if (window.innerWidth >= config.BIG_SCREEN_BREAK_POINT) {
        $rg2eventtitle.text(events.getActiveEventName() + " " + events.getActiveEventDate()).show();
      } else if (window.innerWidth > config.SMALL_SCREEN_BREAK_POINT) {
        $rg2eventtitle.text(events.getActiveEventName()).show();
      } else {
        $rg2eventtitle.hide();
      }
      resetMapState();
    }

    // called whenever the active tab changes to tidy up as necessary
    function tabActivated() {
      var active = $rg2infopanel.tabs("option", "active");
      switch (active) {
        case config.TAB_DRAW:
          courses.removeAllFromDisplay();
          drawing.showCourseInProgress();
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
      // fill canvas to erase things: clearRect doesn't work on Android (?) and leaves the old map as background when changing
      ctx.fillStyle = config.WHITE;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      // go back to where we started
      ctx.restore();
      // set transparency of map
      ctx.globalAlpha = mapIntensity;

      if (map.height > 0) {
        // using non-zero map height to show we have a map loaded
        ctx.drawImage(map, 0, 0);
        var active = $rg2infopanel.tabs("option", "active");
        if (active === config.TAB_DRAW) {
          courses.drawCourses(config.DIM);
          controls.drawControls();
          drawing.drawNewTrack();
        } else {
          if (active === config.TAB_CREATE) {
            manager.drawControls();
          } else {
            courses.drawCourses(config.FULL_INTENSITY);
            results.drawTracks();
            controls.drawControls();
            // parameter determines if animation time is updated or not
            if (fromTimer) {
              animation.runAnimation(true);
            } else {
              animation.runAnimation(false);
            }
          }
        }
      } else {
        ctx.font = '30pt Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = config.BLACK;
        ctx.fillText(mapLoadingText, canvas.width / 2, canvas.height / 2);
      }

    }

    function displayAboutDialog() {
      $("#rg2-version-info").empty().append("Version information: " + config.RG2VERSION);
      $("#rg2-about-dialog").dialog({
        //modal : true,
        minWidth : 400,
        buttons : {
          Ok : function() {
            $(this).dialog("close");
          }
        }
      });
    }

    function displayOptionsDialog() {
      $("#rg2-option-controls").dialog({
        //modal : true,
        minWidth : 400,
        buttons : {
          Ok : function() {
            $(this).dialog("close");
          }
        }
      });
    }

    function resizeInfoDisplay() {
      if (infoPanelMaximised) {
        infoPanelMaximised = false;
        $("#rg2-resize-info").prop("title", "Show info panel");
        $("#rg2-hide-info-panel-control").css("left", "0px");
        $("#rg2-hide-info-panel-icon").removeClass("fa-chevron-left").addClass("fa-chevron-right").prop("title", "Show info panel");
        $rg2infopanel.hide();
      } else {
        infoPanelMaximised = true;
        $("#rg2-resize-info").prop("title", "Hide info panel");
        $("#rg2-hide-info-panel-control").css("left", "366px");
        $("#rg2-hide-info-panel-icon").removeClass("fa-chevron-right").addClass("fa-chevron-left").prop("title", "Hide info panel");
        $rg2infopanel.show();
      }
      // move map around if necesssary
      resetMapState();
    }
    
    // homegrown touch handling: seems no worse than adding some other library in
    // pinch zoom is primitive but works
    var handleTouchStart = function(evt) {
      evt.preventDefault();
      if (evt.touches.length > 1) {
        pinchStart0 = ctx.transformedPoint(evt.touches[0].pageX, evt.touches[0].pageY);
        pinchStart1 = ctx.transformedPoint(evt.touches[1].pageX, evt.touches[1].pageY);
        pinched = true;
      }
      lastX = evt.touches[0].pageX;
      lastY = evt.touches[0].pageY;
      handleInputDown(evt);
    };
      
    var handleTouchMove = function(evt) {
      var oldDistance;
      var newDistance;
      if (evt.touches.length > 1) {
        if (!pinched) {
          // second touch seen during move
          pinchStart0 = ctx.transformedPoint(evt.touches[0].pageX, evt.touches[0].pageY);
          pinchStart1 = ctx.transformedPoint(evt.touches[1].pageX, evt.touches[1].pageY);
          pinched = true;
        }
      } else {
        pinched = false;
      }
      if (pinched && (evt.touches.length > 1)) {
        pinchEnd0 = ctx.transformedPoint(evt.touches[0].pageX, evt.touches[0].pageY);
        pinchEnd1 = ctx.transformedPoint(evt.touches[1].pageX, evt.touches[1].pageY);
        oldDistance = getDistanceBetweenPoints(pinchStart0.x, pinchStart0.y, pinchStart1.x, pinchStart1.y);
        newDistance = getDistanceBetweenPoints(pinchEnd0.x, pinchEnd0.y, pinchEnd1.x, pinchEnd1.y);
        if ((oldDistance / newDistance) > 1.1) {
          zoom(-1);
          pinchStart0 = pinchEnd0;
          pinchStart1 = pinchEnd1;
        } else if ((oldDistance / newDistance) < 0.9) {
          zoom(1);
          pinchStart0 = pinchEnd0;
          pinchStart1 = pinchEnd1;
        }
      } else {
        lastX = evt.touches[0].pageX;
        lastY = evt.touches[0].pageY;
        handleInputMove(evt);
      }
    };

    var handleTouchEnd = function(evt) {
      handleInputUp(evt);
      pinched = false;
    };

    var zoom = function(zoomDirection) {
      var factor = Math.pow(scaleFactor, zoomDirection);
      var tempZoom = zoomSize * factor;
      // limit zoom to avoid things disappearing
      // chosen values seem reasonable after some quick tests
      if ((tempZoom < 50) && (tempZoom > 0.05)) {
        zoomSize = tempZoom;
        var pt = ctx.transformedPoint(lastX, lastY);
        ctx.translate(pt.x, pt.y);
        ctx.scale(factor, factor);
        ctx.translate(-pt.x, -pt.y);
        ctx.save();
        redraw(false);
      }
      //console.log("Zoom size " + zoomSize);      
    };

    var handleScroll = function(evt) {
      var delta = evt.wheelDelta ? evt.wheelDelta / 40 : evt.detail ? -evt.detail : 0;
      if (delta) {
        zoom(delta);
      }
      evt.stopPropagation();
      return evt.preventDefault() && false;
    };

    var handleMouseDown = function(evt) {
      lastX = evt.offsetX || (evt.layerX - canvas.offsetLeft);
      lastY = evt.offsetY || (evt.layerY - canvas.offsetTop);
      handleInputDown(evt);
      evt.stopPropagation();
      return evt.preventDefault() && false;
    };


    var handleMouseMove = function(evt) {
      lastX = evt.offsetX || (evt.layerX - canvas.offsetLeft);
      lastY = evt.offsetY || (evt.layerY - canvas.offsetTop);
      handleInputMove(evt);
      evt.stopPropagation();
      return evt.preventDefault() && false;
    };

    var handleMouseUp = function(evt) {
      handleInputUp(evt);
      evt.stopPropagation();
      return evt.preventDefault() && false;
    };

    var handleInputDown = function(evt) {
      dragStart = ctx.transformedPoint(lastX, lastY);
      dragged = false;
      // need to cache this here since IE and FF don't set it for mousemove events
      whichButton = evt.which;
      //console.log ("InputDown " + lastX + " " + lastY + " " + dragStart.x + " " + dragStart.y);
    };
    
    var handleInputMove = function(evt) {
      if (dragStart) {
        var pt = ctx.transformedPoint(lastX, lastY);
        //console.log ("Mousemove after" + pt.x + ": " + pt.y);
        // allow for Webkit which gives us mousemove events with no movement!
        // Math.floor is a lot quicker than parseInt, plus it removes some of the small moves since you need to move at least a pixel
        if ((Math.floor(pt.x) !== Math.floor(dragStart.x)) || (Math.floor(pt.y) !== Math.floor(dragStart.y))) {
          // but use Math.round here to get that extra 0.5 pixel accuracy!
          if (drawing.gpsFileLoaded()) {
            drawing.adjustTrack(Math.round(dragStart.x), Math.round(dragStart.y), Math.round(pt.x), Math.round(pt.y), whichButton ,evt.shiftKey, evt.ctrlKey);
          } else {
            if ($rg2infopanel.tabs("option", "active") === config.TAB_CREATE) {
              manager.adjustControls(Math.round(dragStart.x), Math.round(dragStart.y), Math.round(pt.x), Math.round(pt.y), whichButton, evt.shiftKey, evt.ctrlKey);
            } else {
              ctx.translate(pt.x - dragStart.x, pt.y - dragStart.y);
            }
          }
          dragged = true;
          redraw(false);
        }
      }
    };
    
    var handleInputUp = function(evt) {
      var active = $rg2infopanel.tabs("option", "active");
      if (!dragged) {
        if (active === config.TAB_CREATE) {
          manager.mouseUp(Math.round(dragStart.x), Math.round(dragStart.y));
        } else {
          // pass button that was clicked
          drawing.mouseUp(Math.round(dragStart.x), Math.round(dragStart.y), evt.which);
        }
      } else {
        if (active === config.TAB_CREATE) {
          manager.dragEnded();
        } else {
          drawing.dragEnded();
        }
      }
      dragStart = null;
      redraw(false);
    };

    function createEventMenu() {
      //loads menu from populated events array
      var html = events.formatEventsAsMenu();
      $("#rg2-event-list").append(html).menu({
        select : function(event, ui) {
          loadEvent(ui.item[0].id);
        }
      });

      // load requested event if set
      // input is kartat ID so need to find internal ID first
      if (requestedEventID) {
        var eventID = events.getEventIDForKartatID(requestedEventID);
        if (eventID !== undefined) {
          loadEvent(eventID);
        }
      }
    }

    function loadEvent(eventid) {
      // new event selected: show we are waiting
      $('body').css('cursor', 'wait');
      courses.deleteAllCourses();
      controls.deleteAllControls();
      animation.resetAnimation();
      results.deleteAllResults();
      events.setActiveEventID(eventid);
      drawing.initialiseDrawing(events.hasResults(eventid));
      loadNewMap(maps_url + "/" + events.getActiveMapID() + '.jpg');
      redraw(false);

      // set title bar
      if (window.innerWidth >= config.BIG_SCREEN_BREAK_POINT) {
        $rg2eventtitle.text(events.getActiveEventName() + " " + events.getActiveEventDate()).show();
      } else if (window.innerWidth > config.SMALL_SCREEN_BREAK_POINT) {
        $rg2eventtitle.text(events.getActiveEventName()).show();
      } else {
        $rg2eventtitle.hide();
      }
      // get courses for event
      $.getJSON(json_url, {
        id : events.getKartatEventID(),
        type : "courses",
        cache : false
      }).done(function(json) {
        console.log("Courses: " + json.data.length);
        $.each(json.data, function() {
          courses.addCourse(new Course(this, events.isScoreEvent()));
        });
        courses.updateCourseDropdown();
        courses.generateControlList(controls);
        $("#btn-toggle-controls").show();
        $("#btn-toggle-names").show();
        getResults();
      }).fail(function(jqxhr, textStatus, error) {
        $('body').css('cursor', 'auto');
        var err = textStatus + ", " + error;
        console.log("Courses request failed: " + err);
      });

    }

    function loadNewMap(mapFile) {
      mapLoadingText = "Map loading...";
      map.src = mapFile;
    }

    function getResults() {
      $.getJSON(json_url, {
        id : events.getKartatEventID(),
        type : "results",
        cache : false
      }).done(function(json) {
        console.log("Results: " + json.data.length);
        var isScoreEvent = events.isScoreEvent();
        results.addResults(json.data, isScoreEvent);
        $("#rg2-result-list").accordion("refresh");
        getGPSTracks();
      }).fail(function(jqxhr, textStatus, error) {
        $('body').css('cursor', 'auto');
        var err = textStatus + ", " + error;
        console.log("Results request failed: " + err);
      });
    }

    function getGPSTracks() {
      $.getJSON(json_url, {
        id : events.getKartatEventID(),
        type : "tracks",
        cache : false
      }).done(function(json) {
        console.log("Tracks: " + json.data.length);
        results.addTracks(json.data);
        createCourseMenu();
        createResultMenu();
        animation.updateAnimationDetails();
        $('body').css('cursor', 'auto');
        if (managing) {
          manager.eventFinishedLoading();
        } else {
          $rg2infopanel.tabs("enable", config.TAB_COURSES);
          $rg2infopanel.tabs("enable", config.TAB_RESULTS);
          $rg2infopanel.tabs("enable", config.TAB_DRAW);
          // open courses tab for new event: else stay on draw tab
          var active = $rg2infopanel.tabs("option", "active");
          // don't change tab if we have come from DRAW since it means
          // we have just relaoded following a save
          if (active !== config.TAB_DRAW) {
            $rg2infopanel.tabs("option", "active", config.TAB_COURSES);
          }
          $rg2infopanel.tabs("refresh");
          $("#btn-show-splits").show();
        }
        redraw(false);
      }).fail(function(jqxhr, textStatus, error) {
        $('body').css('cursor', 'auto');
        var err = textStatus + ", " + error;
        console.log("Tracks request failed: " + err);
      });
    }

    function createCourseMenu() {
      //loads menu from populated courses array
      $("#rg2-course-table").empty().append(courses.formatCoursesAsTable());

      // checkbox on course tab to show a course
      $(".courselist").click(function(event) {
        if (event.target.checked) {
          courses.putOnDisplay(parseInt(event.currentTarget.id, 10));
        } else {
          courses.removeFromDisplay(parseInt(event.currentTarget.id, 10));
          // make sure the all checkbox is not checked
          $(".allcourses").prop('checked', false);
        }
        redraw(false);
      });
      // checkbox on course tab to show all courses
      $(".allcourses").click(function(event) {
        if (event.target.checked) {
          courses.putAllOnDisplay();
          // select all the individual checkboxes for each course
          $(".courselist").prop('checked', true);
        } else {
          courses.removeAllFromDisplay();
          $(".courselist").prop('checked', false);
        }
        redraw(false);
      });
      // checkbox on course tab to show tracks for one course
      $(".tracklist").click(function(event) {
        var courseid = event.target.id;
        if (event.target.checked) {
          results.putTracksOnDisplay(courseid);
        } else {
          results.removeTracksFromDisplay(courseid);
          // make sure the all checkbox is not checked
          $(".alltracks").prop('checked', false);
        }
        redraw(false);
      });
      // checkbox on course tab to show all tracks
      $(".alltracks").click(function(event) {
        if (event.target.checked) {
          results.putAllTracksOnDisplay();
          // select all the individual checkboxes for each course
          $(".tracklist").prop('checked', true);
        } else {
          results.removeAllTracksFromDisplay();
          // deselect all the individual checkboxes for each course
          $(".tracklist").prop('checked', false);
        }
        redraw(false);
      });
    }

    function createResultMenu() {
      //loads menu from populated result array
      var html = results.formatResultListAsAccordion();
      // checkbox on course tab to show a course
      $(".courselist").unbind('click').click(function(event) {
        if (event.target.checked) {
          courses.putOnDisplay(parseInt(event.currentTarget.id, 10));
        } else {
          courses.removeFromDisplay(parseInt(event.currentTarget.id, 10));
          // make sure the all checkbox is not checked
          $(".allcourses").prop('checked', false);
        }
        redraw();

      });
      $("#rg2-result-list").empty().append(html);

      $("#rg2-result-list").accordion("refresh");

      $rg2infopanel.tabs("refresh");

      // checkbox to show a course
      $(".showcourse").click(function(event) {
        //Prevent opening accordion when check box is clicked
        event.stopPropagation();
        if (event.target.checked) {
          courses.putOnDisplay(event.target.id);
        } else {
          courses.removeFromDisplay(event.target.id);
        }
        redraw(false);
      });
      // checkbox to show a result
      $(".showtrack").click(function(event) {
        if (event.target.checked) {
          results.putOneTrackOnDisplay(event.target.id);
        } else {
          results.removeOneTrackFromDisplay(event.target.id);
        }
        redraw(false);
      });
      // checkbox to animate a result
      $(".replay").click(function(event) {
        if (event.target.checked) {
          animation.addRunner(new Runner(event.target.id));
        } else {
          animation.removeRunner(event.target.id);
        }
        redraw(false);
      });
      // disable control dropdown if we have no controls
      if (courses.getHighestControlNumber() === 0) {
        $("#rg2-control-select").prop('disabled', true);
      } else {
        $("#rg2-control-select").prop('disabled', false);
      }
    }

    // Allow functions on collections to be called.
    // Not a great fix and probably better to rewrite things to avoid
    // this as far as possible but works for now.
    function getCourseDetails(courseid) {
      return courses.getFullCourse(courseid);
    }

    function getCourseName(courseid) {
      return courses.getCourseName(courseid);
    }

    function getResultsByCourseID(courseid) {
      return results.getResultsByCourseID(courseid);
    }

    function getTotalResults() {
      return results.getTotalResults();
    }

    function drawStart(x, y, text, angle) {
      return controls.drawStart(x, y, text, angle);
    }

    function drawSingleControl(x, y, i) {
      return controls.drawSingleControl(x, y, i);
    }

    function drawFinish(x, y, text) {
      return controls.drawFinish(x, y, text);
    }

    function getFullResult(resultid) {
      return results.getFullResult(resultid);
    }

    function getHighestControlNumber() {
      return courses.getHighestControlNumber();
    }

    function getKartatEventID(courseid) {
      return events.getKartatEventID(courseid);
    }
    
    function eventHasResults() {
      return events.hasResults();
    }

    function incrementTracksCount(courseid) {
      return courses.incrementTracksCount(courseid);
    }

    function putOnDisplay(courseid) {
      courses.putOnDisplay(courseid);
    }

    function removeFromDisplay(courseid) {
      courses.removeFromDisplay(courseid);
    }

    function createNameDropdown(courseid) {
      results.createNameDropdown(courseid);
    }

    function getRunnerName(resultid) {
      return results.getRunnerName(resultid);
    }

    function resultIDExists(resultid) {
      return results.resultIDExists(resultid);
    }

    function getKartatResultID(resultid) {
      return results.getKartatResultID(resultid);
    }

    function getTimeForID(resultid) {
      return results.getTimeForID(resultid);
    }

    function getSplitsForID(resultid) {
      return results.getSplitsForID(resultid);
    }

    function mapIsGeoreferenced() {
      return events.mapIsGeoreferenced();
    }

    function getMapSize() {
      var size = {};
      size.height = map.height;
      size.width = map.width;
      return size;
    }

    function getWorldFile() {
      return events.getWorldFile();
    }

    function getControlX() {
      return drawing.getControlX();
    }

    function getControlY() {
      return drawing.getControlY();
    }

    function getActiveEventID() {
      return events.getActiveEventID();
    }

    function createEventEditDropdown() {
      events.createEventEditDropdown();
    }
    
    function getOverprintWidth() {
      return overprintWidth;
    }

    function getRouteWidth() {
      return routeWidth;
    }

    function getReplayFontSize() {
      return replayFontSize;
    }
    
    function showThreeSeconds() {
     return $("#chk-show-three-seconds").prop('checked');
    }

    function getEventInfo(id) {
      return events.getEventInfo(id);
    }
    
    function getCoursesForEvent(id) {
      return courses.getCoursesForEvent();
    }

    function getRoutesForEvent() {
      return results.getRoutesForEvent();
    }
        
    return {
      // functions and variables available elsewhere
      init : init,
      config : config,
      redraw : redraw,
      getOverprintWidth: getOverprintWidth,
      getRouteWidth: getRouteWidth,
      getReplayFontSize: getReplayFontSize,
      ctx : ctx,
      getMapSize : getMapSize,
      loadNewMap : loadNewMap,
      loadEvent : loadEvent,
      loadEventList: loadEventList,
      eventHasResults: eventHasResults,
      mapIsGeoreferenced : mapIsGeoreferenced,
      getWorldFile : getWorldFile,
      getFullResult : getFullResult,
      drawStart : drawStart,
      drawSingleControl : drawSingleControl,
      drawFinish : drawFinish,
      getTimeForID : getTimeForID,
      getSplitsForID : getSplitsForID,
      resultIDExists : resultIDExists,
      getRunnerName : getRunnerName,
      putOnDisplay : putOnDisplay,
      removeFromDisplay : removeFromDisplay,
      createNameDropdown : createNameDropdown,
      incrementTracksCount : incrementTracksCount,
      getKartatEventID : getKartatEventID,
      getKartatResultID : getKartatResultID,
      getActiveEventID : getActiveEventID,
      getHighestControlNumber : getHighestControlNumber,
      getCourseDetails : getCourseDetails,
      getCourseName : getCourseName,
      getResultsByCourseID : getResultsByCourseID,
      getTotalResults : getTotalResults,
      getControlX : getControlX,
      getControlY : getControlY,
      createEventEditDropdown : createEventEditDropdown,
      showThreeSeconds: showThreeSeconds,
      getEventInfo: getEventInfo,
      getCoursesForEvent: getCoursesForEvent,
      getRoutesForEvent: getRoutesForEvent
    };

  }());

$(document).ready(rg2.init);

/*global rg2:false */
/*global formatSecsAsMMSS:false */
/*global clearInterval:false */
/*global setInterval:false */
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

	resetAnimation : function() {
		this.runners.length = 0;
		clearInterval(this.timer);
		this.timer = null;
		this.updateAnimationDetails();
		$("#btn-start-stop").removeClass("fa-pause").addClass("fa-play");
		$("#btn-start-stop").prop("title", "Run");
	},

	addRunner : function(runner) {
		this.runners.push(runner);
		this.updateAnimationDetails();
	},

	updateAnimationDetails : function() {
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
	clockSliderMoved : function(time) {
		this.resetAnimationTime(time);
		rg2.redraw(false);
	},

	getAnimationNames : function() {
		var html = "";
		if (this.runners.length < 1) {
			return html;
		}
		for (var i = 0; i < this.runners.length; i += 1) {
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
		for ( i = 0; i < this.runners.length; i += 1) {
			if (this.runners[i].splits.length > maxControls) {
				maxControls = this.runners[i].splits.length;
			}
		}
		// allow for start and finish
		maxControls -= 2;

		html = "<table class='splitstable'><tr><th>Course</th><th>Name</th>";
		for ( i = 1; i <= maxControls; i += 1) {
			html += "<th>" + i + "</th>";
		}
		html += "<th>F</th></tr>";
		for ( i = 0; i < this.runners.length; i += 1) {
			run = this.runners[i];
			prevControlSecs = 0;
			html += "<tr class='splitsname-row'><td>" + run.coursename + "</td><td>" + run.name + "</td>";
			for ( j = 1; j < run.splits.length; j += 1) {
				html += "<td>" + formatSecsAsMMSS(run.splits[j]) + "</td>";
				legSplit[j] = run.splits[j] - prevControlSecs;
				prevControlSecs = run.splits[j];
			}
			html += "</tr><tr class='splitstime-row'><td></td><td></td>";
			for ( j = 1; j < run.splits.length; j += 1) {
				html += "<td>" + formatSecsAsMMSS(legSplit[j]) + "</td>";
			}
			html += "</tr><tr class='splitsdistance-row'><td></td><td>pixels</td>";
			for ( j = 1; j < run.splits.length; j += 1) {
				html += "<td>" + run.legTrackDistance[j] + "</td>";
			}

		}
		html += "</tr></table>";
		return html;
	},

	removeRunner : function(runnerid) {
		for (var i = 0; i < this.runners.length; i += 1) {
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
			$("#btn-start-stop").removeClass("fa-play").addClass("fa-pause");
			$("#btn-start-stop").prop("title", "Pause");
		} else {
			this.stopAnimation();
			$("#btn-start-stop").removeClass("fa-pause").addClass("fa-play");
			$("#btn-start-stop").prop("title", "Run");
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
		for (var i = 0; i < this.runners.length; i += 1) {
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
		rg2.redraw(true);
	},

	setFullTails : function(fullTails) {
		if (fullTails) {
			this.useFullTails = true;
		} else {
			this.useFullTails = false;
		}
		rg2.redraw(false);
	},

	setTailLength : function(minutes) {
		this.tailLength = 60 * minutes;
		rg2.redraw(false);
	},

	setStartControl : function(control) {
		var i;
		this.massStartControl = parseInt(control, 10);
		if (this.massStartControl === rg2.config.MASS_START_BY_CONTROL) {
			this.massStartControl = 0;
			this.massStartByControl = true;
			// get split time at control 1
			for ( i = 0; i < this.runners.length; i += 1) {
				this.runners[i].nextStopTime = this.runners[i].splits[1];
			}
		} else {
			this.massStartByControl = false;
			for ( i = 0; i < this.runners.length; i += 1) {
				this.runners[i].nextStopTime = rg2.config.VERY_HIGH_TIME_IN_SECS;
			}
		}
		this.resetAnimationTime(0);
	},

	setReplayType : function(type) {
		if (type === rg2.config.MASS_START_REPLAY) {
			this.realTime = false;
			$("#btn-mass-start").addClass('active');
			$("#btn-real-time").removeClass('active');
			if (rg2.getHighestControlNumber() > 0) {
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

	toggleNameDisplay : function() {
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
    $("#btn-toggle-names").prop("title", title);
	},

	runAnimation : function(fromTimer) {
    var text;
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
		$("#rg2-clock-slider").slider("value", this.animationSecs);
		$("#rg2-clock").text(this.formatSecsAsHHMMSS(this.animationSecs));
		rg2.ctx.lineWidth = rg2.getRouteWidth();
		rg2.ctx.globalAlpha = 1.0;
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

		for ( i = 0; i < this.runners.length; i += 1) {
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
			rg2.ctx.beginPath();
			rg2.ctx.moveTo(runner.x[tailStartTimeSecs - timeOffset], runner.y[tailStartTimeSecs - timeOffset]);

			// t runs as real time seconds or 0-based seconds depending on this.realTime
			//runner.x[] is always indexed in 0-based time so needs to be adjusted for starttime offset
			for ( t = tailStartTimeSecs; t <= this.animationSecs; t += 1) {
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
				rg2.ctx.font = rg2.getReplayFontSize() + 'pt Arial';
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
	checkForStopControl : function(currentTime) {
		var allAtControl = true;
		var i;
		var legTime;
		// work out if everybody has got to the next control
		for ( i = 0; i < this.runners.length; i += 1) {
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
			for ( i = 0; i < this.runners.length; i += 1) {
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
	}
};
/*global rg2:false */
function Controls() {
	this.controls = [];
	this.displayControls = false;
}

Controls.prototype = {
	Constructor : Controls,

	addControl : function(code, x, y) {
		var newCode = true;
		for (var i = 0; i < this.controls.length; i += 1) {
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
			var i;
			var l;
			rg2.ctx.lineWidth = rg2.getOverprintWidth();
			rg2.ctx.strokeStyle = rg2.config.PURPLE;
			rg2.ctx.font = '20pt Arial';
			rg2.ctx.fillStyle = rg2.config.PURPLE;
			rg2.ctx.globalAlpha = 1.0;
			l = this.controls.length;
			for (i = 0; i < l; i += 1) {
				// Assume things starting with 'F' are a Finish
				if (this.controls[i].code.indexOf('F') === 0) {
					this.drawFinish(this.controls[i].x, this.controls[i].y, this.controls[i].code);
				} else {
					// Assume things starting with 'S' are a Start
					if (this.controls[i].code.indexOf('S') === 0) {
						this.drawStart(this.controls[i].x, this.controls[i].y, this.controls[i].code, (6 * Math.PI / 4));
					} else {
						// Else it's a normal control
						this.drawSingleControl(this.controls[i].x, this.controls[i].y, this.controls[i].code);

					}
				}
			}
		}
	},
	drawSingleControl : function(x, y, code) {
		//Draw the white halo around the controls
		rg2.ctx.beginPath();
		rg2.ctx.strokeStyle = "white";
		rg2.ctx.lineWidth = rg2.getOverprintWidth() + 2;
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
		rg2.ctx.strokeText(code, x + 25, y + 20);
		//Draw the purple control
		rg2.ctx.beginPath();
		rg2.ctx.font = "20pt Arial";
		rg2.ctx.fillStyle = rg2.config.PURPLE;
		rg2.ctx.strokeStyle = rg2.config.PURPLE;
		rg2.ctx.lineWidth = rg2.getOverprintWidth();
		rg2.ctx.arc(x, y, 20, 0, 2 * Math.PI, false);
		rg2.ctx.fillText(code, x + 25, y + 20);
		rg2.ctx.stroke();
	},
	drawFinish : function(x, y, code) {
		//Draw the white halo around the finish control
		rg2.ctx.strokeStyle = "white";
		rg2.ctx.lineWidth = rg2.getOverprintWidth() + 2;
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
		rg2.ctx.strokeText(code, x + 30, y + 20);
		rg2.ctx.stroke();
		//Draw the purple finish control
		rg2.ctx.beginPath();
		rg2.ctx.fillStyle = rg2.config.PURPLE;
		rg2.ctx.strokeStyle = rg2.config.PURPLE;
		rg2.ctx.lineWidth = rg2.getOverprintWidth();
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
		var DEGREES_120 = (2 * Math.PI / 3);
		angle = angle + (Math.PI / 2);
		rg2.ctx.lineCap = 'round';
		rg2.ctx.strokeStyle = "white";
		rg2.ctx.lineWidth = rg2.getOverprintWidth() + 2;
		rg2.ctx.beginPath();
		x[0] = startx + (rg2.config.START_TRIANGLE_LENGTH * Math.sin(angle));
		y[0] = starty - (rg2.config.START_TRIANGLE_LENGTH * Math.cos(angle));
		rg2.ctx.moveTo(x[0], y[0]);
		x[1] = startx + (rg2.config.START_TRIANGLE_LENGTH * Math.sin(angle + DEGREES_120));
		y[1] = starty - (rg2.config.START_TRIANGLE_LENGTH * Math.cos(angle + DEGREES_120));
		rg2.ctx.lineTo(x[1], y[1]);
		rg2.ctx.stroke();
		rg2.ctx.beginPath();
		rg2.ctx.moveTo(x[1], y[1]);
		x[2] = startx + (rg2.config.START_TRIANGLE_LENGTH * Math.sin(angle - DEGREES_120));
		y[2] = starty - (rg2.config.START_TRIANGLE_LENGTH * Math.cos(angle - DEGREES_120));
		rg2.ctx.lineTo(x[2], y[2]);
		rg2.ctx.stroke();
		rg2.ctx.beginPath();
		rg2.ctx.moveTo(x[2], y[2]);
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
		rg2.ctx.lineWidth = rg2.getOverprintWidth();
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
		rg2.ctx.moveTo(x[2], y[2]);
		rg2.ctx.lineTo(x[0], y[0]);
		rg2.ctx.fillText(code, x[0] + 25, y[0] + 25);
		rg2.ctx.stroke();
	},
	toggleControlDisplay : function() {
		if (this.displayControls) {
			$("#btn-toggle-controls").removeClass("fa-ban").addClass("fa-circle-o");
			$("#btn-toggle-controls").prop("title", "Show all controls map");
		} else {
			$("#btn-toggle-controls").removeClass("fa-circle-o").addClass("fa-ban");
			$("#btn-toggle-controls").prop("title", "Hide all controls map");
		}
		this.displayControls = !this.displayControls;
	},
	
	displayAllControls: function() {
    this.displayControls = true;
	}
};

function Control(code, x, y) {
	this.code = code;
	this.x = x;
	this.y = y;
}

Control.prototype = {
	Constructor : Control
};
/*global rg2:false */
/*global getAngle:false */
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

	getCoursesForEvent : function() {
    var courses = [];
    var course;
    for (var i = 0; i < this.courses.length; i += 1) {
      if (this.courses[i] !== undefined) {
        course = {};
        course.id = this.courses[i].courseid;
        course.name = this.courses[i].name;
        courses.push(course);
      }
    }
    return courses;
  },
  
	getHighestControlNumber : function() {
		return this.highestControlNumber;
	},

	getFullCourse : function(courseid) {
		return this.courses[courseid];
	},

	incrementTracksCount : function(courseid) {
		this.courses[courseid].incrementTracksCount();
		this.totaltracks += 1;
	},

	gettrackcountCount : function(courseid) {
		return this.courses[courseid].trackcount;
	},

	getTotalTracksCount : function() {
		return this.totaltracks;
	},

	addCourse : function(courseObject) {
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

	updateCourseDropdown : function() {
		$("#rg2-course-select").empty();
		var i;
		var dropdown = document.getElementById("rg2-course-select");
		var opt = document.createElement("option");
		opt.value = null;
		opt.text = "Select course";
		dropdown.options.add(opt);

		for (i = 0; i < this.courses.length; i += 1) {
			if (this.courses[i] !== undefined) {
				opt = document.createElement("option");
				opt.value = i;
				opt.text = this.courses[i].name;
				dropdown.options.add(opt);
			}
		}
		//dropdown.options.add(opt);
	},

	updateControlDropdown : function() {
		$("#rg2-control-select").empty();
		var dropdown = document.getElementById("rg2-control-select");
		var opt;
		var i;
		for (i = 0; i < this.highestControlNumber; i += 1) {
			opt = document.createElement("option");
			opt.value = i;
			if (i === 0) {
				opt.text = "S";
			} else {
				opt.text = i;
			}
			dropdown.options.add(opt);
		}
		opt = document.createElement("option");
		opt.value = rg2.config.MASS_START_BY_CONTROL;
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
		for (var i = 0; i < this.courses.length; i += 1) {
			if (this.courses[i] !== undefined) {
				this.courses[i].drawCourse(intensity);
			}
		}
	},

	putOnDisplay : function(courseid) {
		if (this.courses[courseid] !== undefined) {
			this.courses[courseid].display = true;
		}
	},

	putAllOnDisplay : function() {
		for (var i = 0; i < this.courses.length; i += 1) {
			if (this.courses[i] !== undefined) {
				this.courses[i].display = true;
			}
		}
	},

	removeAllFromDisplay : function() {
		for (var i = 0; i < this.courses.length; i += 1) {
			if (this.courses[i] !== undefined) {
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
	generateControlList : function(controls) {
		var codes;
		var x;
		var y;
		// for all courses
		for (var i = 0; i < this.courses.length; i += 1) {
			if (this.courses[i] !== undefined) {
				codes = this.courses[i].codes;
				x = this.courses[i].x;
				y = this.courses[i].y;
				// for all controls on course
				if (codes !== undefined) {
					for (var j = 0; j < codes.length; j += 1) {
						controls.addControl(codes[j], x[j], y[j]);
					}
				}
			}
		}
	},

	formatCoursesAsTable : function() {
		var html = "<table class='coursemenutable'><tr><th>Course</th><th>Show</th><th>Runners</th><th>Tracks</th><th>Show</th></tr>";
		for (var i = 0; i < this.courses.length; i += 1) {
			if (this.courses[i] !== undefined) {
				html += "<tr><td>" + this.courses[i].name + "</td>";
				html += "<td><input class='courselist' id=" + i + " type=checkbox name=course></input></td>";
				html += "<td>" + rg2.getResultsByCourseID(i) + "</td>";
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
		html += "<td>" + rg2.getTotalResults() + "</td>";
		if (this.totaltracks > 0) {
			html += "<td>" + this.totaltracks + "</td><td><input id=" + i + " class='alltracks' type=checkbox name=track></input></td>";
		} else {
			html += "<td>" + this.totaltracks + "</td><td></td>";
		}
		html += "</tr></table>";
		return html;
	}
};

function Course(data, isScoreCourse) {
	this.name = data.name;
	this.trackcount = 0;
	this.display = false;
	this.courseid = data.courseid;
	this.codes = data.codes;
	this.x = data.xpos;
	this.y = data.ypos;
	this.isScoreCourse = isScoreCourse;
}

Course.prototype = {
	Constructor : Course,

	incrementTracksCount : function() {
		this.trackcount += 1;
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
			rg2.ctx.globalAlpha = intensity;
			rg2.ctx.lineWidth = rg2.getOverprintWidth();
			rg2.ctx.strokeStyle = rg2.config.PURPLE;
			if (this.isScoreCourse) {
				// align score event start triangle upwards
				angle = Math.PI * 3 / 2;
			} else {
				angle = getAngle(this.x[0], this.y[0], this.x[1], this.y[1]);
			}
			rg2.drawStart(this.x[0], this.y[0], "", angle);
			for ( i = 0; i < (this.x.length - 1); i += 1) {
				angle = getAngle(this.x[i], this.y[i], this.x[i + 1], this.y[i + 1]);
				if (i === 0) {
					c1x = this.x[i] + (rg2.config.START_TRIANGLE_LENGTH * Math.cos(angle));
					c1y = this.y[i] + (rg2.config.START_TRIANGLE_LENGTH * Math.sin(angle));
				} else {
					c1x = this.x[i] + (rg2.config.CONTROL_CIRCLE_RADIUS * Math.cos(angle));
					c1y = this.y[i] + (rg2.config.CONTROL_CIRCLE_RADIUS * Math.sin(angle));
				}
				//Assume the last control in the array is a finish
				if (i === this.x.length - 2) {
					c2x = this.x[i + 1] - (rg2.config.FINISH_OUTER_RADIUS * Math.cos(angle));
					c2y = this.y[i + 1] - (rg2.config.FINISH_OUTER_RADIUS * Math.sin(angle));
				} else {
					c2x = this.x[i + 1] - (rg2.config.CONTROL_CIRCLE_RADIUS * Math.cos(angle));
					c2y = this.y[i + 1] - (rg2.config.CONTROL_CIRCLE_RADIUS * Math.sin(angle));
				}
				// don't join up controls for score events
				if (!this.isScoreCourse) {
					rg2.ctx.beginPath();
					rg2.ctx.moveTo(c1x, c1y);
					rg2.ctx.lineTo(c2x, c2y);
					rg2.ctx.stroke();
				}

			}
			for (var i = 1; i < (this.x.length - 1); i += 1) {
				rg2.drawSingleControl(this.x[i], this.y[i], i);
			}
			rg2.drawFinish(this.x[this.x.length - 1], this.y[this.y.length - 1], "");
		}
	}
};
/*global rg2:false */
/*global GPSTrack:false */
/*global getAngle:false */
/*global formatSecsAsMMSS:false */
/*global getSecsFromMMSS:false */
/*global rg2WarningDialog:false */
/*global json_url:false */
/*global getDistanceBetweenPoints:false */
// handle drawing of a new route
function Draw() {
  this.trackColor = '#ff0000';
  this.HANDLE_DOT_RADIUS = 7;
  this.CLOSE_ENOUGH = 10;
  this.hasResults = false;
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
  this.totaltime = 0;
}

Draw.prototype = {
  Constructor : Draw,

  gpsFileLoaded : function() {
    return this.gpstrack.fileLoaded;
  },

  uploadGPS : function(evt) {
    this.gpstrack.uploadGPS(evt);
  },

  getControlX : function() {
    return this.controlx;
  },

  getControlY : function() {
    return this.controly;
  },

  mouseUp : function(x, y, button) {
    // called after a click at (x, y)
    var active = $("#rg2-info-panel").tabs("option", "active");
    var i;
    var trk;
    var len;
    var delta = 3;
    var h = {};
    var handle;
    if (active !== rg2.config.TAB_DRAW) {
      return;
    }
    trk = this.gpstrack;
    if (trk.fileLoaded) {
      handle = this.getHandleClicked(x, y);
      if (handle !== undefined) {
        if ((button === rg2.config.RIGHT_CLICK) &&  (handle !== 0) && (handle !== trk.handles.length)) {
          // delete handle if not first or last entries
          trk.handles.splice(handle, 1);
        } else {
          // clicked in a handle area so toggle state
          if (trk.handles[handle].locked) {
            trk.handles[handle].locked = false;
            this.pointsLocked -= 1;
          } else {
            trk.handles[handle].locked = true;
            this.pointsLocked += 1;
          }
        }
      } else {
        // not an existing handle so read through track to look for x,y
        len = trk.baseX.length;
        for ( i = 0; i < len; i += 1) {
          if ((trk.baseX[i] + delta >= x) && (trk.baseX[i] - delta <= x) && (trk.baseY[i] + delta >= y) && (trk.baseY[i] - delta <= y)) {
            // found on track so add new handle
            h.x = x;
            h.y = y;
            h.basex = x;
            h.basey = y;
            h.locked = false;
            h.time = i;
            trk.handles.push(h);
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
        rg2WarningDialog('No course/name', 'Please select course and name before you start drawing a route or upload a file.');
      }
    }
  },

  dragEnded : function() {
    if (this.gpstrack.fileLoaded) {
      var i;
      var trk =this.gpstrack;
      // rebaseline GPS track
      trk.savedBaseX = trk.baseX.slice(0);
      trk.savedBaseY = trk.baseY.slice(0);
      trk.baseX = trk.routeData.x.slice(0);
      trk.baseY = trk.routeData.y.slice(0);
      // can't use slice(0) for an array of objects so need to do deep copy in jQuery
      // see http://stackoverflow.com/questions/122102/most-efficient-way-to-clone-an-object
      trk.savedHandles = $.extend(true, [], trk.handles);
      for (i = 0; i < trk.handles.length; i += 1) {
        trk.handles[i].basex = trk.handles[i].x;
        trk.handles[i].basey = trk.handles[i].y;
      }
      $("#btn-undo-gps-adjust").button("enable");
    }
  },

  // locks or unlocks background when adjusting map
  toggleMoveAll : function(checkedState) {
    this.backgroundLocked = checkedState;
  },

  initialiseDrawing : function() {
    this.gpstrack = new GPSTrack();
    this.gpstrack.routeData = new RouteData();
    this.backgroundLocked = false;
    this.pointsLocked = 0;
    this.pendingCourseID = null;
    // the RouteData versions of these have the start control removed for saving
    this.controlx = [];
    this.controly = [];
    this.nextControl = 0;
    this.gpstrack.initialiseGPS();
    this.hasResults = rg2.eventHasResults();
    if (this.hasResults) {
      $("#rg2-select-name").show();
      $("#rg2-enter-name").hide();
    } else {
      $("#rg2-select-name").hide();
      $("#rg2-enter-name").show();
    }
    $("#rg2-name-select").prop('disabled', true);
    $("#rg2-undo").prop('disabled', true);
    $("#btn-save-route").button("disable");
    $("#btn-save-gps-route").button("disable");
    $("#btn-undo").button("disable");
    $("#btn-three-seconds").button("disable");
    $("#btn-reset-drawing").button("enable");
    $("#rg2-name-select").empty();
    $("#rg2-new-comments").empty().val(rg2.config.DEFAULT_NEW_COMMENT);
    $("#rg2-event-comments").empty().val(rg2.config.DEFAULT_EVENT_COMMENT);
    $("rg2-move-all").prop('checked', false);
    $("#rg2-load-gps-file").button('disable');
    $("#rg2-name-entry").empty().val('');
    $("#rg2-time-entry").empty().val('');
    $("#rg2-name").removeClass('valid');
    $("#rg2-time").removeClass('valid');
    rg2.redraw(false);
  },

  setCourse : function(courseid) {
    if (!isNaN(courseid)) {
      if (this.gpstrack.routeData.courseid !== null) {
        // already have a course so we are trying to change it
        if (this.gpstrack.routeData.x.length > 1) {
          // drawing started so ask to confirm change
          this.pendingCourseid = courseid;
          this.confirmCourseChange();
        } else {
          // nothing done yet so just change course
          rg2.removeFromDisplay(this.gpstrack.routeData.courseid);
          this.initialiseCourse(courseid);
        }
      } else {
        // first time course has been selected
        this.initialiseCourse(courseid);
      }
    }
  },

  initialiseCourse : function(courseid) {
    this.gpstrack.routeData.eventid = rg2.getKartatEventID();
    this.gpstrack.routeData.courseid = courseid;
    rg2.putOnDisplay(courseid);
    var course = rg2.getCourseDetails(courseid);
    this.gpstrack.routeData.coursename = course.name;
    this.controlx = course.x;
    this.controly = course.y;
    this.gpstrack.routeData.x.length = 0;
    this.gpstrack.routeData.y.length = 0;
    this.gpstrack.routeData.x[0] = this.controlx[0];
    this.gpstrack.routeData.y[0] = this.controly[0];
    this.nextControl = 1;
    rg2.createNameDropdown(courseid);
    $("#rg2-name-select").prop('disabled', false);
    $("#btn-undo-gps-adjust").button("disable");
    rg2.redraw(false);
  },

  confirmCourseChange : function() {

    var msg = "<div id='course-change-dialog'>The route you have started to draw will be discarded. Are you sure you want to change the course?</div>";
    var me = this;
    $(msg).dialog({
      title : "Confirm course change",
      modal : true,
      dialogClass : "no-close",
      closeOnEscape : false,
      buttons : [{
        text : "Change course",
        click : function() {
          me.doChangeCourse();
        }
      }, {
        text : "Cancel",
        click : function() {
          me.doCancelChangeCourse();
        }
      }]
    });
  },

  resetDrawing : function() {
    var msg = "<div id='drawing-reset-dialog'>All information you have entered will be removed. Are you sure you want to reset?</div>";
    var me = this;
    $(msg).dialog({
      title : "Confirm reset",
      modal : true,
      dialogClass : "no-close",
      closeOnEscape : false,
      buttons : [{
        text : "Reset",
        click : function() {
          me.doDrawingReset();
        }
      }, {
        text : "Cancel",
        click : function() {
          me.doCancelDrawingReset();
        }
      }]
    });

  },

  doChangeCourse : function() {
    $('#course-change-dialog').dialog("destroy");
    rg2.removeFromDisplay(this.gpstrack.routeData.courseid);
    this.doDrawingReset();
    this.initialiseCourse(this.pendingCourseid);
  },

  doCancelChangeCourse : function() {
    // reset course dropdown
    $("#rg2-course-select").val(this.gpstrack.routeData.courseid);
    this.pendingCourseid = null;
    $('#course-change-dialog').dialog("destroy");
  },

  doDrawingReset : function() {
    $('#drawing-reset-dialog').dialog("destroy");
    this.pendingCourseid = null;
    this.initialiseDrawing();
  },

  doCancelDrawingReset : function() {
    $('#drawing-reset-dialog').dialog("destroy");
  },

  showCourseInProgress : function() {
    if (this.gpstrack.routeData.courseid !== null) {
      rg2.putOnDisplay(this.gpstrack.routeData.courseid);
    }
  },

  setName : function(resultid) {
    if (!isNaN(resultid)) {
      this.gpstrack.routeData.resultid = rg2.getKartatResultID(resultid);
      this.gpstrack.routeData.name = rg2.getRunnerName(resultid);
      this.startDrawing();
    }
  },
  
  setNameAndTime :function(event) {
    var t;
    var time;
    var name = $("#rg2-name-entry").val();
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
    if ((name) && (time)) {
      time = time.replace(".", ":");
      this.gpstrack.routeData.name = name;
      this.gpstrack.routeData.resultid = 0;
      this.gpstrack.routeData.totaltime = time;
      this.gpstrack.routeData.startsecs = 0;
      this.gpstrack.routeData.time[0] = getSecsFromMMSS(time);
      this.startDrawing();
    }
  },

  startDrawing : function() {
    $("#btn-three-seconds").button('enable');
    $("#rg2-load-gps-file").button('enable');
  },

  addNewPoint : function(x, y) {

    // enable here for testing
    //$("#btn-save-route").button("enable");

    if (this.closeEnough(x, y)) {
      this.gpstrack.routeData.x.push(this.controlx[this.nextControl]);
      this.gpstrack.routeData.y.push(this.controly[this.nextControl]);
      this.nextControl += 1;
      if (this.nextControl === this.controlx.length) {
        $("#btn-save-route").button("enable");
      }
    } else {
      this.gpstrack.routeData.x.push(Math.round(x));
      this.gpstrack.routeData.y.push(Math.round(y));
    }
    if (this.gpstrack.routeData.x.length > 1) {
      $("#btn-undo").button("enable");
    } else {
      $("#btn-undo").button("disable");
    }
    rg2.redraw(false);
  },
  
  undoGPSAdjust : function() {
    // restore route from before last adjust operation
    var trk;
    trk = this.gpstrack;
    trk.baseX = trk.savedBaseX.slice(0);
    trk.baseY = trk.savedBaseY.slice(0);
    trk.routeData.x = trk.savedBaseX.slice(0);
    trk.routeData.y = trk.savedBaseY.slice(0);
    // can't use slice(0) for an array of objects so need to do deep copy in jQuery
    // see http://stackoverflow.com/questions/122102/most-efficient-way-to-clone-an-object
    trk.handles = $.extend(true, [], trk.savedHandles);
    for (var i = 0; i < trk.handles.length; i += 1) {
        trk.handles[i].x = trk.handles[i].basex;
        trk.handles[i].y = trk.handles[i].basey;
      }
    $("#btn-undo-gps-adjust").button("disable");
    rg2.redraw(false);
  },

  undoLastPoint : function() {
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
      }
      this.gpstrack.routeData.x.pop();
      this.gpstrack.routeData.y.pop();
    }
    // note that array length has changed so can't use points
    if (this.gpstrack.routeData.x.length > 1) {
      $("#btn-undo").button("enable");
    } else {
      $("#btn-undo").button("enable");
    }
    rg2.redraw(false);
  },

  saveGPSRoute : function() {
    // called to save GPS file route
    // tidy up route details
    var i;
    var l;
    var t = this.gpstrack.routeData.time[this.gpstrack.routeData.time.length - 1] - this.gpstrack.routeData.time[0];
    this.gpstrack.routeData.totaltime = formatSecsAsMMSS(t);
    this.gpstrack.routeData.startsecs = this.gpstrack.routeData.time[0];
    l = this.gpstrack.routeData.x.length;
    for ( i = 0; i < l; i += 1) {
      this.gpstrack.routeData.x[i] = Math.round(this.gpstrack.routeData.x[i]);
      this.gpstrack.routeData.y[i] = Math.round(this.gpstrack.routeData.y[i]);
      // convert real time seconds to offset seconds from start time
      this.gpstrack.routeData.time[i] -= this.gpstrack.routeData.startsecs;
    }
    // allow for already having a GPS route for this runner
    this.gpstrack.routeData.resultid += rg2.config.GPS_RESULT_OFFSET;
    while (rg2.resultIDExists(this.gpstrack.routeData.resultid)) {
      this.gpstrack.routeData.resultid += rg2.config.GPS_RESULT_OFFSET;
      // add marker(s) to name to show it is a duplicate
      this.gpstrack.routeData.name += '*';
    }
    this.gpstrack.routeData.comments = $("#rg2-new-comments").val();

    $("#btn-undo-gps-adjust").button("disable");
    this.postRoute();
  },

  saveRoute : function() {
    // called to save manually entered route
    this.gpstrack.routeData.comments = $("#rg2-new-comments").val();
    this.gpstrack.routeData.controlx = this.controlx;
    this.gpstrack.routeData.controly = this.controly;
    // don't need start control so remove it
    this.gpstrack.routeData.controlx.splice(0, 1);
    this.gpstrack.routeData.controly.splice(0, 1);
    this.postRoute();
  },

  postRoute : function() {
    var $url = json_url + '?type=addroute&id=' + this.gpstrack.routeData.eventid;
    // create JSON data
    var json = JSON.stringify(this.gpstrack.routeData);
    var self = this;
    $.ajax({
      data : json,
      type : 'POST',
      url : $url,
      dataType : 'json',
      success : function(data, textStatus, jqXHR) {
        if (data.ok) {
          self.routeSaved(data.status_msg);
        } else {
          self.saveError(data.status_msg);
        }
      },
      error : function(jqXHR, textStatus, errorThrown) {
        self.saveError(errorThrown);
      }
    });
  },

  saveError : function(text) {
    rg2WarningDialog(this.gpstrack.routeData.name, 'Your route was not saved. Please try again.' + text);
  },

  routeSaved : function(text) {
    rg2WarningDialog(this.gpstrack.routeData.name, 'Your route has been saved.');
    rg2.loadEvent(rg2.getActiveEventID());
  },

  waitThreeSeconds : function() {
    // insert a new point in the same place as the last point
    this.gpstrack.routeData.x.push(this.gpstrack.routeData.x[this.gpstrack.routeData.x.length - 1]);
    this.gpstrack.routeData.y.push(this.gpstrack.routeData.y[this.gpstrack.routeData.y.length - 1]);
    rg2.redraw(false);
  },

  // snapto: test if drawn route is close enough to control
  closeEnough : function(x, y) {
    if (Math.abs(x - this.controlx[this.nextControl]) < this.CLOSE_ENOUGH) {
      if (Math.abs(y - this.controly[this.nextControl]) < this.CLOSE_ENOUGH) {
        return true;
      }
    }
    return false;
  },

  trackLocked : function() {
    return (this.pointsLocked > 0);
  },

  adjustTrack : function(x1, y1, x2, y2, button, shiftKeyPressed, ctrlKeyPressed) {
// called whilst dragging a GPS track
// TODO: not the greatest function in the world and a candidate for refactoring big-time
// but it works which is a huge step forward
    var i;
    var trk;
    var len;
    var lockBefore;
    var lockAfter;
    var dragIndex;
    var handle;
    var x;
    var y;
    var a;
    var xb;
    var yb;
    var xs;
    var ys;
    var dx;
    var dy;
    var scale1;
    var scale2;
    var scale;
    var oldAngle;
    var newAngle;
    var angle;
    var reverseAngle;
    var earliest;
    var latest;
    var lockedHandle1;
    var lockedHandle2;
    var fromTime;
    var toTime;
    //console.log("adjustTrack ", x1, y1, x2, y2);
    if ((this.backgroundLocked) || (button === rg2.config.RIGHT_CLICK)) {
      rg2.ctx.translate(x2 - x1, y2 - y1);
    } else {
      trk = this.gpstrack;
      len = trk.baseX.length;
      if (this.pointsLocked > 0) {
        if (this.pointsLocked === 1)  {
          handle = this.getLockedHandle();
          // scale and rotate track around single locked point
          oldAngle = getAngle(x1, y1, handle.basex, handle.basey);
          newAngle = getAngle(x2, y2, handle.basex, handle.basey);
          angle = newAngle - oldAngle;
          scale1 = getDistanceBetweenPoints(x1, y1, handle.basex, handle.basey);
          scale2 = getDistanceBetweenPoints(x2, y2, handle.basex, handle.basey);
          scale = scale2/scale1;
          //console.log (x1, y1, x2, y2, handle.basex, handle.basey, scale, angle);
          for ( i = 0; i < len; i += 1) {
            x = trk.baseX[i] - handle.basex;
            y = trk.baseY[i] - handle.basey;
            trk.routeData.x[i] = (((Math.cos(angle) * x) - (Math.sin(angle) * y)) * scale) + handle.basex;
            trk.routeData.y[i] = (((Math.sin(angle) * x) + (Math.cos(angle) * y)) * scale) + handle.basey;
          }
          for (i = 0; i < trk.handles.length; i += 1) {
            if (!trk.handles[i].locked) {
              x = trk.handles[i].basex - handle.basex;
              y = trk.handles[i].basey - handle.basey;
              trk.handles[i].x = (((Math.cos(angle) * x) - (Math.sin(angle) * y)) * scale) + handle.basex;
              trk.handles[i].y = (((Math.sin(angle) * x) + (Math.cos(angle) * y)) * scale) + handle.basey;
            }
          }
          
        } else {
          // check if start of drag is on a handle
          handle = this.getHandleClicked(x1, y1);
          // we already know we have at least two points locked: cases to deal with from here
          // 1: drag point not on a handle: exit
          // 2: drag point on a locked handle: exit
          // 3: drag point between start and a locked handle: scale and rotate around single point
          // 4: drag point between locked handle and end: scale and rotate around single handle
          // 5: drag point between two locked handles: shear around two fixed handles
          //case 1
          if (handle === undefined) {
            //console.log("Point (" + x1 + ", " + y1 + ") not on track: " + this.pointsLocked + " points locked.");
            return;
          }
          // case 2
          if (trk.handles[handle].locked) {
            //console.log("Point (" + x1 + ", " + y1 + ") locked: " + this.pointsLocked + " points locked.");
            return;
          }
          earliest = this.getEarliestLockedHandle();
          latest = this.getLatestLockedHandle();
          
          if ((trk.handles[earliest].time > trk.handles[handle].time) || (trk.handles[latest].time < trk.handles[handle].time)) {
            // case 3 and 4: floating end point
            if (trk.handles[earliest].time > trk.handles[handle].time) {
              lockedHandle1 = earliest;
              fromTime = 0;
              toTime = trk.handles[earliest].time;
            } else {
              lockedHandle1 = latest;
              fromTime = trk.handles[latest].time + 1;
              // second entry is always the last point in the route
              toTime = trk.handles[1].time + 1;
            }
            // scale and rotate track around single locked point
            scale1 = getDistanceBetweenPoints(x1, y1, trk.handles[lockedHandle1].basex, trk.handles[lockedHandle1].basey);
            scale2 = getDistanceBetweenPoints(x2, y2, trk.handles[lockedHandle1].basex, trk.handles[lockedHandle1].basey);
            scale = scale2/scale1;
            oldAngle = getAngle(x1, y1, trk.handles[lockedHandle1].basex, trk.handles[lockedHandle1].basey);
            newAngle = getAngle(x2, y2, trk.handles[lockedHandle1].basex, trk.handles[lockedHandle1].basey);
            angle = newAngle - oldAngle;
            //console.log (x1, y1, x2, y2, trk.handles[handle].basex, trk.handles[handle].basey, scale, angle, fromTime, toTime);
            for ( i = fromTime; i < toTime; i += 1) {
              x = trk.baseX[i] - trk.handles[lockedHandle1].basex;
              y = trk.baseY[i] - trk.handles[lockedHandle1].basey;
              trk.routeData.x[i] = (((Math.cos(angle) * x) - (Math.sin(angle) * y)) * scale) + trk.handles[lockedHandle1].basex;
              trk.routeData.y[i] = (((Math.sin(angle) * x) + (Math.cos(angle) * y)) * scale) + trk.handles[lockedHandle1].basey;
            }
            for (i = 0; i < trk.handles.length; i += 1) {
              if ((!trk.handles[i].locked) && (trk.handles[i].time >= fromTime) && (trk.handles[i].time <= toTime)) {
                x = trk.handles[i].basex - trk.handles[lockedHandle1].basex;
                y = trk.handles[i].basey - trk.handles[lockedHandle1].basey;
                trk.handles[i].x = (((Math.cos(angle) * x) - (Math.sin(angle) * y)) * scale) + trk.handles[lockedHandle1].basex;
                trk.handles[i].y = (((Math.sin(angle) * x) + (Math.cos(angle) * y)) * scale) + trk.handles[lockedHandle1].basey;
              }
            }
          } else {
            // case 5: shear/scale around two locked points 
            // all based on putting handle1 at (0, 0), rotating handle 2 to be on x-axis and then shearing on x-axis and scaling on y-axis.
            // there must be a better way...
            
            lockedHandle1 = this.getPreviousLockedHandle(handle);
            fromTime = trk.handles[lockedHandle1].time;
            lockedHandle2 = this.getNextLockedHandle(handle);
            toTime = trk.handles[lockedHandle2].time;
            //console.log("Point (", x1, ", ", y1, ") in middle of ", lockedHandle1, trk.handles[lockedHandle1].basex, trk.handles[lockedHandle1].basey, " and ",lockedHandle2, trk.handles[lockedHandle2].basex, trk.handles[lockedHandle2].basey);
            reverseAngle = getAngle(trk.handles[lockedHandle1].basex, trk.handles[lockedHandle1].basey, trk.handles[lockedHandle2].basex, trk.handles[lockedHandle2].basey);
            angle = (2 * Math.PI) - reverseAngle;
            
            xb = x1 - trk.handles[lockedHandle1].basex;
            yb = y1 - trk.handles[lockedHandle1].basey;
            x1 = (Math.cos(angle) * xb) - (Math.sin(angle) * yb);
            y1 = (Math.sin(angle) * xb) + (Math.cos(angle) * yb);
                      
            xb = x2 - trk.handles[lockedHandle1].basex;
            yb = y2 - trk.handles[lockedHandle1].basey;
            x2 = (Math.cos(angle) * xb) - (Math.sin(angle) * yb);
            y2 = (Math.sin(angle) * xb) + (Math.cos(angle) * yb);
                        
            xb = trk.handles[lockedHandle2].basex - trk.handles[lockedHandle1].basex;
            yb = trk.handles[lockedHandle2].basey - trk.handles[lockedHandle1].basey;
            x = (Math.cos(angle) * xb) - (Math.sin(angle) * yb);
            y = (Math.sin(angle) * xb) + (Math.cos(angle) * yb);

            // calculate scaling factors
            a = (x2 - x1) /y1;
            scale = y2 / y1;
            
            if (!isFinite(a) || !isFinite(scale)) {
              // TODO: this will cause trouble when y1 is 0 (or even just very small) but I've never managed to get it to happen
              // you need to click exactly on a line through the two locked handles: just do nothing for now
              console.log("y1 became 0: scale factors invalid", a, scale);
              return;
            }
            // recalculate all points between locked handles          
            for ( i = fromTime + 1; i < toTime; i += 1) {
              // translate to put locked point at origin
              xb = trk.baseX[i] - trk.handles[lockedHandle1].basex;
              yb = trk.baseY[i] - trk.handles[lockedHandle1].basey;
              // rotate to give locked points as x-axis
              x = (Math.cos(angle) * xb) - (Math.sin(angle) * yb);
              y = (Math.sin(angle) * xb) + (Math.cos(angle) * yb);
              
              // shear/stretch
              xs = x + (y * a);
              ys = y * scale;
              
              // rotate and translate back
              trk.routeData.x[i] = (Math.cos(reverseAngle) * xs) - (Math.sin(reverseAngle) * ys) + trk.handles[lockedHandle1].basex;
              trk.routeData.y[i] = (Math.sin(reverseAngle) * xs) + (Math.cos(reverseAngle) * ys) + trk.handles[lockedHandle1].basey;

            }
            // recalculate all handles between locked handles
            for (i = 0; i < trk.handles.length; i += 1) {
              if ((!trk.handles[i].locked) && (trk.handles[i].time >= fromTime) && (trk.handles[i].time <= toTime)) {
                xb = trk.handles[i].basex - trk.handles[lockedHandle1].basex;
                yb = trk.handles[i].basey - trk.handles[lockedHandle1].basey;
                
                // rotate to give locked points as x-axis
                x = (Math.cos(angle) * xb) - (Math.sin(angle) * yb);
                y = (Math.sin(angle) * xb) + (Math.cos(angle) * yb);
              
                // shear/stretch
                xs = x + (y * a);
                ys = y * scale;
                             
                trk.handles[i].x = ((Math.cos(reverseAngle) * xs) - (Math.sin(reverseAngle) * ys)) + trk.handles[lockedHandle1].basex;
                trk.handles[i].y = ((Math.sin(reverseAngle) * xs) + (Math.cos(reverseAngle) * ys)) + trk.handles[lockedHandle1].basey;
              }
            }
          }
          
        }
      } else {
        // nothing locked so drag track
        dx = x2 - x1;
        dy = y2 - y1;
        for ( i = 0; i < len; i += 1) {
          trk.routeData.x[i] = trk.baseX[i] + dx;
          trk.routeData.y[i] = trk.baseY[i] + dy;
        }
        for (i = 0; i < trk.handles.length; i += 1) {
          trk.handles[i].x = trk.handles[i].basex + dx;
          trk.handles[i].y = trk.handles[i].basey + dy;
        }
      }
    }
  },
  
  // find if the click was on an existing handle
  // return: handle index or undefined
  // basex and basey are handle locations at the start of the drag which is what we are interested in
  getHandleClicked: function (x, y) {
    //console.log("Get handle clicked for " + x + ", " + y);
    var i;
    var distance;
    for (i = 0; i < this.gpstrack.handles.length; i += 1) {
      distance = getDistanceBetweenPoints(x, y, this.gpstrack.handles[i].basex, this.gpstrack.handles[i].basey);
      if (distance <= this.HANDLE_DOT_RADIUS) {
        return i;
      }
    }
    return undefined;
  },
  
  // called when we know there is only one locked handle
  // return: handle object or undefined
  getLockedHandle: function() {
    var i;
    for (i = 0; i < this.gpstrack.handles.length; i += 1) {
      if (this.gpstrack.handles[i].locked) {
        return this.gpstrack.handles[i];
      }
    }
    return undefined;
  },
  
  // called to find earliest locked handle
  getEarliestLockedHandle: function() {
    var i;
    var earliest = 99999;
    var handle;
    for (i = 0; i < this.gpstrack.handles.length; i += 1) {
      if (this.gpstrack.handles[i].locked) {
        if (this.gpstrack.handles[i].time < earliest) {
          earliest = this.gpstrack.handles[i].time;
          handle = i;
        }
      }
    }
    return handle;
  },

  // called to find latest locked handle
  getLatestLockedHandle: function() {
    var i;
    var latest = -1;
    var handle;
    for (i = 0; i < this.gpstrack.handles.length; i += 1) {
      if (this.gpstrack.handles[i].locked) {
        if (this.gpstrack.handles[i].time > latest) {
          latest = this.gpstrack.handles[i].time;
          handle = i;
        }
      }
    }
    return handle;
  },

  getPreviousLockedHandle: function(handle) {
    var i;
    // max diff possible is last entry time
    var minDiff = this.gpstrack.handles[1].time;
    var time = this.gpstrack.handles[handle].time;
    var previous;
    for (i = 0; i < this.gpstrack.handles.length; i += 1) {
      if (((time - this.gpstrack.handles[i].time) < minDiff) && (this.gpstrack.handles[i].time < time) && this.gpstrack.handles[i].locked) {
        minDiff = time - this.gpstrack.handles[i].time;
        previous = i;
      }
    }
    return previous;
  },

  getNextLockedHandle: function(handle) {
    var i;
    var l;
    // max diff possible is last entry time
    var minDiff = this.gpstrack.handles[1].time;
    var time = this.gpstrack.handles[handle].time;
    var next;
    l = this.gpstrack.handles.length;
    for (i = 0; i < l; i += 1) {
      if (((this.gpstrack.handles[i].time - time) < minDiff) && (this.gpstrack.handles[i].time > time) && this.gpstrack.handles[i].locked) {
        minDiff = this.gpstrack.handles[i].time - time;
        next = i;
      }
    }
    return next;
  },

  drawNewTrack : function() {
    var i;
    var l;
    rg2.ctx.lineWidth = rg2.getRouteWidth();
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
      rg2.ctx.fillRect(this.controlx[this.nextControl] - 1, this.controly[this.nextControl] - 1, 3, 3);
      rg2.ctx.stroke();
      // dot at start of route
      rg2.ctx.beginPath();
      rg2.ctx.arc(this.gpstrack.routeData.x[0] + (rg2.config.RUNNER_DOT_RADIUS / 2), this.gpstrack.routeData.y[0], rg2.config.RUNNER_DOT_RADIUS, 0, 2 * Math.PI, false);
      rg2.ctx.fill();
    }
    // route itself
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
    // locked points
    l = this.gpstrack.handles.length;
    for (i = 0; i < l; i += 1) {
      if (this.gpstrack.handles[i].locked === true) {
        rg2.ctx.fillStyle = rg2.config.RED;
      } else {
        rg2.ctx.fillStyle = rg2.config.GREEN;
      }
      rg2.ctx.strokestyle = rg2.config.PURPLE;
      rg2.ctx.beginPath();
      rg2.ctx.arc(this.gpstrack.handles[i].x, this.gpstrack.handles[i].y, this.HANDLE_DOT_RADIUS, 0, 2 * Math.PI, false);
      rg2.ctx.fill();
      rg2.ctx.stroke();
    }
  }
};
/*global rg2:false */
function Events() {
	this.events = [];
	this.activeEventID = null;
}

Events.prototype = {
	Constructor : Events,

  deleteAllEvents: function() {
    this.events.length = 0;
    this.activeEventID = null;
  },
  
	addEvent : function(eventObject) {
		this.events.push(eventObject);
	},

	getEventInfo : function(id) {
    var realid = this.getEventIDForKartatID(id);
    var info = this.events[realid];
    info.id = realid;
    return info;
	},
	
	getKartatEventID : function() {
		return this.events[this.activeEventID].kartatid;
	},

	getActiveMapID : function() {
		return this.events[this.activeEventID].mapid;
	},

	setActiveEventID : function(eventid) {
		this.activeEventID = eventid;
	},

	getActiveEventID : function() {
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

	createEventEditDropdown : function() {
		$("#rg2-event-selected").empty();
		var dropdown = document.getElementById("rg2-event-selected");
		var i;
		var len;
		var opt = document.createElement("option");
    opt.value = null;
    opt.text = 'No event selected';
    dropdown.options.add(opt);
    len = this.events.length - 1;
		for (i = len; i > -1; i -= 1) {
      opt = document.createElement("option");
			opt.value = this.events[i].kartatid;
			opt.text = this.events[i].kartatid + ": " + this.events[i].date + ": " + this.events[i].name;
			dropdown.options.add(opt);
		}
	},

	isScoreEvent : function() {
		return (this.events[this.activeEventID].format === rg2.config.SCORE_EVENT);
	},
	
	hasResults: function () {
    if (this.activeEventID !== null) {
      return (this.events[this.activeEventID].format !== rg2.config.EVENT_WITHOUT_RESULTS);
    } else {
      return true;
    }
	},

  isValidEventID : function (eventid) {
    if ((this.events.length >= eventid) && (eventid > 0)) {
        return true;
    } else {
      return false;
    }
  },

	mapIsGeoreferenced : function() {
		return this.events[this.activeEventID].georeferenced;
	},

	getWorldFile : function() {
		return this.events[this.activeEventID].worldFile;
	},

	formatEventsAsMenu : function() {
		var title;
		var html = '';
		var i;
		for (i = this.events.length - 1; i >= 0; i -= 1) {
			if (this.events[i].comment !== "") {
				title = this.events[i].type + " event on " + this.events[i].date + ": " + this.events[i].comment;
			} else {
				title = this.events[i].type + " event on " + this.events[i].date;
			}
			html += "<li title='" + title + "' id=" + i + "><a href='#" + this.events[i].kartatid + "'>";
			if (this.events[i].comment !== "") {
				html += "<i class='fa fa-info-circle event-info-icon' id='info-" + i + "'></i>";
			}
			html += this.events[i].name + "</a></li>";
		}
		return html;

	}
};

function Event(data) {
	this.kartatid = parseInt(data.id, 10);
	this.mapid = data.mapid;
	this.format = parseInt(data.format, 10);
	this.name = data.name;
	this.date = data.date;
	this.club = data.club;
	this.worldFile = [];
	if ( typeof (data.A) === 'undefined') {
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
	this.rawtype = data.type;
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
	Constructor : Event
};
/*global rg2:false */
/*global map:false */
/*global getLatLonDistance:false */
/*global RouteData:false */
/*global rg2WarningDialog:false */
function GPSTrack() {
	this.lat = [];
	this.lon = [];
	this.time = [];
	this.baseX = [];
	this.baseY = [];
  this.handles = [];
  this.savedBaseX = [];
  this.savedBaseY = [];
  this.savedHandles = [];
	this.fileLoaded = false;
	this.fileName = '';
	this.routeData = new RouteData();
}

GPSTrack.prototype = {

	Constructor : GPSTrack,

	initialiseGPS : function() {
		this.lat.length = 0;
		this.lon.length = 0;
		this.time.length = 0;
		this.baseX.length = 0;
		this.baseY.length = 0;
    this.handles.length = 0;
    this.savedBaseX.length = 0;
    this.savedBaseY.length = 0;
    this.savedHandles.length = 0;
		this.fileLoaded = false;
	},

	uploadGPS : function(evt) {
		//console.log ("File" + evt.target.files[0].name);
		var reader = new FileReader();
    this.fileName = evt.target.files[0].name;
    
		reader.onerror = function(evt) {
			switch(evt.target.error.code) {
				case evt.target.error.NOT_FOUND_ERR:
          rg2WarningDialog('GPS file problem', 'File not found');
					break;
				case evt.target.error.NOT_READABLE_ERR:
          rg2WarningDialog('GPS file problem', 'File not readable. Please check you have selected the correct file.');
					break;
				default:
          rg2WarningDialog('GPS file problem', 'An error occurred. Please check you have selected the correct file.');
			}
		};

		var self = this;

		reader.onload = function(evt) {
			var xml;
			var fileType = self.fileName.slice(-3).toLowerCase();
			if ((fileType !== 'gpx') && (fileType !== 'tcx')) {
        rg2WarningDialog('GPS file problem', 'File type not recognised. Please check you have selected the correct file.');
        return;
      }
      try {
        xml = $.parseXML(evt.target.result);
      } catch(err) {
        rg2WarningDialog('GPS file problem', 'File is not valid XML. Please check you have selected the correct file.');
        return;
      }
			if (fileType === "gpx") {
        self.processGPX(xml);
      } else {
        if (fileType === "tcx") {
          self.processTCX(xml);
        }
			}
			self.processGPSTrack();
			$("#rg2-load-gps-file").button('disable');
		};

		// read the selected file
		reader.readAsText(evt.target.files[0]);

	},

  processGPX: function (xml) {
    var trksegs;
    var trkpts;
    var i;
    var j;
    var timestring;
    trksegs = xml.getElementsByTagName('trkseg');
    for ( i = 0; i < trksegs.length; i += 1) {
      trkpts = trksegs[i].getElementsByTagName('trkpt');
      for ( j = 0; j < trkpts.length; j += 1) {
        this.lat.push(trkpts[j].getAttribute('lat'));
        this.lon.push(trkpts[j].getAttribute('lon'));
        timestring = trkpts[j].childNodes[3].textContent;
        this.time.push(this.getSecsFromTrackpoint(timestring));
      }
    }
  },

  processTCX: function (xml) {
    var trksegs;
    var trkpts;
    var i;
    var j;
    var timestring;
    trksegs = xml.getElementsByTagName('Track');
    for ( i = 0; i < trksegs.length; i += 1) {
      trkpts = trksegs[i].getElementsByTagName('Trackpoint');
      for ( j = 0; j < trkpts.length; j += 1) {
        this.lat.push(trkpts[j].childNodes[3].childNodes[1].textContent);
        this.lon.push(trkpts[j].childNodes[3].childNodes[3].textContent);
        timestring = trkpts[j].childNodes[1].textContent;
        this.time.push(this.getSecsFromTrackpoint(timestring));
      }
    }
  },
  
	getSecsFromTrackpoint : function(timestring) {
	try {
		// input is 2013-12-03T12:34:56Z (or 56.000Z)
		var hrs = parseInt(timestring.substr(11, 2), 10);
		var mins = parseInt(timestring.substr(14, 2), 10);
		var secs = parseInt(timestring.substr(17, 2), 10);
		return (hrs * 3600) + (mins * 60) + secs;
	} catch (err) {
      return 0;
	}
	},

	processGPSTrack : function() {
		if (rg2.mapIsGeoreferenced()) {
			// translate lat/lon to x,y based on world file info: see http://en.wikipedia.org/wiki/World_file
			var w = rg2.getWorldFile();
			// simplify calculation a little
			var AEDB = (w.A * w.E) - (w.D * w.B);
			var xCorrection = (w.B * w.F) - (w.E * w.C);
			var yCorrection = (w.D * w.C) - (w.A * w.F);
			var i;
			for ( i = 0; i < this.lat.length; i += 1) {
				this.routeData.x[i] = Math.round(((w.E * this.lon[i]) - (w.B * this.lat[i]) + xCorrection) / AEDB);
				this.routeData.y[i] = Math.round(((-1 * w.D * this.lon[i]) + (w.A * this.lat[i]) + yCorrection) / AEDB);
			}
			// find bounding box for track
			var minX = this.routeData.x[0];
			var maxX = this.routeData.x[0];
			var minY = this.routeData.y[0];
			var maxY = this.routeData.y[0];

			for ( i = 1; i < this.routeData.x.length; i += 1) {
				maxX = Math.max(maxX, this.routeData.x[i]);
				maxY = Math.max(maxY, this.routeData.y[i]);
				minX = Math.min(minX, this.routeData.x[i]);
				minY = Math.min(minY, this.routeData.y[i]);
			}
			// check we are somewhere on the map
			var mapSize = rg2.getMapSize();
			if ((maxX < 0) || (minX > mapSize.width) || (minY > mapSize.height) || (maxY < 0)) {
				// warn and fit to track
				var msg = "<div id='GPS-problem-dialog'>Your GPS file does not match the map co-ordinates. Please check you have selected the correct file.</div>";
				$(msg).dialog({
					title : "GPS file problem"
				});
				this.fitTrackInsideCourse();

			}
		} else {
			this.fitTrackInsideCourse();
		}
		this.baseX = this.routeData.x.slice(0);
		this.baseY = this.routeData.y.slice(0);
		// add handles at start and finish of route
		var h0 = {};
    var h1 = {};
		h0.x = this.baseX[0];
    h0.y = this.baseY[0];
    h0.basex = h0.x;
    h0.basey = h0.y;
    h0.locked = false;
    h0.time = 0;
    this.handles.push(h0);
    h1.x = this.baseX[this.baseX.length - 1];
    h1.y = this.baseY[this.baseY.length - 1];
    h1.basex = h1.x;
    h1.basey = h1.y;
    h1.locked = false;
    h1.time = this.baseY.length - 1;
    this.handles.push(h1);
		this.routeData.time = this.time;
		this.fileLoaded = true;
		$("#btn-save-gps-route").button("enable");
		rg2.redraw(false);
	},

	fitTrackInsideCourse : function() {
		// fit track to within limits of course
		// find bounding box for track
		var maxLat = this.lat[0];
		var maxLon = this.lon[0];
		var minLat = this.lat[0];
		var minLon = this.lon[0];

    var minControlX;
    var maxControlX;
    var minControlY;
    var maxControlY;
    var size;
		var x;
		var y;
		for (var i = 1; i < this.lat.length; i += 1) {
			maxLat = Math.max(maxLat, this.lat[i]);
			maxLon = Math.max(maxLon, this.lon[i]);
			minLat = Math.min(minLat, this.lat[i]);
			minLon = Math.min(minLon, this.lon[i]);
			x = this.lon[i] - this.lon[0];
			y = this.lat[i] - this.lat[0];
		}

		var controlx = rg2.getControlX();
		var controly = rg2.getControlY();

		// find bounding box for course
    minControlX = controlx[0];
		maxControlX = controlx[0];
		minControlY = controly[0];
		maxControlY = controly[0];
		for ( i = 1; i < controlx.length; i += 1) {
			maxControlX = Math.max(maxControlX, controlx[i]);
			maxControlY = Math.max(maxControlY, controly[i]);
			minControlX = Math.min(minControlX, controlx[i]);
			minControlY = Math.min(minControlY, controly[i]);
		}
    // issue #60: allow for no controls or just a few in a small area
    // 100 is an arbitrary but sensible cut-off
    if (((maxControlY - minControlY) < 100) || ((maxControlX - minControlX) < 100)) {
      minControlX = 0;
      minControlY = 0;
      size = rg2.getMapSize();
      maxControlX = size.width;
      maxControlY = size.height;
    }

		//console.log (minControlX, maxControlX, minControlY, maxControlY);

		// scale GPS track to within bounding box of controls: a reasonable start
		var scaleX = (maxControlX - minControlX) / (maxLon - minLon);
		var scaleY = (maxControlY - minControlY) / (maxLat - minLat);
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
		this.routeData.x[0] = ((this.lon[0] - minLon) * scaleX) + minControlX;
		this.routeData.y[0] = (-1 * (this.lat[0] - maxLat) * scaleY) + minControlY;

		// translate lat/lon to x,y
		var deltaX = minControlX - (this.routeData.x[0] - controlx[0]);
		var deltaY = minControlY - (this.routeData.y[0] - controly[0]);

		for ( i = 0; i < this.lat.length; i += 1) {
			this.routeData.x[i] = ((this.lon[i] - minLon) * scaleX) + deltaX;
			this.routeData.y[i] = (-1 * (this.lat[i] - maxLat) * scaleY) + deltaY;
		}

	}
};
/* exported getLatLonDistance */
/* exported getDistanceBetweenPoints */
/* exported getAngle */
/* exported rg2WarningDialog */
/* exported formatSecsAsMMSS */
/* exported getSecsFromMMSS */
/* exported trackTransforms */
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

function Colours() {
  // used to generate track colours: add extra colours as necessary
  this.colours = ["#ff0000", "#ff8000",  "#ff00ff", "#ff0080", "#008080", "#008000", "#00ff00", "#0080ff", "#0000ff", "#8000ff", "#000000", "#00ffff", "#808080"];
  this.colourIndex = 0;
}

Colours.prototype = {
  Constructor : Colours,

  getNextColour : function() {
    this.colourIndex += 1;
    if (this.colourIndex === this.colours.length) {
      this.colourIndex = 0;
    }
    return this.colours[this.colourIndex];
  }
};

Number.prototype.toRad = function() {
  return this * Math.PI / 180;
};


function rg2WarningDialog(title, text) {
  var msg = '<div>' + text + '</div>';
  $(msg).dialog({
    title : title
  });
}

function getLatLonDistance(lat1, lon1, lat2, lon2) {
  // Haversine formula (http://www.codecodex.com/wiki/Calculate_distance_between_two_points_on_a_globe)
  var x = lat2 - lat1;
  var dLat = x.toRad();
  var y = lon2 - lon1;
  var dLon = y.toRad();
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1).toRad()) * Math.cos((lat2.toRad())) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // multiply by IUUG earth mean radius (http://en.wikipedia.org/wiki/Earth_radius) in metres
  return 6371009 * c;
}

function getAngle(x1, y1, x2, y2) {
  var angle = Math.atan2((y2 - y1), (x2 - x1));
  if (angle < 0) {
    angle = angle + (2 * Math.PI);
  }
  return angle;
}

function getDistanceBetweenPoints(x1, y1, x2, y2) {
  // Pythagoras
  return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));
}

// converts seconds to MM:SS
function formatSecsAsMMSS(secs) {
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

}

// converts MM:SS to seconds
function getSecsFromMMSS(time) {
  var secs = 0;
  var bits = time.split(":");
  secs = (parseInt(bits[0], 10) * 60) + parseInt(bits[1], 10);
  if (isNaN(secs)) {
    return 0;
  } else {
    return secs;
  }
}

// Adds ctx.getTransform() - returns an SVGMatrix
// Adds ctx.transformedPoint(x,y) - returns an SVGPoint
function trackTransforms(ctx) {
  var svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
  var xform = svg.createSVGMatrix();
  ctx.getTransform = function() {
    return xform;
  };

  var savedTransforms = [];
  var save = ctx.save;
  ctx.save = function() {
    savedTransforms.push(xform.translate(0, 0));
    return save.call(ctx);
  };
  var restore = ctx.restore;
  ctx.restore = function() {
    xform = savedTransforms.pop();
    return restore.call(ctx);
  };
  var scale = ctx.scale;
  ctx.scale = function(sx, sy) {
    xform = xform.scaleNonUniform(sx, sy);
    return scale.call(ctx, sx, sy);
  };
  var rotate = ctx.rotate;
  ctx.rotate = function(radians) {
    xform = xform.rotate(radians * 180 / Math.PI);
    return rotate.call(ctx, radians);
  };
  var translate = ctx.translate;
  ctx.translate = function(dx, dy) {
    xform = xform.translate(dx, dy);
    return translate.call(ctx, dx, dy);
  };
  var transform = ctx.transform;
  ctx.transform = function(a, b, c, d, e, f) {
    var m2 = svg.createSVGMatrix();
    m2.a = a;
    m2.b = b;
    m2.c = c;
    m2.d = d;
    m2.e = e;
    m2.f = f;
    xform = xform.multiply(m2);
    return transform.call(ctx, a, b, c, d, e, f);
  };
  var setTransform = ctx.setTransform;
  ctx.setTransform = function(a, b, c, d, e, f) {
    xform.a = a;
    xform.b = b;
    xform.c = c;
    xform.d = d;
    xform.e = e;
    xform.f = f;
    return setTransform.call(ctx, a, b, c, d, e, f);
  };
  var pt = svg.createSVGPoint();
  ctx.transformedPoint = function(x, y) {
    pt.x = x;
    pt.y = y;
    return pt.matrixTransform(xform.inverse());
  };
}

/*global rg2:false */
/*global Colours:false */
/*global getDistanceBetweenPoints:false */
function Results() {
	this.results = [];
	this.colours = new Colours();
}

Results.prototype = {
	Constructor : Results,

	addResults : function(data, isScoreEvent) {
		// for each result
		var l = data.length;
		for (var i = 0; i < l; i += 1) {
			var result = new Result(data[i], isScoreEvent, this.colours.getNextColour());
			this.results.push(result);
		}
		this.generateLegPositions();
	},

  generateLegPositions: function() {

    var i;
    var j;
    var k;
    var courses;
    var controls;
    courses = [];
    controls = [];
    for (i = 0; i < this.results.length; i += 1) {
      if (courses.indexOf(this.results[i].courseid) === -1) {
        courses.push(this.results[i].courseid);
        // not a good way fo finding number of controls: better to get from courses?
        controls.push(this.results[i].splits.length);
      }
    
    }
    var pos = [];
    var p;
    for (i = 0; i < courses.length; i += 1) {
      //console.log("Generate positions for course " + courses[i]);

      // start at 1 since 0 is time 0
      for (k = 1; k < controls[i]; k += 1) {
        pos.length = 0;
        for (j = 0; j < this.results.length; j += 1) {
          if (this.results[j].courseid === courses[i]) {
            p = {};
            p.time = this.results[j].splits[k];
            p.id = j;
            pos.push(p);
          }
        }
        pos.sort(this.sortTimes);
        //console.log(pos);
        for (j = 0; j < pos.length; j+= 1) {
          // no allowance for ties yet
          this.results[pos[j].id].legpos[k] = j + 1;
        }
      }
    }
  },

  sortTimes : function(a, b) {
    return a.time - b.time;
  },
  
	getResultsByCourseID : function(courseid) {
		var count = 0;
		for (var i = 0; i < this.results.length; i += 1) {
			if (this.results[i].courseid === courseid) {
				count += 1;
			}

		}
		return count;
	},

  getRoutesForEvent : function() {
    var routes = [];
    var route;
    for (var i = 0; i < this.results.length; i += 1) {
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

	getTotalResults : function() {
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
    var show;
    // check if +3 to be displayed once here rather than every time through loop
    show = rg2.showThreeSeconds();
		for (var i = 0; i < this.results.length; i += 1) {
			this.results[i].drawTrack(show);
		}
	},

	updateTrackNames : function() {
		$("#rg2-track-names").empty();
		var html = this.getDisplayedTrackNames();
		if (html !== "") {
			$("#rg2-track-names").append(html);
			$("#rg2-track-names").show();
		} else {
			$("#rg2-track-names").hide();
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
		for (var i = 0; i < this.results.length; i += 1) {
			if (this.results[i].courseid == courseid) {
				this.results[i].putTrackOnDisplay();
			}
		}
		this.updateTrackNames();
	},

	// put all tracks for all courses on display
	putAllTracksOnDisplay : function() {
    var i;
    var l;
    l = this.results.length;
		for (i = 0; i < l; i += 1) {
			this.results[i].putTrackOnDisplay();
		}
		this.updateTrackNames();
	},

	getDisplayedTrackNames : function() {
		var html = "";
		for (var i = 0; i < this.results.length; i += 1) {
			if (this.results[i].displayTrack) {
				html += "<p style='color:" + this.results[i].trackColour + ";'>" + rg2.getCourseName(this.results[i].courseid);
				html += ": " + this.results[i].name + "</p>";
			}
		}
		return html;
	},

	resultIDExists : function(resultid) {
		for (var i = 0; i < this.results.length; i += 1) {
			if (resultid === this.results[i].resultid) {
				return true;
			}
		}
		return false;
	},

	getSplitsForID : function(resultid) {
		for (var i = 0; i < this.results.length; i += 1) {
			if (resultid === this.results[i].resultid) {
				return this.results[i].splits;
			}
		}
		return rg2.config.SPLITS_NOT_FOUND;
	},

	getTimeForID : function(resultid) {
		for (var i = 0; i < this.results.length; i += 1) {
			if (resultid === this.results[i].resultid) {
				return this.results[i].time;
			}
		}
		return rg2.config.TIME_NOT_FOUND;
	},

	removeAllTracksFromDisplay : function() {
		for (var i = 0; i < this.results.length; i += 1) {
			this.results[i].removeTrackFromDisplay();
		}
		this.updateTrackNames();
	},

	removeTracksFromDisplay : function(courseid) {
		for (var i = 0; i < this.results.length; i += 1) {
			if (this.results[i].courseid == courseid) {
				this.results[i].removeTrackFromDisplay();
			}
		}
		this.updateTrackNames();
	},

	addTracks : function(tracks) {
		// this gets passed the json data array
		var resultIndex;
		var i;
		var j;
		var l;
		// for each track
		l = tracks.length;
		for (i = 0; i < l; i += 1) {
			resultIndex = tracks[i].resultid;
			j = 0;
			// don't add GPS track since we got a better one in the original results
			if (resultIndex < rg2.config.GPS_RESULT_OFFSET) {
				// loop through all results and add it against the correct id
				while (j < this.results.length) {
					if (resultIndex == this.results[j].resultid) {
						this.results[j].addTrack(tracks[i]);
						break;
					}
					j += 1;
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

	sortByCourseIDThenResultID : function(a, b) {
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
    var i;
    var l;
    l = this.results.length;
		for (i = 0; i < l; i += 1) {
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
		}
		
		if (html === "") {
			html = "<p>No results available.</p>";
		} else {
			html += "</table></div></div>";
		}
		return html;
	},

	createNameDropdown : function(courseid) {
		$("#rg2-name-select").empty();
		var dropdown = document.getElementById("rg2-name-select");
		var opt = document.createElement("option");
		opt.value = null;
		opt.text = 'Select name';
		dropdown.options.add(opt);
		for (var i = 0; i < this.results.length; i += 1) {
			// don't include result if it has a valid track already
			if ((this.results[i].courseid === courseid) && (!this.results[i].hasValidTrack)) {
				opt = document.createElement("option");
				opt.value = i;
				opt.text = this.results[i].name;
				dropdown.options.add(opt);
			}
		}
		dropdown.options.add(opt);
	}
};

function Result(data, isScoreEvent, colour) {
	// resultid is the kartat id value
	this.resultid = data.resultid;
	this.isScoreEvent = isScoreEvent;
	// GPS track ids are normal resultid + GPS_RESULT_OFFSET
	if (this.resultid >= rg2.config.GPS_RESULT_OFFSET) {
		//this.name = (data.name).replace("GPS ", "");
		this.isGPSTrack = true;
	} else {
		//this.name = data.name;
		this.isGPSTrack = false;
	}
	this.name = data.name;
	this.initials = this.getInitials(this.name);
	this.starttime = data.starttime;
	this.time = data.time;
	// get round iconv problem in API for now
	if (data.comments !== null) {
		// escape single quotes so that tooltips show correctly
		this.comments = data.comments.replace("'", "&apos;");
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

	if (data.scoreref !== "") {
		// save control locations for score course result
		this.scorex = data.scorex;
		this.scorey = data.scorey;
	}

	// calculated cumulative distance in pixels
	this.cumulativeDistance = [];
	// set true if track includes all expected controls in correct order or is a GPS track
	this.hasValidTrack = false;
	this.displayTrack = false;
	this.trackColour = colour;
	// raw track data
	this.trackx = [];
	this.tracky = [];
	// interpolated times
	this.xysecs = [];
	if (this.isGPSTrack) {
		// don't get time or splits so need to copy them in from (GPS_RESULT_OFFSET - resultid)
		this.time = rg2.getTimeForID(this.resultid - rg2.config.GPS_RESULT_OFFSET);
		// allow for events with no results where there won't be a non-GPS result
		if (this.time === rg2.config.TIME_NOT_FOUND) {
      this.time = data.time;
		}
		this.splits = rg2.getSplitsForID(this.resultid - rg2.config.GPS_RESULT_OFFSET);

	}
  this.legpos = [];
	if (data.gpsx.length > 0) {
     this.addTrack(data);
	}

  }

Result.prototype = {
	Constructor : Result,

	putTrackOnDisplay : function() {
		if (this.hasValidTrack) {
			this.displayTrack = true;
		}
	},

	removeTrackFromDisplay : function() {
		if (this.hasValidTrack) {
			this.displayTrack = false;
		}
	},
	
	addTrack: function(data) {
    // copy arrays but ignore first value: that's just how it needs to work
    this.trackx = data.gpsx;
    this.tracky = data.gpsy;
    this.trackx.splice(0,1);
    this.tracky.splice(0,1);
    var trackOK;
    if (this.isGPSTrack) {
      trackOK = this.expandGPSTrack();
    } else {
      trackOK = this.expandNormalTrack();
    }
    if (trackOK) {
      rg2.incrementTracksCount(this.courseid);
    }
	},

	drawTrack : function(showThreeSeconds) {
		var l;
		if (this.displayTrack) {
			rg2.ctx.lineWidth = rg2.getRouteWidth();
			rg2.ctx.strokeStyle = this.trackColour;
			rg2.ctx.globalAlpha = 1.0;
      rg2.ctx.fillStyle = this.trackColour;
      rg2.ctx.font = '10pt Arial';
      rg2.ctx.textAlign = "left";
			// set transparency of overprint
			rg2.ctx.beginPath();
			rg2.ctx.moveTo(this.trackx[0], this.tracky[0]);
      var oldx = this.trackx[0];
      var oldy = this.tracky[0];
      var stopCount = 0;
			l = this.trackx.length;
			for (var i = 1; i < l; i += 1) {
				// lines
				rg2.ctx.lineTo(this.trackx[i], this.tracky[i]);
        if ((this.trackx[i] === oldx) && (this.tracky[i] === oldy)) {
          // we haven't moved
          stopCount += 1;
        } else {
          // we have started moving again
          if (stopCount > 0) {
            if (!this.isGPSTrack || (this.isGPSTrack && showThreeSeconds)) {
              rg2.ctx.fillText("+" + (3 * stopCount), oldx + 5, oldy + 5);
            }
            stopCount = 0;
          }
        }
        oldx = this.trackx[i];
        oldy = this.tracky[i];
			}
			rg2.ctx.stroke();
		}
	},

	expandNormalTrack : function() {
		// add times and distances at each position
		this.xysecs[0] = 0;
		this.cumulativeDistance[0] = 0;
		// get course details
		var course = {};
		// each person has their own defined score course
		if (this.isScoreEvent) {
			course.x = this.scorex;
			course.y = this.scorey;
		} else {
			course.x = rg2.getCourseDetails(this.courseid).x;
			course.y = rg2.getCourseDetails(this.courseid).y;
		}
		// read through list of controls and copy in split times
		var nextcontrol = 1;
		var nextx = course.x[nextcontrol];
		var nexty = course.y[nextcontrol];
		var dist = 0;
		var oldx = this.trackx[0];
		var oldy = this.tracky[0];
		var i;
		var j;
		var l;
		var x = 0;
		var y = 0;
		var deltat = 0;
		var deltadist = 0;
		var olddist = 0;
		var oldt = 0;
		var previouscontrolindex = 0;
		// we are assuming the track starts at the start which is index 0...
		// look at each track point and see if it matches the next control location
		l = this.trackx.length;
		for ( i = 1; i < l; i += 1) {
			// calculate distance while we are looping through
			x = this.trackx[i];
			y = this.tracky[i];
			dist += getDistanceBetweenPoints(x, y, oldx, oldy);
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
				for (j = previouscontrolindex; j <= i; j += 1) {
					this.xysecs[j] = oldt + Math.round(((this.cumulativeDistance[j] - olddist) * deltat / deltadist));
				}
				previouscontrolindex = i;
				nextcontrol += 1;
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
		if (this.isScoreEvent) {
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
		var l = this.trackx.length;
		for ( t = 0; t < l; t += 1) {
			this.xysecs[t] = 3 * t;
			x = this.trackx[t];
			y = this.tracky[t];
			dist += getDistanceBetweenPoints(x, y, oldx, oldy);
			this.cumulativeDistance[t] = Math.round(dist);
			oldx = x;
			oldy = y;
		}
		this.hasValidTrack = true;
		return this.hasValidTrack;

	},

	getCourseName : function() {
		if (this.coursename !== "") {
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
	},
	
  getInitials : function (name) {
    // converts name to initials
    // remove white space at each end
    name.trim();
    var i;
    var addNext;
    var len = name.length;
    var initials = "";
    if (len === 0) {
      return "";
    }
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
/*global rg2:false */
/*exported Runner */
// animated runner details
function Runner(resultid) {
	var res = rg2.getFullResult(resultid);
	this.name = res.name;
	this.initials = res.initials;
	// careful: we need the index into results, not the resultid from the text file
	this.runnerid = resultid;
	this.starttime = res.starttime;
	this.splits = res.splits;
	this.legpos = res.legpos;
	this.colour = res.trackColour;
	// get course details
	var course = rg2.getCourseDetails(res.courseid);
	this.coursename = course.name;
	// used to stop runners when doing replay by control
	this.nextStopTime = rg2.config.VERY_HIGH_TIME_IN_SECS;
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
		for ( xy = 1; xy < res.xysecs.length; xy += 1) {
			tox = res.trackx[xy];
			toy = res.tracky[xy];
			diffx = tox - fromx;
			diffy = toy - fromy;
			dist = dist + Math.sqrt(((tox - fromx) * (tox - fromx)) + ((toy - fromy) * (toy - fromy)));
			diffdist = dist - fromdist;
			timeatxy = res.xysecs[xy];
			difft = timeatxy - timeatprevxy;
			for ( t = timeatprevxy + 1; t < timeatxy; t += 1) {
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
		for ( control = 1; control < course.codes.length; control += 1) {
			tox = course.x[control];
			toy = course.y[control];
			diffx = tox - fromx;
			diffy = toy - fromy;
			dist = dist + Math.sqrt(((tox - fromx) * (tox - fromx)) + ((toy - fromy) * (toy - fromy)));
			diffdist = dist - fromdist;
			timeatcontrol = res.splits[control];
			difft = timeatcontrol - timeatprevcontrol;
			for ( t = timeatprevcontrol + 1; t < timeatcontrol; t += 1) {
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

	if (course.codes !== undefined) {
		for ( control = 1; control < course.codes.length; control += 1) {
			this.cumulativeTrackDistance[control] = Math.round(cumulativeDistance[res.splits[control]]);
			this.legTrackDistance[control] = this.cumulativeTrackDistance[control] - this.cumulativeTrackDistance[control - 1];
		}
	}

	res = 0;
	course = 0;
}
