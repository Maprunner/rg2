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

  function setManagerOptions() {
    rg2.manager = new rg2.Manager(rg2Config.keksi);
    rg2.managerUI.initialiseUI();
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
    rg2.ui.setTitleBar();
    rg2.getCourses();
  }

  function init() {
    $("#rg2-container").hide();
    $.ajaxSetup({
      cache : false
    });
    if ($('#rg2-manage-login').length !== 0) {
      rg2.config.managing = true;
    } else {
      rg2.config.managing = false;
    }
    rg2.loadConfigOptions();
    rg2.ui.configureUI();
    rg2.setLanguageOptions();
    rg2.events = new rg2.Events();
    rg2.courses = new rg2.Courses();
    rg2.colours = new rg2.Colours();
    rg2.results = new rg2.Results();
    rg2.controls = new rg2.Controls();
    rg2.animation = new rg2.Animation();
    rg2.drawing = new rg2.Draw();
    rg2.requestedHash = new rg2.RequestedHash();
    if (rg2.config.managing) {
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
    getEventStats : getEventStats
  };
}(window, window.jQuery));
