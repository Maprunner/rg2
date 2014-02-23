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
    var events;
    var courses;
    var results;
    var controls;
    var animation;
    var manager;
    var drawing;
    var infoPanelMaximised;
    var infoHideIconSrc;
    var infoShowIconSrc;
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
      TAB_LOGOUT : 7,
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
      START_TRIANGLE_HEIGHT : 40,
      // parameters for call to draw courses
      DIM : 0.75,
      FULL_INTENSITY : 1.0,
      // values of event format
      NORMAL_EVENT : 1,
      EVENT_WITHOUT_RESULTS : 2,
      SCORE_EVENT : 3,
      // version gets set automatically by grunt file during build process
      RG2VERSION: '0.5.4',
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
      mapLoadingText = "Select an event";
      mapIntensity = config.FULL_INTENSITY;
      overprintWidth = config.DEFAULT_OVERPRINT_LINE_THICKNESS;
      routeWidth = config.DEFAULT_ROUTE_THICKNESS;
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

      // initially loaded file has a close icon
      infoHideIconSrc = $("#rg2-resize-info-icon").attr("src");
      infoShowIconSrc = infoHideIconSrc.replace("hide-info", "show-info");

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
        manager = new Manager();
        $("#rg2-animation-controls").hide();
        $("#rg2-create-tab").hide();
        $("#rg2-edit-tab").hide();
        $("#rg2-logout-tab").hide();
        $("#rg2-manage-login").show();
        $rg2infopanel.tabs("disable", config.TAB_EVENTS);
        $("#rg2-draw-tab").hide();
        $("#rg2-results-tab").hide();
        $("#rg2-courses-tab").hide();
        $("#rg2-events-tab").hide();
        $rg2infopanel.tabs("option", "active", config.TAB_LOGIN);
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
        resetMapState();
      }, false);

      // disable right click menu: may add our own later
      $(document).bind("contextmenu", function(evt) {
        evt.preventDefault();
      });

      // load event details
      $.getJSON(json_url, {
        type : "events",
        cache : false
      }).done(function(json) {
        console.log("Events: " + json.data.length);
        $.each(json.data, function() {
          events.addEvent(new Event(this));
        });
        createEventMenu();
      }).fail(function(jqxhr, textStatus, error) {
        var err = textStatus + ", " + error;
        console.log("Events request failed: " + err);
      });

      setTimeout(function() {$("#rg2-container").show();}, 1000);
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
        $("#rg2-resize-info-icon").attr("src", infoShowIconSrc);
        $("#rg2-resize-info").prop("title", "Show info panel");
        $("#rg2-hide-info-panel-control").css("left", "0px");
        $("#rg2-hide-info-panel-icon").removeClass("fa-chevron-left").addClass("fa-chevron-right").prop("title", "Show info panel");
        $rg2infopanel.hide();
      } else {
        infoPanelMaximised = true;
        $("#rg2-resize-info-icon").attr("src", infoHideIconSrc);
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
    
    function showThreeSeconds() {
     return $("#chk-show-three-seconds").prop('checked');
    }

    function getEventInfo(id) {
      return events.getEventInfo(id);  
    }
    
    function getCoursesForEvent(id) {
      return courses.getCoursesForEvent(id);  
    }
    
    return {
      // functions and variables available elsewhere
      init : init,
      config : config,
      redraw : redraw,
      getOverprintWidth: getOverprintWidth,
      getRouteWidth: getRouteWidth,
      ctx : ctx,
      getMapSize : getMapSize,
      loadNewMap : loadNewMap,
      loadEvent : loadEvent,
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
      getCoursesForEvent: getCoursesForEvent
    };

  }());

$(document).ready(rg2.init);
