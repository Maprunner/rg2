/*global Proj4js:false */
/*global L:false */
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
    this.isScoreEvent = false;
    this.hasResults = true;
    this.newcontrols = new rg2.Controls();
    this.courses = [];
    this.mapping = [];
    this.isEnrichCourseNames = false;
    this.mapLoaded = false;
    this.coursesGeoreferenced = false;
    this.controlsAdjusted = false;
    this.drawingCourses = false;
    this.drawnCourse = {};
    this.results = [];
    this.variants = [];
    this.resultCourses = [];
    this.mapWidth = 0;
    this.mapHeight = 0;
    this.mapFile = undefined;
    this.resultsOrCourseFile = undefined;
    this.resultsFileFormat = "";
    // list of possible encodings from results or course file: just add new ones to the array if needed
    this.encodings = ['UTF-8', 'ISO-8859-1', 'windows-1251'];
    // count of errors when parsing each encoding type
    this.errorCount = [];
    // current index into encodings
    this.encodingIndex = 0;
    // state flag showing we have found the least worst encoding so use anyway
    this.useThisEncoding = false;
    this.backgroundLocked = false;
    this.sortResults = false;
    this.handle = { x: null, y: null };
    this.maps = [];
    this.localworldfile = new rg2.Worldfile(0);
    this.worldfile = new rg2.Worldfile(0);
    this.georefmap = L.map('rg2-world-file-map');
    this.initialiseMap();
    this.initialiseUI();
  }

  Manager.prototype = {

    Constructor: Manager,

    initialiseUI: function () {
      var self;
      self = this;
      $("#btn-login").button();
      $("rg2-manager-courses").hide();
      $("rg2-manager-results").hide();
      $("#chk-read-only").prop("checked", false);
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

    initialiseMap: function () {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(this.georefmap);
    },

    logIn: function () {
      var url, json, self;
      url = rg2Config.json_url + '?type=login';
      json = JSON.stringify(this.user.encodeUser());
      self = this;
      $.ajax({
        type: 'POST',
        dataType: 'json',
        data: json,
        url: url,
        cache: false,
        success: function (data) {
          // save new cookie
          self.user.y = data.keksi;
          if (data.ok) {
            self.enableEventEdit();
          } else {
            rg2.utils.showWarningDialog("Login failed", "Login failed. Please try again.");
          }
        },
        error: function () {
          rg2.utils.showWarningDialog("Login failed", "User name or password incorrect. Please try again.");
        }
      });
      return false;
    },

    setButtons: function () {
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
        self.validateMapUpload(this.files[0]);
        self.readMapFile(evt);
      });
      $("#rg2-load-results-file").button().click(function (evt) {
        if (!self.mapLoaded) {
          rg2.utils.showWarningDialog("No map loaded", "Please load a map file before adding results.");
          evt.preventDefault();
        }
      }).change(function (evt) {
        self.resultsOrCourseFile = evt.target.files[0];
        self.initialiseEncodings();
        self.readResults();
      });
      $("#btn-move-map-and-controls").click(function (evt) {
        self.toggleMoveAll(evt.target.checked);
      });
      $("#btn-no-results").click(function (evt) {
        self.toggleResultsRequired(evt.target.checked);
      });
      $("#btn-score-event").click(function (evt) {
        self.toggleScoreEvent(evt.target.checked);
      });
      $("#btn-enrich-course-names").click(function(evt) {
        self.toggleEnrichCourseNames(evt.target.checked);
      });
      $("#btn-sort-results").click(function (evt) {
        self.toggleSortResults(evt.target.checked);
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

    validateMapUpload: function (upload) {
      var reader, image, size;
      reader = new FileReader();
      reader.onload = function (e) {
        image = new Image();
        image.src = e.target.result;
        image.onload = function () {
          var msg;
          size = Math.round(upload.size / 1024 / 1024);
          msg = "The uploaded map file is " + size + "MB (" + this.width;
          msg += " x " + this.height + "). It is recommended that you only use maps under";
          msg += " " + rg2.config.FILE_SIZE_WARNING + "MB. Please see the ";
          msg += "<a href='https://github.com/Maprunner/rg2/wiki/Map-files'>RG2 wiki</a> for ";
          msg += "guidance on how to create map files.";
          if (size > rg2.config.FILE_SIZE_WARNING) {
            rg2.utils.showWarningDialog("Oversized map upload", msg);
          }
        };
      };
      reader.readAsDataURL(upload);
    },

    initialiseEncodings: function () {
      this.encodingIndex = 0;
      this.errorCount = [];
      this.useThisEncoding = false;
    },

    enableEventEdit: function () {
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
        dateFormat: 'yy-mm-dd',
        onSelect: function (date) {
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

    getMaps: function () {
      var i, self;
      self = this;
      $.getJSON(rg2Config.json_url, {
        type: "maps",
        cache: false
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

    setGeoref: function (code) {
      if (code !== null) {
        this.convertWorldFile(code);
      }
    },

    eventListLoaded: function () {
      // called after event list has been updated
      rg2.managerUI.createEventEditDropdown();
    },

    eventFinishedLoading: function () {
      var kartatid;
      kartatid = parseInt($("#rg2-event-selected").val(), 10);
      rg2.managerUI.eventFinishedLoading(rg2.events.getEventInfo(kartatid));
    },

    startDrawingCourses: function () {
      if (this.mapLoaded) {
        this.drawingCourses = true;
        this.courses.length = 0;
        this.newcontrols.deleteAllControls();
        this.drawnCourse.name = 'Course';
        this.drawnCourse.x = [];
        this.drawnCourse.y = [];
        this.drawnCourse.codes = [];
        this.drawnCourse.courseid = 0;
        $('#rg2-new-course-name').val('Course');
        $('#rg2-draw-courses').show();
      } else {
        rg2.utils.showWarningDialog("No map selected", "Please load a map before drawing courses");
      }
    },

    displayCourseAllocations: function () {
      var i, html;
      if ((this.courses.length) && (this.resultCourses.length)) {
        html = "<div id='rg2-course-alloc'><table><thead><tr><th>Results</th><th>Course</th></tr></thead><tbody>";
        // create html for course allocation list
        // using a table to make it easier for now
        for (i = 0; i < this.resultCourses.length; i += 1) {
          html += "<tr><td>" + this.resultCourses[i].course + "</td><td>" + this.createCourseDropdown(this.resultCourses[i].course, i) + "</td></tr>";
        }
        html += "</tbody></table></div>";
        $("#rg2-course-allocations").empty().append(html);
      }
    },

    createResultCourseMapping: function () {
      var i;
      // create a dummy result-course mapping
      // to allow display of courses with no results
      if (!this.hasResults) {
        this.resultCourses.length = 0;
        for (i = 0; i < this.courses.length; i += 1) {
          this.resultCourses.push({ courseid: this.courses[i].courseid, course: this.courses[i].name });
        }
      }
    },

    validateData: function () {
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
        return 'Date is not valid.';
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
        if (this.hasResults) {
          return 'No results information. Check your results file.';
        }
      }
      if (!this.controlsAdjusted) {
        return 'Controls have not been adjusted on the map.';
      }
      return 'OK';

    },

    confirmCreateEvent: function () {
      var valid, dlg;
      valid = this.validateData();
      if (valid !== 'OK') {
        rg2.utils.showWarningDialog("Event set-up incomplete", valid + " Please enter all necessary information and make sure controls are aligned before creating the event.");
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

    doCreateEvent: function () {
      var self, data;
      $("#event-create-dialog").dialog("destroy");
      self = this;
      data = this.generateNewEventData();
      $("#rg2-load-progress-label").text("Creating event");
      $("#rg2-load-progress").show();
      $.ajax({
        data: data,
        type: "POST",
        url: rg2Config.json_url + "?type=createevent",
        dataType: "json",
        success: function (data) {
          // save new cookie
          self.user.y = data.keksi;
          if (data.ok) {
            rg2.utils.showWarningDialog("Event created", self.eventName + " has been added with id " + data.newid + ".");
            // open newly created event in a separate window
            window.open(rg2Config.json_url.replace("rg2api.php", "") + "#" + data.newid);
            rg2.getEvents();
            rg2.managerUI.setEvent();
          } else {
            rg2.utils.showWarningDialog("Save failed", data.status_msg + " Failed to create event. Please try again.");
          }
        },
        error: function () {
          rg2.utils.showWarningDialog("Save failed", " Failed to create event.");
        },
        complete: function () {
          $("#rg2-load-progress-label").text("");
          $("#rg2-load-progress").hide();
        }
      });
    },

    generateNewEventData: function () {
      var data, text, user, i;
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
      data.locked = $("#chk-read-only").prop("checked");
      data.club = this.club;
      if (this.hasResults) {
        if (this.isScoreEvent) {
          data.format = rg2.config.FORMAT_SCORE_EVENT;
        } else {
          data.format = rg2.config.FORMAT_NORMAL;
        }
      } else {
        if (this.isScoreEvent) {
          data.format = rg2.config.FORMAT_SCORE_EVENT_NO_RESULTS;
        } else {
          data.format = rg2.config.FORMAT_NORMAL_NO_RESULTS;
        }
      }
      data.level = this.eventLevel;
      if (this.drawingCourses) {
        this.courses.push(this.drawnCourse);
        this.createResultCourseMapping();
      }
      this.setControlLocations();
      this.mapResultsToCourses();
      this.enrichCourseNames();
      this.renumberResults();
      if (this.isScoreEvent) {
        this.extractVariants();
        data.variants = this.variants.slice(0);
      }
      data.courses = this.courses.slice(0);
      if (this.sortResults) {
        data.results = this.results.slice(0).sort(this.sortResultItems);
      } else {
        data.results = this.results.slice(0);
      }
      // #485 tidy up for results files that have a finish time in the splits list
      // not pretty but it will catch most of the issues
      if (data.format === rg2.config.FORMAT_NORMAL) {
        for (i = 0; i < data.results.length; i += 1) {
          var splits = (data.results[i].splits.match(/;/g) || []).length;
          // if we have one too many splits
          if (splits === this.getControlCount(data.courses, data.results[i].courseid) + 1) {
            // remove last ; and everything after it
            data.results[i].splits = data.results[i].splits.substring(0, data.results[i].splits.lastIndexOf(";"));
          }
        }
      }
      // #386 remove unused data: partial solution to problems with POST size
      for (i = 0; i < data.results.length; i += 1) {
        delete data.results[i].codes;
        delete data.results[i].chipid;
        delete data.results[i].club;
      }
      user = this.user.encodeUser();
      data.x = user.x;
      data.y = user.y;
      return JSON.stringify(data);
    },

    enrichCourseNames: function () {
      if (!this.isEnrichCourseNames) {
        return;
      }
      for (var i = 0; i < this.courses.length; i += 1) {
        this.courses[i].name = this.enrichCourseName(this.courses[i].name)
      }
    },

    getControlCount: function (courses, courseid) {
      for (var i = 0; i < courses.length; i += 1) {
        if (courses[i].courseid === courseid) {
          return courses[i].controlcount;
        }
      }
      return 0;
    },

    hasZeroTime: function (time) {
      if (time === 0 || time === '0' || time === '0:00' || time === '00:00') {
        return true;
      }
      return false;
    },

    sortResultItems: function (a, b) {
      // called after final courseids allocated so this is safe
      if (a.courseid !== b.courseid) {
        return a.courseid - b.courseid;
      }
      if (a.position !== '' && b.position !== '') {
        // sort by position, if available
        return a.position - b.position;
      }
      if (a.position === '' && b.position !== '') {
        return 1;
      }
      if (a.position !== '' && b.position === '') {
        return -1;
      }
      // sort by time, if available
      if (this.rg2.Manager.prototype.hasZeroTime(a.time) && this.rg2.Manager.prototype.hasZeroTime(b.time)) {
        // sort by name, when no time
        return a.name - b.name;
      }
      return a.time - b.time;
    },

    renumberResults: function () {
      // updates the course id and name when we know the mapping
      // and deletes results for courses not required
      var i, newResults, id;
      newResults = [];
      for (i = 0; i < this.results.length; i += 1) {
        id = this.getCourseIDForResult(this.results[i].course);
        if (id !== rg2.config.DO_NOT_SAVE_COURSE) {
          this.results[i].courseid = id;
          this.results[i].course = this.getCourseName(id);
          // set null here: overwritten later in extractVariants if this is a variant
          this.results[i].variantid = '';
          newResults.push(this.results[i]);
        }
      }
      this.results = newResults;
    },

    getCourseName: function (id) {
      var i;
      for (i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i].courseid === id) {
          return this.courses[i].name;
        }
      }
      return 0;
    },

    mapResultsToCourses: function () {
      // read through dropdowns and allocate courseid for each required course
      // also delete unwanted courses
      var i, selector, id, newCourses, courseid;
      newCourses = [];
      // courseid historically starts at 1 just to cause endless indexing problems
      courseid = 1;
      for (i = 0; i < this.resultCourses.length; i += 1) {
        if (this.drawingCourses) {
          // only handles one course at present, so it is always 0
          id = 0;
        } else {
          // get dropdown value
          selector = "#rg2-alloc-" + i;
          // comes back as NaN if selector doesn't exist when we have no results, which works OK
          id = parseInt($(selector).val(), 10);
        }
        if (id !== rg2.config.DO_NOT_SAVE_COURSE) {
          // check we haven't already saved this course
          if (this.courses[id].courseid === 0) {
            this.courses[id].courseid = courseid;
            newCourses.push(this.courses[id]);
            this.resultCourses[i].courseid = courseid;
            courseid += 1;
          } else {
            this.resultCourses[i].courseid = this.courses[id].courseid;
          }
        }
      }
      this.courses = newCourses;
    },

    enrichCourseName: function(course_name) {
      var j;
      var classes = "";

      if (this.mapping && (this.mapping.length > 0) && this.isEnrichCourseNames) {
        for (j = 0; j < this.mapping.length; j += 1) {
          var course = this.mapping[j].course;
          var class_name = "";
          if (course === course_name) {
            if (classes !== "") {
              classes += ", ";
            }
            class_name = this.mapping[j].className;
            class_name = class_name.replace(/ /g, "");
            class_name = class_name.replace(/-/g, "");
            classes += class_name;
          }
        }
      }

      if (classes !== "") {
        return (course_name + ": " + classes);
      }
      return course_name;
    },

    /**
    * @param {string} course - Course name from results file.
    * @param {integer} courseidx - Course name index.
    */
    createCourseDropdown: function (course, courseidx) {
      var i, j, idx, html;
      idx = -1;
      // check against list of course names first to default to results by course
      // do known courses include this course name?
      // This covers "Brown" results mapping to a "Brown" course
      for (i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i].name === course) {
          idx = i;
          break;
        }
      }
      // If we didn't match a course name then try a class name
      // This covers M50 results mapping to course 3 as defined in the course XML
      if ((idx === -1) && (this.mapping.length > 0)) {
        for (i = 0; i < this.mapping.length; i += 1) {
          if (this.mapping[i].className === course) {
            // now have course name so look it up to get index
            for (j = 0; j < this.courses.length; j += 1) {
              if (this.courses[j].name === this.mapping[i].course) {
                idx = j;
                break;
              }
            }
            break;
          }
        }
      }
      html = "<select id='rg2-alloc-" + courseidx + "'><option value=" + rg2.config.DO_NOT_SAVE_COURSE;
      if (idx === -1) {
        html += " selected";
      }
      html += ">Do not save</option>";
      for (i = 0; i < this.courses.length; i += 1) {
        html += "<option value=" + i;
        if (idx === i) {
          html += " selected";
        }
        html += ">" + this.enrichCourseName(this.courses[i].name) + "</option>";
      }
      html += "</select>";
      return html;
    },

    extractVariants: function () {
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

    getVariantID: function (codes, courseid) {
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
        this.variants.push({ x: x, y: y, id: id, courseid: courseid, name: 'Variant ' + id, codes: codes });
      }

      return id;
    },

    getCourseIDForResult: function (course) {
      var i;
      for (i = 0; i < this.resultCourses.length; i += 1) {
        if (this.resultCourses[i].course === course) {
          return this.resultCourses[i].courseid;
        }
      }
      return 0;
    },

    setControlLocations: function () {
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

    getControlXY: function (code) {
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

    confirmUpdateEvent: function () {
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

    doUpdateEvent: function () {
      var id, $url, data, json, self, user;
      $("#event-update-dialog").dialog("destroy");
      id = $("#rg2-event-selected").val();
      $url = rg2Config.json_url + "?type=editevent&id=" + id;
      data = {};
      data.comments = $("#rg2-edit-event-comments").val();
      data.locked = $("#chk-edit-read-only").prop("checked");
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
        data: json,
        type: "POST",
        url: $url,
        dataType: "json",
        success: function (data) {
          // save new cookie
          self.user.y = data.keksi;
          if (data.ok) {
            rg2.utils.showWarningDialog("Event updated", "Event " + id + " has been updated.");
            rg2.events.setActiveEventID(null);
            rg2.ui.setTitleBar();
            rg2.getEvents();
            rg2.managerUI.setEvent();
          } else {
            rg2.utils.showWarningDialog("Update failed", data.status_msg + ". Event update failed. Please try again.");
          }
        },
        error: function (jqXHR, textStatus) {
          rg2.utils.showWarningDialog("Update failed", textStatus + ". Event update failed.");
        }
      });
    },

    confirmDeleteRoute: function () {
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

    doDeleteRoute: function () {
      var id, $url, routeid, json, self;
      $("#route-delete-dialog").dialog("destroy");
      id = $("#rg2-event-selected").val();
      routeid = $("#rg2-route-selected").val();
      $url = rg2Config.json_url + "?type=deleteroute&id=" + id + "&routeid=" + routeid;
      json = JSON.stringify(this.user.encodeUser());
      self = this;
      $.ajax({
        data: json,
        type: "POST",
        url: $url,
        dataType: "json",
        success: function (data) {
          // save new cookie
          self.user.y = data.keksi;
          if (data.ok) {
            rg2.utils.showWarningDialog("Route deleted", "Route " + routeid + " has been deleted.");
          } else {
            rg2.utils.showWarningDialog("Delete failed", data.status_msg + ". Delete failed. Please try again.");
          }
        },
        error: function (jqXHR, textStatus) {
          rg2.utils.showWarningDialog("Delete failed", textStatus + ". Delete failed.");
        }
      });
    },

    confirmDeleteEvent: function () {
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

    doDeleteEvent: function () {
      var id, $url, json, self;
      $("#event-delete-dialog").dialog("destroy");
      id = $("#rg2-event-selected").val();
      $url = rg2Config.json_url + "?type=deleteevent&id=" + id;
      json = JSON.stringify(this.user.encodeUser());
      self = this;
      $.ajax({
        data: json,
        type: "POST",
        url: $url,
        dataType: "json",
        success: function (data) {
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
        error: function (jqXHR, textStatus) {
          rg2.utils.showWarningDialog("Delete failed", textStatus + ". Delete failed.");
        }
      });
    },

    readResults: function () {
      var format, reader, self;
      reader = new FileReader();
      self = this;
      reader.onerror = function () {
        rg2.utils.showWarningDialog('Results file error', 'The selected results file could not be read.');
      };
      reader.onload = function (evt) {
        self.checkResultsFileEncoding(evt);
      };
      format = this.resultsOrCourseFile.name.substr(-3, 3).toUpperCase();
      if ((format === 'XML') || (format === 'CSV')) {
        this.resultsFileFormat = format;
        reader.readAsText(this.resultsOrCourseFile, this.encodings[this.encodingIndex]);
      } else {
        rg2.utils.showWarningDialog("File type error", "Results file type is not recognised. Please select a valid file.");
      }
    },

    checkResultsFileEncoding: function (evt) {
      // not pretty but it works
      // need to use the array of possible encodings that we want to try if the file is not UTF-8
      // might be better to use a synchronous read, but that needs a worker thread
      var errors, lowest, i;
      errors = this.testForInvalidCharacters(evt.target.result);
      // if this encoding is clean, or we have tried everything so this is the least worst case
      if ((errors === 0) || (this.useThisEncoding)) {
        // use this version of the results
        this.processResultFile(evt);
        return;
      }
      this.errorCount[this.encodingIndex] = errors;
      this.encodingIndex += 1;
      // have we tried all the encodings?
      if (this.encodingIndex === this.encodings.length) {
        lowest = 99999;
        // no clean encodings found, since we would have escaped by now, so find least worst
        for (i = 0; i < this.encodings.length; i += 1) {
          if (lowest > this.errorCount[i]) {
            this.encodingIndex = i;
            lowest = this.errorCount[i];
          }
        }
        // force this one to be used next time we get back here
        this.useThisEncoding = true;
      }
      // try a new encoding
      this.readResults();
    },

    processResultFile: function (evt) {
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

    readCourses: function (evt) {
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
      // TODO: input charset should be set based on RG_FILE_ENCODING variable
      // reader.readAsText(evt.target.files[0], 'ISO-8859-1');
      reader.readAsText(evt.target.files[0]);
    },

    processCourseFile: function (evt) {
      var parsedCourses;
      this.coursesGeoreferenced = false;
      this.backgroundLocked = false;
      $('#btn-move-map-and-controls').prop('checked', false);
      this.handle = { x: null, y: null };
      this.newcontrols.deleteAllControls();
      parsedCourses = new rg2.CourseParser(evt, this.worldfile, this.localworldfile);
      this.courses = parsedCourses.courses;
      this.newcontrols = parsedCourses.newcontrols;
      this.mapping = parsedCourses.mapping;
      if (this.mapping.length > 0) {
        $("#rg2-enrich-course-names").show();
      } else {
        $("#rg2-enrich-course-names").hide();
      }
      this.coursesGeoreferenced = parsedCourses.georeferenced;
      rg2.managerUI.displayCourseInfo(this.getCourseInfoAsHTML());
      this.createResultCourseMapping();
      this.displayCourseAllocations();
      this.fitControlsToMap();
      rg2.redraw(false);
    },

    getCourseInfoAsHTML: function () {
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

    getResultInfoAsHTML: function () {
      var info, i, runners, oldcourse;
      if (this.results.length) {
        info = "<table><thead><tr><th>Course</th><th>Winner</th><th>Time</th><th class='align-center'>Runners</th></tr></thead><tbody>";
        runners = 0;
        oldcourse = null;
        for (i = 0; i < this.results.length; i += 1) {
          if (this.results[i].course !== oldcourse) {
            if (oldcourse !== null) {
              info += "<td class='align-center'>" + runners + "</td></tr>";
              runners = 0;
            }
            info += "<tr><td>" + this.results[i].course + "</td><td>" + this.results[i].name + "</td><td>" + this.results[i].time + "</td>";
            oldcourse = this.results[i].course;
          }
          runners += 1;
        }
        info += "<td class='align-center'>" + runners + "</td></tr></tbody></table>";
      } else {
        info = "No valid results found.";
      }

      return info;
    },

    testForInvalidCharacters: function (rawtext) {
      // takes in text read from a results file and checks it has converted to UTF-8 correctly
      var i, count;
      count = 0;
      for (i = 0; i < rawtext.length; i += 1) {
        // Unicode U+FFFD (65533) is the replacement character used to replace an incoming character whose value is unknown or unrepresentable
        // see http://www.fileformat.info/info/unicode/char/0fffd/index.htm
        if (rawtext.charCodeAt(i) === 65533) {
          count += 1;
        }
      }
      console.log("Encoding: " + this.encodings[this.encodingIndex] + ", Invalid characters: " + count);
      return count;
    },

    readMapFile: function (evt) {
      var reader, self, format;
      reader = new FileReader();
      self = this;
      reader.onload = function (event) {
        self.processMap(event);
      };
      format = evt.target.files[0].name.substr(-3, 3).toUpperCase();
      if ((format === 'JPG') || (format === 'GIF')) {
        this.mapFile = evt.target.files[0];
        reader.readAsDataURL(evt.target.files[0]);
      } else {
        rg2.utils.showWarningDialog("File type error", evt.target.files[0].name + " is not recognised. Only .jpg and .gif files are supported at present.");
      }
    },

    mapLoadCallback: function () {
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

    processMap: function (event) {
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

    fitControlsToMap: function () {
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
          this.controlsAdjusted = true;
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

    getBoundingBox: function () {
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

    copyXYToOldXY: function () {
      // rebaseline control locations
      var i;
      for (i = 0; i < this.newcontrols.controls.length; i += 1) {
        this.newcontrols.controls[i].oldX = this.newcontrols.controls[i].x;
        this.newcontrols.controls[i].oldY = this.newcontrols.controls[i].y;
      }
    },

    setClub: function () {
      this.club = $("#rg2-club-name").val();
      if (this.club) {
        $("#rg2-select-club-name").addClass('valid');
      } else {
        $("#rg2-select-club-name").removeClass('valid');
      }
    },

    setEventName: function () {
      this.eventName = $("#rg2-event-name").val();
      if (this.eventName) {
        $("#rg2-select-event-name").addClass('valid');
      } else {
        $("#rg2-select-event-name").removeClass('valid');
      }
    },

    setCourseName: function () {
      var course = $("#rg2-new-course-name").val();
      if (course) {
        this.drawnCourse.name = course;
      }
    },

    setMapName: function () {
      this.newMap.name = $("#rg2-map-name").val();
      if (this.newMap.name) {
        $("#rg2-select-map-name").addClass('valid');
      } else {
        $("#rg2-select-map-name").removeClass('valid');
      }
    },

    setDate: function (date) {
      this.eventDate = date;
      if (this.eventDate) {
        $("#rg2-select-event-date").addClass('valid');
      } else {
        $("#rg2-select-event-date").removeClass('valid');
      }
    },

    drawControls: function () {
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
    adjustControls: function (p1, p2, button) {
      // console.log (p1.x, p1.y, p2.x, p2.y, this.handle.x, this.handle.y, button);
      var i, x, y, dx, dy, scaleX, scaleY;
      if ((this.backgroundLocked) || (button === rg2.config.RIGHT_CLICK)) {
        // drag track and background
        rg2.ctx.translate(p2.x - p1.x, p2.y - p1.y);
      } else {
        this.controlsAdjusted = true;
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

    dragEnded: function () {
      // console.log("Drag ended");
      if ((this.mapLoaded) && (this.newcontrols.controls.length > 0)) {
        // rebaseline control locations
        this.copyXYToOldXY();
      }
    },

    mouseUp: function (x, y) {
      // console.log("Mouse up ",x, y);
      if (this.drawingCourses) {
        this.addNewControl(x, y);
        this.controlsAdjusted = true;
        return;
      }
      if ((this.mapLoaded) && (this.newcontrols.controls.length > 0)) {
        // adjusting the track
        if (this.handle.x === null) {
          this.handle = { x: x, y: y };
        } else {
          this.handle = { x: null, y: null };
        }
      }
    },

    addNewControl: function (x, y) {
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
    toggleMoveAll: function (checkedState) {
      this.backgroundLocked = checkedState;
    },

    toggleSortResults: function (checkedState) {
      this.sortResults = checkedState;
    },

    toggleResultsRequired: function (checked) {
      // check box checked means event does not have results
      this.hasResults = !checked;
      this.createResultCourseMapping();
      this.displayCourseAllocations();
    },

    toggleScoreEvent: function (checked) {
      this.isScoreEvent = checked;
    },

    toggleEnrichCourseNames: function (checked) {
      this.isEnrichCourseNames = checked;
      this.displayCourseAllocations();
    },

    confirmAddMap: function () {
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

    doUploadMapFile: function () {
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
      $("#rg2-load-progress-label").text("Saving map");
      $("#rg2-load-progress").show();
      $.ajax({
        url: url,
        data: formData,
        type: "POST",
        mimeType: "multipart/form-data",
        processData: false,
        contentType: false,
        dataType: "json",
        success: function (data) {
          // save new cookie
          self.user.y = data.keksi;
          if (data.ok) {
            self.doAddMap();
          } else {
            rg2.utils.showWarningDialog("Save failed", data.status_msg + ". Failed to save map. Please try again.");
          }
        },
        error: function (jqXHR, textStatus) {
          console.log(textStatus);
        },
        complete: function () {
          $("#rg2-load-progress-label").text("");
          $("#rg2-load-progress").hide();
        }
      });
    },

    doAddMap: function () {
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
        data: json,
        type: "POST",
        url: $url,
        dataType: "json",
        success: function (data) {
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
        error: function (jqXHR, textStatus) {
          console.log(textStatus);
        }
      });
    },

    readGeorefFile: function (evt) {
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
        self.localworldfile = new rg2.Worldfile({ A: args[0], B: args[2], C: args[4], D: args[1], E: args[3], F: args[5] });
        $("#rg2-georef-selected").val(self.georefsystems.getDefault());
        self.convertWorldFile(self.georefsystems.getDefault());
      };
    },

    convertWorldFile: function (type) {
      // takes in a World file for the map image and translates it to WGS84 (GPS)
      try {
        var i, size, source, dest, xsrc, ysrc, xpx, ypx, p, pt, wf;
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
        // calculation based on fixed points on map
        // x0, y0 is top left, x1, y1 is bottom right, x2, y2 is top right, x3, y3 is bottom left
        // 0, 1 and 2 are saved by the API, and must have these settings
        // 4 is just used here
        // save pixel values of these locations for map image
        xpx = [0, this.mapWidth, this.mapWidth, 0];
        ypx = [0, this.mapHeight, 0, this.mapHeight];

        // calculate the same locations using worldfile for the map
        xsrc = [];
        ysrc = [];
        for (i = 0; i < 4; i += 1) {
          xsrc[i] = this.localworldfile.getLon(xpx[i], ypx[i]);
          ysrc[i] = this.localworldfile.getLat(xpx[i], ypx[i]);
        }

        this.newMap.xpx.length = 0;
        this.newMap.ypx.length = 0;
        this.newMap.lat.length = 0;
        this.newMap.lon.length = 0;
        // translate source georef to WGS84 (as in GPS file) and store with newMap details
        // Careful: p[] has x = lon and y = lat
        p = [];
        for (i = 0; i < 4; i += 1) {
          pt = {};
          pt.x = xsrc[i];
          pt.y = ysrc[i];
          p.push(pt);
          Proj4js.transform(source, dest, p[i]);
          this.newMap.xpx.push(xpx[i]);
          this.newMap.ypx.push(ypx[i]);
          this.newMap.lat.push(p[i].y);
          this.newMap.lon.push(p[i].x);
          //console.log(p[i].x, p[i].y);
        }

        wf = {};
        // X = Ax + By + C, Y = Dx + Ey + F
        // C = X - Ax - By, where x and y are 0
        wf.C = p[0].x;
        // F = Y - Dx - Ey, where X and Y are 0
        wf.F = p[0].y;
        // A = (X - By - C) / x where y = 0
        wf.A = (p[2].x - wf.C) / xpx[2];
        // B = (X - Ax - C) / y where x = 0
        wf.B = (p[3].x - wf.C) / ypx[3];
        // D = (Y - Ey - F) / x where y = 0
        wf.D = (p[2].y - wf.F) / xpx[2];
        // E = (Y - Dx - F) / y where x = 0
        wf.E = (p[3].y - wf.F) / ypx[3];
        //console.log("Calculated lon diff = " + (((wf.A * xpx[1]) + (wf.B * ypx[1]) + wf.C) - p[1].x));
        //console.log("Calculated lat diff = " + (((wf.D * xpx[1]) + (wf.E * ypx[1]) + wf.F) - p[1].y));
        delete this.newMap.worldfile;
        this.newMap.worldfile = new rg2.Worldfile(wf);
        this.updateGeorefDisplay();
        this.updateGeorefMap();
      } catch (err) {
        delete this.newMap.worldfile;
        this.newMap.worldfile = new rg2.Worldfile(0);
        this.updateGeorefDisplay();
        this.updateGeorefMap();
        return;
      }
    },

    updateGeorefDisplay: function () {
      var letters, i;
      letters = ["A", "B", "C", "D", "E", "F"];
      for (i = 0; i < letters.length; i += 1) {
        $("#georef-" + letters[i]).empty().text(letters[i] + ": " + this.newMap.worldfile[letters[i]]);
      }
    },
    updateGeorefMap: function () {
      var lon, lat, poly, poly_coords, indices;
      // Plot a polygon and recentre the map on the polygon
      lon = this.newMap.lon;
      lat = this.newMap.lat;
      poly_coords = [];
      // For some reason this is the order the coordinates are stored in.
      indices = [3, 1, 2, 0];
      indices.forEach(function (i) {
        poly_coords.push([lat[i], lon[i]]);
      });
      poly = L.polygon(poly_coords, { color: 'red' });
      poly.addTo(this.georefmap);
      $("#rg2-world-file-map").show();
      this.georefmap.invalidateSize();
      this.georefmap.fitBounds(poly.getBounds());
    }
  };
  rg2.Manager = Manager;
}());
