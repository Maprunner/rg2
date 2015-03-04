/*
 * Routegadget 2
 * https://github.com/Maprunner/rg2
 *
 * Copyright (c) 2014 Simon Errington and contributors
 * Licensed under the MIT license.
 * https://github.com/Maprunner/rg2/blob/master/LICENSE
 */
/*global rg2Config:false */
/*global Image:false */
/*global setTimeout:false */
/*global localStorage:false */
/*global loadEvent */
/*global console */
var rg2 = (function (window, $) {
  'use strict';
  var canvas, ctx, dictionary, input, map, mapLoadingText, infoPanelMaximised, scaleFactor, zoomSize,
    options, $rg2eventtitle, zoom;
  canvas = $("#rg2-map-canvas")[0];
  ctx = canvas.getContext('2d');
  input = {};
  options = {
    // initialised to default values: overwritten from storage later
    mapIntensity : 100,
    routeIntensity : 100,
    replayFontSize : 12,
    courseWidth : 3,
    routeWidth : 4,
    circleSize : 20,
    snap : true,
    showThreeSeconds : false,
    showGPSSpeed : false
  };

  // translation function
  function t(str) {
    if (dictionary.hasOwnProperty(str)) {
      return dictionary[str];
    }
    return str;
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
    ctx.fillStyle = rg2.config.WHITE;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    // go back to where we started
    ctx.restore();
    // set transparency of map
    ctx.globalAlpha = (options.mapIntensity / 100);

    if (map.height > 0) {
      // using non-zero map height to show we have a map loaded
      ctx.drawImage(map, 0, 0);
      var active = $("#rg2-info-panel").tabs("option", "active");
      if (active === rg2.config.TAB_DRAW) {
        rg2.courses.drawCourses(rg2.config.DIM);
        rg2.controls.drawControls(false);
        rg2.results.drawTracks();
        rg2.drawing.drawNewTrack();
      } else {
        if (active === rg2.config.TAB_CREATE) {
          rg2.manager.drawControls();
        } else {
          rg2.courses.drawCourses(rg2.config.FULL_INTENSITY);
          rg2.results.drawTracks();
          rg2.controls.drawControls(false);
          // parameter determines if animation time is updated or not
          if (fromTimer) {
            rg2.animation.runAnimation(true);
          } else {
            rg2.animation.runAnimation(false);
          }
        }
      }
    } else {
      ctx.font = '30pt Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = rg2.config.BLACK;
      ctx.fillText(t(mapLoadingText), canvas.width / 2, canvas.height / 2);
    }
  }

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
      redraw(false);
    });
    // checkbox to show an individual score course
    $(".showscorecourse").click(function (event) {
      rg2.results.displayScoreCourse(parseInt(event.target.id, 10), event.target.checked);
      redraw(false);
    });
    // checkbox to show a result
    $(".showtrack").click(function (event) {
      if (event.target.checked) {
        rg2.results.putOneTrackOnDisplay(event.target.id);
      } else {
        rg2.results.removeOneTrackFromDisplay(event.target.id);
      }
      rg2.requestedHash.setRoutes();
      redraw(false);
    });
    // checkbox to animate a result
    $(".showreplay").click(function (event) {
      if (event.target.checked) {
        rg2.animation.addRunner(new rg2.Runner(parseInt(event.target.id, 10)), true);
      } else {
        rg2.animation.removeRunner(parseInt(event.target.id, 10), true);
      }
      redraw(false);
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
      redraw(false);
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
      redraw(false);
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
      redraw(false);
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
      redraw(false);
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
      redraw(false);
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
      redraw(false);
    });
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
    var i, selected, dropdown;
    $("#rg2-select-language").empty();
    dropdown = document.getElementById("rg2-select-language");
    selected = (dictionary.code === "en");
    dropdown.options.add(rg2.utils.generateOption('en', 'en: English', selected));
    for (i in rg2Config.languages) {
      if (rg2Config.languages.hasOwnProperty(i)) {
        selected = (dictionary.code === i);
        dropdown.options.add(rg2.utils.generateOption(i, i + ": " + rg2Config.languages[i], selected));
      }
    }
  }

  function setLanguageOptions() {
    // use English unless a dictionary was passed in
    if (rg2Config.dictionary.code === undefined) {
      dictionary = {};
      dictionary.code = 'en';
    } else {
      dictionary = rg2Config.dictionary;
    }
    createLanguageDropdown();
  }

  function setNewLanguage(dict) {
    var eventid;
    $("#rg2-event-list").menu("destroy");
    dictionary = dict;
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
    translateFixedText();
    $("#rg2-info-panel").tabs("refresh");
    redraw(false);
  }

  function resetMapState() {
    // place map in centre of canvas and scale it down to fit
    var mapscale, heightscale;
    heightscale = canvas.height / map.height;
    input.lastX = canvas.width / 2;
    input.lastY = canvas.height / 2;
    zoomSize = 1;
    input.dragStart = null;
    // looks odd but this works for initialisation
    input.dragged = true;
    // don't stretch map: just shrink to fit
    if (heightscale < 1) {
      mapscale = heightscale;
    } else {
      mapscale = 1;
    }
    // move map into view on small screens
    // avoid annoying jumps on larger screens
    if (infoPanelMaximised || window.innerWidth >= rg2.config.BIG_SCREEN_BREAK_POINT) {
      ctx.setTransform(mapscale, 0, 0, mapscale, $("#rg2-info-panel").outerWidth(), 0);
    } else {
      ctx.setTransform(mapscale, 0, 0, mapscale, 0, 0);
    }
    ctx.save();
    redraw(false);
  }

  zoom = function (zoomDirection) {
    var pt, factor, tempZoom;
    factor = Math.pow(scaleFactor, zoomDirection);
    tempZoom = zoomSize * factor;
    // limit zoom to avoid things disappearing
    // chosen values seem reasonable after some quick tests
    if ((tempZoom < 50) && (tempZoom > 0.05)) {
      zoomSize = tempZoom;
      pt = ctx.transformedPoint(input.lastX, input.lastY);
      ctx.translate(pt.x, pt.y);
      ctx.scale(factor, factor);
      ctx.translate(-pt.x, -pt.y);
      ctx.save();
      redraw(false);
    }
  };

  function resizeInfoDisplay() {
    if (infoPanelMaximised) {
      infoPanelMaximised = false;
      $("#rg2-resize-info").prop("title", t("Show info panel"));
      $("#rg2-hide-info-panel-control").css("left", "0px");
      $("#rg2-hide-info-panel-icon").removeClass("fa-chevron-left").addClass("fa-chevron-right").prop("title", t("Show info panel"));
      $("#rg2-info-panel").hide();
    } else {
      infoPanelMaximised = true;
      $("#rg2-resize-info").prop("title", t("Hide info panel"));
      $("#rg2-hide-info-panel-control").css("left", "366px");
      $("#rg2-hide-info-panel-icon").removeClass("fa-chevron-right").addClass("fa-chevron-left").prop("title", t("Hide info panel"));
      $("#rg2-info-panel").show();
    }
    // move map around if necesssary
    resetMapState();
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
      if (text === t(rg2.config.DEFAULT_NEW_COMMENT)) {
        $('#rg2-new-comments').val("");
      }
    });
    $("#chk-snap-toggle").prop('checked', options.snap).click(function (event) {
      if (event.target.checked) {
        options.snap = true;
      } else {
        options.snap = false;
      }
    });
    $("#chk-show-three-seconds").prop('checked', options.showThreeSeconds).click(function () {
      redraw(false);
    });
    $("#chk-show-GPS-speed").prop('checked', options.showGPSSpeed).click(function () {
      redraw(false);
    });
    $("#rg2-select-language").click(function () {
      newlang = $("#rg2-select-language").val();
      if (newlang !== dictionary.code) {
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
    redraw(false);
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
    var stats, coursearray, resultsinfo, runnercomments, eventinfo, id;
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
    stats = "<h3>" + t("Event statistics") + ": " + eventinfo.name + ": " + eventinfo.date + "</h3>";
    if (eventinfo.comment) {
      stats += "<p>" + eventinfo.comment + "</p>";
    }
    stats += "<p><strong>" + t("Courses") + ":</strong> " + coursearray.length + ". <strong>" + t("Results") + ":</strong> " + resultsinfo.results;
    stats += ". <strong> " + t("Controls") + ":</strong> " + eventinfo.controls + ".</p>";
    stats += "<p><strong>" + t("Routes") + ":</strong> " + resultsinfo.totalroutes + " (" + resultsinfo.percent + "%). ";
    stats += "<strong>" + t("Drawn routes") + ":</strong> " + resultsinfo.drawnroutes + ". <strong>" + t("GPS routes") + ":</strong> " + resultsinfo.gpsroutes + ".</p>";
    stats += "<p><strong>" + t("Total time") + ":</strong> " + resultsinfo.time + ".</p>";
    stats += "<p><strong>" + t("Map ") + ":</strong> ID " + rg2.events.getActiveMapID() + ", " + map.width + " x " + map.height + " pixels";
    if (eventinfo.georeferenced) {
      stats += ". " + t("Map is georeferenced") + ".</p>";
    } else {
      stats += ".</p>";
    }
    if (runnercomments) {
      stats += "<p><strong>" + t("Comments") + ":</strong></p>" + runnercomments;
    }
    // #177 not pretty but gets round problems of double encoding
    stats = stats.replace(/&amp;/g, '&');
    return stats;
  }

  function displayAboutDialog() {
    $("#rg2-event-stats").empty().html(getEventStats());
    $("#rg2-about-dialog").dialog({
      width : Math.min(1000, (canvas.width * 0.8)),
      maxHeight : Math.min(1000, (canvas.height * 0.9)),
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

  function saveConfigOptions() {
    try {
      if ((window.hasOwnProperty('localStorage')) && (window.localStorage !== null)) {
        options.snap = $("#chk-snap-toggle").prop('checked');
        options.showThreeSeconds = $("#chk-show-three-seconds").prop('checked');
        options.showGPSSpeed = $("#chk-show-GPS-speed").prop('checked');
        localStorage.setItem('rg2-options', JSON.stringify(options));
      }
    } catch (e) {
      // storage not supported so just return
      return;
    }
  }

  function displayOptionsDialog() {
    $("#rg2-option-controls").dialog({
      minWidth : 400,
      title : t("Configuration options"),
      dialogClass : "rg2-options-dialog",
      close : function () {
        saveConfigOptions();
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
      resetMapState();
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
      redraw(false);
    }).hide();
    $("#btn-toggle-names").click(function () {
      rg2.animation.toggleNameDisplay();
      redraw(false);
    }).hide();
    $("#btn-undo").button().button("disable").click(function () {
      rg2.drawing.undoLastPoint();
    });
    $("#btn-undo-gps-adjust").button().button("disable").click(function () {
      rg2.drawing.undoGPSAdjust();
    });
    $("#btn-zoom-in").click(function () {
      zoom(1);
    });
    $("#btn-zoom-out").click(function () {
      zoom(-1);
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
        options.circleSize = ui.value;
        redraw(false);
      }
    }).val(options.circleSize);
    $("#spn-course-width").spinner({
      max : 10,
      min : 1,
      step : 0.5,
      spin : function (event, ui) {
        /*jslint unparam:true*/
        options.courseWidth = ui.value;
        redraw(false);
      }
    }).val(options.courseWidth);
    $("#spn-map-intensity").spinner({
      max : 100,
      min : 0,
      step : 10,
      numberFormat : "n",
      spin : function (event, ui) {
        /*jslint unparam:true*/
        options.mapIntensity = ui.value;
        redraw(false);
      }
    }).val(options.mapIntensity);
    $("#spn-name-font-size").spinner({
      max : 30,
      min : 5,
      step : 1,
      numberFormat : "n",
      spin : function (event, ui) {
        /*jslint unparam:true*/
        options.replayFontSize = ui.value;
        redraw(false);
      }
    }).val(options.replayFontSize);
    $("#spn-route-intensity").spinner({
      max : 100,
      min : 0,
      step : 10,
      numberFormat : "n",
      spin : function (event, ui) {
        /*jslint unparam:true*/
        options.routeIntensity = ui.value;
        redraw(false);
      }
    }).val(options.routeIntensity);
    $("#spn-route-width").spinner({
      max : 10,
      min : 1,
      step : 0.5,
      spin : function (event, ui) {
        /*jslint unparam:true*/
        options.routeWidth = ui.value;
        redraw(false);
      }
    }).val(options.routeWidth);
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

  function setConfigOptions() {
    try {
      if ((window.hasOwnProperty('localStorage')) && (window.localStorage !== null)) {
        if (localStorage.getItem('rg2-options') !== null) {
          options = JSON.parse(localStorage.getItem('rg2-options'));
          // best to keep this at default?
          options.circleSize = 20;
          if (options.mapIntensity === 0) {
            rg2.utils.showWarningDialog("Warning", "Your saved settings have 0% map intensity so the map is invisible. You can adjust this on the configuration menu");
          }
        }
      }
    } catch (e) {
      // storage not supported so just continue
      console.log('Local storage not supported');
    }
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

  function mapLoadedCallback() {
    resetMapState();
    if (rg2Config.managing) {
      rg2.manager.mapLoadCallback();
    }
  }

  function resizeCanvas() {
    var winwidth, winheight;
    winwidth = window.innerWidth;
    winheight = window.innerHeight;
    scaleFactor = rg2.config.DEFAULT_SCALE_FACTOR;
    // allow for header
    $("#rg2-container").css("height", winheight - 36);
    canvas.width = winwidth;
    // allow for header
    canvas.height = winheight - 36;
    setTitleBar();
    resetMapState();
  }

  // Adds ctx.getTransform() - returns an SVGMatrix
  // Adds ctx.transformedPoint(x,y) - returns an SVGPoint
  function trackTransforms(ctx) {
    var xform, svg, savedTransforms, save, restore, scale, rotate, translate, transform, m2, setTransform, pt;
    svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
    xform = svg.createSVGMatrix();
    ctx.getTransform = function () {
      return xform;
    };

    savedTransforms = [];
    save = ctx.save;
    ctx.save = function () {
      savedTransforms.push(xform.translate(0, 0));
      return save.call(ctx);
    };
    restore = ctx.restore;
    ctx.restore = function () {
      xform = savedTransforms.pop();
      return restore.call(ctx);
    };
    scale = ctx.scale;
    ctx.scale = function (sx, sy) {
      xform = xform.scaleNonUniform(sx, sy);
      return scale.call(ctx, sx, sy);
    };
    rotate = ctx.rotate;
    ctx.rotate = function (radians) {
      xform = xform.rotate(radians * 180 / Math.PI);
      return rotate.call(ctx, radians);
    };
    translate = ctx.translate;
    ctx.translate = function (dx, dy) {
      xform = xform.translate(dx, dy);
      return translate.call(ctx, dx, dy);
    };
    transform = ctx.transform;
    ctx.transform = function (a, b, c, d, e, f) {
      m2 = svg.createSVGMatrix();
      m2.a = a;
      m2.b = b;
      m2.c = c;
      m2.d = d;
      m2.e = e;
      m2.f = f;
      xform = xform.multiply(m2);
      return transform.call(ctx, a, b, c, d, e, f);
    };
    setTransform = ctx.setTransform;
    ctx.setTransform = function (a, b, c, d, e, f) {
      xform.a = a;
      xform.b = b;
      xform.c = c;
      xform.d = d;
      xform.e = e;
      xform.f = f;
      return setTransform.call(ctx, a, b, c, d, e, f);
    };
    pt = svg.createSVGPoint();
    ctx.transformedPoint = function (x, y) {
      pt.x = x;
      pt.y = y;
      return pt.matrixTransform(xform.inverse());
    };
  }

  function setUpCanvas() {
    canvas.addEventListener('touchstart', rg2.handleTouchStart, false);
    canvas.addEventListener('touchmove', rg2.handleTouchMove, false);
    canvas.addEventListener('touchend', rg2.handleTouchEnd, false);
    trackTransforms(ctx);
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, false);
    canvas.addEventListener('DOMMouseScroll', rg2.handleScroll, false);
    canvas.addEventListener('mousewheel', rg2.handleScroll, false);
    canvas.addEventListener('mousedown', rg2.handleMouseDown, false);
    canvas.addEventListener('mousemove', rg2.handleMouseMove, false);
    canvas.addEventListener('mouseup', rg2.handleMouseUp, false);
    // force redraw once map has loaded
    map.addEventListener("load", function () {
      mapLoadedCallback();
    }, false);
  }


  function loadNewMap(mapFile) {
    // translated when displayed
    mapLoadingText = "Loading map";
    map.src = mapFile;
  }

  function loadEvent(eventid) {
    // highlight the selected event
    $('#rg2-event-list > li').removeClass('rg2-active-event').filter('#' + eventid).addClass('rg2-active-event');
    // show we are waiting
    $('body').css('cursor', 'wait');
    $("#rg2-load-progress-label").text(t("Loading courses"));
    $("#rg2-load-progress").show();
    rg2.courses.deleteAllCourses();
    rg2.controls.deleteAllControls();
    rg2.animation.resetAnimation();
    rg2.results.deleteAllResults();
    rg2.events.setActiveEventID(eventid);
    rg2.drawing.initialiseDrawing(rg2.events.hasResults(eventid));
    loadNewMap(rg2Config.maps_url + rg2.events.getMapFileName());
    redraw(false);
    setTitleBar();
    rg2.getCourses();
  }

  function getMapSize() {
    var size = {};
    size.height = map.height;
    size.width = map.width;
    return size;
  }

  function getOverprintDetails() {
    var opt, size, scaleFact, circleSize;
    opt = {};
    // attempt to scale overprint depending on map image size
    // this avoids very small/large circles, or at least makes things a bit more sensible
    size = getMapSize();
    // Empirically derived  so open to suggestions. This is based on a nominal 20px circle
    // as default. The square root stops things getting too big too quickly.
    // 1500px is a typical map image maximum size.
    scaleFact = Math.pow(Math.min(size.height, size.width) / 1500, 0.5);
    // don't get too carried away, although these would be strange map files
    scaleFact = Math.min(scaleFact, 5);
    scaleFact = Math.max(scaleFact, 0.5);
    circleSize = Math.round(options.circleSize * scaleFact);
    // ratios based on IOF ISOM overprint specification
    opt.controlRadius = circleSize;
    opt.finishInnerRadius = circleSize * (5 / 6);
    opt.finishOuterRadius = circleSize * (7 / 6);
    opt.startTriangleLength = circleSize * (7 / 6);
    opt.overprintWidth = options.courseWidth;
    opt.font = circleSize + 'pt Arial';
    return opt;
  }

  function getReplayDetails() {
    var opt;
    opt = {};
    opt.routeWidth = options.routeWidth;
    // stored as %, but used as 0 to 1.
    opt.routeIntensity = options.routeIntensity / 100;
    opt.replayFontSize = options.replayFontSize;
    opt.showThreeSeconds = $("#chk-show-three-seconds").prop('checked');
    opt.showGPSSpeed = $("#chk-show-GPS-speed").prop('checked');
    return opt;
  }

  function getSnapToControl() {
    return options.snap;
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
    setLanguageOptions();
    setConfigOptions();
    initialiseButtons();
    initialiseSpinners();
    configureUI();
    translateFixedText();

    map = new Image();
    rg2.events = new rg2.Events();
    rg2.courses = new rg2.Courses();
    rg2.colours = new rg2.Colours();
    rg2.results = new rg2.Results();
    rg2.controls = new rg2.Controls();
    rg2.animation = new rg2.Animation();
    rg2.drawing = new rg2.Draw();
    rg2.requestedHash = new rg2.RequestedHash();
    input.dragStart = null;
    // looks odd but this works for initialisation
    input.dragged = true;
    infoPanelMaximised = true;

    if (rg2Config.managing) {
      setManagerOptions();
      mapLoadingText = "";
    } else {
      // translated when displayed
      mapLoadingText = "Select an event";
    }
    setUpCanvas();
    // disable right click menu: may add our own later
    $(document).bind("contextmenu", function (evt) {
      evt.preventDefault();
    });
    startDisplayingInfo();
  }

  return {
    // functions and variables available elsewhere
    t : t,
    init : init,
    input: input,
    options : options,
    redraw : redraw,
    zoom: zoom,
    getOverprintDetails : getOverprintDetails,
    getReplayDetails : getReplayDetails,
    ctx : ctx,
    canvas: canvas,
    getMapSize : getMapSize,
    loadNewMap : loadNewMap,
    loadEvent : loadEvent,
    createEventMenu : createEventMenu,
    createResultMenu : createResultMenu,
    createCourseMenu : createCourseMenu,
    getSnapToControl : getSnapToControl,
    setNewLanguage : setNewLanguage
  };
}(window, window.jQuery));
