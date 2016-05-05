/*global rg2:false */
/*global rg2Config:false */
(function () {
  var ui = {

    setTitleBar: function () {
      var title;
      if (window.innerWidth >= rg2.config.BIG_SCREEN_BREAK_POINT) {
        title = rg2.events.getActiveEventName() + " " + rg2.events.getActiveEventDate();
        $("#rg2-event-title").html(title).show();
      } else if (window.innerWidth > rg2.config.SMALL_SCREEN_BREAK_POINT) {
        title = rg2.events.getActiveEventName();
        $("#rg2-event-title").html(title).show();
      } else {
        $("#rg2-event-title").hide();
      }
      if (rg2.events.mapIsGeoreferenced()) {
        $("#rg2-event-title-icon").addClass("fa fa-globe");
      } else {
        $("#rg2-event-title-icon").removeClass("fa fa-globe");
      }
    },

    setNewLanguage : function (dict) {
      var eventid;
      $("#rg2-event-ul").menu("destroy");
      rg2.setDictionary(dict);
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

  // called whenever the active tab changes to tidy up as necessary
    tabActivated : function () {
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
    },

    displayAboutDialog : function () {
      $("#rg2-event-stats").empty().html(rg2.getEventStats());
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
    },

    displayOptionsDialog : function () {
      $("#rg2-option-controls").dialog({
        minWidth : 400,
        title :  rg2.t("Configuration options"),
        dialogClass : "rg2-options-dialog",
        close : function () {
          rg2.saveConfigOptions();
        },
        buttons : {
          Ok : function () {
            $(this).dialog("close");
          }
        }
      });
    },

    initialiseButtons : function () {
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
          width : 'auto',
          dialogClass : "rg2-splits-table",
          buttons : {
            Ok : function () {
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
      $("#rg2-load-gps-file").val('').button().button("disable");
    },

    setResultCheckboxes : function () {
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
    },

    createResultMenu : function () {
      //loads menu from populated result array
      var html = rg2.results.formatResultListAsAccordion();
      // #177 not pretty but gets round problems of double encoding
      html = html.replace(/&amp;/g, '&');
      $("#rg2-result-table").empty().append(html);
      $("#rg2-result-table").accordion("refresh");
      $("#rg2-info-panel").tabs("refresh");
      this.setResultCheckboxes();
      // disable control dropdown if we have no controls
      if (rg2.courses.getHighestControlNumber() === 0) {
        $("#rg2-control-select").prop('disabled', true);
      } else {
        $("#rg2-control-select").prop('disabled', false);
      }
    },

    createCourseMenu : function () {
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
    },

    initialiseSpinners : function () {
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
        // spinner uses 0 to 100%: stored and used as 0 to 1
        max : 100,
        min : 0,
        step : 10,
        numberFormat : "n",
        spin : function (event, ui) {
          /*jslint unparam:true*/
          rg2.setConfigOption("mapIntensity", ui.value / 100);
          rg2.redraw(false);
        }
      }).val(rg2.options.mapIntensity * 100);
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
        // spinner uses 0 to 100%: stored and used as 0 to 1
        max : 100,
        min : 0,
        step : 10,
        numberFormat : "n",
        spin : function (event, ui) {
          /*jslint unparam:true*/
          rg2.setConfigOption("routeIntensity", ui.value / 100);
          rg2.redraw(false);
        }
      }).val(rg2.options.routeIntensity * 100);
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
      $("#spn-offset").spinner({
        max : 600,
        min : -600,
        disabled: true,
        spin : function (event, ui) {
          /*jslint unparam:true*/
          rg2.drawing.adjustOffset(ui.value);
        }
      }).val(0);
    },

    setAutofitSpinner : function (offset) {
      $("#spn-offset").spinner("value", offset).spinner("enable");
    },

    event_list_li : [],
    createEventMenu : function () {
      //loads menu from populated events array
      var html = rg2.events.formatEventsAsMenu();
      $("#rg2-event-ul").empty().append(html).menu({
        select : function (event, ui) {
          /*jslint unparam:true*/
          rg2.loadEvent(ui.item[0].id);
          rg2.requestedHash.setNewEvent(rg2.events.getKartatEventID());
        }
      });
      this.event_list_li = $('#rg2-event-ul > li').clone();
    },

    setUIEventHandlers : function () {
      var text, newlang, self;
      self = this;
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
      $("#rg2-select-language").click(function () {
        newlang = $("#rg2-select-language").val();
        if (newlang !== rg2.getDictionaryCode()) {
          if (newlang === 'en') {
            self.setNewLanguage({code: "en"});
          } else {
            rg2.getNewLanguage(newlang);
          }
        }
      });
      $("#rg2-load-gps-file").change(function (evt) {
        rg2.drawing.uploadGPS(evt);
      });
      $('#filter-events-input').keyup(function () {
        $('#rg2-event-ul').empty();
        var valThis = $(this).val().toLowerCase();
        if (valThis === "") {
          rg2.ui.event_list_li.appendTo("#rg2-event-ul");
        } else {
          rg2.ui.event_list_li.each(function () {
            text = $(this).text().toLowerCase();
            if (text.indexOf(valThis) >= 0) {
              $(this).appendTo('#rg2-event-ul');
            }
          });
        }
      });
      $('#filter-result-input').keyup(function () {
        var valThis = $(this).val().toLowerCase();
        if (valThis === "") {
          $('#rg2-result-table tr').show();
        } else {
          $('#rg2-result-table tr').each(function () {
            text = $(this).find('td').eq(1).text().toLowerCase();
            if (text.indexOf(valThis) >= 0) {
              $(this).show();
            } else {
              $(this).hide();
            }
          });
        }
      });
    },

    configureUI : function () {
      // disable right click menu: may add our own later
      $(document).bind("contextmenu", function (evt) {
        evt.preventDefault();
      });
      // disable tabs until we have loaded something
      var self;
      self = this;
      $("#rg2-info-panel").tabs({
        disabled : [rg2.config.TAB_COURSES, rg2.config.TAB_RESULTS, rg2.config.TAB_DRAW],
        active : rg2.config.TAB_EVENTS,
        heightStyle : "content",
        activate : function () {
          self.tabActivated();
        }
      });
      $("#rg2-result-table").accordion({
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
      $("#rg2-map-load-progress-bar").progressbar({
        value : false
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
