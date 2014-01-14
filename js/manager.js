function User() {
  this.name = null;
  this.pwd = null;
}

function Manager() {
  this.loggedIn = false;
  this.user = new User();
  this.eventName;
  this.mapName;
  this.eventDate;
  this.eventLevel;
  this.club;
  this.comments;
  this.newcontrols = new Controls();
  this.xmlcourses = [];
  this.mapLoaded = false;
  
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
      dateFormat: 'dd/mm/yy',
      onSelect: function(date) {
         self.setDate(date);
      }
    });

    $("#rg2-event-name").on( "change", function(evt) {
         self.setEventName(evt);
    });

    $("#rg2-club-name").on( "change", function(evt) {
         self.setClub(evt);
    });
    
    $("#rg2-map-name").on( "change", function(evt) {
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
  
  doContinue: function() {
    if ((this.eventName) && (this.mapName) && (this.eventDate) && (this.club) && (this.eventLevel) && (this.mapLoaded) && (this.newcontrols) && (this.xmlcourses)) {
      // align controls
    
      // allocate courses  
    } else {
      alert("Data entry not complete");
    }
  },
  
  readResultsCSV : function(evt) {

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
    reader.onload = function(evt) {
      var csv = evt.target.result;
      var rows = evt.target.result.split(/[\r\n|\n]+/);
      var i;
      var res = {};
      for (i = 0; i < rows.length; i += 1) {
        res[i] = rows[i].split(";");
      }
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
    self = this;
    reader.onload = function(evt) {
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
      self.extractControls(nodelist);
      // extract all normal controls
      nodelist = xml.getElementsByTagName('Control');
      self.extractControls(nodelist);
      // extract all finish controls
      nodelist = xml.getElementsByTagName('FinishPoint');
      self.extractControls(nodelist);
      
      // extract all courses
      nodelist = xml.getElementsByTagName('Course');
      self.extractCourses(nodelist);      
    };

    reader.readAsText(evt.target.files[0]);
  },

  extractControls : function (nodelist) {
    var i;
    var x;
    var y;
    var code;
    for ( i = 0; i < nodelist.length; i += 1) {
      code =  nodelist[i].children[0].textContent;
      x =  nodelist[i].children[1].getAttribute('x');
      y =  nodelist[i].children[1].getAttribute('y');
      this.newcontrols.addControl(code.trim(), x, y);
    }  
  },
  
  extractCourses : function (nodelist) {
    var i;
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
      course.name =  nodelist[i].getElementsByTagName('CourseName').textContent;
      tmp = nodelist[i].getElementsByTagName('StartPointCode')[0].textContent;
      codes.push(tmp.trim());
      controllist = nodelist[i].getElementsByTagName('CourseControl');
      for (j = 0; j < controllist.length; j += 1) {
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
      self = this;
      reader.onload = function(event) {
        rg2.loadNewMap(event.target.result);
        $("#rg2-select-map-file").addClass('valid');
        self.mapLoaded = true;
      };
      reader.readAsDataURL(evt.target.files[0]);
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
    var types = ["National", "Regional", "Local", "Training", "International"];
    var abbrev = ["N", "R", "L", "T", "I"]
    var opt;
    var i;
    for (i = 0; i < types.length; i += 1) {
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
    
  }

};
