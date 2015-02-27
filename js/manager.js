/*global rg2:false */
/*global rg2Config:false */
/*global FormData:false */
/*global Proj4js:false */
/*global console:false */
(function () {
  function Manager(keksi) {
    this.DO_NOT_SAVE_COURSE = 9999;
    this.INVALID_MAP_ID = 9999;
    this.FORMAT_NORMAL = 1;
    this.FORMAT_NO_RESULTS = 2;
    this.FORMAT_SCORE_EVENT = 3;
    this.loggedIn = false;
    this.user = new rg2.User(keksi);
    this.newMap = new rg2.Map();
    this.georefsystems = new rg2.Georefs();
    this.eventName = null;
    this.eventDate = null;
    this.eventLevel = null;
    this.mapIndex = this.INVALID_MAP_ID;
    this.club = null;
    this.comments = null;
    this.format = this.FORMAT_NORMAL;
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
    this.handleX = null;
    this.handleY = null;
    this.maps = [];
    this.localworldfile = new rg2.Worldfile(0, 0, 0, 0, 0, 0);
    this.worldfile = new rg2.Worldfile(0, 0, 0, 0, 0, 0);
    this.handleColor = '#ff0000';
    this.initialiseUI();
  }

  Manager.prototype = {

    Constructor : Manager,

    initialiseUI : function () {
      var self = this;
      $("#btn-login").button();
      $("rg2-manager-courses").hide();
      $("rg2-manager-results").hide();
      $("#rg2-manager-login-form").submit(function () {
        self.user.name = $("#rg2-user-name").val();
        self.user.pwd = $("#rg2-password").val();
        // check we have user name and password
        if ((self.user.name.length > 4) && (self.user.pwd.length > 4)) {
          self.logIn();
        } else {
          rg2.utils.showWarningDialog("Login failed", "Please enter user name and password of at least five characters");
        }
        // prevent form submission
        return false;
      });
      $("#rg2-new-event-details-form").submit(function () {
        console.log("Form submitted");
      });
    },

    encodeUser : function () {
      var data = {};
      data.x = this.alterString(this.user.name + this.user.pwd, this.user.y);
      data.y = this.user.y;
      return data;
    },

    alterString : function (input, pattern) {
      var i, str;
      str = "";
      for (i = 0; i < input.length; i += 1) {
        str += input.charAt(i) + pattern.charAt(i);
      }
      return str;
    },

    logIn : function () {
      var url, user, json, self;
      url = rg2Config.json_url + '?type=login';
      user = this.encodeUser();
      json = JSON.stringify(user);
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

    enableEventEdit : function () {
      var self = this;
      this.setUIVisibility();
      this.loggedIn = true;
      this.getMaps();
      this.setButtons();
      this.createEventLevelDropdown("rg2-event-level");
      this.createEventLevelDropdown("rg2-event-level-edit");
      this.createGeorefDropdown();
      this.createEventEditDropdown();

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
        if (self.mapIndex !== self.INVALID_MAP_ID) {
          $("#rg2-manager-map-select").addClass('valid');
          rg2.loadNewMap(rg2Config.maps_url + "/" + self.maps[self.mapIndex].mapfilename);
        } else {
          $("#rg2-manager-map-select").removeClass('valid');
          self.mapLoaded = false;
          self.mapWidth = 0;
          self.mapHeight = 0;
        }
      });

      $('#rg2-event-comments').focus(function () {
        // Clear comment box if user focuses on it and it still contains default text
        var text = $("#rg2-event-comments").val();
        if (text === rg2.config.DEFAULT_EVENT_COMMENT) {
          $('#rg2-event-comments').val("");
        }
      });

      $("#rg2-event-date").datepicker({
        dateFormat : 'yy-mm-dd',
        onSelect : function (date) {
          self.setDate(date);
        }
      });

      $("#rg2-event-date-edit").datepicker({
        dateFormat : 'yy-mm-dd'
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
        self.setEvent(parseInt($("#rg2-event-selected").val(), 10));
      });

      $("#rg2-georef-type").change(function () {
        self.setGeoref($("#rg2-georef-selected").val());
      });

      $('#rg2-info-panel').tabs('option', 'active', rg2.config.TAB_CREATE);
    },

    setUIVisibility : function () {
      $('#rg2-draw-courses').hide();
      $("#rg2-manage-create").show();
      $("#rg2-create-tab").show();
      $("#rg2-edit-tab").show();
      $("#rg2-map-tab").show();
      $("#rg2-manage-login").hide();
      $("#rg2-login-tab").hide();
      // TODO: hide course delete function for now: not fully implemented yet, and may not be needed...
      $("#rg2-temp-hide-course-delete").hide();
      // TODO hide results grouping for now: may never implement
      $("#rg2-results-grouping").hide();
    },

    setButtons : function () {
      var self = this;
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
        self.createMapDropdown();
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

    setEvent : function (kartatid) {
      var event;
      if (kartatid) {
        // load details for this event
        event = rg2.events.getEventInfo(kartatid);
        rg2.loadEvent(event.id);
      } else {
        // no event selected so disable everything
        $("#btn-delete-event").button("disable");
        $("#btn-update-event").button("disable");
        $("#btn-delete-route").button("disable");
        $("#rg2-event-name-edit").val("");
        $("#rg2-club-name-edit").val("");
        $("#rg2-event-date-edit").val("");
        $("#rg2-event-level-edit").val("");
        $("#rg2-edit-event-comments").val("");
        $("#rg2-route-selected").empty();
      }

    },

    eventListLoaded : function () {
      // called after event list has been updated
      this.createEventEditDropdown();
    },

    eventFinishedLoading : function () {
      // called once the requested event has loaded
      // copy event details to edit-form
      // you tell me why this needs parseInt but the same call above doesn't
      var kartatid, event;
      kartatid = parseInt($("#rg2-event-selected").val(), 10);
      event = rg2.events.getEventInfo(kartatid);
      $("#rg2-event-name-edit").empty().val(event.name);
      $("#rg2-club-name-edit").empty().val(event.club);
      $("#rg2-event-date-edit").empty().val(event.date);
      $("#rg2-event-level-edit").val(event.rawtype);
      $("#rg2-edit-event-comments").empty().val(event.comment);
      $("#btn-delete-event").button("enable");
      $("#btn-update-event").button("enable");
      $("#btn-delete-route").button("enable");
      this.createCourseDeleteDropdown(event.id);
      this.createRouteDeleteDropdown(event.id);
    },

    createMapDropdown : function () {
      var dropdown, i;
      $("#rg2-map-selected").empty();
      dropdown = document.getElementById("rg2-map-selected");
      dropdown.options.add(rg2.utils.generateOption(this.INVALID_MAP_ID, 'Select map'));
      for (i = (this.maps.length - 1); i > -1; i -= 1) {
        dropdown.options.add(rg2.utils.generateOption(i, this.maps[i].mapid + ": " + this.maps[i].name));
      }
    },

    createGeorefDropdown : function () {
      var dropdown;
      $("#rg2-georef-selected").empty();
      dropdown = document.getElementById("rg2-georef-selected");
      dropdown = this.georefsystems.getDropdown(dropdown);
    },

    createEventEditDropdown : function () {
      var dropdown;
      $("#rg2-event-selected").empty();
      dropdown = document.getElementById("rg2-event-selected");
      dropdown = rg2.events.getEventEditDropdown(dropdown);
    },

    createCourseDeleteDropdown : function (id) {
      var dropdown, i, courses;
      $("#rg2-course-selected").empty();
      dropdown = document.getElementById("rg2-course-selected");
      courses = rg2.courses.getCoursesForEvent(id);
      for (i = 0; i < courses.length; i += 1) {
        dropdown.options.add(rg2.utils.generateOption(courses[i].id, courses[i].name));
      }
    },

    createRouteDeleteDropdown : function (id) {
      var dropdown, routes, i;
      $("#rg2-route-selected").empty();
      dropdown = document.getElementById("rg2-route-selected");
      routes = rg2.results.getRoutesForEvent(id);
      for (i = 0; i < routes.length; i += 1) {
        dropdown.options.add(rg2.utils.generateOption(routes[i].resultid, routes[i].resultid + ": " + routes[i].name + " on " + routes[i].coursename));
      }
    },

    getCoursesFromResults : function () {
      // creates an array of all course names in the results file
      var i, j, a, idx;
      this.resultCourses = [];
      for (i = 0; i < this.results.length; i += 1) {
        // have we already found this course?
        idx = -1;
        for (j = 0; j < this.resultCourses.length; j += 1) {
          if (this.resultCourses[j].course === this.results[i].course) {
            idx = j;
            break;
          }
        }
        if (idx === -1) {
          a = {};
          a.course = this.results[i].course;
          // set later when mapping is known
          a.courseid = this.DO_NOT_SAVE_COURSE;
          this.resultCourses.push(a);
        }
      }

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
      if (this.mapIndex === this.INVALID_MAP_ID) {
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
        if (this.format !== this.FORMAT_NO_RESULTS) {
          return 'No results information. Check your results file.';
        }
      }
      return 'OK';

    },

    confirmCreateEvent : function () {
      var valid, msg, me;
      valid = this.validateData();
      if (valid !== 'OK') {
        rg2.utils.showWarningDialog("Data missing", valid + " Please enter all necessary information before creating the event.");
        return;
      }
      msg = "<div id='event-create-dialog'>Are you sure you want to create this event?</div>";
      me = this;
      $(msg).dialog({
        title : "Confirm event creation",
        modal : true,
        dialogClass : "no-close rg2-confirm-create-event-dialog",
        closeOnEscape : false,
        buttons : [{
          text : "Cancel",
          click : function () {
            me.doCancelCreateEvent();
          }
        }, {
          text : "Create event",
          click : function () {
            me.doCreateEvent();
          }
        }]
      });
    },

    doCancelCreateEvent : function () {
      $("#event-create-dialog").dialog("destroy");
    },

    doCreateEvent : function () {
      var $url, data, user, json, self, text;
      $("#event-create-dialog").dialog("destroy");
      $url = rg2Config.json_url + "?type=createevent";
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
        data.format = this.FORMAT_SCORE_EVENT;
      }
      data.level = this.eventLevel;
      if (this.drawingCourses) {
        this.courses.push(this.drawnCourse);
      }
      this.setControlLocations();
      this.mapResultsToCourses();
      this.renumberResults();
      if (data.format === this.FORMAT_SCORE_EVENT) {
        this.extractVariants();
        data.variants = this.variants.slice(0);
      }
      data.courses = this.courses.slice(0);
      data.results = this.results.slice(0);
      user = this.encodeUser();
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
            rg2.utils.showWarningDialog("Event created", self.eventName + " has been added with id " + data.newid + ".");
          } else {
            rg2.utils.showWarningDialog("Save failed", data.status_msg + " Failed to create event. Please try again.");
          }
        },
        error : function () {
          rg2.utils.showWarningDialog("Save failed", " Failed to create event.");
        }
      });
    },

    renumberResults : function () {
      // updates the course id when we know the mapping
      // and deletes results for courses not required
      var i, id, newResults;
      newResults = [];
      for (i = 0; i < this.results.length; i += 1) {
        id = this.getCourseIDForResult(this.results[i].course);
        if (id !== this.DO_NOT_SAVE_COURSE) {
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
        if (id !== this.DO_NOT_SAVE_COURSE) {
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
      var i, j, c, x, y, v, match, id;
      x = [];
      y = [];
      v = {};
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
        v.codes = codes;
        for (i = 0; i < codes.length; i += 1) {
          c = this.getControlXY(codes[i]);
          x.push(c.x);
          y.push(c.y);
        }
        v.x = x;
        v.y = y;
        v.id = id;
        v.courseid = courseid;
        v.name = 'Variant ' + id;
        this.variants.push(v);
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
      var me = this;
      $("<div id='event-update-dialog'>Are you sure you want to update this event?</div>").dialog({
        title : "Confirm event update",
        modal : true,
        dialogClass : "no-close rg2-confirm-update-dialog",
        closeOnEscape : false,
        buttons : [{
          text : "Cancel",
          click : function () {
            me.doCancelUpdateEvent();
          }
        }, {
          text : "Update event",
          click : function () {
            me.doUpdateEvent();
          }
        }]
      });
    },

    doCancelUpdateEvent : function () {
      $("#event-update-dialog").dialog("destroy");
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
      user = this.encodeUser();
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
      var me = this;
      $("<div id='route-delete-dialog'>This route will be permanently deleted. Are you sure?</div>").dialog({
        title : "Confirm route delete",
        modal : true,
        dialogClass : "no-close rg2-confirm-route-delete-dialog",
        closeOnEscape : false,
        buttons : [{
          text : "Cancel",
          click : function () {
            me.doCancelDeleteRoute();
          }
        }, {
          text : "Delete route",
          click : function () {
            me.doDeleteRoute();
          }
        }]
      });
    },

    doCancelDeleteRoute : function () {
      $("#route-delete-dialog").dialog("destroy");
    },

    doDeleteRoute : function () {
      var id, $url, routeid, json, self, user;
      $("#route-delete-dialog").dialog("destroy");
      id = $("#rg2-event-selected").val();
      routeid = $("#rg2-route-selected").val();
      $url = rg2Config.json_url + "?type=deleteroute&id=" + id + "&routeid=" + routeid;
      user = this.encodeUser();
      json = JSON.stringify(user);
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
      var me = this;
      $("<div id='event-delete-dialog'>This event will be deleted. Are you sure?</div>").dialog({
        title : "Confirm event delete",
        modal : true,
        dialogClass : "no-close rg2-confirm-delete-event-dialog",
        closeOnEscape : false,
        buttons : [{
          text : "Cancel",
          click : function () {
            me.doCancelDeleteEvent();
          }
        }, {
          text : "Delete event",
          click : function () {
            me.doDeleteEvent();
          }
        }]
      });
    },
    doCancelDeleteEvent : function () {
      $("#event-delete-dialog").dialog("destroy");
    },

    doDeleteEvent : function () {
      var id, $url, user, json, self;
      $("#event-delete-dialog").dialog("destroy");
      id = $("#rg2-event-selected").val();
      $url = rg2Config.json_url + "?type=deleteevent&id=" + id;
      user = this.encodeUser();
      json = JSON.stringify(user);
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
            rg2.loadEventList();
            self.setEvent();
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
        reader.readAsText(evt.target.files[0]);
      } else {
        rg2.utils.showWarningDialog("File type error", "Results file type is not recognised. Please select a valid file.");
      }
    },

    processResultFile : function (evt) {
      this.results = new rg2.ResultParser(evt, this.resultsFileFormat);
      // extract courses from results
      this.getCoursesFromResults();
      this.displayResultInfo();
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
      reader.readAsText(evt.target.files[0]);
    },

    processCourseFile : function (evt) {
      var parsedCourses;
      this.coursesGeoreferenced = false;
      this.backgroundLocked = false;
      $('#btn-move-map-and-controls').prop('checked', false);
      this.handleX = null;
      this.handleY = null;
      this.newcontrols.deleteAllControls();
      parsedCourses = new rg2.CourseParser(evt, this.worldfile, this.localworldfile);
      this.courses = parsedCourses.courses;
      this.newcontrols = parsedCourses.newcontrols;
      this.displayCourseInfo();
      this.displayCourseAllocations();
      this.fitControlsToMap();
      rg2.redraw(false);
    },

    displayCourseInfo : function () {
      var info = this.getCourseInfoAsHTML();
      if (info) {
        $("#rg2-manage-courses").empty().html(info);
        $("#rg2-manage-courses").dialog({
          title : "Course details",
          dialogClass : "rg2-course-info-dialog",
          resizable : true,
          width : 'auto',
          maxHeight : (window.innerHeight * 0.9),
          buttons : {
            Ok : function () {
              $(this).dialog("close");
            }
          }
        });
      }
    },

    displayResultInfo : function () {
      var info = this.getResultInfoAsHTML();
      $("#rg2-manage-results").empty().html(info);
      if (info) {
        $("#rg2-manage-results").dialog({
          title : "Result details",
          dialogClass : "rg2-result-info-dialog",
          resizable : true,
          width : 'auto',
          maxHeight : (window.innerHeight * 0.9),
          buttons : {
            Ok : function () {
              $(this).dialog("close");
            }
          }
        });
      }
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

    // rows: array of raw lines from Spklasse results csv file
    processSpklasseCSVResults : function (rows, separator) {
      // fields in course row
      var COURSE_IDX = 0, NUM_CONTROLS_IDX = 1, FIRST_NAME_IDX = 0, SURNAME_IDX = 1, CLUB_IDX = 2,
        START_TIME_IDX = 3, FIRST_SPLIT_IDX = 4, course, controls, i, j, fields, result, len, totaltime;
      fields = [];
      try {
        course = '';
        controls = 0;

        // read through all rows
        for (i = 0; i < rows.length; i += 1) {
          fields = rows[i].split(separator);
          // discard blank lines
          if (fields.length > 0) {
            // check for new course
            if (fields.length === 2) {
              course = fields[COURSE_IDX];
              controls = parseInt(fields[NUM_CONTROLS_IDX], 10);
            } else {
              // assume everything else is a result
              result = {};
              result.chipid = 0;
              result.name = (fields[FIRST_NAME_IDX] + " " + fields[SURNAME_IDX] + " " + fields[CLUB_IDX]).trim();
              result.dbid = (result.chipid + "__" + result.name);
              result.starttime = rg2.utils.getSecsFromHHMM(fields[START_TIME_IDX]);
              result.club = fields[CLUB_IDX];
              result.course = course;
              result.controls = controls;
              result.splits = '';
              result.codes = [];
              len = fields.length - FIRST_SPLIT_IDX;
              totaltime = 0;
              for (j = 0; j < len; j += 1) {
                if (j > 0) {
                  result.splits += ";";
                }
                result.codes[j] = 'X';
                totaltime += rg2.utils.getSecsFromHHMMSS(fields[j + FIRST_SPLIT_IDX]);
                result.splits += totaltime;
              }
              result.time = rg2.utils.formatSecsAsMMSS(totaltime);
              this.results.push(result);
            }
          }
        }
      } catch (err) {
        rg2.utils.showWarningDialog("Spklasse csv file contains invalid information");
      }
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
      if (this.mapIndex !== this.INVALID_MAP_ID) {
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
      var i, georefOK, minX, maxX, minY, maxY, scale, xRange, yRange;
      georefOK = false;
      if ((this.mapLoaded) && (this.newcontrols.controls.length > 0)) {
        // get max extent of controls
        // find bounding box for track
        minX = this.newcontrols.controls[0].x;
        maxX = this.newcontrols.controls[0].x;
        minY = this.newcontrols.controls[0].y;
        maxY = this.newcontrols.controls[0].y;
        for (i = 1; i < this.newcontrols.controls.length; i += 1) {
          maxX = Math.max(maxX, this.newcontrols.controls[i].x);
          maxY = Math.max(maxY, this.newcontrols.controls[i].y);
          minX = Math.min(minX, this.newcontrols.controls[i].x);
          minY = Math.min(minY, this.newcontrols.controls[i].y);
        }
        if (this.coursesGeoreferenced) {
          // check we are somewhere on the map
          if ((maxX < 0) || (minX > this.mapWidth) || (minY > this.mapHeight) || (maxY < 0)) {
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
          xRange = (maxX - minX);
          yRange = (maxY - minY);

          for (i = 0; i < this.newcontrols.controls.length; i += 1) {
            this.newcontrols.controls[i].x = ((this.newcontrols.controls[i].x - minX) * (this.mapWidth / xRange) * scale) + (this.mapWidth * (1 - scale) * 0.5);
            this.newcontrols.controls[i].y = (this.mapHeight - ((this.newcontrols.controls[i].y - minY) * (this.mapHeight / yRange)) * scale) - (this.mapHeight * (1 - scale) * 0.5);
          }
        }
        this.copyXYToOldXY();
        this.newcontrols.displayAllControls();
      }
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

    createEventLevelDropdown : function (id) {
      var dropdown, types, abbrev, i;
      $("#" + id).empty();
      dropdown = document.getElementById(id);
      types = ["Select level", "Training", "Local", "Regional", "National", "International"];
      abbrev = ["X", "T", "L", "R", "N", "I"];
      for (i = 0; i < types.length; i += 1) {
        dropdown.options.add(rg2.utils.generateOption(abbrev[i], types[i]));
      }

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
      html = "<select id='rg2-alloc-" + courseidx + "'><option value=" + this.DO_NOT_SAVE_COURSE;
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

    drawControls : function () {
      if ((this.mapLoaded) && (this.newcontrols.controls.length > 0)) {
        this.newcontrols.drawControls(true);
        var opt = rg2.getOverprintDetails();
        // locked point for control edit
        if (this.handleX !== null) {
          rg2.ctx.lineWidth = opt.overprintWidth;
          rg2.ctx.strokeStyle = this.handleColor;
          rg2.ctx.fillStyle = this.handleColour;
          rg2.ctx.globalAlpha = 1.0;

          rg2.ctx.beginPath();
          rg2.ctx.arc(this.handleX, this.handleY, rg2.config.HANDLE_DOT_RADIUS, 0, 2 * Math.PI, false);
          rg2.ctx.fill();
          rg2.ctx.beginPath();
          rg2.ctx.arc(this.handleX, this.handleY, 2 * rg2.config.HANDLE_DOT_RADIUS, 0, 2 * Math.PI, false);
          rg2.ctx.stroke();
        }
      }
    },

    // based on adjustTrack from draw.js
    adjustControls : function (x1, y1, x2, y2, button) {
      // console.log (x1, y1, x2, y2, this.handleX, this.handleY, button);
      var i, x, y, dx, dy, scaleX, scaleY;
      if ((this.backgroundLocked) || (button === rg2.config.RIGHT_CLICK)) {
        // drag track and background
        rg2.ctx.translate(x2 - x1, y2 - y1);
      } else {
        if (this.handleX !== null) {
          // scale controls
          scaleX = (x2 - this.handleX) / (x1 - this.handleX);
          scaleY = (y2 - this.handleY) / (y1 - this.handleY);
          // don't rotate: we are assuming controls and map are already rotated the same
          // console.log (x1, y1, x2, y2, this.handleX, this.handleY, scaleX, scaleY);
          if (isFinite(scaleX) && isFinite(scaleY)) {
            // just ignore very small moves
            for (i = 0; i < this.newcontrols.controls.length; i += 1) {
              x = this.newcontrols.controls[i].oldX - this.handleX;
              y = this.newcontrols.controls[i].oldY - this.handleY;
              this.newcontrols.controls[i].x = (x * scaleX) + this.handleX;
              this.newcontrols.controls[i].y = (y * scaleY) + this.handleY;
            }
          }
        } else {
          // drag controls
          dx = x2 - x1;
          dy = y2 - y1;
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
        if (this.handleX === null) {
          this.handleX = x;
          this.handleY = y;
        } else {
          this.handleX = null;
          this.handleY = null;
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
        this.format = this.FORMAT_NO_RESULTS;
      } else {
        this.format = this.FORMAT_NORMAL;
      }

    },

    confirmAddMap : function () {
      var msg, me;
      msg = "<div id='add-map-dialog'>Are you sure you want to add this map?</div>";
      me = this;
      $(msg).dialog({
        title : "Confirm new map",
        modal : true,
        dialogClass : "no-close rg2-confirm-add-map-dialog",
        closeOnEscape : false,
        buttons : [{
          text : "Cancel",
          click : function () {
            me.doCancelAddMap();
          }
        }, {
          text : "Add map",
          click : function () {
            me.doUploadMapFile();
          }
        }]
      });
    },

    doCancelAddMap : function () {
      $("#add-map-dialog").dialog("destroy");
    },

    doUploadMapFile : function () {
      var url, user, self, formData;
      $("#add-map-dialog").dialog("destroy");
      // first transfer map file to server
      url = rg2Config.json_url + "?type=uploadmapfile";
      user = this.encodeUser();
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
      user = this.encodeUser();
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
        self.localworldfile = new rg2.Worldfile(args[0], args[2], args[4], args[1], args[3], args[5]);
        $("#rg2-georef-selected").val(self.georefsystems.getDefault());
        self.convertWorldFile(self.georefsystems.getDefault());
      };
    },

    convertWorldFile : function (type) {
      // takes in a World file for the map image and translates it to WGS84 (GPS)
      try {
        var i, size, source, dest, xScale, yScale, xSkew, ySkew, xsrc, ysrc, xpx, ypx, p, pt,
          hypot, adj, angle1, angle2, angle, pixResX, pixResY;
        size = rg2.getMapSize();
        this.mapWidth = size.width;
        this.mapHeight = size.height;
        if ((!this.localworldfile.valid) || (this.mapWidth === 0) || (type === "none")) {
          // no map or world file loaded or user selected do not georef
          this.clearGeorefs();
          return;
        }

        Proj4js.defs[type] = this.georefsystems.getParams(type);
        source = new Proj4js.Proj(type);

        // WGS84 as used by GPS: included by default in Proj4js.defs
        dest = new Proj4js.Proj("EPSG:4326");
        xScale = this.localworldfile.A;
        ySkew = this.localworldfile.D;
        xSkew = this.localworldfile.B;
        yScale = this.localworldfile.E;
        // x0, y0 is top left
        // x1, y1 is bottom right
        // x2, y2 is top right
        xpx = [0, this.mapWidth, this.mapWidth];
        ypx = [0, this.mapHeight, 0];

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
        // translate source to WGS84 (as in GPS file)
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

        hypot = rg2.utils.getLatLonDistance(p[0].y, p[0].x, p[2].y, p[2].x);
        adj = rg2.utils.getLatLonDistance(p[0].y, p[0].x, p[0].y, p[2].x);
        angle1 = Math.acos(adj / hypot);
        hypot = rg2.utils.getLatLonDistance(p[2].y, p[2].x, p[1].y, p[1].x);
        adj = rg2.utils.getLatLonDistance(p[2].y, p[2].x, p[1].y, p[2].x);
        angle2 = Math.acos(adj / hypot);

        angle = (angle1 + angle2) / 2;
        //console.log(hypot, hypot2, adj, adj2, angle1, angle2, angle);
        pixResX = (p[2].x - p[0].x) / this.mapWidth;
        pixResY = (p[2].y - p[1].y) / this.mapHeight;
        delete this.newMap.worldfile;
        this.newMap.worldfile = new rg2.Worldfile(pixResX * Math.cos(angle), pixResX * Math.sin(angle), p[0].x, pixResY * Math.sin(angle), -1 * pixResY * Math.cos(angle), p[0].y);
        this.updateGeorefDisplay();
      } catch (err) {
        delete this.newMap.worldfile;
        this.newMap.worldfile = new rg2.Worldfile(0, 0, 0, 0, 0, 0);
        this.updateGeorefDisplay();
        return;
      }
    },

    updateGeorefDisplay : function () {
      $("#georef-A").empty().text("A: " + this.newMap.worldfile.A);
      $("#georef-B").empty().text("B: " + this.newMap.worldfile.B);
      $("#georef-C").empty().text("C: " + this.newMap.worldfile.C);
      $("#georef-D").empty().text("D: " + this.newMap.worldfile.D);
      $("#georef-E").empty().text("E: " + this.newMap.worldfile.E);
      $("#georef-F").empty().text("F: " + this.newMap.worldfile.F);
    }
  };
  rg2.Manager = Manager;
}());