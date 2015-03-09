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
var rg2 = (function (window, $) {
  'use strict';

  function startDisplayingInfo() {
    // check if a specific event has been requested
    if ((window.location.hash) && (!rg2.config.managing)) {
      rg2.requestedHash.parseHash(window.location.hash);
    }
    // load event details
    rg2.getEvents();
    // slight delay looks better than going straight in....
    setTimeout(function () {
      $("#rg2-container").show();
    }, 500);
  }

  function getResultsStats(controls) {
    var stats, resultsinfo, coursearray;
    resultsinfo = rg2.results.getResultsInfo();
    coursearray = rg2.courses.getCoursesForEvent();
    stats = "<p><strong>" +  rg2.t("Courses") + ":</strong> " + coursearray.length + ". <strong>" +  rg2.t("Controls") + ":</strong> " + controls;
    stats += ". <strong> " +  rg2.t("Results") + ":</strong> " + resultsinfo.results + ".</p>";
    stats += "<p><strong>" +  rg2.t("Routes") + ":</strong> " + resultsinfo.totalroutes + " (" + resultsinfo.percent + "%). ";
    stats += "<strong>" +  rg2.t("Drawn routes") + ":</strong> " + resultsinfo.drawnroutes + ". <strong>" +  rg2.t("GPS routes") + ":</strong> " + resultsinfo.gpsroutes + ".</p>";
    stats += "<p><strong>" +  rg2.t("Total time") + ":</strong> " + resultsinfo.time + ".</p>";
    return stats;
  }

  function getMapStats(validWordlfile) {
    var stats, mapSize;
    mapSize = rg2.getMapSize();
    stats = "<p><strong>" +  rg2.t("Map ") + ":</strong> ID " + rg2.events.getActiveMapID() + ", " + mapSize.width + " x " + mapSize.height + " pixels";
    if (validWordlfile) {
      stats += ". " +  rg2.t("Map is georeferenced") + ".</p>";
    } else {
      stats += ".</p>";
    }
    return stats;
  }

  function getEventStats() {
    var stats, runnercomments, eventinfo, id;
    id = rg2.events.getActiveEventID();
    // check there is an event to report on
    if (id === null) {
      return "";
    }
    id = rg2.events.getKartatEventID();
    eventinfo = rg2.events.getEventInfo(parseInt(id, 10));
    runnercomments = rg2.results.getComments();
    stats = "<h3>" +  rg2.t("Event statistics") + ": " + eventinfo.name + ": " + eventinfo.date + "</h3>";
    stats += getResultsStats(eventinfo.controls);
    if (eventinfo.comment) {
      stats += "<p>" + eventinfo.comment + "</p>";
    }
    stats += getMapStats(eventinfo.worldfile.valid);
    if (runnercomments) {
      stats += "<p><strong>" +  rg2.t("Comments") + ":</strong></p>" + runnercomments;
    }
    // #177 not pretty but gets round problems of double encoding
    stats = stats.replace(/&amp;/g, '&');
    return stats;
  }

  function setManagerOptions() {
    if ($('#rg2-manage-login').length !== 0) {
      rg2.config.managing = true;
      rg2.manager = new rg2.Manager(rg2Config.keksi);
      rg2.managerUI.initialiseUI();
    } else {
      rg2.config.managing = false;
      // translated when displayed
      rg2.setMapLoadingText("Select an event");
    }
  }

  function updateUIForNewEvent(eventid) {
    // highlight the selected event
    $('#rg2-event-list > li').removeClass('rg2-active-event').filter('#' + eventid).addClass('rg2-active-event');
    // show we are waiting
    $('body').css('cursor', 'wait');
    $("#rg2-load-progress-label").text(rg2.t("Loading courses"));
    $("#rg2-load-progress").show();
  }

  function loadEvent(eventid) {
    updateUIForNewEvent(eventid);
    rg2.courses.deleteAllCourses();
    rg2.controls.deleteAllControls();
    rg2.animation.resetAnimation();
    rg2.results.deleteAllResults();
    rg2.events.setActiveEventID(eventid);
    rg2.drawing.initialiseDrawing(rg2.events.hasResults(eventid));
    rg2.loadNewMap(rg2Config.maps_url + rg2.events.getMapFileName());
    rg2.ui.setTitleBar();
    rg2.redraw(false);
    rg2.getCourses();
  }

  function createObjects() {
    rg2.events = new rg2.Events();
    rg2.courses = new rg2.Courses();
    rg2.colours = new rg2.Colours();
    rg2.results = new rg2.Results();
    rg2.controls = new rg2.Controls();
    rg2.animation = new rg2.Animation();
    rg2.drawing = new rg2.Draw();
    rg2.requestedHash = new rg2.RequestedHash();
  }

  function init() {
    $("#rg2-container").hide();
    $.ajaxSetup({
      cache : false
    });
    rg2.loadConfigOptions();
    rg2.ui.configureUI();
    rg2.setLanguageOptions();
    createObjects();
    setManagerOptions();
    rg2.setUpCanvas();
    startDisplayingInfo();
  }

  return {
    // functions and variables available elsewhere
    init : init,
    loadEvent : loadEvent,
    getEventStats : getEventStats
  };
}(window, window.jQuery));
