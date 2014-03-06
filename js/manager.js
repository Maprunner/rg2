/*global rg2:false */
/*global Controls:false */
/*global json_url:false */
/*global maps_url:false */
/*global getAngle:false */
/*global rg2WarningDialog:false */
/*global FormData:false */
/*global Proj4js:false */
/*global getLatLonDistance:false */
function User(keksi) {
  this.x = "";
  this.y = keksi;
  this.name = null;
  this.pwd = null;
}

function Map(data) {
  if (data !== undefined){
    // existing map from database
    this.mapid = data.mapid;
    this.name = data.name;
    this.georeferenced = data.georeferenced;
    this.A = data.A;
    this.B = data.B;
    this.C = data.C;
    this.D = data.D;
    this.E = data.E;
    this.F = data.F;
  } else {
    // new map to be added
    this.mapid = 0;
    this.name = "";
    this.georeferenced = false;
    this.A = 0;
    this.B = 0;
    this.C = 0;
    this.D = 0;
    this.E = 0;
    this.F = 0;
  }
}

function Manager(keksi) {
  this.DO_NOT_GEOREF = 0;
  this.UK_NATIONAL_GRID = 1;
  this.FORMAT_NORMAL = 1;
  this.FORMAT_NO_RESULTS = 2;
  this.FORMAT_SCORE = 3;
  this.loggedIn = false;
  this.user = new User(keksi);
  this.newMap = new Map();
  this.eventName = null;
  this.eventDate = null;
  this.eventLevel = null;
  this.mapID = 0;
  this.club = null;
  this.comments = null;
  this.format = this.FORMAT_NORMAL;
  this.newcontrols = new Controls();
  this.xmlcourses = [];
  this.mapLoaded = false;
  this.results = [];
  this.resultCourses = [];
  this.allocationsDisplayed = false;
  this.mapWidth = 0;
  this.mapHeight = 0;
  this.mapFile = undefined;
  this.backgroundLocked = false;
  this.handleX = null;
  this.handleY = null;
  this.maps = [];
  this.worldfileArgs = [];
  this.HANDLE_DOT_RADIUS = 10;
  this.handleColor = '#ff0000';
  $("#btn-login").button();
  var self = this;

  $("#rg2-manager-login-form").submit(function(event) {
    self.user.name = $("#rg2-user-name").val();
    self.user.pwd = $("#rg2-password").val();
    // check we have user name and password
    if ((self.user.name.length > 4) && (self.user.pwd.length > 4)) {
      self.logIn();
    } else {
      var msg = "<div>Please enter user name and password of at least five characters.</div>";
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

  encodeUser: function () {
    var data = {};
    data.x = this.alterString(this.user.name + this.user.pwd, this.user.y);
    data.y = this.user.y;
    return data;
  },
  
  alterString : function(input, pattern) {
    var i;
    var str = "";
    for (i = 0; i < input.length; i += 1) {
      str += input.charAt(i) + pattern.charAt(i);
    }
    return str;
  },
  
  logIn : function() {
    var url = json_url + '?type=login';
    var user = this.encodeUser();
    var json = JSON.stringify(user);
    var self = this;
    $.ajax({
      type : 'POST',
      dataType : 'json',
      data : json,
      url : url,
      cache : false,
      success : function(data, textStatus, jqXHR) {
        // save new cookie
        self.user.y = data.keksi;
        if (data.ok) {
          self.enableEventEdit();
        } else {
          var msg = "<div>" + data.status_msg + ". Login failed. Please try again.</div>";
          $(msg).dialog({
            title : "Login failed"
          });
        }
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
    
    this.getMaps();

    this.createEventLevelDropdown("rg2-event-level");
    $("#rg2-event-level").click(function(event) {
      self.eventLevel = $("#rg2-event-level").val();
      if (self.eventLevel !== 'X') {
        $("#rg2-select-event-level").addClass('valid');
      } else {
        $("#rg2-select-event-level").removeClass('valid');
      }
    });

    $("#rg2-map-selected").click(function(event) {
      self.mapID = parseInt($("#rg2-map-selected").val(), 10);
      if (self.mapID) {
        $("#rg2-manager-map-select").addClass('valid');
        rg2.loadNewMap(maps_url + "/" + self.mapID + '.jpg');
      } else {
        $("#rg2-manager-map-select").removeClass('valid');
        self.mapLoaded = false;
        self.mapWidth = 0;
        self.mapHeight = 0;
      }
    });
    
    rg2.createEventEditDropdown();

    $('#rg2-event-comments').focus(function() {
      // Clear comment box if user focuses on it and it still contains default text
      var text = $("#rg2-event-comments").val();
      if (text === rg2.config.DEFAULT_EVENT_COMMENT) {
        $('#rg2-event-comments').val("");
      }
    });

    $("#rg2-event-date").datepicker({
      dateFormat : 'yy-mm-dd',
      onSelect : function(date) {
        self.setDate(date);
      }
    });
    
    this.createEventLevelDropdown("rg2-event-level-edit");
    this.createGeorefDropdown();
        
    $("#rg2-event-date-edit").datepicker({
      dateFormat : 'yy-mm-dd'
    });
    
    $("#rg2-event-name").on("change", function(evt) {
      self.setEventName(evt);
    });

    $("#rg2-map-name").on("change", function(evt) {
      self.setMapName(evt);
    });
    
    $("#rg2-club-name").on("change", function(evt) {
      self.setClub(evt);
    });

    $("#rg2-load-map-file").button().change(function(evt) {
      self.readMapFile(evt);
    });

    $("#rg2-load-georef-file").button().change(function(evt) {
      self.readGeorefFile(evt);
    });

    $("#rg2-load-results-file").button().change(function(evt) {
      self.readResults(evt);
    });

    $("#rg2-load-course-file").button().change(function(evt) {
      self.readCourses(evt);
    });

    $("#btn-move-map-and-controls").click(function(evt) {
      self.toggleMoveAll(evt.target.checked);
    });
     
    $("#rg2-manager-event-select").click(function(event) {
        self.setEvent(parseInt($("#rg2-event-selected").val(), 10));
    });
                 
    $("#rg2-georef-type").click(function(event) {
        self.setGeoref($("#rg2-georef-selected").val());
    });

    $("#btn-create-event").button().click(function() {
      self.confirmCreateEvent();
    }).button("enable");
    
    $("#btn-update-event").button().click(function() {
      self.confirmUpdateEvent();
    }).button("disable");
    
    $("#btn-delete-course").button().click(function() {
      self.confirmDeleteCourse();
    }).button("disable");
    
    $("#btn-delete-route").button().click(function() {
      self.confirmDeleteRoute();
    }).button("disable");
    
    $("#btn-delete-event").button().click(function() {
      self.confirmDeleteEvent();
    }).button("disable");

    $("#btn-add-map").button().click(function() {
      self.confirmAddMap();
    }).button("disable");
    
    // TODO: hide course delete function for now: not fully implemented yet, and may not be needed...
    $("#rg2-temp-hide-course-delete").hide();
    
    // TODO hide results grouping for now: may never implement
    $("#rg2-results-grouping").hide();
    
    $("#rg2-manage-create").show();
    $("#rg2-create-tab").show();
    $("#rg2-edit-tab").show();
    $("#rg2-map-tab").show();
    $("#rg2-manage-login").hide();
    $("#rg2-login-tab").hide();
    $('#rg2-info-panel').tabs('option', 'active', rg2.config.TAB_CREATE);
  },
  
  getMaps: function() {
    var self = this;
    var i;
  $.getJSON(json_url, {
    type : "maps",
    cache : false
  }).done(function(json) {
    self.maps.length = 0;
    console.log("Maps: " + json.data.length);
    for (i = 0; i < json.data.length; i += 1) {
      self.maps.push(new Map(json.data[i]));
    }
    self.createMapDropdown();
    $("#btn-toggle-controls").show();
  }).fail(function(jqxhr, textStatus, error) {
    $('body').css('cursor', 'auto');
    var err = textStatus + ", " + error;
    console.log("Map request failed: " + err);
  });
  },
  
  setGeoref: function() {
    this.convertWorldFile(parseInt($("#rg2-georef-selected").val(), 10));
  },

  setEvent : function(kartatid) {
    if (kartatid) {
      // load details for this event
      var event = rg2.getEventInfo(kartatid);
      rg2.loadEvent(event.id);
    } else {
      // no event selected so disable everything
      $("#btn-delete-event").button("disable");
      $("#btn-update-event").button("disable");
      $("#btn-delete-route").button("disable");
      $("#btn-delete-course").button("disable");
      $("#rg2-event-name-edit").val("");
      $("#rg2-club-name-edit").val("");
      $("#rg2-event-date-edit").val("");
      $("#rg2-event-level-edit").val("");
      $("#rg2-edit-event-comments").val("");
      $("#rg2-route-selected").empty();
    }
      
  },
  
  eventListLoaded : function() {
    // called after event list has been updated
    rg2.createEventEditDropdown();
  },
  
  eventFinishedLoading : function () {
    // called once the requested event has loaded
    // copy event details to edit-form
    // you tell me why this needs parseInt but the same call above doesn't
    var kartatid = parseInt($("#rg2-event-selected").val(), 10);
    var event = rg2.getEventInfo(kartatid);
    $("#rg2-event-name-edit").empty().val(event.name);
    $("#rg2-club-name-edit").empty().val(event.club);
    $("#rg2-event-date-edit").empty().val(event.date);
    $("#rg2-event-level-edit").val(event.rawtype);
    $("#rg2-edit-event-comments").empty().val(event.comment);
    $("#btn-delete-event").button("enable");
    $("#btn-update-event").button("enable");
    $("#btn-delete-route").button("enable");
    $("#btn-delete-course").button("enable");
    this.createCourseDeleteDropdown(event.id);
    this.createRouteDeleteDropdown(event.id);
  },
  
  createMapDropdown : function(id) {
    $("#rg2-map-selected").empty();
    var dropdown = document.getElementById("rg2-map-selected");
    var i;
    var opt;
    opt = document.createElement("option");
    opt.value = 0;
    opt.text = "Select map";
    dropdown.options.add(opt);
    var len = this.maps.length - 1;
    for ( i = len; i > -1; i -= 1) {
      opt = document.createElement("option");
      opt.value = this.maps[i].mapid;
      opt.text = this.maps[i].mapid + ": " + this.maps[i].name;
      dropdown.options.add(opt);
    }
  },

  createGeorefDropdown : function(id) {
    $("#rg2-georef-selected").empty();
    var dropdown = document.getElementById("rg2-georef-selected");
    var opt;
    var i;
    var coord = ['Not georeferenced', 'GB National Grid'];
    // assumes this.UK_NATIONAL_GRID is 1
    // assumes this.DO_NOT_GEOREF = 0;
    for ( i = 0; i < coord.length; i += 1) {
      opt = document.createElement("option");
      opt.value = i;
      opt.text = coord[i];
      dropdown.options.add(opt);
    }
  },
  
  createCourseDeleteDropdown : function(id) {
    $("#rg2-course-selected").empty();
    var dropdown = document.getElementById("rg2-course-selected");
    var courses = rg2.getCoursesForEvent(id);
    var i;
    var opt;
    for ( i = 0; i < courses.length; i += 1) {
      opt = document.createElement("option");
      opt.value = courses[i].id;
      opt.text = courses[i].name;
      dropdown.options.add(opt);
    }
  },

  createRouteDeleteDropdown : function(id) {
    $("#rg2-route-selected").empty();
    var dropdown = document.getElementById("rg2-route-selected");
    var routes = rg2.getRoutesForEvent(id);
    var i;
    var opt;
    for ( i = 0; i < routes.length; i += 1) {
      opt = document.createElement("option");
      opt.value = routes[i].resultid;
      opt.text = routes[i].resultid + ": " + routes[i].name + " on " + routes[i].coursename;
      dropdown.options.add(opt);
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
      var html = "<table><thead><tr><th>Results file</th><th>Course name</th></tr></thead><tbody>";
      var i;
      for ( i = 0; i < this.xmlcourses.length; i += 1) {
        html += "<tr><td>" + this.xmlcourses[i].name + "</td><td>" + this.createCourseDropdown(this.xmlcourses[i].name) + "</td></tr>";
      }
      html += "</tbody></table>";
      $("#rg2-course-allocations").empty().append(html);
      this.allocationsDisplayed = true;
    }
  },
  
  validData : function() {
    if ((this.eventName) &&
        (this.mapID) &&
        (this.eventDate) &&
        (this.club) &&
        (this.eventLevel) &&
        (this.format) &&
//        (this.newcontrols) &&
        (this.xmlcourses)) {
      return true;
    } else {
      return false;
    }
  
  },
  
  confirmCreateEvent : function() {
    if (!this.validData()) {
      rg2WarningDialog("Data missing", "Please enter all necessary information before creating the event.");
      return;
    }
    var msg = "<div id='event-create-dialog'>Are you sure you want to create this event?</div>";
    var me = this;
    $(msg).dialog({
      title : "Confirm event creation",
      modal : true,
      dialogClass : "no-close",
      closeOnEscape : false,
      buttons : [ {
        text : "Cancel",
        click : function() {
          me.doCancelCreateEvent();
        }
      }, {
        text : "Create event",
        click : function() {
          me.doCreateEvent();
        }
      }]
    });
  },
  
  doCancelCreateEvent : function() {
    $("#event-create-dialog").dialog("destroy");
  },
  
  doCreateEvent : function() {
    $("#event-create-dialog").dialog("destroy");
    var id = $("#rg2-event-selected").val();
    var $url = json_url + "?type=createevent";
    var data = {};
    data.name = this.eventName;
    data.mapid = this.mapID;
    data.eventdate = this.eventDate;
    data.club = this.club;
    data.format = this.format;
    data.level = this.eventLevel;
    this.setControlLocations();
    this.mapResultsToCourses();
    data.courses = this.xmlcourses.slice(0);
    data.results = this.results.slice(0);
    var user = this.encodeUser();
    data.x = user.x;
    data.y = user.y;
    var json = JSON.stringify(data);
    var self = this;
    $.ajax({
        data:json,
        type:"POST",
        url:$url,
        dataType:"json",
        success:function(data, textStatus, jqXHR) {
          // save new cookie
          self.user.y = data.keksi;
          if (data.ok) {
            rg2WarningDialog("Event created", self.eventName + " has been added with id " + data.newid + ".");
          } else {
            rg2WarningDialog("Save failed", data.status_msg + ". Failed to create event. Please try again.");
          }
        },
        error:function(jqXHR, textStatus, errorThrown) {
          console.log(textStatus);
        }
        
    });
  },
  
  mapResultsToCourses: function() {
    // called when saving courses
    // generates the necessary course IDs for the results file 
    var i;
    for (i = 0; i < this.results.length; i += 1) {
      this.results[i].courseid = this.getCourseIDForCourseName(this.results[i].course);
    }
  },
  
  getCourseIDForCourseName : function(course) {
    var i;
    for (i = 0; i < this.xmlcourses.length; i += 1) {
      if (this.xmlcourses[i].name === course) {
        return this.xmlcourses[i].courseid;
      }
    }
    return 0;
  },
  
  setControlLocations: function() {
    // called when saving courses
    // reads control locations and updates course details
    var i;
    var j;
    var c;
    for (i = 0; i < this.xmlcourses.length; i += 1) {
      for (j = 0; j < this.xmlcourses[i].codes.length; j += 1) {
        c = this.getControlXY(this.xmlcourses[i].codes[j]);
        this.xmlcourses[i].x[j] = c.x;
        this.xmlcourses[i].y[j] = c.y;
      }
    }
  },
  
  getControlXY: function(code) {
    var i;
    var c = {};
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
  
  confirmUpdateEvent : function() {

    var msg = "<div id='event-update-dialog'>Are you sure you want to update this event?</div>";
    var me = this;
    $(msg).dialog({
      title : "Confirm event update",
      modal : true,
      dialogClass : "no-close",
      closeOnEscape : false,
      buttons : [{
        text : "Cancel",
        click : function() {
          me.doCancelUpdateEvent();
        }
      }, {
        text : "Update event",
        click : function() {
          me.doUpdateEvent();
        }
      }]
    });
  },
  
  doCancelUpdateEvent : function() {
    $("#event-update-dialog").dialog("destroy");
  },
  
  doUpdateEvent : function() {
    $("#event-update-dialog").dialog("destroy");
    var id = $("#rg2-event-selected").val();
    var $url = json_url + "?type=editevent&id=" + id;
    var data = {};
    data.comments = $("#rg2-edit-event-comments").val();
    data.name = $("#rg2-event-name-edit").val();
    data.type = $("#rg2-event-level-edit").val();
    data.eventdate = $("#rg2-event-date-edit").val();
    data.club = $("#rg2-club-name-edit").val();
    var user = this.encodeUser();
    data.x = user.x;
    data.y = user.y;
    var json = JSON.stringify(data);
    var self = this;
    $.ajax({
        data:json,
        type:"POST",
        url:$url,
        dataType:"json",
        success:function(data, textStatus, jqXHR) {
          // save new cookie
          self.user.y = data.keksi;
          if (data.ok) {
            rg2WarningDialog("Event updated", "Event " + id + " has been updated.");
          } else {
            rg2WarningDialog("Update failed", data.status_msg + ". Event update failed. Please try again.");
          }
        },
        error:function(jqXHR, textStatus, errorThrown) {
          console.log(textStatus);
        }
        
    });
  },
  
  confirmDeleteCourse : function() {
    var msg = "<div id='course-delete-dialog'>This course will be permanently deleted. Are you sure?</div>";
    var me = this;
    $(msg).dialog({
      title : "Confirm course delete",
      modal : true,
      dialogClass : "no-close",
      closeOnEscape : false,
      buttons : [ {
        text : "Cancel",
        click : function() {
          me.doCancelDeleteCourse();
        }
      }, {
        text : "Delete course",
        click : function() {
          me.doDeleteCourse();
        }
      }]
    });
  },
  
  doCancelDeleteCourse : function() {
    $("#course-delete-dialog").dialog("destroy");
  },
  
  doDeleteCourse : function() {
    $("#course-delete-dialog").dialog("destroy");
    var id = $("#rg2-event-selected").val();
    var routeid = $("#rg2-route-selected").val();
    var $url = json_url + "?type=deletecourse&id=" + id + "&routeid=" + routeid;
    // TODO: add course delete functionality
    /*$.ajax({
      data:"",
        type:"POST",
        url:$url,
        dataType:"json",
        success:function(data, textStatus, jqXHR) {
          console.log(data.status_msg);
        },
        error:function(jqXHR, textStatus, errorThrown) {
          console.log(textStatus);
        } 
    }); */
  },
  
  confirmDeleteRoute : function() {
    var msg = "<div id='route-delete-dialog'>This route will be permanently deleted. Are you sure?</div>";
    var me = this;
    $(msg).dialog({
      title : "Confirm route delete",
      modal : true,
      dialogClass : "no-close",
      closeOnEscape : false,
      buttons : [{
        text : "Cancel",
        click : function() {
          me.doCancelDeleteRoute();
        }
      }, {
        text : "Delete route",
        click : function() {
          me.doDeleteRoute();
        }
      }]
    });
  },
  
   doCancelDeleteRoute : function() {
    $("#route-delete-dialog").dialog("destroy");
  },
  
  doDeleteRoute : function() {
    $("#route-delete-dialog").dialog("destroy");
    var id = $("#rg2-event-selected").val();
    var routeid = $("#rg2-route-selected").val();
    var $url = json_url + "?type=deleteroute&id=" + id + "&routeid=" + routeid;
    var user = this.encodeUser();
    var json = JSON.stringify(user);
    var self = this;
    $.ajax({
        data: json,
        type:"POST",
        url:$url,
        dataType:"json",
        success:function(data, textStatus, jqXHR) {
          // save new cookie
          var msg;
          self.user.y = data.keksi;
          if (data.ok) {
            rg2WarningDialog("Route deleted", "Route " + routeid + " has been deleted.");
          } else {
            rg2WarningDialog("Delete failed", data.status_msg + ". Delete failed. Please try again.");
          }
        },
        error:function(jqXHR, textStatus, errorThrown) {
          console.log(textStatus);
        }
    });
  },
  
  confirmDeleteEvent : function() {

    var msg = "<div id='event-delete-dialog'>This event will be deleted. Are you sure?</div>";
    var me = this;
    $(msg).dialog({
      title : "Confirm event delete",
      modal : true,
      dialogClass : "no-close",
      closeOnEscape : false,
      buttons : [{
        text : "Cancel",
        click : function() {
          me.doCancelDeleteEvent();
        }
      }, {
        text : "Delete event",
        click : function() {
          me.doDeleteEvent();
        }
      }]
    });
  },
  doCancelDeleteEvent : function() {
    $("#event-delete-dialog").dialog("destroy");
  },
  
  doDeleteEvent : function() {
    $("#event-delete-dialog").dialog("destroy");
    var id = $("#rg2-event-selected").val();
    var $url = json_url + "?type=deleteevent&id=" + id;
    var user = this.encodeUser();
    var json = JSON.stringify(user);
    var self = this;
    var msg;
    $.ajax({
        data: json,
        type:"POST",
        url:$url,
        dataType:"json",
        success:function(data, textStatus, jqXHR) {
          // save new cookie
          self.user.y = data.keksi;
          if (data.ok) {
            rg2WarningDialog("Event deleted", "Event " + id + " has been deleted.");
            rg2.loadEventList();
            self.setEvent();
            $("#rg2-event-selected").empty();
          } else {
            rg2WarningDialog("Delete failed", data.status_msg + ". Event delete failed. Please try again.");
          }
        },
        error:function(jqXHR, textStatus, errorThrown) {
          console.log(textStatus);
        }
        
    });
  },
  
  readResults : function(evt) {

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

  readCourses : function(evt) {

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
      self.displayCourseAllocations();
      self.fitControlsToMap();
      rg2.redraw(false);
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
        result.name = (fields[i][FIRST_NAME_IDX] + " " + fields[i][SURNAME_IDX]).trim();
        result.dbid = fields[i][DB_IDX] + "__" + result.name;
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
      course.courseid = i + 1;
      course.x = x;
      course.y = y;
      this.xmlcourses.push(course);
    }
    $("#rg2-select-course-file").addClass('valid');
  },

  readMapFile : function(evt) {
    var reader = new FileReader();
    var self = this;
    reader.onload = function(event) {
      self.processMap(event);
    };
    this.mapFile = evt.target.files[0];
    reader.readAsDataURL(evt.target.files[0]);
  },
  
  mapLoadCallback : function() {
    //callback when map image is loaded from an existing map file
    this.mapLoaded = true;
    this.fitControlsToMap();
    rg2.redraw(false);
  },

  processMap : function(event) {
    rg2.loadNewMap(event.target.result);
    $("#rg2-select-map-file").addClass('valid');
    this.mapLoaded = true;
    this.fitControlsToMap();
    rg2.redraw(false);
    $("#btn-add-map").button("enable");
  },

  fitControlsToMap : function() {
    var i;
    if ((this.mapLoaded) && (this.newcontrols.controls.length > 0)) {
      var size = rg2.getMapSize();
      this.mapWidth = size.width;
      this.mapHeight = size.height;
      
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
      // fit within the map since this is probably needed anyway
      var scale = 1.25;
      var xRange = scale * (maxX - minX);
      var yRange = scale * (maxY - minY);
      minX *= scale;
      minY *= scale;
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
    this.newMap.name = $("#rg2-map-name").val();
    if (this.newMap.name) {
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

  createEventLevelDropdown : function(id) {
    $("#" + id).empty();
    var dropdown = document.getElementById(id);
    var types = ["Select level", "Training", "Local", "Regional", "National", "International"];
    var abbrev = ["X", "T", "L", "R", "N", "I"];
    var opt;
    var i;
    for ( i = 0; i < types.length; i += 1) {
      opt = document.createElement("option");
      opt.value = abbrev[i];
      opt.text = types[i];
      dropdown.options.add(opt);
    }

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
        rg2.ctx.lineWidth = rg2.getOverprintWidth();
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
  adjustControls : function(x1, y1, x2, y2, button, shiftKeyPressed, ctrlKeyPressed) {
    var i;
    var x;
    var y;
    var dx;
    var dy;
    if ((this.backgroundLocked) || (button === rg2.config.RIGHT_CLICK)) {
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
  },
  
  confirmAddMap : function() {

    var msg = "<div id='add-map-dialog'>Are you sure you want to add this map?</div>";
    var me = this;
    $(msg).dialog({
      title : "Confirm new map",
      modal : true,
      dialogClass : "no-close",
      closeOnEscape : false,
      buttons : [{
        text : "Cancel",
        click : function() {
          me.doCancelAddMap();
        }
      }, {
        text : "Add map",
        click : function() {
          me.doUploadMapFile();
        }
      }]
    });
  },
  
  doCancelAddMap : function() {
    $("#add-map-dialog").dialog("destroy");
  },

  doUploadMapFile : function(id) {
    $("#add-map-dialog").dialog("destroy");
    // first transfer map file to server
    var url = json_url + "?type=uploadmapfile";
    var user = this.encodeUser();
    var self = this;
    var formData = new FormData();
    formData.append(this.mapFile.name, this.mapFile);
    formData.append("name", this.mapFile.name);
    formData.append("x", user.x);
    formData.append("y", user.y);
    $.ajax({
        url: url,
        data: formData,
        type:"POST",
        mimeType:"multipart/form-data",
        processData:false,
        contentType: false,
        dataType: "json",
        success:function(data, textStatus, jqXHR) {
          // save new cookie
          self.user.y = data.keksi;
          if (data.ok) {
            self.doAddMap();
          } else {
            rg2WarningDialog("Save failed", data.status_msg + ". Failed to save map. Please try again.");
          }
        },
        error:function(jqXHR, textStatus, errorThrown) {
          console.log(textStatus);
        }

    });
  },
  
  doAddMap : function() {
    // map file uploaded OK so add new details
    var $url = json_url + "?type=addmap";
    var data = {};
    data = this.newMap;
    var user = this.encodeUser();
    data.x = user.x;
    data.y = user.y;
    var json = JSON.stringify(data);
    var self = this;
    $.ajax({
        data:json,
        type:"POST",
        url:$url,
        dataType:"json",
        success:function(data, textStatus, jqXHR) {
          // save new cookie
          self.user.y = data.keksi;
          if (data.ok) {
            rg2WarningDialog("Map added", self.newMap.name + " has been added with id " + data.newid + ".");
            // update map dropdown
            self.getMaps();
          } else {
            rg2WarningDialog("Save failed", data.status_msg + ". Failed to save map. Please try again.");
          }
        },
        error:function(jqXHR, textStatus, errorThrown) {
          console.log(textStatus);
        }
        
    });
  },
  
  readGeorefFile : function (evt) {

  var reader = new FileReader();
  
  var self = this;
  try {
    reader.readAsText(evt.target.files[0]);
  }
  catch(err) {
    rg2WarningDialog("File read error", "Failed to open selected file.");
    return;
  }

  reader.onerror = function(evt) {
    switch(evt.target.error.code) {
      case evt.target.error.NOT_FOUND_ERR:
        console.log('File not found');
        break;
      case evt.target.error.NOT_READABLE_ERR:
        console.log('File not readable');
        break;
      default:
        console.log('An error occurred reading the file.');
    }
  };

  reader.onload = function(evt) {
    // see http://en.wikipedia.org/wiki/World_file
    // read JGW world file
    var txt = evt.target.result;
    var args = txt.split(/[\r\n]+/g);
    var i;
    for (i = 0; i < 6; i +=1) {
      self.worldfileArgs[i] = parseFloat(args[i]);
    }
    self.convertWorldFile(self.UK_NATIONAL_GRID);
  };
  },
  
  convertWorldFile : function(type) {
    var size = rg2.getMapSize();
    this.mapWidth = size.width;
    this.mapHeight = size.height;
    if ((this.worldfileArgs.length === 0) || (this.mapWidth === 0)) {
      // no map or world file loaded
      return;
    }
    // UK National Grid
    Proj4js.defs["EPSG:27700"] = "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs ";
    var source;
    
    switch (type) {
    case this.UK_NATIONAL_GRID:
      source = new Proj4js.Proj("EPSG:27700");
      break;
    case this.DO_NOT_GEOREF:
      this.clearGeorefs();
      return;
    default:
      return;
    }
    // WGS84 as used by GPS
    var dest = new Proj4js.Proj("EPSG:4326");

    var xScale = this.worldfileArgs[0];
    var ySkew = this.worldfileArgs[1];
    var xSkew = this.worldfileArgs[2];
    var yScale = this.worldfileArgs[3];

    var xos = [];
    var yos = [];
    var xpx = [];
    var ypx = [];

    // x0, y0 is top left
    xos[0] = this.worldfileArgs[4];
    yos[0] = this.worldfileArgs[5];
    xpx[0] = 0;
    ypx[0] = 0;

    // x1, y1 is bottom right
    xpx[1] = this.mapWidth;
    ypx[1] = this.mapHeight;
    xos[1] = (xScale * xpx[1]) + (xSkew * ypx[1]) + xos[0];
    yos[1] = (yScale * ypx[1]) + (ySkew * xpx[1]) + yos[0];

    // x2, y2 is top right
    xpx[2] = this.mapWidth;
    ypx[2] = 0;
    xos[2] = (xScale * xpx[2]) + (xSkew * ypx[2]) + xos[0];
    yos[2] = (yScale * ypx[2]) + (ySkew * xpx[2]) + yos[0];

    // x3, y3 is bottom left
    xpx[3] = 0;
    ypx[3] = this.mapHeight;
    xos[3] = (xScale * xpx[3]) + (xSkew * ypx[3]) + xos[0];
    yos[3] = (yScale * ypx[3]) + (ySkew * xpx[3]) + yos[0];

    // translate source to WGS84 (as in GPS file)
    var i;
    var p = [];
    var pt;
    for (i = 0; i < 4; i += 1) {
      pt = {};
      pt.x = parseInt(xos[i] + 0.5, 10);
      pt.y = parseInt(yos[i] + 0.5, 10);
      p.push(pt);
      Proj4js.transform(source, dest, p[i]);
      //console.log(p[i].x, p[i].y);
    }

    var hypot = getLatLonDistance(p[0].y, p[0].x, p[2].y, p[2].x);
    var adj = getLatLonDistance(p[0].y, p[0].x, p[0].y, p[2].x);
    var angle1 = Math.acos(adj / hypot);

    var hypot2 = getLatLonDistance(p[2].y, p[2].x, p[1].y, p[1].x);
    var adj2 = getLatLonDistance(p[2].y, p[2].x, p[1].y, p[2].x);
    var angle2 = Math.acos(adj2 / hypot2);

    var angle = (angle1 + angle2) / 2;
    //console.log(hypot, hypot2, adj, adj2, angle1, angle2, angle);
    var pixResX = (p[2].x - p[0].x) / this.mapWidth;
    var pixResY = (p[2].y - p[1].y) / this.mapHeight;

    this.newMap.A = pixResX * Math.cos(angle);
    this.newMap.D = pixResY * Math.sin(angle);
    this.newMap.B = pixResX * Math.sin(angle);
    this.newMap.E = -1 * pixResY * Math.cos(angle);
    this.newMap.C = p[0].x;
    this.newMap.F = p[0].y;
    $("#georef-A").empty().text("A: " + this.newMap.A);
    $("#georef-B").empty().text("B: " + this.newMap.B);
    $("#georef-C").empty().text("C: " + this.newMap.C);
    $("#georef-D").empty().text("D: " + this.newMap.D);
    $("#georef-E").empty().text("E: " + this.newMap.E);
    $("#georef-F").empty().text("F: " + this.newMap.F);
    $("#rg2-georef-selected").val(type);
    this.newMap.georeferenced = true;
  },
  
  clearGeorefs : function() {
    this.newMap.A = 0;
    this.newMap.D = 0;
    this.newMap.B = 0;
    this.newMap.E = 0;
    this.newMap.C = 0;
    this.newMap.F = 0;
    $("#georef-A").empty().text("A: 0");
    $("#georef-B").empty().text("B: 0");
    $("#georef-C").empty().text("C: 0");
    $("#georef-D").empty().text("D: 0");
    $("#georef-E").empty().text("E: 0");
    $("#georef-F").empty().text("F: 0");
    this.newMap.georeferenced = false;
  }
};

