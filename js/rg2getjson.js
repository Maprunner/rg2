(function () {
  function reportJSONFail(errorText) {
    $("#rg2-load-progress").hide();
    $("#rg2-map-load-progress").hide();
    $('body').css('cursor', 'auto');
    rg2.utils.showWarningDialog('Configuration error', errorText);
  }

  function getEvents() {
    var eventID;
    $.getJSON(rg2Config.json_url, {
      type : "events",
      cache : false
    }).done(function (json) {
      //console.log("Events: " + json.data.events.length);
      rg2.events.deleteAllEvents();
      $.each(json.data.events, function () {
        rg2.events.addEvent(new rg2.Event(this));
      });
      rg2.ui.createEventMenu();
      // load requested event if set
      // input is kartat ID so need to find internal ID first
      if (rg2.requestedHash.getID()) {
        eventID = rg2.events.getEventIDForKartatID(rg2.requestedHash.getID());
        if (eventID !== undefined) {
          rg2.loadEvent(eventID);
        }
      }
      if (rg2.config.managing) {
        rg2.manager.eventListLoaded();
      }
    }).fail(function (jqxhr, textStatus, error) {
      reportJSONFail("Events request failed: " + error);
    });
  }

  function processGPSTracks(json) {
    var active, i, routes, crs;
    $("#rg2-load-progress-label").text(rg2.t("Saving routes"));
    // TODO remove temporary (?) fix to get round RG1 events with no courses defined: see #179
    if (rg2.courses.getNumberOfCourses() > 0) {
      rg2.results.addTracks(json.data.routes);
    }
    rg2.ui.createCourseMenu();
    rg2.ui.createResultMenu();
    rg2.animation.updateAnimationDetails();
    $('body').css('cursor', 'auto');
    if (rg2.config.managing) {
      rg2.manager.eventFinishedLoading();
    } else {
      $("#rg2-info-panel").tabs("enable", rg2.config.TAB_COURSES);
      $("#rg2-info-panel").tabs("enable", rg2.config.TAB_RESULTS);
      if (rg2.events.eventIsLocked()) {
        $("#rg2-info-panel").tabs("disable", rg2.config.TAB_DRAW);
      } else {
        $("#rg2-info-panel").tabs("enable", rg2.config.TAB_DRAW);
      }
      // open courses tab for new event: else stay on draw tab
      active = $("#rg2-info-panel").tabs("option", "active");
      // don't change tab if we have come from DRAW since it means
      // we have just reloaded following a save
      if (active !== rg2.config.TAB_DRAW) {
        $("#rg2-info-panel").tabs("option", "active", rg2.requestedHash.getTab());
      }
      $("#rg2-info-panel").tabs("refresh");
      $("#btn-show-splits").show();
      if ((rg2Config.enable_splitsbrowser) && (rg2.events.hasResults())) {
        $("#rg2-splitsbrowser").off().click(function () {
          // _=<timestamp> mimics jQuery cache busting strategy to force reload of event data: needed to get
          // around events that are deleted and then recreated with same number
          window.open(rg2Config.json_url + "?type=splitsbrowser&id=" + rg2.events.getKartatEventID() + "&_=" + Date.now());
        }).show();
      } else {
        $("#rg2-splitsbrowser").off().hide();
      }
      // set up screen as requested in hash
      routes = rg2.requestedHash.getRoutes();
      for (i = 0; i < routes.length; i += 1) {
        const event = $.Event('click');
        event.target = {};
        event.target.checked = true;
        event.target.id = routes[i];
        $(".showtrack").filter("#" + routes[i]).trigger(event).prop('checked', true);
      }
      crs = rg2.requestedHash.getCourses();
      for (i = 0; i < crs.length; i += 1) {
        const event = $.Event('click');
        event.target = {};
        event.target.checked = true;
        event.target.id = crs[i];
        $(".showcourse").filter("#" + crs[i]).trigger(event).prop('checked', true);
      }
    }
    $("#rg2-load-progress-label").text("");
    $("#rg2-load-progress").hide();
    rg2.redraw(false);
  }

  function processResults(json) {
    var isScoreEvent;
    $("#rg2-load-progress-label").text(rg2.t("Saving results"));
    isScoreEvent = rg2.events.isScoreEvent();
    // TODO remove temporary (?) fix to get round RG1 events with no courses defined: see #179
    if (rg2.courses.getNumberOfCourses() > 0) {
      rg2.results.addResults(json.data.results, isScoreEvent);
    }
    rg2.courses.setResultsCount();
    if (isScoreEvent) {
      rg2.controls.deleteAllControls();
      rg2.results.generateScoreCourses();
      rg2.courses.generateControlList(rg2.controls);
    }
    $("#rg2-result-list").accordion("refresh");
  }

  function getEvent(id) {
    // get courses, results and routes for event
    $.getJSON(rg2Config.json_url, {
      id : id,
      type : "event",
      cache : false
    }).done(function (json) {
      $("#rg2-load-progress-label").text(rg2.t("Saving courses"));
      //("Event " + id + ": " + json.data.courses.length + " courses, " + json.data.results.length + " results, " + json.data.routes.length + " routes");
      $.each(json.data.courses, function () {
        rg2.courses.addCourse(new rg2.Course(this, rg2.events.isScoreEvent()));
      });
      rg2.courses.updateCourseDropdown();
      rg2.courses.generateControlList(rg2.controls);
      $("#btn-toggle-controls").show();
      $("#btn-toggle-names").show();
      processResults(json);
      processGPSTracks(json);
      rg2.eventLoaded();
    }).fail(function (jqxhr, textStatus, error) {
      reportJSONFail("Event request failed for event " + id + ": " + error);
      rg2.eventLoaded();
    });
  }

  function getNewLanguage(lang) {
    $.getScript(rg2Config.lang_url + lang + ".js")
      .done(function (lang) {
        // script sets rg2.dictionary to new language
        rg2.ui.setNewLanguage(lang);
        /* eslint-disable-next-line no-unused-vars */
      }).fail(function (jqxhr, settings, exception) {
        reportJSONFail("Language request failed.");
      });
  }

  rg2.getEvents = getEvents;
  rg2.getEvent = getEvent;
  rg2.getNewLanguage = getNewLanguage;
}());
