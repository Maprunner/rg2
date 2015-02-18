/*
* Routegadget 2
* https://github.com/Maprunner/rg2
*
* Copyright (c) 2014 Simon Errington and contributors
* Licensed under the MIT license.
* https://github.com/Maprunner/rg2/blob/master/LICENSE
*/
/*global rg2Config:false */
/*global $:false */
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
/*global setTimeout:false */
/*global localStorage:false */
var rg2 = ( function(window, $) {
    'use strict';
    var canvas = $("#rg2-map-canvas")[0];
    var ctx = canvas.getContext('2d');
    var dictionary;
    var map;
    var mapLoadingText;
    var events;
    var courses;
    var results;
    var controls;
    var colours;
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
      // translated when output so leave as English here
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
      RUNNER_DOT_RADIUS : 6,
      // parameters for call to draw courses
      DIM : 0.75,
      FULL_INTENSITY : 1.0,
      // values of event format
      NORMAL_EVENT : 1,
      EVENT_WITHOUT_RESULTS : 2,
      SCORE_EVENT : 3,
      // version gets set automatically by grunt file during build process
      RG2VERSION: '1.0.4',
      TIME_NOT_FOUND : 9999,
      SPLITS_NOT_FOUND : 9999,
      // values for evt.which 
      RIGHT_CLICK : 3
    };
    
    var options = {
      // initialised to default values: overwritten from storage later
      mapIntensity: 100,
      routeIntensity: 100,
      replayFontSize: 12,
      courseWidth: 3,
      routeWidth: 4,
      circleSize: 20,
      snap: true,
      showThreeSeconds: false,
      showGPSSpeed: false
    };

		Number.prototype.toRad = function() {
			return this * Math.PI / 180;
		};

		function Colours() {
		// used to generate track colours: add extra colours as necessary
		this.colours = ["#ff0000", "#ff8000",  "#ff00ff", "#ff0080", "#008080", "#008000", "#0080ff", "#0000ff", "#8000ff", "#808080"];
		//this.colours = ["#ff0000", "#ff8000",  "#ff00ff", "#ff0080", "#008080", "#008000", "#00ff00", "#0080ff", "#0000ff", "#8000ff", "#00ffff", "#808080"];

		this.colourIndex = 0;
		}

		Colours.prototype = {
			Constructor : Colours,

			getNextColour : function() {
				this.colourIndex = (this.colourIndex + 1) % this.colours.length;
				return this.colours[this.colourIndex];
			}
		};
		
		function RequestedHash() {
			this.id = 0;
			this.courses = [];
			this.routes = [];
		}
		
		RequestedHash.prototype = {
			Constructor : RequestedHash,

			parseHash : function(hash) {
			try {
				var fields;
				var i;
				// input looks like #id&course=a,b,c&result=x,y,z
				fields = hash.split('&');
				for (i= 0; i < fields.length; i += 1) {
					fields[i] = fields[i].toLowerCase();
					if (fields[i].search('#') !== -1) {
						this.id = parseInt(fields[i].replace("#", ""), 10);
					}
					if (fields[i].search('course=') !== -1) {
						this.courses = fields[i].replace("course=", "").split(',');
					}
					if (fields[i].search('route=') !== -1) {
						this.routes = fields[i].replace("route=", "").split(',');
					}
				}
				// convert to integers
				this.courses = this.courses.map(Number);
				this.routes = this.routes.map(Number);
				
      } catch (e) {
				this.id = 0;
				this.courses.length = 0;
				this.routes.length = 0;
      }
			},
			
			getRoutes : function() {
				return this.routes;
			},
			
			getCourses : function() {
				return this.courses;
			},

			getID : function() {
				return this.id;
			},

			getTab : function() {
				if (this.routes.length > 0) {
					return config.TAB_RESULTS;
				}
				return config.TAB_COURSES;
			},
			
			setCourses : function () {
				this.courses = courses.getCoursesOnDisplay();
				window.history.pushState('', '', this.getHash());
			},

			setRoutes : function () {
				this.routes = results.getTracksOnDisplay();
				window.history.pushState('', '', this.getHash());
			},
			
			setNewEvent : function (id) {
				this.id = id;
				this.courses.length = 0;
				this.routes.length = 0;
				window.history.pushState('', '', this.getHash());
			},
			
			getHash : function () {
				var hash;
				var i;
				if (this.id === 0) {
					return '#0';
				} else {
					hash = '#' + this.id;
				}
				if (this.courses.length > 0) {
					hash += '&course=';
					for (i = 0; i < this.courses.length; i += 1) {
						if (i > 0) {
							hash += ',';
						}
						hash += this.courses[i];
					}
				}
				if (this.routes.length > 0) {
					hash += '&route=';
					for (i = 0; i < this.routes.length; i += 1) {
						if (i > 0) {
							hash += ',';
						}
						hash += this.routes[i];
					}
				}
				return hash;
			}
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
      setLanguageOptions();
      setConfigOptions();
      initialiseButtons();
      initialiseSpinners();
      configureUI();
      translateFixedText();

      map = new Image();
      events = new Events();
      courses = new Courses();
      colours = new Colours();
      results = new Results();
      controls = new Controls();
      animation = new Animation();
      drawing = new Draw();
      dragStart = null;
      // looks odd but this works for initialisation
      dragged = true;
      infoPanelMaximised = true;

      if (managing) {
        setManagerOptions();
        mapLoadingText = "";
      } else {
        // translated when displayed
        mapLoadingText = "Select an event";
      }
      setUpCanvas();
      // disable right click menu: may add our own later
      $(document).bind("contextmenu", function(evt) {
        evt.preventDefault();
      });
      startDisplayingInfo();
    }
    
    function startDisplayingInfo() {
      requestedHash = new RequestedHash();
      // check if a specific event has been requested
      if ((window.location.hash) && (!managing)) {
        requestedHash.parseHash(window.location.hash);
      }
      // load event details
      loadEventList();
      // slight delay looks better than going straight in....
      setTimeout(function() {$("#rg2-container").show();}, 500);
    }
    
    function configureUI() {
      // disable tabs until we have loaded something
      $rg2infopanel.tabs({
        disabled : [config.TAB_COURSES, config.TAB_RESULTS, config.TAB_DRAW],
        active : config.TAB_EVENTS,
        heightStyle : "content",
        activate : function() {
          tabActivated();
        }
      });
      $("#rg2-result-list").accordion({
        collapsible : true,
        heightStyle : "content"
      });
      $("#rg2-clock").text("00:00:00");
      $("#rg2-clock-slider").slider({
        slide : function(event, ui) {
          // passes slider value as new time
          animation.clockSliderMoved(ui.value);
        }
      });
      $("#rg2-header-container").css("color", rg2Config.header_text_colour).css("background", rg2Config.header_colour);
      $("#rg2-about-dialog").hide();
      $("#rg2-splits-display").hide();
      $("#rg2-track-names").hide();
      $("#rg2-add-new-event").hide();
      $("#rg2-load-progress-bar").progressbar({value: false});
      $("#rg2-load-progress-label").text("");
      $("#rg2-load-progress").hide();
      $("#rg2-option-controls").hide();
      $("#rg2-animation-controls").hide();
      $("#rg2-splitsbrowser").hide();
      setUIEventHandlers();
    }
    
    function setUIEventHandlers() {
      $("#rg2-resize-info").click(function() {
        resizeInfoDisplay();
      });
      $("#rg2-hide-info-panel-control").click(function() {
        resizeInfoDisplay();
      });
      $("#rg2-control-select").prop('disabled', true).change(function() {
        animation.setStartControl($("#rg2-control-select").val());
      });
      $("#rg2-name-select").prop('disabled', true).change(function() {
        drawing.setName(parseInt($("#rg2-name-select").val(), 10));
      });
      $("#rg2-course-select").change(function() {
        drawing.setCourse(parseInt($("#rg2-course-select").val(), 10));
      });
      $("#rg2-enter-name").click(function() {
        drawing.setNameAndTime();
      }).keyup(function() {
        drawing.setNameAndTime();
      });
      $('#rg2-new-comments').focus(function() {
        // Clear comment box if user focuses on it and it still contains default text
        var text = $("#rg2-new-comments").val();
        if (text === t(config.DEFAULT_NEW_COMMENT)) {
          $('#rg2-new-comments').val("");
        }
      });
      $("#chk-snap-toggle").prop('checked', options.snap).click(function(event) {
        if (event.target.checked) {
          options.snap = true;
        } else {
          options.snap = false;
        }
      });
      $("#chk-show-three-seconds").prop('checked', options.showGPSSpeed).click(function() {
        redraw(false);
      });
      $("#chk-show-GPS-speed").prop('checked', options.showGPSSpeed).click(function() {
        redraw(false);
      });
      $("#rg2-select-language").click(function() {
        var newlang;
        newlang = $("#rg2-select-language").val();
        if (newlang !== dictionary.code) {
          if (newlang === 'en') {
            dictionary = {};
            dictionary.code = 'en';
            setNewLanguage();
          } else {
            getNewLanguage(newlang);
          }
        }
      });
      $("#rg2-load-gps-file").change(function(evt) {
        drawing.uploadGPS(evt);
      });
    }
    
    function initialiseButtons() {
      $("#btn-about").click(function() {
        displayAboutDialog();
      });
      $("#btn-faster").click(function() {
        animation.goFaster();
      });
      $("#btn-full-tails").prop('checked', false).click(function(event) {
        if (event.target.checked) {
          animation.setFullTails(true);
          $("#spn-tail-length").spinner("disable");
        } else {
          animation.setFullTails(false);
          $("#spn-tail-length").spinner("enable");
        }
      });
      $("#btn-mass-start").addClass('active').click(function() {
        animation.setReplayType(config.MASS_START_REPLAY);
      });
      $("#btn-move-all").prop('checked', false);
      $("#btn-options").click(function() {
        displayOptionsDialog();
      });
      $("#btn-real-time").removeClass('active').click(function() {
        animation.setReplayType(config.REAL_TIME_REPLAY);
      });
      $("#btn-reset").click(function() {
        resetMapState();
      });
      $("#btn-reset-drawing").button().button("disable").click(function() {
        drawing.resetDrawing();
      });
      $("#btn-save-gps-route").button().button("disable").click(function() {
        drawing.saveGPSRoute();
      });
      $("#btn-save-route").button().button("disable").click(function() {
        drawing.saveRoute();
      });
      $("#btn-show-splits").click(function() {
        $("#rg2-splits-table")
        .empty()
        .append(animation.getSplitsTable())
        .dialog({
          width : 'auto',
          dialogClass: "rg2-splits-table",
          buttons : {
            Ok : function() {
              $(this).dialog('close');
            }
          }
        });
      }).hide();
      $("#btn-slower").click(function() {
        animation.goSlower();
      });
      $("#btn-start-stop").click(function() {
        animation.toggleAnimation();
      });
      $("#btn-three-seconds").button().click(function() {
        drawing.waitThreeSeconds();
      }).button("disable");
      $("#btn-toggle-controls").click(function() {
        controls.toggleControlDisplay();
        redraw(false);
      }).hide();
      $("#btn-toggle-names").click(function() {
        animation.toggleNameDisplay();
        redraw(false);
      }).hide();
      $("#btn-undo").button().button("disable").click(function() {
        drawing.undoLastPoint();
      });
      $("#btn-undo-gps-adjust").button().button("disable").click(function() {
        drawing.undoGPSAdjust();
      });
      $("#btn-zoom-in").click(function() {
        zoom(1);
      });
      $("#btn-zoom-out").click(function() {
        zoom(-1);
      });
      $("#rg2-load-gps-file").button().button("disable");
    }
    
    function initialiseSpinners() {
      $("#spn-control-circle").spinner({
        max : 50,
        min : 3,
        step: 1,
        spin : function(event, ui) {
          options.circleSize = ui.value;
          redraw(false);
        }
      }).val(options.circleSize);
      $("#spn-course-width").spinner({
        max : 10,
        min : 1,
        step: 0.5,
        spin : function(event, ui) {
          options.courseWidth = ui.value;
          redraw(false);
        }
      }).val(options.courseWidth);
      $("#spn-map-intensity").spinner({
        max : 100,
        min : 0,
        step: 10,
        numberFormat: "n",
        spin : function(event, ui) {
          options.mapIntensity = ui.value;
          redraw(false);
        }
      }).val(options.mapIntensity);
      $("#spn-name-font-size").spinner({
        max : 30,
        min : 5,
        step: 1,
        numberFormat: "n",
        spin : function(event, ui) {
          options.replayFontSize = ui.value;
          redraw(false);
        }
      }).val(options.replayFontSize);
      $("#spn-route-intensity").spinner({
        max : 100,
        min : 0,
        step: 10,
        numberFormat: "n",
        spin : function(event, ui) {
          options.routeIntensity = ui.value;
          redraw(false);
        }
      }).val(options.routeIntensity);
      $("#spn-route-width").spinner({
        max : 10,
        min : 1,
        step: 0.5,
        spin : function(event, ui) {
          options.routeWidth = ui.value;
          redraw(false);
        }
      }).val(options.routeWidth);
      // set default to 0 secs = no tails
      $("#spn-tail-length").spinner({
        max : 600,
        min : 0,
        spin : function(event, ui) {
          animation.setTailLength(ui.value);
        }
      }).val(0);
    }
    
    function setLanguageOptions() {
      // use English unless a dictionary was passed in  
      if (typeof rg2Config.dictionary === 'undefined') {
        dictionary = {};
        dictionary.code = 'en';
      } else {
        dictionary = rg2Config.dictionary;
      }
      createLanguageDropdown();
    }
    
    function setConfigOptions() {
      try {
        if (('localStorage' in window) && (window.localStorage !== null)) {
          if (localStorage.getItem( 'rg2-options') !== null) {
            options = JSON.parse(localStorage.getItem( 'rg2-options'));
            // best to keep this at default?
            options.circleSize = 20;
            if (options.mapIntensity === 0) {
              rg2.showWarningDialog("Warning", "Your saved settings have 0% map intensity so the map is invisible. You can adjust this on the configuration menu");
            }
          }
        }
      } catch (e) {
        // storage not supported so just continue
        console.log('Local storage not supported');
      }
    }
    
    function setManagerOptions() {
      manager = new Manager(rg2Config.keksi);
      $("#rg2-animation-controls").hide();
      $("#rg2-create-tab").hide();
      $("#rg2-edit-tab").hide();
      $("#rg2-map-tab").hide();
      $("#rg2-manage-login").show();
      $("#rg2-draw-tab").hide();
      $("#rg2-results-tab").hide();
      $("#rg2-courses-tab").hide();
      $("#rg2-events-tab").hide();
      $rg2infopanel.tabs("disable", config.TAB_EVENTS).tabs("option", "active", config.TAB_LOGIN);
    }
    
    function setUpCanvas() {
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
    }
    
    // translation function
    function t(str) {
      if (dictionary.hasOwnProperty(str)) {
        return dictionary[str];
      } else {
        return str;
      }
    }
    
    function translateFixedText() {
      var temp;
      $("#rg2-events-tab a").text(t('Events'));
      $("#rg2-courses-tab a").text(t('Courses'));
      $("#rg2-results-tab a").text(t('Results'));
      $("#rg2-draw-tab a").text(t('Draw'));
      $("#rg2-hide-info-panel-icon").prop("title", t("Hide info panel"));
      $('#btn-about').prop('title', t('Help'));
      $('#btn-options').prop('title', t('Options'));
      $('#btn-zoom-out').prop('title', t('Zoom out'));
      $('#btn-zoom-in').prop('title', t('Zoom in'));
      $('#btn-reset').prop('title', t('Reset'));
      $('#btn-show-splits').prop('title', t('Splits'));
      temp = $('#btn-toggle-controls').prop('title');
      $('#btn-toggle-controls').prop('title', t(temp));
      temp = $('#btn-toggle-names').prop('title');
      $('#btn-toggle-names').prop('title', t(temp));
      $('#rg2-splits-table').prop('title', t('Splits table'));
      $('#btn-slower').prop('title', t('Slower'));
      $('#btn-faster').prop('title', t('Faster'));
      temp = $('#btn-start-stop').prop('title');
      $('#btn-start-stop').prop('title', t(temp));
      $('#btn-real-time').prop('title', t('Real time'));
      $('#btn-mass-start').prop('title', t('Mass start'));
      $('label[for=rg2-control-select]').prop('textContent', t('Start at'));
      $('label[for=btn-full-tails]').prop('textContent', t('Full tails'));
      $('label[for=spn-tail-length]').prop('textContent', t('Length'));
      $('.rg2-options-dialog .ui-dialog-title').text(t('Configuration options'));
      $('label[for=rg2-select-language]').prop('textContent', t('Language'));
      $('label[for=spn-map-intensity]').prop('textContent', t('Map intensity %'));
      $('label[for=spn-route-intensity]').prop('textContent', t('Route intensity %'));
      $('label[for=spn-route-width]').prop('textContent', t('Route width'));
      $('label[for=spn-name-font-size]').prop('textContent', t('Replay label font size'));
      $('label[for=spn-course-width]').prop('textContent', t('Course overprint width'));
      $('label[for=spn-control-circle]').prop('textContent', t('Control circle size'));
      $('label[for=chk-snap-toggle]').prop('textContent', t('Snap to control when drawing'));
      $('label[for=chk-show-three-seconds]').prop('textContent', t('Show +3 time loss for GPS routes'));
      $('label[for=chk-show-GPS-speed]').prop('textContent', t('Show GPS speed colours'));
      $('#btn-undo').button('option', 'label', t('Undo'));
      $('#btn-undo-gps-adjust').button('option', 'label', t('Undo'));
      $('#btn-save-route').button('option', 'label', t('Save'));
      $('#btn-reset-drawing').button('option', 'label', t('Reset'));
      $('#btn-three-seconds').button('option', 'label', t('+3 sec'));
      $('#btn-save-gps-route').button('option', 'label', t('Save GPS route'));
      $('#rg2-draw-title').text(t('Draw route'));
      $('#draw-text-1').text(t('Left click to add/lock/unlock a handle'));
      $('#draw-text-2').text(t('Green - draggable'));
      $('#draw-text-3').text(t('Red - locked'));
      $('#draw-text-4').text(t('Right click to delete a handle'));
      $('#draw-text-5').text(t('Drag a handle to adjust track around locked point(s)'));
      $('#rg2-load-gps-title').text(t('Load GPS file (GPX or TCX)'));
      $('label[for=rg2-course-select]').prop('textContent', t('Select course'));
      $('label[for=rg2-name-select]').prop('textContent', t('Select name'));
      $('label[for=btn-move-all]').prop('textContent', t('Move track and map together (or right click-drag)'));
    }
    
    function createLanguageDropdown() {
      $("#rg2-select-language").empty();
      var dropdown = document.getElementById("rg2-select-language");
      var i;
      var opt;
      var languages;
      opt = document.createElement("option");
      opt.value = "en";
      opt.text = "en: English";
      if (dictionary.code === "en") {
        opt.selected = true;
      }
      dropdown.options.add(opt);
      for (i in rg2Config.languages) {
        if (rg2Config.languages.hasOwnProperty(i)) {
          opt = document.createElement("option");
          opt.value = i;
          opt.text = i + ": " + rg2Config.languages[i];
          if (dictionary.code === i) {
            opt.selected = true;
          }
          dropdown.options.add(opt);
        }
      }
    }
    
    function getNewLanguage(lang) {
      $.getJSON(rg2Config.json_url, {
        id: lang,
        type: 'lang',
        cache : false
      }).done(function(json) {
        dictionary = json.data.dict;
        setNewLanguage();
      }).fail(function(jqxhr, textStatus, error) {
        reportJSONFail("Language request failed: " + error);
      });
    }
    
    function setNewLanguage() {
      $("#rg2-event-list").menu("destroy");
      createEventMenu();
      var eventid = events.getActiveEventID();
      if (eventid !== null) {
        courses.removeAllFromDisplay();
        results.removeAllTracksFromDisplay();
        animation.resetAnimation();
        drawing.initialiseDrawing(events.hasResults(eventid));
        createCourseMenu();
        createResultMenu();
      }
      translateFixedText();
      $rg2infopanel.tabs( "refresh" );
      redraw(false);
    }
    
    function reportJSONFail(errorText) {
      $("#rg2-load-progress").hide();
      $('body').css('cursor', 'auto');
      rg2.showWarningDialog('Configuration error', errorText);
    }
    
    function loadEventList() {
      $.getJSON(rg2Config.json_url, {
        type : "events",
        cache : false
      }).done(function(json) {
        console.log("Events: " + json.data.events.length);
        events.deleteAllEvents();
        $.each(json.data.events, function() {
          events.addEvent(new Event(this));
        });
        createEventMenu();
        // load requested event if set
        // input is kartat ID so need to find internal ID first
        if (requestedHash.getID()) {
          var eventID = events.getEventIDForKartatID(requestedHash.getID());
          if (eventID !== undefined) {
            loadEvent(eventID);
          }
        }
        if (managing) {
          manager.eventListLoaded();
        }
      }).fail(function(jqxhr, textStatus, error) {
        reportJSONFail("Events request failed: " + error);
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
      setTitleBar();
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
      ctx.globalAlpha = (options.mapIntensity / 100);

      if (map.height > 0) {
        // using non-zero map height to show we have a map loaded
        ctx.drawImage(map, 0, 0);
        var active = $rg2infopanel.tabs("option", "active");
        if (active === config.TAB_DRAW) {
          courses.drawCourses(config.DIM);
          controls.drawControls(false);
          results.drawTracks();
          drawing.drawNewTrack();
        } else {
          if (active === config.TAB_CREATE) {
            manager.drawControls();
          } else {
            courses.drawCourses(config.FULL_INTENSITY);
            results.drawTracks();
            controls.drawControls(false);
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
        ctx.fillText(t(mapLoadingText), canvas.width / 2, canvas.height / 2);
      }

    }

    function displayAboutDialog() {
      $("#rg2-event-stats").empty().html(getEventStats());
      $("#rg2-about-dialog").dialog({
        width : Math.min(1000, (canvas.width * 0.8)),
        maxHeight : Math.min(1000, (canvas.height * 0.9)),
        title: "RG2 Version " + config.RG2VERSION,
        dialogClass: "rg2-about-dialog",
        resizable: false,
        buttons : {
          Ok : function() {
            $(this).dialog("close");
          }
        }
      });
    }

    function displayOptionsDialog() {
      $("#rg2-option-controls").dialog({
        minWidth : 400,
        title: t("Configuration options"),
        dialogClass: "rg2-options-dialog",
        close: function() {
          saveConfigOptions();
        }
      });
    }
    
    function saveConfigOptions() {
      try {
        if (('localStorage' in window) && (window.localStorage !== null)) {
          options.snap = $("#chk-snap-toggle").prop('checked');
          options.showThreeSeconds = $("#chk-show-three-seconds").prop('checked');
          options.showGPSSpeed = $("#chk-show-GPS-speed").prop('checked');
          localStorage.setItem( 'rg2-options', JSON.stringify(options) );
        }
      } catch (e) {
        // storage not supported so just return
        return;
      }
    }

    function resizeInfoDisplay() {
      if (infoPanelMaximised) {
        infoPanelMaximised = false;
        $("#rg2-resize-info").prop("title", t("Show info panel"));
        $("#rg2-hide-info-panel-control").css("left", "0px");
        $("#rg2-hide-info-panel-icon").removeClass("fa-chevron-left").addClass("fa-chevron-right").prop("title", t("Show info panel"));
        $rg2infopanel.hide();
      } else {
        infoPanelMaximised = true;
        $("#rg2-resize-info").prop("title", t("Hide info panel"));
        $("#rg2-hide-info-panel-control").css("left", "366px");
        $("#rg2-hide-info-panel-icon").removeClass("fa-chevron-right").addClass("fa-chevron-left").prop("title", t("Hide info panel"));
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
    
    var handleInputMove = function() {
      if (dragStart) {
        var pt = ctx.transformedPoint(lastX, lastY);
        //console.log ("Mousemove after" + pt.x + ": " + pt.y);
        // simple debounce so that very small drags are treated as clicks instead
        if ((Math.abs(pt.x - dragStart.x) + Math.abs(pt.y - dragStart.y)) > 5) {
          if (drawing.gpsFileLoaded()) {
            drawing.adjustTrack(Math.round(dragStart.x), Math.round(dragStart.y), Math.round(pt.x), Math.round(pt.y), whichButton);
          } else {
            if ($rg2infopanel.tabs("option", "active") === config.TAB_CREATE) {
              manager.adjustControls(Math.round(dragStart.x), Math.round(dragStart.y), Math.round(pt.x), Math.round(pt.y), whichButton);
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
		
		function showWarningDialog(title, text) {
			var msg = '<div id=rg2-warning-dialog>' + text + '</div>';
			$(msg).dialog({
				title : title,
				dialogClass : "rg2-warning-dialog",
					close: function() {
					$('#rg2-warning-dialog').dialog('destroy').remove();
				}
			});
		}
		
		function getDistanceBetweenPoints(x1, y1, x2, y2) {
			// Pythagoras
			return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));
		}
    
    function getEventStats() {
      var stats;
      var coursearray;
      var resultsinfo;
      var runnercomments;
      var eventinfo;
      var id;
      id = events.getActiveEventID();
      // check there is an event to report on
      if (id === null) {
        return "";
      }
      id = events.getKartatEventID();
      eventinfo = events.getEventInfo(parseInt(id, 10));
      coursearray = courses.getCoursesForEvent();
      resultsinfo = results.getResultsInfo();
      runnercomments = results.getComments();
      stats = "<h3>" + t("Event statistics") + ": " + eventinfo.name + ": " + eventinfo.date + "</h3>";
      if (eventinfo.comment) {
        stats += "<p>" + eventinfo.comment + "</p>";
      }
      stats += "<p><strong>" + t("Courses") + ":</strong> " + coursearray.length + ". <strong>" + t("Results") + ":</strong> " + resultsinfo.results;
      stats += ". <strong> " + t("Controls") + ":</strong> " + eventinfo.controls + ".</p>";
      stats += "<p><strong>" + t("Routes") + ":</strong> " + resultsinfo.totalroutes + " (" +  resultsinfo.percent + "%). ";
      stats += "<strong>" + t("Drawn routes") + ":</strong> " + resultsinfo.drawnroutes +  ". <strong>" + t("GPS routes") + ":</strong> " + resultsinfo.gpsroutes + ".</p>";
      stats += "<p><strong>" + t("Total time") + ":</strong> " + resultsinfo.time + ".</p>";
      stats += "<p><strong>" + t("Map ") + ":</strong> ID " + events.getActiveMapID() + ", " + map.width + " x " + map.height + " pixels";
      if (eventinfo.georeferenced) {
        stats += ". " + t("Map is georeferenced") + ".</p>";
      } else {
        stats += ".</p>";
      }
      if (runnercomments) {
        stats += "<p><strong>" + t("Comments") + ":</strong></p>" + runnercomments ;
      }
      // #177 not pretty but gets round problems of double encoding
      stats = stats.replace(/&amp;/g, '&');
      return stats;
    }

    function createEventMenu() {
      //loads menu from populated events array
      var html = events.formatEventsAsMenu();
      $("#rg2-event-list").append(html).menu({
        select : function(event, ui) {
          loadEvent(ui.item[0].id);
					requestedHash.setNewEvent(events.getKartatEventID());
        }
      });
    }

    function loadEvent(eventid) {
      // highlight the selected event
      $('#rg2-event-list > li').removeClass('rg2-active-event').filter('#' + eventid).addClass('rg2-active-event');
      // show we are waiting
      $('body').css('cursor', 'wait');
      $("#rg2-load-progress-label").text(t("Loading courses"));
      $("#rg2-load-progress").show();
      courses.deleteAllCourses();
      controls.deleteAllControls();
      animation.resetAnimation();
      results.deleteAllResults();
      events.setActiveEventID(eventid);
      drawing.initialiseDrawing(events.hasResults(eventid));
      loadNewMap(rg2Config.maps_url + events.getMapFileName());
      redraw(false);
      setTitleBar();
      getCourses();
    }
    
    function getCourses() {
      // get courses for event
      $.getJSON(rg2Config.json_url, {
        id : events.getKartatEventID(),
        type : "courses",
        cache : false
      }).done(function(json) {
        $("#rg2-load-progress-label").text(t("Saving courses"));
        console.log("Courses: " + json.data.courses.length);
        $.each(json.data.courses, function() {
          courses.addCourse(new Course(this, events.isScoreEvent()));
        });
        courses.updateCourseDropdown();
        courses.generateControlList(controls);
        $("#btn-toggle-controls").show();
        $("#btn-toggle-names").show();
        getResults();
      }).fail(function(jqxhr, textStatus, error) {
        reportJSONFail("Courses request failed for event " + events.getKartatEventID() + ": " + error);
      });
    }

    function setTitleBar() {
      var title;
      if (window.innerWidth >= config.BIG_SCREEN_BREAK_POINT) {
        title = events.getActiveEventName() + " " + events.getActiveEventDate();
        $rg2eventtitle.html(title).show();
      } else if (window.innerWidth > config.SMALL_SCREEN_BREAK_POINT) {
        title = events.getActiveEventName();
        $rg2eventtitle.html(title).show();
      } else {
        $rg2eventtitle.hide();
      }
      if (events.mapIsGeoreferenced()) {
        $("#rg2-event-title-icon").addClass("fa fa-globe");
      } else {
        $("#rg2-event-title-icon").removeClass("fa fa-globe");
      }
    }

    function loadNewMap(mapFile) {
      // translated when displayed
      mapLoadingText = "Loading map";
      map.src = mapFile;
    }

    function getResults() {
      $("#rg2-load-progress-label").text(t("Loading results"));
      $.getJSON(rg2Config.json_url, {
        id : events.getKartatEventID(),
        type : "results",
        cache : false
      }).done(function(json) {
        console.log("Results: " + json.data.results.length);
        $("#rg2-load-progress-label").text(t("Saving results"));
        var isScoreEvent = events.isScoreEvent();
        // TODO remove temporary (?) fix to get round RG1 events with no courses defined: see #179
        if (courses.getNumberOfCourses() > 0 ) {
          results.addResults(json.data.results, isScoreEvent);
        }
        courses.setResultsCount();
        if (isScoreEvent) {
          controls.deleteAllControls();
          results.generateScoreCourses();
          courses.generateControlList(controls);
        }
        $("#rg2-result-list").accordion("refresh");
        getGPSTracks();
      }).fail(function(jqxhr, textStatus, error) {
        reportJSONFail("Results request failed for event " + events.getKartatEventID() + ": " + error);
      });
    }

    function getGPSTracks() {
      $("#rg2-load-progress-label").text(t("Loading routes"));
      $.getJSON(rg2Config.json_url, {
        id : events.getKartatEventID(),
        type : "tracks",
        cache : false
      }).done(function(json) {
        $("#rg2-load-progress-label").text(t("Saving routes"));
        console.log("Tracks: " + json.data.routes.length);
        // TODO remove temporary (?) fix to get round RG1 events with no courses defined: see #179        
        if (courses.getNumberOfCourses() > 0 ) {
          results.addTracks(json.data.routes);
        }
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
          // we have just reloaded following a save
          if (active !== config.TAB_DRAW) {
            $rg2infopanel.tabs("option", "active", requestedHash.getTab());
          }
          $rg2infopanel.tabs("refresh");
          $("#btn-show-splits").show();
          if ((rg2Config.enable_splitsbrowser) && (events.hasResults())) {
            $("#rg2-splitsbrowser").off().click(function() {
              window.open(rg2Config.json_url + "?type=splitsbrowser&id=" + events.getKartatEventID());
            }).show();
          } else {
            $("#rg2-splitsbrowser").off().hide();
          }
					// set up screen as requested in hash
					var i;
					var event = $.Event('click');
					event.target = {};
					event.target.checked = true;
					var routes = requestedHash.getRoutes();
					for (i = 0; i < routes.length; i += 1) {
						event.target.id = routes[i];
						$(".showtrack").filter("#" + routes[i]).trigger(event).prop('checked', true);
					}
					var crs = requestedHash.getCourses();
					for (i = 0; i < crs.length; i += 1) {
						event.target.id = crs[i];
						$(".showcourse").filter("#" + crs[i]).trigger(event).prop('checked', true);
					}
        }
				$("#rg2-load-progress-label").text("");
				$("#rg2-load-progress").hide();
        redraw(false);
      }).fail(function(jqxhr, textStatus, error) {
        reportJSONFail("Routes request failed for event " + events.getKartatEventID() + ": " + error);
      });
    }

    function createCourseMenu() {
      //loads menu from populated courses array
      $("#rg2-course-table").empty().append(courses.formatCoursesAsTable());

      // checkbox on course tab to show a course
      $(".courselist").click(function(event) {
        var id = parseInt(event.currentTarget.id, 10);
        if (event.target.checked) {
          courses.putOnDisplay(id);
          // check box on results tab
          $(".showcourse").filter("#" + id).prop('checked', true);
        } else {
          courses.removeFromDisplay(id);
          // make sure the all checkbox is not checked
          $(".allcourses").prop('checked', false);
          // uncheck box on results tab
          $(".showcourse").filter("#" + id).prop('checked', false);
        }
        requestedHash.setCourses();
        redraw(false);
      });
      // checkbox on course tab to show all courses
      $(".allcourses").click(function(event) {
        if (event.target.checked) {
          courses.putAllOnDisplay();
          // select all the individual checkboxes for each course
          $(".courselist").prop('checked', true);
          // check all boxes on results tab
          $(".showcourse").prop('checked', true);
        } else {
          courses.removeAllFromDisplay();
          $(".courselist").prop('checked', false);
          // uncheck all boxes on results tab
          $(".showcourse").prop('checked', false);
        }
        requestedHash.setCourses();
        redraw(false);
      });
      // checkbox on course tab to show tracks for one course
      $(".tracklist").click(function(event) {
        var courseid = event.target.id;
        if (event.target.checked) {
          results.putTracksOnDisplay(parseInt(courseid, 10));
        } else {
          results.removeTracksFromDisplay(parseInt(courseid, 10));
          // make sure the all checkbox is not checked
          $(".alltracks").prop('checked', false);
        }
        requestedHash.setRoutes();
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
        requestedHash.setRoutes();
        redraw(false);
      });
    }
       
		function getAngle(x1, y1, x2, y2) {
			var angle = Math.atan2((y2 - y1), (x2 - x1));
			if (angle < 0) {
				angle = angle + (2 * Math.PI);
			}
			return angle;
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

		// converts MM:SS to seconds
		// but may also get hh:mm:ss sometimes
		// so allow for both based on number of :
		function getSecsFromMMSS(time) {
			if (!time) {
				return 0;
			}
			var secs = 0;
			var bits = time.split(":");
			if (bits.length === 2) {
				secs = (parseInt(bits[0], 10) * 60) + parseInt(bits[1], 10);
			} else {
				if (bits.length === 3) {
					secs = (parseInt(bits[0], 10) * 3600) + (parseInt(bits[1], 10) * 60) + parseInt(bits[2], 10);
				}
			}
			if (isNaN(secs)) {
				return 0;
			} else {
				return secs;
			}
		}

		function getSecsFromHHMMSS(time) {
			if (!time) {
				return 0;
			}
			var secs = 0;
			var bits = time.split(":");
			secs = (parseInt(bits[0], 10) * 3600) + (parseInt(bits[1], 10) * 60) + parseInt(bits[2], 10);
			if (isNaN(secs)) {
				return 0;
			} else {
				return secs;
			}
		}

		function getSecsFromHHMM(time) {
			if (!time) {
				return 0;
			}
			var secs = 0;
			var bits = time.split(":");
			secs = (parseInt(bits[0], 10) * 3600) + (parseInt(bits[1], 10) * 60);
			if (isNaN(secs)) {
				return 0;
			} else {
				return secs;
			}
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

    function createResultMenu() {
      //loads menu from populated result array
      var html = results.formatResultListAsAccordion();
      // #177 not pretty but gets round problems of double encoding
      html = html.replace(/&amp;/g, '&');
      $("#rg2-result-list").empty().append(html);
      $("#rg2-result-list").accordion("refresh");
      $rg2infopanel.tabs("refresh");
      setResultCheckboxes();
      // disable control dropdown if we have no controls
      if (courses.getHighestControlNumber() === 0) {
        $("#rg2-control-select").prop('disabled', true);
      } else {
        $("#rg2-control-select").prop('disabled', false);
      }
    }
    
    function setResultCheckboxes() {
      // checkbox to show a course
      $(".showcourse").click(function(event) {
        //Prevent opening accordion when check box is clicked
        event.stopPropagation();
        var id = event.target.id;
        if (event.target.checked) {
          courses.putOnDisplay(id);
           // check box on courses tab
          $(".courselist").filter("#" + id).prop('checked', true);
        } else {
          courses.removeFromDisplay(id);
           // uncheck box on courses tab
          $(".courselist").filter("#" + id).prop('checked', false);
          // make sure the all checkbox is not checked
          $(".allcourses").prop('checked', false);
        }
        requestedHash.setCourses();
        redraw(false);
      });
      // checkbox to show an individual score course
      $(".showscorecourse").click(function(event) {
        results.displayScoreCourse(parseInt(event.target.id, 10), event.target.checked);
        redraw(false);
      });
      // checkbox to show a result
      $(".showtrack").click(function(event) {
        if (event.target.checked) {
          results.putOneTrackOnDisplay(event.target.id);
        } else {
          results.removeOneTrackFromDisplay(event.target.id);
        }
        requestedHash.setRoutes();
        redraw(false);
      });
      // checkbox to animate a result
      $(".showreplay").click(function(event) {
        if (event.target.checked) {
          animation.addRunner(new Runner(parseInt(event.target.id, 10)), true);
        } else {
          animation.removeRunner(parseInt(event.target.id, 10), true);
        }
        redraw(false);
      });
      // checkbox to display all tracks for course
      $(".allcoursetracks").click(function(event) {
        var runners;
        var selector;
        runners = results.getAllRunnersForCourse(parseInt(event.target.id, 10));
        var i;
        for (i = 0; i < runners.length; i += 1) {
          if (event.target.checked) {
            results.putOneTrackOnDisplay(runners[i]);
          } else {
            results.removeOneTrackFromDisplay(runners[i]);
          }
        }
        selector = ".showtrack-" + event.target.id;
        if (event.target.checked) {
          // select all the individual checkboxes for the course
          $(selector).prop('checked', true);
        } else {
          $(selector).prop('checked', false);
        }
        requestedHash.setRoutes();
        redraw(false);
      });
      // checkbox to animate all results for course
      $(".allcoursereplay").click(function(event) {
        var courseresults;
        var selector;
        courseresults = results.getAllRunnersForCourse(parseInt(event.target.id, 10));
        animation.animateRunners(courseresults, event.target.checked);
        selector = ".showreplay-" + event.target.id;
        if (event.target.checked) {
          // select all the individual checkboxes for each course
          $(selector).prop('checked', true);
        } else {
          $(selector).prop('checked', false);
        }
        redraw(false);
      });
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

    function countResultsByCourseID(courseid) {
      return results.countResultsByCourseID(courseid);
    }

    function drawStart(x, y, text, angle, opt) {
      return controls.drawStart(x, y, text, angle, opt);
    }

    function drawSingleControl(x, y, i, angle, opt) {
      return controls.drawSingleControl(x, y, i, angle, opt);
    }

    function drawFinish(x, y, text, opt) {
      return controls.drawFinish(x, y, text, opt);
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
    
    function putScoreCourseOnDisplay(resultid, display) {
      results.putScoreCourseOnDisplay(resultid, display);
    }

    function removeFromDisplay(courseid) {
      courses.removeFromDisplay(courseid);
    }

    function createNameDropdown(courseid) {
      results.createNameDropdown(courseid);
    }

    function resultIDExists(resultid) {
      return results.resultIDExists(resultid);
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

    function getRouteWidth() {
      return options.routeWidth;
    }

    function getOverprintDetails() {
      var opt = {};
      // attempt to scale overprint depending on map image size
      // this avoids very small/large circles, or at least makes things a bit more sensible
      var size = getMapSize();
      // Empirically derived  so open to suggestions. This is based on a nominal 20px circle
      // as default. The square root stops things getting too big too quickly.
      // 1500px is a typical map image maximum size.
      var scaleFactor = Math.pow(Math.min(size.height, size.width)/1500, 0.5);
      // don't get too carried away, although these would be strange map files
      scaleFactor = Math.min(scaleFactor, 5);
      scaleFactor = Math.max(scaleFactor, 0.5);
      var circleSize = Math.round(options.circleSize * scaleFactor);
      // ratios based on IOF ISOM overprint specification
      opt.controlRadius = circleSize;
      opt.finishInnerRadius = circleSize * (5 / 6);
      opt.finishOuterRadius = circleSize * (7 / 6);
      opt.startTriangleLength = circleSize * (7 / 6);
      opt.overprintWidth = options.courseWidth;
      opt.font = circleSize + 'pt Arial';
      return opt;
    }

    function getRouteIntensity() {
      // stored as %, but used as 0 to 1.
      return (options.routeIntensity / 100);
    }

    function getReplayFontSize() {
      return options.replayFontSize;
    }
    
    function showThreeSeconds() {
     return $("#chk-show-three-seconds").prop('checked');
    }

    function showGPSSpeed() {
     return $("#chk-show-GPS-speed").prop('checked');
    }

    function getEventInfo(id) {
      return events.getEventInfo(id);
    }
    
    function getCoursesForEvent() {
      return courses.getCoursesForEvent();
    }

    function getRoutesForEvent() {
      return results.getRoutesForEvent();
    }

    function getNextRouteColour() {
      return colours.getNextColour();
    }
    function updateScoreCourse(courseid, codes, x, y) {
      courses.updateScoreCourse(courseid, codes, x, y);
    }
    
    function getSnapToControl() {
      return options.snap;
    }
    
    function getControlCount() {
      return controls.getControlCount();
    }
    function getMetresPerPixel() {
      return events.getMetresPerPixel();
    }
    
    function drawLinesBetweenControls(x, y, angle, courseid, opt) {
      courses.drawLinesBetweenControls(x, y, angle, courseid, opt);
    }
        
    return {
      // functions and variables available elsewhere
      t: t,
      init : init,
      config : config,
      options: options,
      redraw : redraw,
      getOverprintDetails: getOverprintDetails,
      getRouteWidth: getRouteWidth,
      getRouteIntensity: getRouteIntensity,
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
      putOnDisplay : putOnDisplay,
      putScoreCourseOnDisplay: putScoreCourseOnDisplay,
      removeFromDisplay : removeFromDisplay,
      createNameDropdown : createNameDropdown,
      incrementTracksCount : incrementTracksCount,
      getKartatEventID : getKartatEventID,
      getActiveEventID : getActiveEventID,
      getHighestControlNumber : getHighestControlNumber,
      getCourseDetails : getCourseDetails,
      getCourseName : getCourseName,
      countResultsByCourseID : countResultsByCourseID,
      getControlX : getControlX,
      getControlY : getControlY,
      createEventEditDropdown : createEventEditDropdown,
      showThreeSeconds: showThreeSeconds,
      showGPSSpeed: showGPSSpeed,
      getEventInfo: getEventInfo,
      getCoursesForEvent: getCoursesForEvent,
      getRoutesForEvent: getRoutesForEvent,
      getNextRouteColour: getNextRouteColour,
      updateScoreCourse: updateScoreCourse,
      getSnapToControl: getSnapToControl,
      getAngle: getAngle,
      showWarningDialog: showWarningDialog,
      getDistanceBetweenPoints: getDistanceBetweenPoints,
      getSecsFromMMSS: getSecsFromMMSS,
      getSecsFromHHMMSS: getSecsFromHHMMSS,
      getSecsFromHHMM: getSecsFromHHMM,
      formatSecsAsMMSS: formatSecsAsMMSS,
      getLatLonDistance: getLatLonDistance,
      getControlCount: getControlCount,
      getMetresPerPixel: getMetresPerPixel,
      drawLinesBetweenControls: drawLinesBetweenControls
    };

  }(window, window.jQuery));

$(document).ready(rg2.init);
