(function () {
  var ui = {

    setTitleBar: function () {
      var title;
      if (window.innerWidth >= rg2.config.BIG_SCREEN_BREAK_POINT) {
        title = rg2.he.decode(rg2.events.getActiveEventName()) + " " + rg2.events.getActiveEventDate();
        // set the tab title
        document.title = title;
        $("#rg2-event-title").html(title).show();
      } else if (window.innerWidth > rg2.config.SMALL_SCREEN_BREAK_POINT) {
        title = rg2.events.getActiveEventName();
        $("#rg2-event-title").html(title).show();
      } else {
        $("#rg2-event-title").hide();
      }
      if (rg2.events.mapIsGeoreferenced()) {
        $("#rg2-event-title-icon").addClass("fa fa-globe-americas");
      } else {
        $("#rg2-event-title-icon").removeClass("fa fa-globe-americas");
      }
      if (rg2.events.eventIsLocked()) {
        $("#rg2-event-lock-icon").addClass("fa fa-lock");
      } else {
        $("#rg2-event-lock-icon").removeClass("fa fa-lock");
      }
    },

    setNewLanguage: function (lang) {
      var eventid;
      if ($("#rg2-event-list").menu("instance") !== undefined) {
        $("#rg2-event-list").menu("destroy");
      }
      // non-english dictionary is already installed by script that has loaded
      if (lang === "en") {
        rg2.setDictionary({ code: "en" });
      }
      this.createEventMenu();
      eventid = rg2.events.getActiveEventID();
      if (eventid !== null) {
        rg2.courses.removeAllFromDisplay();
        rg2.results.updateTrackDisplay(rg2.config.DISPLAY_ALL_COURSES, false);
        rg2.animation.resetAnimation();
        rg2.drawing.initialiseDrawing(rg2.events.hasResults(eventid));
        this.createCourseMenu();
        this.createResultMenu();
      }
      $("#rg2-info-panel").tabs("refresh");
      rg2.redraw(false);
    },

    getManagerLink: function () {
      var link, html;
      // replace the api link with the manage token
      link = rg2Config.json_url.replace("rg2api.php", "?manage");
      html = "<a href=" + link + ">Manager Login</a>";
      return html;
    },

    // called whenever the active tab changes to tidy up as necessary
    tabActivated: function () {
      switch (this.getActiveTab()) {
        case rg2.config.TAB_DRAW:
          rg2.courses.removeAllFromDisplay();
          rg2.drawing.showCourseInProgress();
          break;
        default:
          break;
      }

      // Set scroll bar position in tab to how it was when 
      // user was last looking at it
      var scrollPos = $("#rg2-info-panel").attr(this.getScrollPosAttrName());
      $("#rg2-event-tab-body").scrollParent().scrollTop(scrollPos);

      rg2.redraw(false);
    },

    displayAboutDialog: function () {
      $("#rg2-event-stats").empty().html(rg2.getEventStats());
      $("#rg2-manager-link").empty().html(this.getManagerLink());
      $("#rg2-about-dialog").dialog({
        width: Math.min(1000, (rg2.canvas.width * 0.8)),
        maxHeight: Math.min(1000, (rg2.canvas.height * 0.9)),
        title: "RG2 Version " + rg2.config.RG2VERSION,
        dialogClass: "rg2-about-dialog",
        resizable: false,
        buttons: {
          Ok: function () {
            $(this).dialog("close");
          }
        }
      });
    },

    displayOptionsDialog: function () {
      $("#rg2-option-controls").dialog({
        minWidth: 400,
        title: rg2.t("Configuration options"),
        dialogClass: "rg2-options-dialog",
        close: function () {
          rg2.saveConfigOptions();
        }
      });
    },

    initialiseButtons: function () {
      var self;
      self = this;
      $("#btn-about").click(function () {
        self.displayAboutDialog();
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
      $("#btn-move-all").prop('checked', false);
      $("#btn-align-map").prop('checked', rg2.options.alignMap).click(function (event) {
        if (event.target.checked) {
          rg2.options.alignMap = true;
        } else {
          rg2.options.alignMap = false;
        }
        rg2.saveConfigOptions();
      });
      $("#btn-options").click(function () {
        self.displayOptionsDialog();
      });
      $("#btn-real-time").click(function () {
        rg2.animation.setReplayType();
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
          width: 'auto',
          maxHeight: $("#rg2-map-canvas").height(),
          height: 'auto',
          position: { my: "top", at: "top", of: "#rg2-map-canvas" },
          dialogClass: "rg2-splits-table",
          modal: true,
          buttons: {
            Ok: function () {
              $("#rg2-splits-table").dialog('close');
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
      $("#btn-autofit-gps").button().button("disable").click(function () {
        rg2.drawing.autofitGPSTrack();
      });
      $("#btn-zoom-in").click(function () {
        rg2.zoom(1);
      });
      $("#btn-zoom-out").click(function () {
        rg2.zoom(-1);
      });
      $("#btn-rotate-left").click(function () {
        rg2.rotateMap(-1);
      });
      $("#btn-rotate-right").click(function () {
        rg2.rotateMap(1);
      });
      $("#rg2-load-gps-file").button().button("disable");
    },

    setResultCheckboxes: function () {
      // checkbox to show a course
      $(".showcourse").click(function (event) {
        //Prevent opening accordion when check box is clicked
        event.stopPropagation();
        const id = event.target.id;
        if (event.target.checked) {
          rg2.courses.putOnDisplay(id);
          // align courses and results tab
          $(".showcourse").filter("#" + id).prop('checked', true);
        } else {
          rg2.courses.removeFromDisplay(id);
          // align courses and results tab
          $(".showcourse").filter("#" + id).prop('checked', false);
        }
        $(".showallcourses").prop('checked', rg2.courses.allCoursesDisplayed());
        rg2.courses.setFilter(id);
        rg2.requestedHash.setCourses();
        rg2.redraw(false);
      });
      // checkbox on course tab to show all courses
      $(".showallcourses").click(function (event) {
        if (event.target.checked) {
          rg2.courses.putAllOnDisplay();
          // select all the individual checkboxes for each course
          $(".showcourse").prop('checked', true);
        } else {
          rg2.courses.removeAllFromDisplay();
          $(".showcourse").prop('checked', false);
        }
        rg2.courses.setAllFilters();
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
        const id = parseInt(event.target.id, 10);
        const courseid = rg2.results.getCourseForResult(id);
        if (event.target.checked) {
          rg2.results.putOneTrackOnDisplay(id);
        } else {
          rg2.results.removeOneTrackFromDisplay(id);
        }
        // align all routes for this course checkboxes
        $(".allcoursetracks").filter("#" + courseid).prop('checked', rg2.results.allTracksForCourseDisplayed(courseid));
        // align all routes for all courses checkbox
        $(".alltracks").prop('checked', rg2.results.allTracksDisplayed());
        rg2.courses.setFilter(courseid);
        rg2.requestedHash.setRoutes();
        rg2.redraw(false);
      });
      // checkbox to delete a route
      $(".deleteroute").click(function (event) {
        rg2.drawing.confirmDeleteRoute(parseInt(event.target.id, 10));
      });
      // checkbox to display all tracks for course
      $(".allcoursetracks").click(function (event) {
        let courseid = parseInt(event.target.id, 10);
        rg2.results.updateTrackDisplay(courseid, event.target.checked);
        // align all tabs
        $(".allcoursetracks").filter("#" + courseid).prop('checked', event.target.checked);
        // align individual result checkboxes
        $(".showtrack-" + courseid).prop('checked', event.target.checked);
        // align all routes for all courses checkbox
        $(".alltracks").prop('checked', rg2.results.allTracksDisplayed());
        rg2.courses.setFilter(courseid);
        rg2.requestedHash.setRoutes();
        rg2.redraw(false);
      });
      // checkbox on course tab to show all tracks for all courses
      $(".alltracks").click(function (event) {
        rg2.results.updateTrackDisplay(rg2.config.DISPLAY_ALL_COURSES, event.target.checked);
        // align all the individual checkboxes for each course
        $(".showtrack").prop('checked', event.target.checked);
        // align all tabs
        $(".allcoursetracks").prop('checked', event.target.checked);
        rg2.courses.setAllFilters(event.target.checked);
        rg2.requestedHash.setRoutes();
        rg2.redraw(false);
      });
      // checkbox to animate a result
      $(".showreplay").click(function (event) {
        let idx = parseInt(event.target.id, 10);
        // this is a mess but too complicated to refactor at this point
        // replay id uses index into this.results rather than resultid like elsewhere
        const courseid = rg2.results.getCourseForResultByIndex(idx);
        if (event.target.checked) {
          rg2.animation.addRunner(new rg2.Runner(idx), true);
        } else {
          rg2.animation.removeRunner(idx, true);
        }
        // align "All routes" checkbox
        $(".allcoursetracksreplay").filter("#" + courseid).prop('checked', rg2.results.allTracksForCourseReplayed(courseid));
        // align "All" checkbox
        $(".allcoursereplay").filter("#" + courseid).prop('checked', rg2.results.allResultsForCourseReplayed(courseid));
        rg2.redraw(false);
      });
      // checkbox to animate all tracks for course
      $(".allcoursetracksreplay").click(function (event) {
        let courseid = parseInt(event.target.id, 10);
        // true means only return runners with a valid track
        const courseresults = rg2.results.getAllRunnersForCourse(courseid, true);
        rg2.animation.animateRunners(courseresults, event.target.checked);
        // align individual result checkboxes
        $(".showtrackreplay.showreplay-" + courseid).prop('checked', event.target.checked);
        // align "All routes" checkbox
        $(".allcoursetracksreplay").filter("#" + courseid).prop('checked', event.target.checked);
        // align "All" checkbox
        $(".allcoursereplay").prop('checked', rg2.results.allResultsForCourseReplayed(courseid));
        rg2.redraw(false);
      });
      // checkbox to animate all results for course
      // this one draws straight lines between controls for non-drawn routes
      $(".allcoursereplay").click(function (event) {
        const courseid = parseInt(event.target.id, 10);
        // false means get all runners even if they don't have a valid track
        const courseresults = rg2.results.getAllRunnersForCourse(courseid, false);
        rg2.animation.animateRunners(courseresults, event.target.checked);
        // align individual result checkboxes
        $(".showreplay-" + courseid).prop('checked', event.target.checked);
        // align "All routes" checkbox
        $(".allcoursetracksreplay").filter("#" + courseid).prop('checked', rg2.results.allTracksForCourseReplayed(courseid));
        rg2.redraw(false);
      });
    },

    createResultMenu: function () {
      //loads menu from populated result array
      var html = rg2.results.formatResultListAsAccordion();
      // #177 not pretty but gets round problems of double encoding
      html = html.replace(/&amp;/g, '&');
      $("#rg2-result-list").empty().append(html);
      // force all panels to start closed: don't know why this is needed after a recreate but...
      $("#rg2-result-list").accordion("option", "active", false).accordion("refresh");
      // Add the search feature to the search bar
      $(".rg2-result-search").keyup(function (event) {
        var courseid, filter, tables, table, rows, data, i;
        // Get the input from the search bar
        filter = event.target.value.toUpperCase();
        courseid = event.target.id.replace("search-", "");
        // Get a list of the result tables
        tables = $(".resulttable");
        // Find the correct table for this search
        for (i = 0; i < tables.length; i += 1) {
          if (tables[i].id === "table-" + courseid) {
            table = tables[i];
            break;
          }
        }
        // Get all the rows of the table
        rows = table.getElementsByTagName("tr");
        // Loop through the rows
        for (i = 1; i < rows.length; i += 1) {
          // Get the data in the second column (the name)
          data = rows[i].getElementsByTagName("td")[1];
          if (data) {
            // If the data doesn't match, hide the row
            if (data.innerHTML.toUpperCase().indexOf(filter) > -1) {
              rows[i].style.display = "";
            } else {
              rows[i].style.display = "none";
            }
          }
        }
      });
      $("#rg2-info-panel").tabs("refresh");
      this.setResultCheckboxes();
      // disable control dropdown if we have no controls
      if (rg2.courses.getHighestControlNumber() === 0) {
        $("#rg2-control-select").prop('disabled', true);
      } else {
        $("#rg2-control-select").prop('disabled', false);
      }
      $('.resulttable tr').dblclick(function () {
        const id = $(this).find("td").attr("id");
        if (id) {
          rg2.stats.showStats(parseInt(id, 10));
        }
      });
      // use right click to trigger extra functionality
      $('.resulttable tr').contextmenu(function (event) {
        event.preventDefault();
        // only handle clicks on valid results rows
        const id = $(this).find("td").attr("id");
        if (id) {
          rg2.stats.showExtraStats(parseInt(id, 10));
        }
      });
    },

    createCourseMenu: function () {
      //loads menu from populated courses array
      $("#rg2-course-table").empty().append(rg2.courses.formatCoursesAsTable());
      $("#rg2-course-filter-table").empty().append(rg2.courses.formatCourseFilters());
      rg2.courses.formatFilterSliders()
    },

    initialiseSpinners: function () {
      $("#spn-control-circle").spinner({
        max: 50,
        min: 3,
        step: 1,
        spin: function (event, ui) {
          rg2.setConfigOption("circleSize", ui.value);
          rg2.redraw(false);
        }
      }).val(rg2.options.circleSize);
      $("#spn-course-width").spinner({
        max: 10,
        min: 1,
        step: 0.5,
        spin: function (event, ui) {
          rg2.setConfigOption("courseWidth", ui.value);
          rg2.redraw(false);
        }
      }).val(rg2.options.courseWidth);
      $("#spn-map-intensity").spinner({
        // spinner uses 0 to 100%: stored and used as 0 to 1
        max: 100,
        min: 0,
        step: 10,
        numberFormat: "n",
        spin: function (event, ui) {
          rg2.setConfigOption("mapIntensity", ui.value / 100);
          rg2.redraw(false);
        }
      }).val(rg2.options.mapIntensity * 100);
      $("#spn-name-font-size").spinner({
        max: 30,
        min: 5,
        step: 1,
        numberFormat: "n",
        spin: function (event, ui) {
          rg2.setConfigOption("replayFontSize", ui.value);
          rg2.redraw(false);
        }
      }).val(rg2.options.replayFontSize);
      $("#spn-route-intensity").spinner({
        // spinner uses 0 to 100%: stored and used as 0 to 1
        max: 100,
        min: 0,
        step: 10,
        numberFormat: "n",
        spin: function (event, ui) {
          rg2.setConfigOption("routeIntensity", ui.value / 100);
          rg2.redraw(false);
        }
      }).val(rg2.options.routeIntensity * 100);
      $("#spn-route-width").spinner({
        max: 10,
        min: 1,
        step: 0.5,
        spin: function (event, ui) {
          rg2.setConfigOption("routeWidth", ui.value);
          rg2.redraw(false);
        }
      }).val(rg2.options.routeWidth);
      // set default to 0 secs = no tails
      $("#spn-tail-length").spinner({
        max: 600,
        min: 0,
        spin: function (event, ui) {
          rg2.animation.setTailLength(ui.value);
        }
      }).val(0);
      $("#spn-offset").spinner({
        max: 600,
        min: -600,
        disabled: true,
        spin: function (event, ui) {
          rg2.drawing.adjustOffset(ui.value);
        }
      }).val(0);
      // speed is min/km so low is fast
      $("#spn-max-speed").spinner({
        max: 10,
        min: 1,
        spin: function (event, ui) {
          rg2.results.setSpeedRange(ui.value, rg2.options.minSpeed);
        }
      }).val(rg2.options.maxSpeed);
      $("#spn-min-speed").spinner({
        max: 20,
        min: 5,
        spin: function (event, ui) {
          rg2.results.setSpeedRange(rg2.options.maxSpeed, ui.value);
        }
      }).val(rg2.options.minSpeed);
    },

    setAutofitSpinner: function (offset) {
      $("#spn-offset").spinner("value", offset).spinner("enable");
    },

    createEventMenu: function () {
      //loads menu from populated events array
      var html, $select;
      if (rg2.config.managing) {
        return;
      }
      // add the search bar
      html = "<span class='input-group-addon'><i class='fa fa-search fa-fw'></i></span><input type='text' class='form-control rg2-event-search' placeholder='" + rg2.t("Search") + "'>";
      $select = $("#rg2-event-search");
      $select.empty().append(html);
      // set up the search function
      $(".rg2-event-search").keyup(function (event) {
        var filter, rows, i;
        filter = event.target.value.toUpperCase();
        rows = $("#rg2-event-list")[0].getElementsByTagName("a");
        for (i = 0; i < rows.length; i += 1) {
          if (rows[i].innerText.toUpperCase().indexOf(filter) > -1) {
            rows[i].parentElement.style.display = "";
          } else {
            rows[i].parentElement.style.display = "none";
          }
        }
      });
      html = rg2.events.formatEventsAsMenu();
      $select = $("#rg2-event-list");
      if ($select.menu("instance") !== undefined) {
        $select.menu("destroy");
      }
      $select.empty().append(html).menu({
        select: function (event, ui) {
          var id;
          id = parseInt(ui.item[0].id.replace('event-', ''), 10);
          rg2.loadEvent(id);
          rg2.requestedHash.setNewEvent(rg2.events.getKartatEventID());
        }
      });
    },

    getScrollPosAttrName: function () {
      return `scroll-${this.getActiveTab()}`;
    },

    getActiveTab: function () {
      return $("#rg2-info-panel").tabs("option", "active");
    },

    setUIEventHandlers: function () {
      var text, newlang, self;
      self = this;
      $("#rg2-info-panel-tab-body").scroll(function () {
        // Save current scroll bar position in tab
        $("#rg2-info-panel").attr(self.getScrollPosAttrName(), $(this).scrollTop());
      });
      $("#rg2-resize-info").click(function () {
        rg2.resizeInfoDisplay();
      });
      $("#rg2-hide-info-panel-control").click(function () {
        rg2.resizeInfoDisplay();
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
        if (text === rg2.t(rg2.config.DEFAULT_NEW_COMMENT)) {
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
      $("#chk-show-three-seconds").prop('checked', rg2.options.showThreeSeconds).click(function (event) {
        if (event.target.checked) {
          rg2.options.showThreeSeconds = true;
        } else {
          rg2.options.showThreeSeconds = false;
        }
        rg2.redraw(false);
      });
      $("#chk-show-GPS-speed").prop('checked', rg2.options.showGPSSpeed).click(function (event) {
        if (event.target.checked) {
          rg2.options.showGPSSpeed = true;
        } else {
          rg2.options.showGPSSpeed = false;
        }
        rg2.redraw(false);
      });
      $("#rg2-select-language").change(function () {
        newlang = $("#rg2-select-language").val();
        if (newlang !== rg2.getDictionaryCode()) {
          if (newlang === 'en') {
            self.setNewLanguage('en');
          } else {
            rg2.getNewLanguage(newlang);
          }
        }
      });
      $("#rg2-load-gps-file").change(function (evt) {
        rg2.drawing.uploadGPS(evt);
      });
    },

    configureUI: function () {
      // disable right click menu: may add our own later
      $(document).on("contextmenu", function (evt) {
        evt.preventDefault();
      });
      // disable tabs until we have loaded something
      var self;
      self = this;
      $("#rg2-info-panel").tabs({
        disabled: [rg2.config.TAB_COURSES, rg2.config.TAB_RESULTS, rg2.config.TAB_DRAW],
        active: rg2.config.TAB_EVENTS,
        heightStyle: "content",
        activate: function () {
          self.tabActivated();
        }
      });
      $("#rg2-result-list").accordion({
        collapsible: true,
        heightStyle: "content"
      });
      $("#rg2-clock").text("00:00:00");
      $("#rg2-clock-slider").slider({
        slide: function (event, ui) {
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
        value: false
      });
      $("#rg2-load-progress-label").text("");
      $("#rg2-load-progress").hide();
      $("#rg2-map-load-progress-bar").progressbar({
        value: false
      });
      $("#rg2-map-load-progress-label").text("");
      $("#rg2-map-load-progress").hide();
      $("#rg2-option-controls").hide();
      $("#rg2-animation-controls").hide();
      $("#rg2-splitsbrowser").hide();
      this.setUIEventHandlers();
      this.initialiseButtons();
      this.initialiseSpinners();
    }
  };
  rg2.ui = ui;
}());
