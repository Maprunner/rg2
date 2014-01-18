/*global rg2:false */
/*global Controls:false */
/*global json_url:false */
/*global getAngle:false */
function User() {
  this.name = null;
  this.pwd = null;
}

function Manager() {
  this.loggedIn = false;
  this.user = new User();
  this.eventName = null;
  this.mapName = null;
  this.eventDate = null;
  this.eventLevel = null;
  this.club = null;
  this.comments = null;
  this.newcontrols = new Controls();
  this.xmlcourses = [];
  this.mapLoaded = false;
  this.results = [];
  this.resultCourses = [];
  this.allocationsDisplayed = false;
  this.mapWidth = 0;
  this.mapHeight = 0;
  this.backgroundLocked = false;
  this.handleX = null;
  this.handleY = null;
  this.HANDLE_DOT_RADIUS = 10;
  this.handleColor = '#ff0000';

  var self = this;

  $("#rg2-manager-login").submit(function(event) {
    self.user.name = $("#rg2-user-name").val();
    self.user.pwd = $("#rg2-password").val();
    // check we have user name and password
    if ((self.user.name) && (self.user.pwd)) {
      self.logIn();
    } else {
      var msg = "<div>Please enter user name and password.</div>";
      $(msg).dialog({
        title : "Login failed"
      });
    }
    // prevent form submission
    return false;
  });

  $("#rg2-new-event-details-form").submit(function(event) {
    console.log("Form submitted");

  });
}

Manager.prototype = {

  Constructor : Manager,

  logIn : function() {
    var url = json_url + '?type=login';
    var json = JSON.stringify(this.user);
    var self = this;
    $.ajax({
      type : 'POST',
      dataType : 'json',
      data : json,
      url : url,
      cache : false,
      success : function(data, textStatus, jqXHR) {
        self.enableEventEdit();
      },
      error : function(jqXHR, textStatus, errorThrown) {
        console.log(errorThrown);
        var msg = "<div>User name or password incorrect. Please try again.</div>";
        $(msg).dialog({
          title : "Login failed"
        });
      }
    });
    return false;
  },

  enableEventEdit : function() {
    this.loggedIn = true;
    var self = this;

    this.createEventLevelDropdown();

    rg2.createEventEditDropdown();

    $('#rg2-event-comments').focus(function() {
      // Clear comment box if user focuses on it and it still contains default text
      var text = $("#rg2-event-comments").val();
      if (text === rg2.config.DEFAULT_EVENT_COMMENT) {
        $('#rg2-event-comments').val("");
      }
    });

    $("#rg2-event-date").datepicker({
      dateFormat : 'dd/mm/yy',
      onSelect : function(date) {
        self.setDate(date);
      }
    });

    $("#rg2-event-name").on("change", function(evt) {
      self.setEventName(evt);
    });

    $("#rg2-club-name").on("change", function(evt) {
      self.setClub(evt);
    });

    $("#rg2-map-name").on("change", function(evt) {
      self.setMapName(evt);
    });

    $("#rg2-load-map-file").button().change(function(evt) {
      self.readMapJPG(evt);
    });

    $("#rg2-load-results-file").button().change(function(evt) {
      self.readResultsCSV(evt);
    });

    $("#rg2-load-course-file").button().change(function(evt) {
      self.readCourseXML(evt);
    });

    $("#btn-move-map-and-controls").click(function(evt) {
      self.toggleMoveAll(evt.target.checked);
    });

    $("#btn-add-event").button().click(function() {
      $("#rg2-add-new-event").dialog({
        title : "Add new event",
        width : 'auto',
        buttons : {
          Continue : function() {
            self.doContinue();
          },
          Cancel : function() {
            $(this).dialog('close');
          }
        }
      });
    });

    // TODO buttons disabled until handling code written
    $("#btn-edit-event").button().click(function() {
      var id = $("#rg2-manager-event-select").val();
    }).button("disable");

    $("#btn-delete-event").button().click(function() {
      var id = $("#rg2-manager-event-select").val();
    }).button("disable");

    $("#rg2-manager-options").show();
    $("#rg2-manager-login").hide();
  },

  doContinue : function() {
    //if ((this.eventName) && (this.mapName) && (this.eventDate) && (this.club) && (this.eventLevel) && (this.mapLoaded) && (this.newcontrols) && (this.xmlcourses)) {
    if (this.xmlcourses) {
      // allocate courses

      // align controls

    } else {
      alert("Data entry not complete");
    }
  },

  getCoursesFromResults : function() {
    var i;
    this.resultCourses = [];
    for ( i = 0; i < this.results.length; i += 1) {
      if (this.resultCourses.indexOf(this.results[i].course) === -1) {
        this.resultCourses.push(this.results[i].course);
      }
    }

  },

  displayCourseAllocations : function() {
    if ((this.xmlcourses.length) && (this.resultCourses) && (!this.allocationsDisplayed)) {

      // create html for course allocation list
      // using a table to make it easier for now
      var html = "<table><thead></thead><tbody>";
      var i;
      for ( i = 0; i < this.xmlcourses.length; i += 1) {
        html += "<tr><td>" + this.xmlcourses[i].name + "</td><td>" + this.createCourseDropdown(this.xmlcourses[i].name) + "</td></tr>";
      }
      html += "</tbody></table>";
      $("#rg2-course-allocations").append(html);
      this.allocationsDisplayed = true;
    }
  },

  readResultsCSV : function(evt) {

    var reader = new FileReader();
    var self = this;

    reader.onerror = function(evt) {
      switch(evt.target.error.code) {
        case evt.target.error.NOT_FOUND_ERR:
          alert('File not found');
          break;
        case evt.target.error.NOT_READABLE_ERR:
          alert('File not readable');
          break;
        default:
          alert('An error occurred reading the file.');
      }
    };
    reader.onload = function(evt) {
      var csv = evt.target.result;
      var rows = evt.target.result.split(/[\r\n|\n]+/);
      // only one valid format for now...
      self.processSICSVResults(rows);
      $("#rg2-select-results-file").addClass('valid');
    };
    reader.readAsText(evt.target.files[0]);
  },

  readCourseXML : function(evt) {

    var reader = new FileReader();
    reader.onerror = function(evt) {
      switch(evt.target.error.code) {
        case evt.target.error.NOT_FOUND_ERR:
          alert('File not found');
          break;
        case evt.target.error.NOT_READABLE_ERR:
          alert('File not readable');
          break;
        default:
          alert('An error occurred reading the file.');
      }
    };
    var self = this;
    reader.onload = function(evt) {
      self.processIOFXML(evt);
    };

    reader.readAsText(evt.target.files[0]);
  },

  processIOFXML : function(evt) {
    var xml;
    var version;
    var i;
    var nodelist;

    xml = $.parseXML(evt.target.result);
    version = xml.getElementsByTagName('IOFVersion')[0].getAttribute('version');
    if (version !== "2.0.3") {
      alert('Invalid IOF file format. Version ' + version + ' not supported.');
      return;
    }
    // extract all start controls
    nodelist = xml.getElementsByTagName('StartPoint');
    this.extractControls(nodelist);
    // extract all normal controls
    nodelist = xml.getElementsByTagName('Control');
    this.extractControls(nodelist);
    // extract all finish controls
    nodelist = xml.getElementsByTagName('FinishPoint');
    this.extractControls(nodelist);

    // extract all courses
    nodelist = xml.getElementsByTagName('Course');
    this.extractCourses(nodelist);
    this.displayCourseAllocations();
    this.fitControlsToMap();
    rg2.redraw(false);
  },

  /*
   * rows: array of raw lines from SI results csv file
   */
  processSICSVResults : function(rows) {
    var CHIP_IDX = 1;
    var DB_IDX = 2;
    var SURNAME_IDX = 3;
    var START_TIME_IDX = 9;
    var TOTAL_TIME_IDX = 11;
    var CLUB_IDX = 15;
    var CITY_IDX = 15;
    var CLASS_IDX = 18;
    var COURSE_IDX = 39;
    var DISTANCE_IDX = 40;
    var CLIMB_IDX = 41;
    var NUM_CONTROLS_IDX = 42;
    var START_PUNCH_IDX = 44;
    var FIRST_SPLIT_IDX = 47;
    var FIRST_NAME_IDX = 4;
    var SPLIT_IDX_STEP = 2;

    var i;
    var j;
    var fields = {};
    var result;
    var nextsplit;
    var temp;
    // extract all fields in all rows
    for ( i = 0; i < rows.length; i += 1) {
      fields[i] = rows[i].split(";");
    }
    // extract what we need: first row is headers so ignore
    for ( i = 1; i < rows.length; i += 1) {
      // need at least this many fields...
      if (fields[i].length >= FIRST_SPLIT_IDX) {
        result = {};
        result.chipid = fields[i][CHIP_IDX];
        result.name = fields[i][FIRST_NAME_IDX] + " " + fields[i][SURNAME_IDX];
        result.dbid = fields[i][DB_IDX] + "_" + result.name;
        result.starttime = this.convertHHMMSSToSecs(fields[i][START_TIME_IDX]);
        result.time = fields[i][TOTAL_TIME_IDX];
        result.club = fields[i][CLUB_IDX];
        // if club name not set then it may be in city field instead
        if (!result.club) {
          result.club = fields[i][CITY_IDX];
        }
        result.course = fields[i][COURSE_IDX];
        result.controls = parseInt(fields[i][NUM_CONTROLS_IDX], 10);
        nextsplit = FIRST_SPLIT_IDX;
        result.splits = "";
        for ( j = 0; j < result.controls; j += 1) {
          if (j > 0) {
            result.splits += ";";
          }
          result.splits += this.convertMMSSToSecs(fields[i][nextsplit]);
          nextsplit += SPLIT_IDX_STEP;
        }
        // add finish split
        result.splits += ";";
        result.splits += this.convertMMSSToSecs(result.time);
        this.results.push(result);
      }
    }
    // extract courses from results
    this.getCoursesFromResults();

    this.displayCourseAllocations();
  },

  convertMMSSToSecs : function(mmss) {
    if (mmss) {
      //takes in (MM)M:SS, returns seconds
      var bits = mmss.split(":");
      var mins = parseInt(bits[0], 0) * 60;
      var secs = parseInt(bits[1], 0);
      return mins + secs;
    } else {
      return 0;
    }
  },

  convertHHMMSSToSecs : function(hhmmss) {
    if (hhmmss) {
      //takes in HH:MM:SS, returns seconds
      var hours = parseInt(hhmmss.substr(0, 2), 0) * 3600;
      var mins = parseInt(hhmmss.substr(3, 2), 0) * 60;
      var secs = parseInt(hhmmss.substr(6, 2), 0);
      return hours + mins + secs;
    } else {
      return 0;
    }
  },

  extractControls : function(nodelist) {
    var i;
    var x;
    var y;
    var code;
    for ( i = 0; i < nodelist.length; i += 1) {
      code = nodelist[i].children[0].textContent;
      x = nodelist[i].children[1].getAttribute('x');
      y = nodelist[i].children[1].getAttribute('y');
      this.newcontrols.addControl(code.trim(), x, y);
    }
  },

  extractCourses : function(nodelist) {
    var i;
    var j;
    var course;
    var codes;
    var x;
    var y;
    var controllist;
    var tmp;
    for ( i = 0; i < nodelist.length; i += 1) {
      course = {};
      codes = [];
      x = [];
      y = [];
      course.name = nodelist[i].getElementsByTagName('CourseName')[0].textContent;
      tmp = nodelist[i].getElementsByTagName('StartPointCode')[0].textContent;
      codes.push(tmp.trim());
      controllist = nodelist[i].getElementsByTagName('CourseControl');
      for ( j = 0; j < controllist.length; j += 1) {
        tmp = controllist[j].children[1].textContent;
        codes.push(tmp.trim());
      }
      tmp = nodelist[i].getElementsByTagName('FinishPointCode')[0].textContent;
      codes.push(tmp.trim());

      course.codes = codes;
      course.x = x;
      course.y = y;
      this.xmlcourses.push(course);
    }
    $("#rg2-select-course-file").addClass('valid');
  },

  readMapJPG : function(evt) {
    var reader = new FileReader();
    var self = this;
    reader.onload = function(event) {
      self.processMap(event);
    };
    reader.readAsDataURL(evt.target.files[0]);
  },

  processMap : function(event) {
    rg2.loadNewMap(event.target.result);
    $("#rg2-select-map-file").addClass('valid');
    this.mapLoaded = true;
    var size = rg2.getMapSize();
    this.mapWidth = size.width;
    this.mapHeight = size.height;
    this.fitControlsToMap();
    rg2.redraw(false);
  },

  fitControlsToMap : function() {
    var i;
    if ((this.mapLoaded) && (this.newcontrols.controls.length > 0)) {
      // get max extent of controls
      // find bounding box for track
      var minX = this.newcontrols.controls[0].x;
      var maxX = this.newcontrols.controls[0].x;
      var minY = this.newcontrols.controls[0].y;
      var maxY = this.newcontrols.controls[0].y;

      for ( i = 1; i < this.newcontrols.controls.length; i += 1) {
        maxX = Math.max(maxX, this.newcontrols.controls[i].x);
        maxY = Math.max(maxY, this.newcontrols.controls[i].y);
        minX = Math.min(minX, this.newcontrols.controls[i].x);
        minY = Math.min(minY, this.newcontrols.controls[i].y);
      }

      var xRange = maxX - minX;
      var yRange = maxY - minY;
      for ( i = 0; i < this.newcontrols.controls.length; i += 1) {
        this.newcontrols.controls[i].x = (this.newcontrols.controls[i].x - minX) * (this.mapWidth / xRange);
        this.newcontrols.controls[i].y = this.mapHeight - ((this.newcontrols.controls[i].y - minY) * (this.mapHeight/ yRange));
        this.newcontrols.controls[i].oldX = this.newcontrols.controls[i].x;
        this.newcontrols.controls[i].oldY = this.newcontrols.controls[i].y;
      }
      this.newcontrols.displayAllControls();
    }
  },

  setClub : function(evt) {
    this.club = $("#rg2-club-name").val();
    if (this.club) {
      $("#rg2-select-club-name").addClass('valid');
    } else {
      $("#rg2-select-club-name").removeClass('valid');
    }
  },

  setEventName : function(evt) {
    this.eventName = $("#rg2-event-name").val();
    if (this.eventName) {
      $("#rg2-select-event-name").addClass('valid');
    } else {
      $("#rg2-select-event-name").removeClass('valid');
    }
  },

  setMapName : function(evt) {
    this.mapName = $("#rg2-map-name").val();
    if (this.mapName) {
      $("#rg2-select-map-name").addClass('valid');
    } else {
      $("#rg2-select-map-name").removeClass('valid');
    }
  },

  setDate : function(date) {
    this.eventDate = date;
    if (this.eventDate) {
      $("#rg2-select-event-date").addClass('valid');
    } else {
      $("#rg2-select-event-date").removeClass('valid');
    }
  },

  createEventLevelDropdown : function() {
    $("#rg2-event-level").empty();
    var dropdown = document.getElementById("rg2-event-level");
    var types = ["Local", "Regional", "National", "Training", "International"];
    var abbrev = ["L", "R", "N", "T", "I"];
    var opt;
    var i;
    for ( i = 0; i < types.length; i += 1) {
      opt = document.createElement("option");
      opt.value = abbrev[i];
      opt.text = types[i];
      dropdown.options.add(opt);
    }
    var self = this;
    $("#rg2-event-level").click(function(event) {
      self.eventLevel = $("#rg2-event-level").val();
      $("#rg2-select-event-level").addClass('valid');
    });

  },

  createCourseDropdown : function(course) {
    /*
     * Input: course name to match
     *
     * Output: html select
     */
    var i;
    var idx = this.resultCourses.indexOf(course);
    var html = "<select name='a'><option value=999";
    if (idx === -1) {
      html += " selected";
    }
    html += ">Skip this class</option>";
    for ( i = 0; i < this.resultCourses.length; i += 1) {
      html += "<option value=" + i;
      if (idx === i) {
        html += " selected";
      }
      html += ">" + this.resultCourses[i] + "</option>";
    }
    html += "</select>";
    return html;
  },

  drawControls : function() {
    if ((this.mapLoaded) && (this.newcontrols.controls.length > 0)) {
      this.newcontrols.drawControls();

      // locked point for control edit
      if (this.handleX !== null) {
        rg2.ctx.lineWidth = 2;
        rg2.ctx.strokeStyle = this.handleColor;
        rg2.ctx.fillStyle = this.handleColour;
        rg2.ctx.globalAlpha = 1.0;

        rg2.ctx.beginPath();
        rg2.ctx.arc(this.handleX, this.handleY, this.HANDLE_DOT_RADIUS, 0, 2 * Math.PI, false);
        rg2.ctx.fill();
        rg2.ctx.beginPath();
        rg2.ctx.arc(this.handleX, this.handleY, 2 * this.HANDLE_DOT_RADIUS, 0, 2 * Math.PI, false);
        rg2.ctx.stroke();
      }

    }

  },

  // based on adjustTrack from draw.js
  adjustControls : function(x1, y1, x2, y2, shiftKeyPressed, ctrlKeyPressed) {
    var i;
    var x;
    var y;
    var dx;
    var dy;
    if (this.backgroundLocked) {
      // drag track and background
      rg2.ctx.translate(x2 - x1, y2 - y1);
    } else {
      if (this.handleX !== null) {
        // scale controls
        var scaleX = (x2 - this.handleX) / (x1 - this.handleX);
        var scaleY = (y2 - this.handleY) / (y1 - this.handleY);
        // don't rotate: we are assuming controls and map are already rotated the same
        //console.log (x1, y1, x2, y2, this.handleX, this.handleY, scaleX, scaleY);
        for ( i = 0; i < this.newcontrols.controls.length; i += 1) {
          x = this.newcontrols.controls[i].oldX - this.handleX;
          y = this.newcontrols.controls[i].oldY - this.handleY;
          this.newcontrols.controls[i].x = (x * scaleX) + this.handleX;
          this.newcontrols.controls[i].y = (y * scaleY) + this.handleY;
        }
      } else {
        // drag controls
        dx = x2 - x1;
        dy = y2 - y1;
        for ( i = 0; i < this.newcontrols.controls.length; i += 1) {
          this.newcontrols.controls[i].x = this.newcontrols.controls[i].oldX + dx;
          this.newcontrols.controls[i].y = this.newcontrols.controls[i].oldY + dy;
        }
      }
    }
  },

  dragEnded : function() {
    var i;
    if ((this.mapLoaded) && (this.newcontrols.controls.length > 0)) {
      // rebaseline control locations
      for ( i = 0; i < this.newcontrols.controls.length; i += 1) {
        this.newcontrols.controls[i].oldX = this.newcontrols.controls[i].x;
        this.newcontrols.controls[i].oldY = this.newcontrols.controls[i].y;
      }
      rg2.redraw(false);
    }
  },

  mouseUp : function(x, y) {
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

  // locks or unlocks background when adjusting map
  toggleMoveAll : function(checkedState) {
    this.backgroundLocked = checkedState;
  }
};
