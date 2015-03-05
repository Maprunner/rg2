/*
 * Routegadget 2
 * https://github.com/Maprunner/rg2
 *
 * Copyright (c) 2014 Simon Errington and contributors
 * Licensed under the MIT license.
 * https://github.com/Maprunner/rg2/blob/master/LICENSE
 */
/*global rg2Config:false */
/*global setTimeout:false */
/*global loadEvent */
var rg2 = (function (window, $) {
  'use strict';
  var $rg2eventtitle;

  function setTitleBar() {
    var title;
    if (window.innerWidth >= rg2.config.BIG_SCREEN_BREAK_POINT) {
      title = rg2.events.getActiveEventName() + " " + rg2.events.getActiveEventDate();
      $rg2eventtitle.html(title).show();
    } else if (window.innerWidth > rg2.config.SMALL_SCREEN_BREAK_POINT) {
      title = rg2.events.getActiveEventName();
      $rg2eventtitle.html(title).show();
    } else {
      $rg2eventtitle.hide();
    }
    if (rg2.events.mapIsGeoreferenced()) {
      $("#rg2-event-title-icon").addClass("fa fa-globe");
    } else {
      $("#rg2-event-title-icon").removeClass("fa fa-globe");
    }
  }

  function setResultCheckboxes() {
    // checkbox to show a course
    $(".showcourse").click(function (event) {
      var id;
      //Prevent opening accordion when check box is clicked
      event.stopPropagation();
      id = event.target.id;
      if (event.target.checked) {
        rg2.courses.putOnDisplay(id);
        // check box on courses tab
        $(".courselist").filter("#" + id).prop('checked', true);
      } else {
        rg2.courses.removeFromDisplay(id);
        // uncheck box on courses tab
        $(".courselist").filter("#" + id).prop('checked', false);
        // make sure the all checkbox is not checked
        $(".allcourses").prop('checked', false);
      }
      rg2.requestedHash.setCourses();
      rg2.redraw(false);
    });
    // checkbox to show an individual score course
    $(".showscorecourse").click(function (event) {
      rg2.results.displayScoreCourse(parseInt(event.target.id, 10), event.target.checked);
      rg2.redraw(false);
    });
    // checkbox to show a result
    $(".showtrack").click(function (event) {
      if (event.target.checked) {
        rg2.results.putOneTrackOnDisplay(event.target.id);
      } else {
        rg2.results.removeOneTrackFromDisplay(event.target.id);
      }
      rg2.requestedHash.setRoutes();
      rg2.redraw(false);
    });
    // checkbox to animate a result
    $(".showreplay").click(function (event) {
      if (event.target.checked) {
        rg2.animation.addRunner(new rg2.Runner(parseInt(event.target.id, 10)), true);
      } else {
        rg2.animation.removeRunner(parseInt(event.target.id, 10), true);
      }
      rg2.redraw(false);
    });
    // checkbox to display all tracks for course
    $(".allcoursetracks").click(function (event) {
      var runners, selector, i;
      runners = rg2.results.getAllRunnersForCourse(parseInt(event.target.id, 10));
      for (i = 0; i < runners.length; i += 1) {
        if (event.target.checked) {
          rg2.results.putOneTrackOnDisplay(runners[i]);
        } else {
          rg2.results.removeOneTrackFromDisplay(runners[i]);
        }
      }
      selector = ".showtrack-" + event.target.id;
      if (event.target.checked) {
        // select all the individual checkboxes for the course
        $(selector).prop('checked', true);
      } else {
        $(selector).prop('checked', false);
      }
      rg2.requestedHash.setRoutes();
      rg2.redraw(false);
    });
    // checkbox to animate all results for course
    $(".allcoursereplay").click(function (event) {
      var courseresults, selector;
      courseresults = rg2.results.getAllRunnersForCourse(parseInt(event.target.id, 10));
      rg2.animation.animateRunners(courseresults, event.target.checked);
      selector = ".showreplay-" + event.target.id;
      if (event.target.checked) {
        // select all the individual checkboxes for each course
        $(selector).prop('checked', true);
      } else {
        $(selector).prop('checked', false);
      }
      rg2.redraw(false);
    });
  }

  function createResultMenu() {
    //loads menu from populated result array
    var html = rg2.results.formatResultListAsAccordion();
    // #177 not pretty but gets round problems of double encoding
    html = html.replace(/&amp;/g, '&');
    $("#rg2-result-list").empty().append(html);
    $("#rg2-result-list").accordion("refresh");
    $("#rg2-info-panel").tabs("refresh");
    setResultCheckboxes();
    // disable control dropdown if we have no controls
    if (rg2.courses.getHighestControlNumber() === 0) {
      $("#rg2-control-select").prop('disabled', true);
    } else {
      $("#rg2-control-select").prop('disabled', false);
    }
  }

  function createEventMenu() {
    //loads menu from populated events array
    var html = rg2.events.formatEventsAsMenu();
    $("#rg2-event-list").append(html).menu({
      select : function (event, ui) {
        /*jslint unparam:true*/
        loadEvent(ui.item[0].id);
        rg2.requestedHash.setNewEvent(rg2.events.getKartatEventID());
      }
    });
  }

  function createCourseMenu() {
    //loads menu from populated courses array
    $("#rg2-course-table").empty().append(rg2.courses.formatCoursesAsTable());

    // checkbox on course tab to show a course
    $(".courselist").click(function (event) {
      var id = parseInt(event.currentTarget.id, 10);
      if (event.target.checked) {
        rg2.courses.putOnDisplay(id);
        // check box on results tab
        $(".showcourse").filter("#" + id).prop('checked', true);
      } else {
        rg2.courses.removeFromDisplay(id);
        // make sure the all checkbox is not checked
        $(".allcourses").prop('checked', false);
        // uncheck box on results tab
        $(".showcourse").filter("#" + id).prop('checked', false);
      }
      rg2.requestedHash.setCourses();
      rg2.redraw(false);
    });
    // checkbox on course tab to show all courses
    $(".allcourses").click(function (event) {
      if (event.target.checked) {
        rg2.courses.putAllOnDisplay();
        // select all the individual checkboxes for each course
        $(".courselist").prop('checked', true);
        // check all boxes on results tab
        $(".showcourse").prop('checked', true);
      } else {
        rg2.courses.removeAllFromDisplay();
        $(".courselist").prop('checked', false);
        // uncheck all boxes on results tab
        $(".showcourse").prop('checked', false);
      }
      rg2.requestedHash.setCourses();
      rg2.redraw(false);
    });
    // checkbox on course tab to show tracks for one course
    $(".tracklist").click(function (event) {
      var courseid = event.target.id;
      if (event.target.checked) {
        rg2.results.updateTrackDisplay(parseInt(courseid, 10), true);
      } else {
        rg2.results.updateTrackDisplay(parseInt(courseid, 10), false);
        // make sure the all checkbox is not checked
        $(".alltracks").prop('checked', false);
      }
      rg2.requestedHash.setRoutes();
      rg2.redraw(false);
    });
    // checkbox on course tab to show all tracks
    $(".alltracks").click(function (event) {
      if (event.target.checked) {
        rg2.results.updateTrackDisplay(rg2.config.DISPLAY_ALL_COURSES, true);
        // select all the individual checkboxes for each course
        $(".tracklist").prop('checked', true);
      } else {
        rg2.results.updateTrackDisplay(rg2.config.DISPLAY_ALL_COURSES, false);
        // deselect all the individual checkboxes for each course
        $(".tracklist").prop('checked', false);
      }
      rg2.requestedHash.setRoutes();
      rg2.redraw(false);
    });
  }

  function resizeInfoDisplay() {
    if (rg2.input.infoPanelMaximised) {
      rg2.input.infoPanelMaximised = false;
      $("#rg2-resize-info").prop("title",  rg2.t("Show info panel"));
      $("#rg2-hide-info-panel-control").css("left", "0px");
      $("#rg2-hide-info-panel-icon").removeClass("fa-chevron-left").addClass("fa-chevron-right").prop("title",  rg2.t("Show info panel"));
      $("#rg2-info-panel").hide();
    } else {
      rg2.input.infoPanelMaximised = true;
      $("#rg2-resize-info").prop("title",  rg2.t("Hide info panel"));
      $("#rg2-hide-info-panel-control").css("left", "366px");
      $("#rg2-hide-info-panel-icon").removeClass("fa-chevron-right").addClass("fa-chevron-left").prop("title",  rg2.t("Hide info panel"));
      $("#rg2-info-panel").show();
    }
    // move map around if necesssary
    rg2.resetMapState();
  }

  function setNewLanguage(dict) {
    var eventid;
    $("#rg2-event-list").menu("destroy");
    rg2.setDictionary(dict);
    createEventMenu();
    eventid = rg2.events.getActiveEventID();
    if (eventid !== null) {
      rg2.courses.removeAllFromDisplay();
      rg2.results.updateTrackDisplay(rg2.config.DISPLAY_ALL_COURSES, false);
      rg2.animation.resetAnimation();
      rg2.drawing.initialiseDrawing(rg2.events.hasResults(eventid));
      createCourseMenu();
      createResultMenu();
    }
    $("#rg2-info-panel").tabs("refresh");
    rg2.redraw(false);
  }

  function startDisplayingInfo() {
    // check if a specific event has been requested
    if ((window.location.hash) && (!rg2Config.managing)) {
      rg2.requestedHash.parseHash(window.location.hash);
    }
    // load event details
    rg2.getEvents();
    // slight delay looks better than going straight in....
    setTimeout(function () {
      $("#rg2-container").show();
    }, 500);
  }

  function setUIEventHandlers() {
    var text, newlang;
    $("#rg2-resize-info").click(function () {
      resizeInfoDisplay();
    });
    $("#rg2-hide-info-panel-control").click(function () {
      resizeInfoDisplay();
    });
    $("#rg2-control-select").prop('disabled', true).change(function () {
      rg2.animation.setStartControl($("#rg2-control-select").val());
    });
    $("#rg2-name-select").prop('disabled', true).change(function () {
      rg2.drawing.setName(parseInt($("#rg2-name-select").val(), 10));
    });
    $("#rg2-course-select").change(function () {
      rg2.drawing.setCourse(parseInt($("#rg2-course-select").val(), 10));
    });
    $("#rg2-enter-name").click(function () {
      rg2.drawing.setNameAndTime();
    }).keyup(function () {
      rg2.drawing.setNameAndTime();
    });
    $('#rg2-new-comments').focus(function () {
      // Clear comment box if user focuses on it and it still contains default text
      text = $("#rg2-new-comments").val();
      if (text ===  rg2.t(rg2.config.DEFAULT_NEW_COMMENT)) {
        $('#rg2-new-comments').val("");
      }
    });
    $("#chk-snap-toggle").prop('checked', rg2.options.snap).click(function (event) {
      if (event.target.checked) {
        rg2.options.snap = true;
      } else {
        rg2.options.snap = false;
      }
    });
    $("#chk-show-three-seconds").prop('checked', rg2.options.showThreeSeconds).click(function () {
      rg2.redraw(false);
    });
    $("#chk-show-GPS-speed").prop('checked', rg2.options.showGPSSpeed).click(function () {
      rg2.redraw(false);
    });
    $("#rg2-select-language").click(function () {
      newlang = $("#rg2-select-language").val();
      if (newlang !== rg2.getDictionaryCode()) {
        if (newlang === 'en') {
          setNewLanguage({code: "en"});
        } else {
          rg2.getNewLanguage(newlang);
        }
      }
    });
    $("#rg2-load-gps-file").change(function (evt) {
      rg2.drawing.uploadGPS(evt);
    });
  }

  // called whenever the active tab changes to tidy up as necessary
  function tabActivated() {
    var active = $("#rg2-info-panel").tabs("option", "active");
    switch (active) {
    case rg2.config.TAB_DRAW:
      rg2.courses.removeAllFromDisplay();
      rg2.drawing.showCourseInProgress();
      break;
    default:
      break;
    }
    rg2.redraw(false);
  }

  function configureUI() {
    // disable tabs until we have loaded something
    $("#rg2-info-panel").tabs({
      disabled : [rg2.config.TAB_COURSES, rg2.config.TAB_RESULTS, rg2.config.TAB_DRAW],
      active : rg2.config.TAB_EVENTS,
      heightStyle : "content",
      activate : function () {
        tabActivated();
      }
    });
    $("#rg2-result-list").accordion({
      collapsible : true,
      heightStyle : "content"
    });
    $("#rg2-clock").text("00:00:00");
    $("#rg2-clock-slider").slider({
      slide : function (event, ui) {
        /*jslint unparam:true*/
        // passes slider value as new time
        rg2.animation.clockSliderMoved(ui.value);
      }
    });
    $("#rg2-header-container").css("color", rg2Config.header_text_colour).css("background", rg2Config.header_colour);
    $("#rg2-about-dialog").hide();
    $("#rg2-splits-display").hide();
    $("#rg2-track-names").hide();
    $("#rg2-add-new-event").hide();
    $("#rg2-load-progress-bar").progressbar({
      value : false
    });
    $("#rg2-load-progress-label").text("");
    $("#rg2-load-progress").hide();
    $("#rg2-option-controls").hide();
    $("#rg2-animation-controls").hide();
    $("#rg2-splitsbrowser").hide();
    setUIEventHandlers();
  }

  function getEventStats() {
    var stats, coursearray, resultsinfo, runnercomments, eventinfo, id, mapSize;
    id = rg2.events.getActiveEventID();
    // check there is an event to report on
    if (id === null) {
      return "";
    }
    id = rg2.events.getKartatEventID();
    eventinfo = rg2.events.getEventInfo(parseInt(id, 10));
    coursearray = rg2.courses.getCoursesForEvent();
    resultsinfo = rg2.results.getResultsInfo();
    runnercomments = rg2.results.getComments();
    mapSize = rg2.getMapSize();
    stats = "<h3>" +  rg2.t("Event statistics") + ": " + eventinfo.name + ": " + eventinfo.date + "</h3>";
    if (eventinfo.comment) {
      stats += "<p>" + eventinfo.comment + "</p>";
    }
    stats += "<p><strong>" +  rg2.t("Courses") + ":</strong> " + coursearray.length + ". <strong>" +  rg2.t("Results") + ":</strong> " + resultsinfo.results;
    stats += ". <strong> " +  rg2.t("Controls") + ":</strong> " + eventinfo.controls + ".</p>";
    stats += "<p><strong>" +  rg2.t("Routes") + ":</strong> " + resultsinfo.totalroutes + " (" + resultsinfo.percent + "%). ";
    stats += "<strong>" +  rg2.t("Drawn routes") + ":</strong> " + resultsinfo.drawnroutes + ". <strong>" +  rg2.t("GPS routes") + ":</strong> " + resultsinfo.gpsroutes + ".</p>";
    stats += "<p><strong>" +  rg2.t("Total time") + ":</strong> " + resultsinfo.time + ".</p>";
    stats += "<p><strong>" +  rg2.t("Map ") + ":</strong> ID " + rg2.events.getActiveMapID() + ", " + mapSize.width + " x " + mapSize.height + " pixels";
    if (eventinfo.worldfile.valid) {
      stats += ". " +  rg2.t("Map is georeferenced") + ".</p>";
    } else {
      stats += ".</p>";
    }
    if (runnercomments) {
      stats += "<p><strong>" +  rg2.t("Comments") + ":</strong></p>" + runnercomments;
    }
    // #177 not pretty but gets round problems of double encoding
    stats = stats.replace(/&amp;/g, '&');
    return stats;
  }

  function displayAboutDialog() {
    $("#rg2-event-stats").empty().html(getEventStats());
    $("#rg2-about-dialog").dialog({
      width : Math.min(1000, (rg2.canvas.width * 0.8)),
      maxHeight : Math.min(1000, (rg2.canvas.height * 0.9)),
      title : "RG2 Version " + rg2.config.RG2VERSION,
      dialogClass : "rg2-about-dialog",
      resizable : false,
      buttons : {
        Ok : function () {
          $(this).dialog("close");
        }
      }
    });
  }

  function displayOptionsDialog() {
    $("#rg2-option-controls").dialog({
      minWidth : 400,
      title :  rg2.t("Configuration options"),
      dialogClass : "rg2-options-dialog",
      close : function () {
        rg2.saveConfigOptions();
      }
    });
  }

  function initialiseButtons() {
    $("#btn-about").click(function () {
      displayAboutDialog();
    });
    $("#btn-faster").click(function () {
      rg2.animation.goFaster();
    });
    $("#btn-full-tails").prop('checked', false).click(function (event) {
      if (event.target.checked) {
        rg2.animation.setFullTails(true);
        $("#spn-tail-length").spinner("disable");
      } else {
        rg2.animation.setFullTails(false);
        $("#spn-tail-length").spinner("enable");
      }
    });
    $("#btn-mass-start").addClass('active').click(function () {
      rg2.animation.setReplayType(rg2.config.MASS_START_REPLAY);
    });
    $("#btn-move-all").prop('checked', false);
    $("#btn-options").click(function () {
      displayOptionsDialog();
    });
    $("#btn-real-time").removeClass('active').click(function () {
      rg2.animation.setReplayType(rg2.config.REAL_TIME_REPLAY);
    });
    $("#btn-reset").click(function () {
      rg2.resetMapState();
    });
    $("#btn-reset-drawing").button().button("disable").click(function () {
      rg2.drawing.resetDrawing();
    });
    $("#btn-save-gps-route").button().button("disable").click(function () {
      rg2.drawing.saveGPSRoute();
    });
    $("#btn-save-route").button().button("disable").click(function () {
      rg2.drawing.saveRoute();
    });
    $("#btn-show-splits").click(function () {
      $("#rg2-splits-table").empty().append(rg2.animation.getSplitsTable()).dialog({
        width : 'auto',
        dialogClass : "rg2-splits-table",
        buttons : {
          Ok : function () {
            $(this).dialog('close');
          }
        }
      });
    }).hide();
    $("#btn-slower").click(function () {
      rg2.animation.goSlower();
    });
    $("#btn-start-stop").click(function () {
      rg2.animation.toggleAnimation();
    });
    $("#btn-three-seconds").button().click(function () {
      rg2.drawing.waitThreeSeconds();
    }).button("disable");
    $("#btn-toggle-controls").click(function () {
      rg2.controls.toggleControlDisplay();
      rg2.redraw(false);
    }).hide();
    $("#btn-toggle-names").click(function () {
      rg2.animation.toggleNameDisplay();
      rg2.redraw(false);
    }).hide();
    $("#btn-undo").button().button("disable").click(function () {
      rg2.drawing.undoLastPoint();
    });
    $("#btn-undo-gps-adjust").button().button("disable").click(function () {
      rg2.drawing.undoGPSAdjust();
    });
    $("#btn-zoom-in").click(function () {
      rg2.zoom(1);
    });
    $("#btn-zoom-out").click(function () {
      rg2.zoom(-1);
    });
    $("#rg2-load-gps-file").button().button("disable");
  }

  function initialiseSpinners() {
    $("#spn-control-circle").spinner({
      max : 50,
      min : 3,
      step : 1,
      spin : function (event, ui) {
        /*jslint unparam:true*/
        rg2.setConfigOption("circleSize", ui.value);
        rg2.redraw(false);
      }
    }).val(rg2.options.circleSize);
    $("#spn-course-width").spinner({
      max : 10,
      min : 1,
      step : 0.5,
      spin : function (event, ui) {
        /*jslint unparam:true*/
        rg2.setConfigOption("courseWidth", ui.value);
        rg2.redraw(false);
      }
    }).val(rg2.options.courseWidth);
    $("#spn-map-intensity").spinner({
      max : 100,
      min : 0,
      step : 10,
      numberFormat : "n",
      spin : function (event, ui) {
        /*jslint unparam:true*/
        rg2.setConfigOption("mapIntensity", ui.value);
        rg2.redraw(false);
      }
    }).val(rg2.options.mapIntensity);
    $("#spn-name-font-size").spinner({
      max : 30,
      min : 5,
      step : 1,
      numberFormat : "n",
      spin : function (event, ui) {
        /*jslint unparam:true*/
        rg2.setConfigOption("replayFontSize", ui.value);
        rg2.redraw(false);
      }
    }).val(rg2.options.replayFontSize);
    $("#spn-route-intensity").spinner({
      max : 100,
      min : 0,
      step : 10,
      numberFormat : "n",
      spin : function (event, ui) {
        /*jslint unparam:true*/
        rg2.setConfigOption("routeIntensity", ui.value);
        rg2.redraw(false);
      }
    }).val(rg2.options.routeIntensity);
    $("#spn-route-width").spinner({
      max : 10,
      min : 1,
      step : 0.5,
      spin : function (event, ui) {
        /*jslint unparam:true*/
        rg2.setConfigOption("routeWidth", ui.value);
        rg2.redraw(false);
      }
    }).val(rg2.options.routeWidth);
    // set default to 0 secs = no tails
    $("#spn-tail-length").spinner({
      max : 600,
      min : 0,
      spin : function (event, ui) {
        /*jslint unparam:true*/
        rg2.animation.setTailLength(ui.value);
      }
    }).val(0);
  }

  function setManagerOptions() {
    rg2.manager = new rg2.Manager(rg2Config.keksi);
    $("#rg2-animation-controls").hide();
    $("#rg2-create-tab").hide();
    $("#rg2-edit-tab").hide();
    $("#rg2-map-tab").hide();
    $("#rg2-manage-login").show();
    $("#rg2-draw-tab").hide();
    $("#rg2-results-tab").hide();
    $("#rg2-courses-tab").hide();
    $("#rg2-events-tab").hide();
    $("#rg2-info-panel").tabs("disable", rg2.config.TAB_EVENTS).tabs("option", "active", rg2.config.TAB_LOGIN);
  }

  function loadEvent(eventid) {
    // highlight the selected event
    $('#rg2-event-list > li').removeClass('rg2-active-event').filter('#' + eventid).addClass('rg2-active-event');
    // show we are waiting
    $('body').css('cursor', 'wait');
    $("#rg2-load-progress-label").text(rg2.t("Loading courses"));
    $("#rg2-load-progress").show();
    rg2.courses.deleteAllCourses();
    rg2.controls.deleteAllControls();
    rg2.animation.resetAnimation();
    rg2.results.deleteAllResults();
    rg2.events.setActiveEventID(eventid);
    rg2.drawing.initialiseDrawing(rg2.events.hasResults(eventid));
    rg2.loadNewMap(rg2Config.maps_url + rg2.events.getMapFileName());
    rg2.redraw(false);
    setTitleBar();
    rg2.getCourses();
  }

  function init() {
    $("#rg2-container").hide();
    rg2.utils = new rg2.Utils();
    // cache jQuery things we use a lot
    $rg2eventtitle = $("#rg2-event-title");
    $.ajaxSetup({
      cache : false
    });
    if ($('#rg2-manage-login').length !== 0) {
      rg2Config.managing = true;
    } else {
      rg2Config.managing = false;
    }
    rg2.loadConfigOptions();
    initialiseButtons();
    initialiseSpinners();
    rg2.setLanguageOptions();
    configureUI();
    rg2.events = new rg2.Events();
    rg2.courses = new rg2.Courses();
    rg2.colours = new rg2.Colours();
    rg2.results = new rg2.Results();
    rg2.controls = new rg2.Controls();
    rg2.animation = new rg2.Animation();
    rg2.drawing = new rg2.Draw();
    rg2.requestedHash = new rg2.RequestedHash();
    if (rg2Config.managing) {
      setManagerOptions();
      rg2.setMapLoadingText("");
    } else {
      // translated when displayed
      rg2.setMapLoadingText("Select an event");
    }
    rg2.setUpCanvas();
    // disable right click menu: may add our own later
    $(document).bind("contextmenu", function (evt) {
      evt.preventDefault();
    });
    startDisplayingInfo();
  }

  return {
    // functions and variables available elsewhere
    init : init,
    loadEvent : loadEvent,
    createEventMenu : createEventMenu,
    createResultMenu : createResultMenu,
    createCourseMenu : createCourseMenu,
    setNewLanguage : setNewLanguage,
    setTitleBar: setTitleBar
  };
}(window, window.jQuery));
