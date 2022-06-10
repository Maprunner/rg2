/*
 * Routegadget 2
 * https://github.com/Maprunner/rg2
 *
 * Copyright (c) 2014 Simon Errington and contributors
 * Licensed under the MIT license.
 * https://github.com/Maprunner/rg2/blob/master/LICENSE
 */
// eslint-disable-next-line no-redeclare
var rg2 = (function (window, $) {
  'use strict';
  var eventRequestInProgress = false;

  function startDisplayingInfo() {
    // check if a specific event has been requested
    if ((window.location.hash) && (!rg2.config.managing)) {
      rg2.requestedHash.parseHash(window.location.hash);
    } else {
      window.history.pushState({hash: '#'}, '', '');
    }
    // load event details
    rg2.getEvents();
    // slight delay looks better than going straight in....
    setTimeout(function () {
      $("#rg2-container").show();
    }, 500);
  }

  function getResultsStats(controls, validWorldFile) {
    var stats, resultsinfo, coursearray, mapSize;
    resultsinfo = rg2.results.getResultsInfo();
    coursearray = rg2.courses.getCoursesForEvent();
    mapSize = rg2.getMapSize();
    stats = "<div class='rg2-event-stats-table'><div class='header'>" + rg2.t("Courses") + "</div><div class='item'>" + coursearray.length + "</div>";
    stats += "<div class='header'>" + rg2.t("Controls") + "</div><div class='item'>" + controls + "</div>";
    stats += "<div class='header'>" + rg2.t("Results") + "</div><div class='item'>" + resultsinfo.results + "</div>";
    stats += "<div class='header'>" + rg2.t("Routes") + "</div><div class='item'>" + resultsinfo.totalroutes + " (" + resultsinfo.percent + "%)</div>";
    stats += "<div class='header'>" + rg2.t("Drawn routes") + "</div><div class='item'>" + resultsinfo.drawnroutes + "</div>";
    stats += "<div class='header'>" + rg2.t("GPS routes") + "</div><div class='item'>" + resultsinfo.gpsroutes + "</div>";
    stats += "<div class='header'>" + rg2.t("Total time") + "</div><div class='item'>" + resultsinfo.time + "</div>";
    stats += "<div class='header'>" +  rg2.t("Map") + " ID " + rg2.events.getActiveMapID() + "</div>";
    stats += "<div class='item'>" + mapSize.width + " x " + mapSize.height + " pixels";
    if (validWorldFile) {
      const worldFile = rg2.events.getWorldFile();
      const digits = 1000000;
      stats += ". " + rg2.t("Map is georeferenced") + ": ";
      stats += (parseInt((worldFile.F) * digits)/digits) + ", " + (parseInt((worldFile.C) * digits)/digits);
    }
    stats += "</div></div>";
    return stats;
  }

  function getEventStats() {
    var stats, eventinfo, id;
    id = rg2.events.getActiveEventID();
    // check there is an event to report on
    if (id === null) {
      return "";
    }
    id = rg2.events.getKartatEventID();
    eventinfo = rg2.events.getEventInfo(parseInt(id, 10));
    stats = "<h2>" + rg2.t("Event statistics") + ": " + eventinfo.name + ": " + eventinfo.date + "</h2>";
    if (eventinfo.comment) {
      stats += "<div><strong>" + rg2.t("Comments") + "</strong>: " + eventinfo.comment + "</div>";
    }
    stats += "<hr>";
    stats += getResultsStats(eventinfo.controls, eventinfo.worldfile.valid);
    stats += "<hr>";
    stats += rg2.results.getComments();
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
    // prevent double loading if user double clicks on event
    if (eventRequestInProgress) {
      return;
    }
    eventRequestInProgress = true;
    updateUIForNewEvent(eventid);
    rg2.courses.deleteAllCourses();
    rg2.controls.deleteAllControls();
    rg2.results.deleteAllResults();
    rg2.events.setActiveEventID(eventid);
    rg2.animation.resetAnimation();
    rg2.drawing.initialiseDrawing(rg2.events.hasResults(eventid));
    rg2.loadNewMap(rg2Config.maps_url + rg2.events.getMapFileName());
    rg2.ui.setTitleBar();
    rg2.redraw(false);
    rg2.getEvent(rg2.events.getKartatEventID());
  }

  function eventLoaded() {
    eventRequestInProgress = false;
  }

  function createObjects() {
    rg2.events = new rg2.Events();
    rg2.courses = new rg2.Courses();
    rg2.colours = new rg2.Colours();
    rg2.results = new rg2.Results();
    rg2.controls = new rg2.Controls();
    rg2.animation = new rg2.Animation();
    rg2.drawing = new rg2.Draw();
    rg2.overlay = new rg2.Overlay();
    rg2.requestedHash = new rg2.RequestedHash();
    rg2.stats = new rg2.Stats();
  }

  function handleNavigation() {
    var requestedID, requestedEventID, activeEventID;
    // console.log("popstate: " + window.location.hash);
    // don't try to do anything clever in manager
    if (!rg2.config.managing) {
      // find out where we are trying to go
      requestedID = rg2.requestedHash.parseHash(window.location.hash);
      if (requestedID) {
        requestedEventID = rg2.events.getEventIDForKartatID(requestedID);
        activeEventID = rg2.events.getActiveEventID();
        // prevent double loading of events for cases where we get popstate for a change
        // triggered via RG2 interaction rather than browser navigation
        // ... or something like that: at least this seems to work in FF, Chrome and Edge
        // which is a start
        if ((requestedEventID !== undefined) && (activeEventID !== requestedEventID)) {
          rg2.loadEvent(requestedEventID);
        }
      }
    }
  }

  function init() {
    $("#rg2-container").hide();
    $.ajaxSetup({
      cache : false,
      // suppress jQuery jsonp handling problem: see issue #291 
      jsonp: false
    });
    rg2.loadConfigOptions();
    rg2.ui.configureUI();
    rg2.setLanguageOptions();
    createObjects();
    setManagerOptions();
    rg2.setUpCanvas();
    window.onpopstate = handleNavigation;
    startDisplayingInfo();
  }

  return {
    // functions and variables available elsewhere
    init : init,
    loadEvent : loadEvent,
    getEventStats : getEventStats,
    eventLoaded : eventLoaded
  };
}(window, window.jQuery));
