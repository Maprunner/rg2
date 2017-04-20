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
    stats = "<tr><td><strong>" + rg2.t("Courses") + "</strong></td><td>" + coursearray.length + "</td></tr>";
    stats += "<tr><td><strong>" + rg2.t("Controls") + "</strong></td><td>" + controls + "</td></tr>";
    stats += "<tr><td><strong>" + rg2.t("Results") + "</strong></td><td>" + resultsinfo.results + "</td></tr>";
    stats += "<tr><td><strong>" + rg2.t("Routes") + "</strong></td><td>" + resultsinfo.totalroutes + " (" + resultsinfo.percent + "%)</td></tr>";
    stats += "<tr><td><strong>" + rg2.t("Drawn routes") + "</strong></td><td>" + resultsinfo.drawnroutes + "</td></tr>";
    stats += "<tr><td><strong>" + rg2.t("GPS routes") + "</strong></td><td>" + resultsinfo.gpsroutes + "</td></tr>";
    stats += "<tr><td><strong>" + rg2.t("Total time") + "</strong></td><td>" + resultsinfo.time + "</td></tr>";
    return stats;
  }

  function getMapStats(validWordlfile) {
    var stats, mapSize;
    mapSize = rg2.getMapSize();
    stats = "<tr><td><strong>" +  rg2.t("Map") + "</strong></td><td>ID " + rg2.events.getActiveMapID() + ", " + mapSize.width + " x " + mapSize.height + " pixels";
    if (validWordlfile) {
      stats += ". " +  rg2.t("Map is georeferenced") + ".</td></tr>";
    } else {
      stats += ".</td></tr>";
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
    stats = "<div><table><thead><tr><th colspan='3'><h2>" + rg2.t("Event statistics") + ": " + eventinfo.name + ": " + eventinfo.date + "</h2></th></tr></thead><tbody>";
    stats += getResultsStats(eventinfo.controls);
    if (eventinfo.comment) {
      stats += "<tr><td>" + rg2.t("Comments") + "</td><td>" + eventinfo.comment + "</td></tr>";
    }
    stats += getMapStats(eventinfo.worldfile.valid);
    stats += "</tbody></table>";
    if (runnercomments) {
      stats += "<div><table><thead><tr><th>"  + rg2.t("Name") + "</th><th>" + rg2.t("Course") + "</th><th>" + rg2.t("Comments") + "</th></tr></thead><tbody>";
      stats += runnercomments + "</tbody></table></div>";
    }
    // #177 not pretty but gets round problems of double encoding
    stats = stats.replace(/&amp;/g, '&');
    return stats;
  }

  function getManagerLink() {
    var link, html;
    // get json url and strip anything after the last / (so you're left with http://x.routegadget.co.uk/rg2/)
    link = rg2Config.json_url.replace(/\/[^\/]+$/, "/");
    // Append the manage token
    link += "?manage";
    html = "<a href=" + link + ">Manager Login</a>";
    return html;
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
    startDisplayingInfo();
  }

  return {
    // functions and variables available elsewhere
    init : init,
    loadEvent : loadEvent,
    getEventStats : getEventStats,
    getManagerLink : getManagerLink
  };
}(window, window.jQuery));
