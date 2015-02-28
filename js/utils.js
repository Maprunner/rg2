/*global rg2:false */
(function () {

  function Utils() {
    // don't need to do anything: just keep jsLint happy
    return true;
  }

  Utils.prototype = {

    Constructor : Utils,

    rotatePoint : function (x, y, angle) {
      // rotation matrix: see http://en.wikipedia.org/wiki/Rotation_matrix
      var pt = {};
      pt.x = (Math.cos(angle) * x) - (Math.sin(angle) * y);
      pt.y = (Math.sin(angle) * x) + (Math.cos(angle) * y);
      return pt;
    },

    getDistanceBetweenPoints : function (x1, y1, x2, y2) {
      // Pythagoras
      return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));
    },

    getAngle : function (x1, y1, x2, y2) {
      var angle = Math.atan2((y2 - y1), (x2 - x1));
      if (angle < 0) {
        angle = angle + (2 * Math.PI);
      }
      return angle;
    },

    getLatLonDistance : function (lat1, lon1, lat2, lon2) {
      // Haversine formula (http://www.codecodex.com/wiki/Calculate_distance_between_two_points_on_a_globe)
      var dLat, dLon, a;
      dLat = (lat2 - lat1).toRad();
      dLon = (lon2 - lon1).toRad();
      a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      // multiply by IUUG earth mean radius (http://en.wikipedia.org/wiki/Earth_radius) in metres
      return 6371009 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },

    // converts MM:SS or HH:MM:SS to seconds based on number of :
    getSecsFromHHMMSS : function (time) {
      var bits, secs;
      if (!time) {
        return 0;
      }
      secs = 0;
      bits = time.split(":");
      if (bits.length === 2) {
        secs = (parseInt(bits[0], 10) * 60) + parseInt(bits[1], 10);
      } else {
        if (bits.length === 3) {
          secs = (parseInt(bits[0], 10) * 3600) + (parseInt(bits[1], 10) * 60) + parseInt(bits[2], 10);
        }
      }
      if (isNaN(secs)) {
        return 0;
      }
      return secs;
    },

    getSecsFromHHMM : function (time) {
      var bits, secs;
      if (!time) {
        return 0;
      }
      secs = 0;
      bits = time.split(":");
      secs = (parseInt(bits[0], 10) * 3600) + (parseInt(bits[1], 10) * 60);
      if (isNaN(secs)) {
        return 0;
      }
      return secs;
    },

    // converts seconds to MM:SS
    formatSecsAsMMSS : function (secs) {
      var formattedtime, minutes, seconds;
      minutes = Math.floor(secs / 60);
      formattedtime = minutes;
      seconds = secs - (minutes * 60);
      if (seconds < 10) {
        formattedtime += ":0" + seconds;
      } else {
        formattedtime += ":" + seconds;
      }
      return formattedtime;
    },


    // returns seconds as hh:mm:ss
    formatSecsAsHHMMSS : function (time) {
      var formattedtime, hours;
      hours = Math.floor(time / 3600);
      if (hours < 10) {
        formattedtime = "0" + hours + ":";
      } else {
        formattedtime = hours + ":";
      }
      time = time - (hours * 3600);
      formattedtime += this.formatSecsAsMMSS(time);
      return formattedtime;
    },

    showWarningDialog : function (title, text) {
      var msg = '<div id=rg2-warning-dialog>' + text + '</div>';
      $(msg).dialog({
        title : title,
        dialogClass : "rg2-warning-dialog",
        close : function () {
          $('#rg2-warning-dialog').dialog('destroy').remove();
        }
      });
    },

    generateOption : function (value, text, selected) {
      var opt;
      opt = document.createElement("option");
      opt.value = value;
      opt.text = text;
      if (selected) {
        opt.selected = true;
      }
      return opt;
    }
  };

  Number.prototype.toRad = function () {
    return this * Math.PI / 180;
  };

  function Colours() {
    // used to generate track colours: add extra colours as necessary
    this.colours = ["#ff0000", "#ff8000", "#ff00ff", "#ff0080", "#008080", "#008000", "#0080ff", "#0000ff", "#8000ff", "#808080"];
    //this.colours = ["#ff0000", "#ff8000",  "#ff00ff", "#ff0080", "#008080", "#008000", "#00ff00", "#0080ff", "#0000ff", "#8000ff", "#00ffff", "#808080"];

    this.colourIndex = 0;
  }

  Colours.prototype = {
    Constructor : Colours,

    getNextColour : function () {
      this.colourIndex = (this.colourIndex + 1) % this.colours.length;
      return this.colours[this.colourIndex];
    }
  };

  function User(keksi) {
    this.x = "";
    this.y = keksi;
    this.name = null;
    this.pwd = null;
  }

  function RouteData() {
    this.courseid = null;
    this.coursename = null;
    this.resultid = null;
    this.isScoreCourse = false;
    this.eventid = null;
    this.name = null;
    this.comments = null;
    this.x = [];
    this.y = [];
    this.controlx = [];
    this.controly = [];
    this.time = [];
    this.startsecs = 0;
    this.totaltime = 0;
  }

  function RequestedHash() {
    this.id = 0;
    this.courses = [];
    this.routes = [];
  }

  RequestedHash.prototype = {
    Constructor : RequestedHash,

    parseHash : function (hash) {
      var fields, i;
      // input looks like #id&course=a,b,c&result=x,y,z
      fields = hash.split('&');
      for (i = 0; i < fields.length; i += 1) {
        fields[i] = fields[i].toLowerCase();
        if (fields[i].search('#') !== -1) {
          this.id = parseInt(fields[i].replace("#", ""), 10);
        }
        if (fields[i].search('course=') !== -1) {
          this.courses = fields[i].replace("course=", "").split(',');
        }
        if (fields[i].search('route=') !== -1) {
          this.routes = fields[i].replace("route=", "").split(',');
        }
      }
      // convert to integers: NaNs sort themselves out on display so don't check here
      this.courses = this.courses.map(Number);
      this.routes = this.routes.map(Number);

      if (isNaN(this.id)) {
        this.id = 0;
        this.courses.length = 0;
        this.routes.length = 0;
      }
    },

    getRoutes : function () {
      return this.routes;
    },

    getCourses : function () {
      return this.courses;
    },

    getID : function () {
      return this.id;
    },

    getTab : function () {
      if (this.routes.length > 0) {
        return rg2.config.TAB_RESULTS;
      }
      return rg2.config.TAB_COURSES;
    },

    setCourses : function () {
      this.courses = rg2.courses.getCoursesOnDisplay();
      window.history.pushState('', '', this.getHash());
    },

    setRoutes : function () {
      this.routes = rg2.results.getTracksOnDisplay();
      window.history.pushState('', '', this.getHash());
    },

    setNewEvent : function (id) {
      this.id = id;
      this.courses.length = 0;
      this.routes.length = 0;
      window.history.pushState('', '', this.getHash());
    },

    getHash : function () {
      var hash;
      if (this.id === 0) {
        return '#0';
      }
      hash = '#' + this.id;
      hash += this.extractItems(this.courses, "&course=");
      hash += this.extractItems(this.routes, "&route=");
      return hash;
    },

    extractItems : function (items, text) {
      var i, extrahash;
      extrahash = "";
      if (items.length > 0) {
        extrahash += text;
        for (i = 0; i < items.length; i += 1) {
          if (i > 0) {
            extrahash += ',';
          }
          extrahash += items[i];
        }
      }
      return extrahash;
    }
  };
  rg2.RouteData = RouteData;
  rg2.RequestedHash = RequestedHash;
  rg2.Utils = Utils;
  rg2.Colours = Colours;
  rg2.User = User;
}());