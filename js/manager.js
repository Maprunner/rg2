/*global rg2:false */
/*global rg2Config:false */
/*global FormData:false */
/*global Proj4js:false */
/*global console:false */
(function () {
  function Manager(keksi) {
    this.user = new rg2.User(keksi);
    this.newMap = new rg2.Map();
    this.georefsystems = new rg2.Georefs();
    this.eventName = null;
    this.eventDate = null;
    this.eventLevel = null;
    this.mapIndex = rg2.config.INVALID_MAP_ID;
    this.club = null;
    this.comments = null;
    this.format = rg2.config.FORMAT_NORMAL;
    this.newcontrols = new rg2.Controls();
    this.courses = [];
    this.mapLoaded = false;
    this.coursesGeoreferenced = false;
    this.drawingCourses = false;
    this.drawnCourse = {};
    this.results = [];
    this.variants = [];
    this.resultCourses = [];
    this.mapWidth = 0;
    this.mapHeight = 0;
    this.mapFile = undefined;
    this.resultsFileFormat = "";
    this.backgroundLocked = false;
    this.handle = {x: null, y: null};
    this.maps = [];
    this.localworldfile = new rg2.Worldfile(0);
    this.worldfile = new rg2.Worldfile(0);
    this.initialiseUI();
  }

  Manager.prototype = {

    Constructor : Manager,

    initialiseUI : function () {
      var self;
      self = this;
      $("#btn-login").button();
      $("rg2-manager-courses").hide();
      $("rg2-manager-results").hide();
      $("#rg2-manager-login-form").submit(function () {
        var validUser;
        validUser = self.user.setDetails($("#rg2-user-name").val(), $("#rg2-password").val());
        // check we have user name and password
        if (validUser) {
          self.logIn();
        } else {
          rg2.utils.showWarningDialog("Login failed", "Please enter user name and password of at least five characters");
        }
        // prevent form submission
        return false;
      });
    },

    logIn : function () {
      var url, json, self;
      url = rg2Config.json_url + '?type=login';
      json = JSON.stringify(this.user.encodeUser());
      self = this;
      $.ajax({
        type : 'POST',
        dataType : 'json',
        data : json,
        url : url,
        cache : false,
        success : function (data) {
          // save new cookie
          self.user.y = data.keksi;
          if (data.ok) {
            self.enableEventEdit();
          } else {
            rg2.utils.showWarningDialog("Login failed", "Login failed. Please try again.");
          }
        },
        error : function () {
          rg2.utils.showWarningDialog("Login failed", "User name or password incorrect. Please try again.");
        }
      });
      return false;
    },

    setButtons : function () {
      var self;
      self = this;
      $("#btn-create-event").button().click(function () {
        self.confirmCreateEvent();
      }).button("enable");
      $("#btn-update-event").button().click(function () {
        self.confirmUpdateEvent();
      }).button("disable");
      $("#btn-delete-route").button().click(function () {
        self.confirmDeleteRoute();
      }).button("disable");
      $("#btn-delete-event").button().click(function () {
        self.confirmDeleteEvent();
      }).button("disable");
      $("#btn-add-map").button().click(function () {
        self.confirmAddMap();
      }).button("disable");
      $("#btn-draw-courses").button().click(function () {
        self.startDrawingCourses();
      });
      $("#rg2-load-georef-file").button().change(function (evt) {
        self.readGeorefFile(evt);
      });
      $("#rg2-load-map-file").button().change(function (evt) {
        self.readMapFile(evt);
      });
      $("#rg2-load-results-file").button().click(function (evt) {
        if (!self.mapLoaded) {
          rg2.utils.showWarningDialog("No map loaded", "Please load a map file before adding results.");
          evt.preventDefault();
        }
      }).change(function (evt) {
        self.readResults(evt);
      });
      $("#btn-move-map-and-controls").click(function (evt) {
        self.toggleMoveAll(evt.target.checked);
      });
      $("#btn-no-results").click(function (evt) {
        self.toggleResultsRequired(evt.target.checked);
      });
      $("#rg2-load-course-file").button().click(function (evt) {
        if (!self.mapLoaded) {
          rg2.utils.showWarningDialog("No map loaded", "Please load a map file before adding courses.");
          evt.preventDefault();
        }
      }).change(function (evt) {
        self.readCourses(evt);
      });
    },

    enableEventEdit : function () {
      var self = this;
      rg2.managerUI.setUIVisibility();
      this.getMaps();
      this.setButtons();
      rg2.managerUI.createEventLevelDropdown("rg2-event-level");
      rg2.managerUI.createEventLevelDropdown("rg2-event-level-edit");
      rg2.managerUI.createGeorefDropdown(this.georefsystems);
      rg2.managerUI.createEventEditDropdown();
      $("#rg2-event-level").change(function () {
        self.eventLevel = $("#rg2-event-level").val();
        if (self.eventLevel !== 'X') {
          $("#rg2-select-event-level").addClass('valid');
        } else {
          $("#rg2-select-event-level").removeClass('valid');
        }
      });

      $("#rg2-map-selected").change(function () {
        self.mapIndex = parseInt($("#rg2-map-selected").val(), 10);
        if (self.mapIndex !== rg2.config.INVALID_MAP_ID) {
          $("#rg2-manager-map-select").addClass('valid');
          rg2.loadNewMap(rg2Config.maps_url + "/" + self.maps[self.mapIndex].mapfilename);
        } else {
          $("#rg2-manager-map-select").removeClass('valid');
          self.mapLoaded = false;
          self.mapWidth = 0;
          self.mapHeight = 0;
        }
      });

      $("#rg2-event-date").datepicker({
        dateFormat : 'yy-mm-dd',
        onSelect : function (date) {
          self.setDate(date);
        }
      });

      $("#rg2-event-name").on("change", function () {
        self.setEventName();
      });

      $("#rg2-map-name").on("change", function () {
        self.setMapName();
      });

      $("#rg2-club-name").on("change", function () {
        self.setClub();
      });

      $("#rg2-new-course-name").on("change", function () {
        self.setCourseName();
      });

      $("#rg2-manager-event-select").change(function () {
        rg2.managerUI.setEvent(parseInt($("#rg2-event-selected").val(), 10));
      });

      $("#rg2-georef-type").change(function () {
        self.setGeoref($("#rg2-georef-selected").val());
      });

      $('#rg2-info-panel').tabs('option', 'active', rg2.config.TAB_CREATE);
    },

    getMaps : function () {
      var i, self;
      self = this;
      $.getJSON(rg2Config.json_url, {
        type : "maps",
        cache : false
      }).done(function (json) {
        self.maps.length = 0;
        console.log("Maps: " + json.data.maps.length);
        for (i = 0; i < json.data.maps.length; i += 1) {
          self.maps.push(new rg2.Map(json.data.maps[i]));
        }
        rg2.managerUI.createMapDropdown(self.maps);
        $("#btn-toggle-controls").show();
      }).fail(function () {
        rg2.utils.showWarningDialog("Map request failed", "Error getting map list.");
      });
    },

    setGeoref : function (code) {
      if (code !== null) {
        this.convertWorldFile(code);
      }
    },

    eventListLoaded : function () {
      // called after event list has been updated
      rg2.managerUI.createEventEditDropdown();
    },

    eventFinishedLoading : function () {
      var kartatid;
      kartatid = parseInt($("#rg2-event-selected").val(), 10);
      rg2.managerUI.eventFinishedLoading(rg2.events.getEventInfo(kartatid));
    },

    startDrawingCourses : function () {
      if (this.mapLoaded) {
        this.drawingCourses = true;
        this.courses.length = 0;
        this.newcontrols.deleteAllControls();
        this.drawnCourse.name = 'Course';
        this.drawnCourse.x = [];
        this.drawnCourse.y = [];
        this.drawnCourse.codes = [];
        $('#rg2-new-course-name').val('Course');
        $('#rg2-draw-courses').show();
      } else {
        rg2.utils.showWarningDialog("No map selected", "Please load a map before drawing courses");
      }
    },

    displayCourseAllocations : function () {
      var i, html;
      if ((this.courses.length) && (this.resultCourses.length)) {
        // create html for course allocation list
        // using a table to make it easier for now
        html = "<div id='rg2-course-allocations'><table><thead><tr><th>Course file</th><th>Results</th></tr></thead><tbody>";
        for (i = 0; i < this.courses.length; i += 1) {
          html += "<tr><td>" + this.courses[i].name + "</td><td>" + this.createCourseDropdown(this.courses[i].name, i) + "</td></tr>";
        }
        html += "</tbody></table></div>";
        $("#rg2-course-allocations").empty().append(html);
      }
    },

    validateData : function () {
      if (!this.eventName) {
        return 'Event name is not valid.';
      }
      if (this.mapIndex === rg2.config.INVALID_MAP_ID) {
        return 'No map selected.';
      }
      if (!this.club) {
        return 'Club name is not valid.';
      }
      if (!this.eventDate) {
        return 'Event date is not valid.';
      }
      if (!this.eventLevel) {
        return 'Event level is not valid.';
      }
      if (!this.format) {
        return 'Event format is not valid.';
      }
      if (this.courses.length === 0) {
        if (!this.drawingCourses) {
          return 'No course information. Check your course XML file.';
        }
      }
      if (this.results.length === 0) {
        if (this.format !== rg2.config.FORMAT_NO_RESULTS) {
          return 'No results information. Check your results file.';
        }
      }
      return 'OK';

    },

    confirmCreateEvent : function () {
      var valid, dlg;
      valid = this.validateData();
      if (valid !== 'OK') {
        rg2.utils.showWarningDialog("Data missing", valid + " Please enter all necessary information before creating the event.");
        return;
      }
      dlg = {};
      dlg.selector = "<div id='event-create-dialog'>Are you sure you want to create this event?</div>";
      dlg.title = "Confirm event creation";
      dlg.classes = "rg2-confirm-create-event-dialog";
      dlg.doText = "Create event";
      dlg.onDo = this.doCreateEvent.bind(this);
      dlg.onCancel = rg2.managerUI.doCancelCreateEvent.bind(this);
      rg2.utils.createModalDialog(dlg);
    },

    doCreateEvent : function () {
      var self, data;
      $("#event-create-dialog").dialog("destroy");
      self = this;
      data = this.generateNewEventData();
      $.ajax({
        data : data,
        type : "POST",
        url : rg2Config.json_url + "?type=createevent",
        dataType : "json",
        success : function (data) {
          // save new cookie
          self.user.y = data.keksi;
          if (data.ok) {
            rg2.utils.showWarningDialog("Event created", self.eventName + " has been added with id " + data.newid + ".");
            rg2.getEvents();
            rg2.managerUI.setEvent();
          } else {
            rg2.utils.showWarningDialog("Save failed", data.status_msg + " Failed to create event. Please try again.");
          }
        },
        error : function () {
          rg2.utils.showWarningDialog("Save failed", " Failed to create event.");
        }
      });
    },

    generateNewEventData : function () {
      var data, text, user;
      data = {};
      data.name = this.eventName;
      data.mapid = this.maps[this.mapIndex].mapid;
      data.eventdate = this.eventDate;
      text = $("#rg2-event-comments").val();
      if (text === rg2.config.DEFAULT_EVENT_COMMENT) {
        data.comments = "";
      } else {
        data.comments = text;
      }
      data.club = this.club;
      data.format = this.format;
      // assume we can just overwrite 1 or 2 at this point
      if ($('#btn-score-event').prop('checked')) {
        data.format = rg2.config.FORMAT_SCORE_EVENT;
      }
      data.level = this.eventLevel;
      if (this.drawingCourses) {
        this.courses.push(this.drawnCourse);
      }
      this.setControlLocations();
      this.mapResultsToCourses();
      this.renumberResults();
      if (data.format === rg2.config.FORMAT_SCORE_EVENT) {
        this.extractVariants();
        data.variants = this.variants.slice(0);
      }
      data.courses = this.courses.slice(0);
      data.results = this.results.slice(0);
      user = this.user.encodeUser();
      data.x = user.x;
      data.y = user.y;
      return JSON.stringify(data);
    },

    renumberResults : function () {
      // updates the course id when we know the mapping
      // and deletes results for courses not required
      var i, id, newResults;
      newResults = [];
      for (i = 0; i < this.results.length; i += 1) {
        id = this.getCourseIDForResult(this.results[i].course);
        if (id !== rg2.config.DO_NOT_SAVE_COURSE) {
          this.results[i].courseid = id;
          // set null here: overwritten later in extractVariants if this is a variant
          this.results[i].variantid = '';
          newResults.push(this.results[i]);
        }
      }
      this.results = newResults;
    },

    mapResultsToCourses : function () {
      // called when saving courses
      // generates the necessary course IDs for the results file
      // deletes unwanted courses
      var i, selector, id, newCourses, courseid;
      newCourses = [];
      courseid = 1;
      for (i = 0; i < this.courses.length; i += 1) {
        selector = "#rg2-alloc-" + i;
        // comes back as NaN if selector doesn't exist when we have no results, which works OK
        id = parseInt($(selector).val(), 10);
        if (id !== rg2.config.DO_NOT_SAVE_COURSE) {
          this.courses[i].courseid = courseid;
          // handle case where we have courses but no results
          if (this.resultCourses.length > 0) {
            this.resultCourses[id].courseid = courseid;
            // use results file course names
            this.courses[i].course = this.resultCourses[id].course;
            this.courses[i].name = this.resultCourses[id].course;
          }
          newCourses.push(this.courses[i]);
          courseid += 1;
        }
      }
      this.courses = newCourses;
    },

    createCourseDropdown : function (course, courseidx) {
      /*
       * Input: course name to match
       *
       * Output: html select
       */
      var i, idx, html;
      idx = -1;
      // do results include this course name?
      for (i = 0; i < this.resultCourses.length; i += 1) {
        if (this.resultCourses[i].course === course) {
          idx = i;
          break;
        }
      }
      html = "<select id='rg2-alloc-" + courseidx + "'><option value=" + rg2.config.DO_NOT_SAVE_COURSE;
      if (idx === -1) {
        html += " selected";
      }
      html += ">Do not save</option>";
      for (i = 0; i < this.resultCourses.length; i += 1) {
        html += "<option value=" + i;
        if (idx === i) {
          html += " selected";
        }
        html += ">" + this.resultCourses[i].course + "</option>";
      }
      html += "</select>";
      return html;
    },

    extractVariants : function () {
      // called when saving score/relay courses
      // creates all course variants once courseid has been set
      var i, j, codes, course;
      this.variants.length = 0;
      for (i = 0; i < this.results.length; i += 1) {
        // codes here are just controls so need to add start and finish
        codes = this.results[i].codes;
        // courseid - 1 gives courses array index given how we created the array
        for (j = 0; j < this.courses.length; j += 1) {
          if (this.courses[j].courseid === this.results[i].courseid) {
            course = this.courses[j];
            break;
          }
        }
        // add start code at start
        codes.unshift(course.codes[0]);
        // add finish code at end
        codes.push(course.codes[course.codes.length - 1]);

        this.results[i].variantid = this.getVariantID(this.results[i].codes, this.results[i].courseid);
      }
    },

    getVariantID : function (codes, courseid) {
      // checks if a variant array of codes already exists
      // adds it if it doesn't
      // returns variantid
      var i, j, c, x, y, match, id;
      x = [];
      y = [];
      id = 0;
      for (i = 0; i < this.variants.length; i += 1) {
        if (this.variants[i].codes.length === codes.length) {
          match = true;
          for (j = 0; j < codes.length; j += 1) {
            if (this.variants[i].codes[j] !== codes[j]) {
              match = false;
              break;
            }
          }
          if (match) {
            id = i + 1;
            break;
          }
        }
      }
      if (id === 0) {
        // didn't find a match so add a new variant
        id = this.variants.length + 1;
        for (i = 0; i < codes.length; i += 1) {
          c = this.getControlXY(codes[i]);
          x.push(c.x);
          y.push(c.y);
        }
        this.variants.push({x: x, y: y, id: id, courseid: courseid, name: 'Variant ' + id, codes: codes});
      }

      return id;
    },

    getCourseIDForResult : function (course) {
      var i;
      for (i = 0; i < this.resultCourses.length; i += 1) {
        if (this.resultCourses[i].course === course) {
          return this.resultCourses[i].courseid;
        }
      }
      return 0;
    },

    setControlLocations : function () {
      // called when saving courses
      // reads control locations and updates course details
      var i, j, c;
      for (i = 0; i < this.courses.length; i += 1) {
        for (j = 0; j < this.courses[i].codes.length; j += 1) {
          c = this.getControlXY(this.courses[i].codes[j]);
          this.courses[i].x[j] = c.x;
          this.courses[i].y[j] = c.y;
        }
      }
    },

    getControlXY : function (code) {
      var i, c;
      c = {};
      c.x = 0;
      c.y = 0;
      for (i = 0; i < this.newcontrols.controls.length; i += 1) {
        if (this.newcontrols.controls[i].code === code) {
          c.x = Math.round(this.newcontrols.controls[i].x);
          c.y = Math.round(this.newcontrols.controls[i].y);
          return c;
        }
      }
      return c;
    },

    confirmUpdateEvent : function () {
      var dlg;
      dlg = {};
      dlg.selector = "<div id='event-update-dialog'>Are you sure you want to update this event?</div>";
      dlg.title = "Confirm event update";
      dlg.classes = "rg2-confirm-update-dialog";
      dlg.doText = "Update event";
      dlg.onDo = this.doUpdateEvent.bind(this);
      dlg.onCancel = rg2.managerUI.doCancelUpdateEvent.bind(this);
      rg2.utils.createModalDialog(dlg);
    },

    doUpdateEvent : function () {
      var id, $url, data, json, self, user;
      $("#event-update-dialog").dialog("destroy");
      id = $("#rg2-event-selected").val();
      $url = rg2Config.json_url + "?type=editevent&id=" + id;
      data = {};
      data.comments = $("#rg2-edit-event-comments").val();
      data.name = $("#rg2-event-name-edit").val();
      data.type = $("#rg2-event-level-edit").val();
      data.eventdate = $("#rg2-event-date-edit").val();
      data.club = $("#rg2-club-name-edit").val();
      user = this.user.encodeUser();
      data.x = user.x;
      data.y = user.y;
      json = JSON.stringify(data);
      self = this;
      $.ajax({
        data : json,
        type : "POST",
        url : $url,
        dataType : "json",
        success : function (data) {
          // save new cookie
          self.user.y = data.keksi;
          if (data.ok) {
            rg2.utils.showWarningDialog("Event updated", "Event " + id + " has been updated.");
          } else {
            rg2.utils.showWarningDialog("Update failed", data.status_msg + ". Event update failed. Please try again.");
          }
        },
        error : function (jqXHR, textStatus) {
          /*jslint unparam:true*/
          rg2.utils.showWarningDialog("Update failed", textStatus + ". Event update failed.");
        }
      });
    },

    confirmDeleteRoute : function () {
      var dlg;
      dlg = {};
      dlg.selector = "<div id='route-delete-dialog'>This route will be permanently deleted. Are you sure?</div>";
      dlg.title = "Confirm route delete";
      dlg.classes = "rg2-confirm-route-delete-dialog";
      dlg.doText = "Delete route";
      dlg.onDo = this.doDeleteRoute.bind(this);
      dlg.onCancel = rg2.managerUI.doCancelDeleteRoute.bind(this);
      rg2.utils.createModalDialog(dlg);
    },

    doDeleteRoute : function () {
      var id, $url, routeid, json, self;
      $("#route-delete-dialog").dialog("destroy");
      id = $("#rg2-event-selected").val();
      routeid = $("#rg2-route-selected").val();
      $url = rg2Config.json_url + "?type=deleteroute&id=" + id + "&routeid=" + routeid;
      json = JSON.stringify(this.user.encodeUser());
      self = this;
      $.ajax({
        data : json,
        type : "POST",
        url : $url,
        dataType : "json",
        success : function (data) {
          // save new cookie
          self.user.y = data.keksi;
          if (data.ok) {
            rg2.utils.showWarningDialog("Route deleted", "Route " + routeid + " has been deleted.");
          } else {
            rg2.utils.showWarningDialog("Delete failed", data.status_msg + ". Delete failed. Please try again.");
          }
        },
        error : function (jqXHR, textStatus) {
          /*jslint unparam:true*/
          rg2.utils.showWarningDialog("Delete failed", textStatus + ". Delete failed.");
        }
      });
    },

    confirmDeleteEvent : function () {
      var dlg;
      dlg = {};
      dlg.selector = "<div id='event-delete-dialog'>This event will be deleted. Are you sure?</div>";
      dlg.title = "Confirm event delete";
      dlg.classes = "rg2-confirm-delete-event-dialog";
      dlg.doText = "Delete event";
      dlg.onDo = this.doDeleteEvent.bind(this);
      dlg.onCancel = rg2.managerUI.doCancelDeleteEvent.bind(this);
      rg2.utils.createModalDialog(dlg);
    },

    doDeleteEvent : function () {
      var id, $url, json, self;
      $("#event-delete-dialog").dialog("destroy");
      id = $("#rg2-event-selected").val();
      $url = rg2Config.json_url + "?type=deleteevent&id=" + id;
      json = JSON.stringify(this.user.encodeUser());
      self = this;
      $.ajax({
        data : json,
        type : "POST",
        url : $url,
        dataType : "json",
        success : function (data) {
          // save new cookie
          self.user.y = data.keksi;
          if (data.ok) {
            rg2.utils.showWarningDialog("Event deleted", "Event " + id + " has been deleted.");
            rg2.getEvents();
            rg2.managerUI.setEvent();
            $("#rg2-event-selected").empty();
          } else {
            rg2.utils.showWarningDialog("Delete failed", data.status_msg + ". Event delete failed. Please try again.");
          }
        },
        error : function (jqXHR, textStatus) {
          /*jslint unparam:true*/
          rg2.utils.showWarningDialog("Delete failed", textStatus + ". Delete failed.");
        }
      });
    },

    readResults : function (evt) {
      var format, reader, self;
      reader = new FileReader();
      self = this;
      reader.onerror = function () {
        rg2.utils.showWarningDialog('Results file error', 'The selected results file could not be read.');
      };
      reader.onload = function (evt) {
        self.processResultFile(evt);
      };
      format = evt.target.files[0].name.substr(-3, 3);
      format = format.toUpperCase();
      if ((format === 'XML') || (format === 'CSV')) {
        this.resultsFileFormat = format;
        //
        // TODO: input charset should be set based on RG_INPUT_ENCODING variable
        //reader.readAsText(evt.target.files[0], 'ISO-8859-1');
        reader.readAsText(evt.target.files[0]);
      } else {
        rg2.utils.showWarningDialog("File type error", "Results file type is not recognised. Please select a valid file.");
      }
    },

    processResultFile : function (evt) {
      var parsedResults = new rg2.ResultParser(evt, this.resultsFileFormat);
      this.results = parsedResults.results;
      this.resultCourses = parsedResults.resultCourses;
      if (parsedResults.valid) {
        $("#rg2-select-results-file").addClass('valid');
      } else {
        $("#rg2-select-results-file").removeClass('valid');
      }
      rg2.managerUI.displayResultInfo(this.getResultInfoAsHTML());
      this.displayCourseAllocations();
    },

    readCourses : function (evt) {
      var reader, self;
      reader = new FileReader();
      reader.onerror = function () {
        rg2.utils.showWarningDialog('Course file error', 'The selected course file could not be read.');
      };
      self = this;
      reader.onload = function (evt) {
        self.processCourseFile(evt);
      };
      //
      // TODO: input charset should be set based on RG_INPUT_ENCODING variable
      // reader.readAsText(evt.target.files[0], 'ISO-8859-1');
      reader.readAsText(evt.target.files[0]);
    },

    processCourseFile : function (evt) {
      var parsedCourses;
      this.coursesGeoreferenced = false;
      this.backgroundLocked = false;
      $('#btn-move-map-and-controls').prop('checked', false);
      this.handle = {x: null, y: null};
      this.newcontrols.deleteAllControls();
      parsedCourses = new rg2.CourseParser(evt, this.worldfile, this.localworldfile);
      this.courses = parsedCourses.courses;
      this.newcontrols = parsedCourses.newcontrols;
      this.coursesGeoreferenced = parsedCourses.georeferenced;
      rg2.managerUI.displayCourseInfo(this.getCourseInfoAsHTML());
      this.displayCourseAllocations();
      this.fitControlsToMap();
      rg2.redraw(false);
    },

    getCourseInfoAsHTML : function () {
      var info, i;
      if (this.courses.length) {
        info = "<table><thead><tr><th>Course</th><th>Name</th><th>Controls</th></tr></thead><tbody>";
        for (i = 0; i < this.courses.length; i += 1) {
          info += "<tr><td>" + (i + 1) + "</td><td>" + this.courses[i].name + "</td><td>" + (this.courses[i].codes.length - 2) + "</td></tr>";
        }
        info += "</tbody></table>";
      } else {
        info = "";
      }

      return info;
    },

    getResultInfoAsHTML : function () {
      var info, i, runners, oldcourse;
      if (this.results.length) {
        info = "<table><thead><tr><th>Course</th><th>Winner</th><th>Time</th><th>Runners</th></tr></thead><tbody>";
        runners = 0;
        oldcourse = null;
        for (i = 0; i < this.results.length; i += 1) {
          if (this.results[i].course !== oldcourse) {
            if (oldcourse !== null) {
              info += "<td>" + runners + "</td></tr>";
              runners = 0;
            }
            info += "<tr><td>" + this.results[i].course + "</td><td>" + this.results[i].name + "</td><td>" + this.results[i].time + "</td>";
            oldcourse = this.results[i].course;
          }
          runners += 1;
        }
        info += "<td>" + runners + "</td></tr></tbody></table>";
      } else {
        info = "";
      }

      return info;
    },

    readMapFile : function (evt) {
      var reader, self, format;
      reader = new FileReader();
      self = this;
      reader.onload = function (event) {
        self.processMap(event);
      };
      format = evt.target.files[0].name.substr(-3, 3);
      format = format.toUpperCase();
      if ((format === 'JPG') || (format === 'GIF')) {
        this.mapFile = evt.target.files[0];
        reader.readAsDataURL(evt.target.files[0]);
      } else {
        rg2.utils.showWarningDialog("File type error", evt.target.files[0].name + " is not recognised. Only .jpg and .gif files are supported at present.");
      }
    },

    mapLoadCallback : function () {
      //callback when map image is loaded
      var size;
      this.mapLoaded = true;
      if (this.mapIndex !== rg2.config.INVALID_MAP_ID) {
        this.localworldfile = this.maps[this.mapIndex].localworldfile;
        this.worldfile = this.maps[this.mapIndex].worldfile;
      }
      size = rg2.getMapSize();
      this.mapWidth = size.width;
      this.mapHeight = size.height;
      this.fitControlsToMap();
      rg2.redraw(false);
    },

    processMap : function (event) {
      // called to load a new map locally
      var size;
      rg2.loadNewMap(event.target.result);
      $("#rg2-select-map-file").addClass('valid');
      this.mapLoaded = true;
      size = rg2.getMapSize();
      this.mapWidth = size.width;
      this.mapHeight = size.height;
      this.fitControlsToMap();
      rg2.redraw(false);
      $("#btn-add-map").button("enable");
    },

    fitControlsToMap : function () {
      var i, georefOK, box, scale;
      georefOK = false;
      if ((this.mapLoaded) && (this.newcontrols.controls.length > 0)) {
        box = this.getBoundingBox();
        if (this.coursesGeoreferenced) {
          // check we are somewhere on the map
          if ((box.maxX < 0) || (box.minX > this.mapWidth) || (box.minY > this.mapHeight) || (box.maxY < 0)) {
            // warn and fit to track
            rg2.utils.showWarningDialog("Course file problem", "Your course file does not match the map co-ordinates. Please check you have selected the correct file.");
          } else {
            georefOK = true;
          }
        }
        if (georefOK) {
          // lock background to prevent accidentally moving the aligned controls
          // user can always unlock and adjust
          this.backgroundLocked = true;
          $('#btn-move-map-and-controls').prop('checked', true);
        } else {
          // fit within the map since this is probably needed anyway
          scale = 0.8;
          for (i = 0; i < this.newcontrols.controls.length; i += 1) {
            this.newcontrols.controls[i].x = ((this.newcontrols.controls[i].x - box.minX) * (this.mapWidth / box.xRange) * scale) + (this.mapWidth * (1 - scale) * 0.5);
            this.newcontrols.controls[i].y = (this.mapHeight - ((this.newcontrols.controls[i].y - box.minY) * (this.mapHeight / box.yRange)) * scale) - (this.mapHeight * (1 - scale) * 0.5);
          }
        }
        this.copyXYToOldXY();
        this.newcontrols.displayAllControls();
      }
    },

    getBoundingBox : function () {
      // find bounding box for controls
      var box, i;
      box = {};
      box.minX = this.newcontrols.controls[0].x;
      box.maxX = this.newcontrols.controls[0].x;
      box.minY = this.newcontrols.controls[0].y;
      box.maxY = this.newcontrols.controls[0].y;
      for (i = 1; i < this.newcontrols.controls.length; i += 1) {
        box.maxX = Math.max(box.maxX, this.newcontrols.controls[i].x);
        box.maxY = Math.max(box.maxY, this.newcontrols.controls[i].y);
        box.minX = Math.min(box.minX, this.newcontrols.controls[i].x);
        box.minY = Math.min(box.minY, this.newcontrols.controls[i].y);
      }
      box.xRange = box.maxX - box.minX;
      box.yRange = box.maxY - box.minY;
      return box;
    },

    copyXYToOldXY : function () {
      // rebaseline control locations
      var i;
      for (i = 0; i < this.newcontrols.controls.length; i += 1) {
        this.newcontrols.controls[i].oldX = this.newcontrols.controls[i].x;
        this.newcontrols.controls[i].oldY = this.newcontrols.controls[i].y;
      }
    },

    setClub : function () {
      this.club = $("#rg2-club-name").val();
      if (this.club) {
        $("#rg2-select-club-name").addClass('valid');
      } else {
        $("#rg2-select-club-name").removeClass('valid');
      }
    },

    setEventName : function () {
      this.eventName = $("#rg2-event-name").val();
      if (this.eventName) {
        $("#rg2-select-event-name").addClass('valid');
      } else {
        $("#rg2-select-event-name").removeClass('valid');
      }
    },

    setCourseName : function () {
      var course = $("#rg2-new-course-name").val();
      if (course) {
        this.drawnCourse.name = course;
      }
    },

    setMapName : function () {
      this.newMap.name = $("#rg2-map-name").val();
      if (this.newMap.name) {
        $("#rg2-select-map-name").addClass('valid');
      } else {
        $("#rg2-select-map-name").removeClass('valid');
      }
    },

    setDate : function (date) {
      this.eventDate = date;
      if (this.eventDate) {
        $("#rg2-select-event-date").addClass('valid');
      } else {
        $("#rg2-select-event-date").removeClass('valid');
      }
    },

    drawControls : function () {
      if ((this.mapLoaded) && (this.newcontrols.controls.length > 0)) {
        this.newcontrols.drawControls(true);
        var opt = rg2.getOverprintDetails();
        // locked point for control edit
        if (this.handle.x !== null) {
          rg2.ctx.lineWidth = opt.overprintWidth;
          rg2.ctx.strokeStyle = rg2.config.HANDLE_COLOUR;
          rg2.ctx.fillStyle = rg2.config.HANDLE_COLOUR;
          rg2.ctx.globalAlpha = 1.0;

          rg2.ctx.beginPath();
          rg2.ctx.arc(this.handle.x, this.handle.y, rg2.config.HANDLE_DOT_RADIUS, 0, 2 * Math.PI, false);
          rg2.ctx.fill();
          rg2.ctx.beginPath();
          rg2.ctx.arc(this.handle.x, this.handle.y, 2 * rg2.config.HANDLE_DOT_RADIUS, 0, 2 * Math.PI, false);
          rg2.ctx.stroke();
        }
      }
    },

    // based on adjustTrack from draw.js
    adjustControls : function (p1, p2, button) {
      // console.log (p1.x, p1.y, p2.x, p2.y, this.handle.x, this.handle.y, button);
      var i, x, y, dx, dy, scaleX, scaleY;
      if ((this.backgroundLocked) || (button === rg2.config.RIGHT_CLICK)) {
        // drag track and background
        rg2.ctx.translate(p2.x - p1.x, p2.y - p1.y);
      } else {
        if (this.handle.x !== null) {
          // scale controls
          scaleX = (p2.x - this.handle.x) / (p1.x - this.handle.x);
          scaleY = (p2.y - this.handle.y) / (p1.y - this.handle.y);
          // don't rotate: we are assuming controls and map are already rotated the same
          // console.log (p1.x, p1.y, p2.x, p2.y, this.handle.x, this.handle.y, scaleX, scaleY);
          if (isFinite(scaleX) && isFinite(scaleY)) {
            // just ignore very small moves
            for (i = 0; i < this.newcontrols.controls.length; i += 1) {
              x = this.newcontrols.controls[i].oldX - this.handle.x;
              y = this.newcontrols.controls[i].oldY - this.handle.y;
              this.newcontrols.controls[i].x = (x * scaleX) + this.handle.x;
              this.newcontrols.controls[i].y = (y * scaleY) + this.handle.y;
            }
          }
        } else {
          // drag controls
          dx = p2.x - p1.x;
          dy = p2.y - p1.y;
          for (i = 0; i < this.newcontrols.controls.length; i += 1) {
            this.newcontrols.controls[i].x = this.newcontrols.controls[i].oldX + dx;
            this.newcontrols.controls[i].y = this.newcontrols.controls[i].oldY + dy;
          }
        }
      }
    },

    dragEnded : function () {
      // console.log("Drag ended");
      if ((this.mapLoaded) && (this.newcontrols.controls.length > 0)) {
        // rebaseline control locations
        this.copyXYToOldXY();
      }
    },

    mouseUp : function (x, y) {
      // console.log("Mouse up ",x, y);
      if (this.drawingCourses) {
        this.addNewControl(x, y);
        return;
      }
      if ((this.mapLoaded) && (this.newcontrols.controls.length > 0)) {
        // adjusting the track
        if (this.handle.x === null) {
          this.handle = {x: x, y: y};
        } else {
          this.handle = {x: null, y: null};
        }
      }
    },

    addNewControl : function (x, y) {
      // add new control: generate a code for it
      var code;
      if (this.newcontrols.controls.length === 0) {
        code = 'S' + (this.newcontrols.controls.length + 1);
      } else {
        code = 'X' + (this.newcontrols.controls.length + 1);
      }
      this.newcontrols.addControl(code, x, y);
      this.newcontrols.displayAllControls();
      this.drawnCourse.codes.push(code);
      this.drawnCourse.x.push(x);
      this.drawnCourse.y.push(y);
    },

    // locks or unlocks background when adjusting map
    toggleMoveAll : function (checkedState) {
      this.backgroundLocked = checkedState;
    },

    // determines if a results file is needed
    // TODO: score events
    toggleResultsRequired : function (noResults) {
      if (noResults) {
        this.format = rg2.config.FORMAT_NO_RESULTS;
      } else {
        this.format = rg2.config.FORMAT_NORMAL;
      }

    },

    confirmAddMap : function () {
      var dlg;
      dlg = {};
      dlg.selector = "<div id='add-map-dialog'>Are you sure you want to add this map?</div>";
      dlg.title = "Confirm new map";
      dlg.classes = "rg2-confirm-add-map-dialog";
      dlg.doText = "Add map";
      dlg.onDo = this.doUploadMapFile.bind(this);
      dlg.onCancel = rg2.managerUI.doCancelAddMap.bind(this);
      rg2.utils.createModalDialog(dlg);
    },

    doUploadMapFile : function () {
      var url, user, self, formData;
      $("#add-map-dialog").dialog("destroy");
      // first transfer map file to server
      url = rg2Config.json_url + "?type=uploadmapfile";
      user = this.user.encodeUser();
      self = this;
      formData = new FormData();
      formData.append(this.mapFile.name, this.mapFile);
      formData.append("name", this.mapFile.name);
      formData.append("x", user.x);
      formData.append("y", user.y);
      $.ajax({
        url : url,
        data : formData,
        type : "POST",
        mimeType : "multipart/form-data",
        processData : false,
        contentType : false,
        dataType : "json",
        success : function (data) {
          // save new cookie
          self.user.y = data.keksi;
          if (data.ok) {
            self.doAddMap();
          } else {
            rg2.utils.showWarningDialog("Save failed", data.status_msg + ". Failed to save map. Please try again.");
          }
        },
        error : function (jqXHR, textStatus) {
          /*jslint unparam:true*/
          console.log(textStatus);
        }
      });
    },

    doAddMap : function () {
      var $url, data, user, json, self;
      // map file uploaded OK so add new details
      $url = rg2Config.json_url + "?type=addmap";
      data = {};
      this.newMap.localworldfile = this.localworldfile;
      data = this.newMap;
      user = this.user.encodeUser();
      data.x = user.x;
      data.y = user.y;
      json = JSON.stringify(data);
      self = this;
      $.ajax({
        data : json,
        type : "POST",
        url : $url,
        dataType : "json",
        success : function (data) {
          // save new cookie
          self.user.y = data.keksi;
          if (data.ok) {
            rg2.utils.showWarningDialog("Map added", self.newMap.name + " has been added with id " + data.newid + ".");
            // update map dropdown
            self.getMaps();
          } else {
            rg2.utils.showWarningDialog("Save failed", data.status_msg + ". Failed to save map. Please try again.");
          }
        },
        error : function (jqXHR, textStatus) {
          /*jslint unparam:true*/
          console.log(textStatus);
        }
      });
    },

    readGeorefFile : function (evt) {
      var reader, self;
      reader = new FileReader();
      self = this;
      try {
        reader.readAsText(evt.target.files[0]);
      } catch (err) {
        rg2.utils.showWarningDialog("File read error", "Failed to open selected world file.");
        return;
      }
      reader.onerror = function () {
        rg2.utils.showWarningDialog('World file error', 'The selected world file could not be read.');
      };
      reader.onload = function (evt) {
        // see http://en.wikipedia.org/wiki/World_file
        var txt, args;
        txt = evt.target.result;
        args = txt.split(/[\r\n]+/g);
        delete self.localworldfile;
        self.localworldfile = new rg2.Worldfile({A: args[0], B: args[2], C: args[4], D: args[1], E: args[3], F: args[5]});
        $("#rg2-georef-selected").val(self.georefsystems.getDefault());
        self.convertWorldFile(self.georefsystems.getDefault());
      };
    },

    convertWorldFile : function (type) {
      // takes in a World file for the map image and translates it to WGS84 (GPS)
      try {
        var i, size, source, dest, xScale, yScale, xSkew, ySkew, xsrc, ysrc, xpx, ypx, p, pt,
          angle, pixResX, pixResY;
        size = rg2.getMapSize();
        this.mapWidth = size.width;
        this.mapHeight = size.height;
        if ((!this.localworldfile.valid) || (this.mapWidth === 0) || (type === "none")) {
          // no map or world file loaded or user selected do not georef
          throw "Do not georeference";
        }
        // set up source which is how map was originally georeferenced
        Proj4js.defs[type] = this.georefsystems.getParams(type);
        source = new Proj4js.Proj(type);
        // dest is WGS84 as used by GPS: included by default in Proj4js.defs
        dest = new Proj4js.Proj("EPSG:4326");

        xScale = this.localworldfile.A;
        ySkew = this.localworldfile.D;
        xSkew = this.localworldfile.B;
        yScale = this.localworldfile.E;

        // calculation based on three fixed points on map
        // x0, y0 is top left, x1, y1 is bottom right, x2, y2 is top right
        // save pixel values of these locations for map image
        xpx = [0, this.mapWidth, this.mapWidth, 0];
        ypx = [0, this.mapHeight, 0, this.mapHeight];

        // calculate same locations using worldfile for the map
        xsrc = [];
        ysrc = [];
        xsrc[0] = this.localworldfile.C;
        ysrc[0] = this.localworldfile.F;
        xsrc[1] = (xScale * xpx[1]) + (xSkew * ypx[1]) + xsrc[0];
        ysrc[1] = (yScale * ypx[1]) + (ySkew * xpx[1]) + ysrc[0];
        xsrc[2] = (xScale * xpx[2]) + (xSkew * ypx[2]) + xsrc[0];
        ysrc[2] = (yScale * ypx[2]) + (ySkew * xpx[2]) + ysrc[0];

        this.newMap.xpx.length = 0;
        this.newMap.ypx.length = 0;
        this.newMap.lat.length = 0;
        this.newMap.lon.length = 0;
        // translate source georef to WGS84 (as in GPS file) and store with newMap details
        // Careful: p[] has x = lon and y = lat
        p = [];
        for (i = 0; i < 3; i += 1) {
          pt = {};
          pt.x = parseInt(xsrc[i] + 0.5, 10);
          pt.y = parseInt(ysrc[i] + 0.5, 10);
          p.push(pt);
          Proj4js.transform(source, dest, p[i]);
          this.newMap.xpx.push(xpx[i]);
          this.newMap.ypx.push(ypx[i]);
          this.newMap.lat.push(p[i].y);
          this.newMap.lon.push(p[i].x);
          //console.log(p[i].x, p[i].y);
        }
        // now need to create the worldfile for WGS84 to map image
        angle = this.getAdjustmentAngle(p);
        pixResX = (p[2].x - p[0].x) / this.mapWidth;
        pixResY = (p[2].y - p[1].y) / this.mapHeight;
        delete this.newMap.worldfile;
        this.newMap.worldfile = new rg2.Worldfile({A: pixResX * Math.cos(angle), B: pixResX * Math.sin(angle), C: p[0].x, D: pixResY * Math.sin(angle), E: -1 * pixResY * Math.cos(angle), F: p[0].y});
        this.updateGeorefDisplay();
      } catch (err) {
        delete this.newMap.worldfile;
        this.newMap.worldfile = new rg2.Worldfile(0);
        this.updateGeorefDisplay();
        return;
      }
    },

    getAdjustmentAngle : function (p) {
      var angle1, angle2;
      // calculates the angle adjustment needed based on an average of two values
      angle1 = this.getAngle([p[0].y, p[0].x, p[2].y, p[2].x, p[0].y, p[2].x]);
      angle2 = this.getAngle([p[2].y, p[2].x, p[1].y, p[1].x, p[1].y, p[2].x]);
      return (angle1 + angle2) / 2;
    },

    getAngle : function (p) {
      var hypot, adj;
      // draw it on paper and it makes sense!
      hypot = rg2.utils.getLatLonDistance(p[0], p[1], p[2], p[3]);
      adj = rg2.utils.getLatLonDistance(p[0], p[1], p[4], p[5]);
      return Math.acos(adj / hypot);
    },

    updateGeorefDisplay : function () {
      var letters, i;
      letters = ["A", "B", "C", "D", "E", "F"];
      for (i = 0; i < letters.length; i += 1) {
        $("#georef-" + letters[i]).empty().text(letters[i] + ": " + this.newMap.worldfile[letters[i]]);
      }
    }
  };
  rg2.Manager = Manager;
}());
