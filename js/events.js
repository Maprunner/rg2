/*global rg2:false */
(function () {
  function Events() {
    this.events = [];
    this.activeEventID = null;
  }


  Events.prototype = {
    Constructor : Events,

    deleteAllEvents : function () {
      this.events.length = 0;
      this.activeEventID = null;
    },

    addEvent : function (eventObject) {
      this.events.push(eventObject);
    },

    getEventInfo : function (id) {
      var realid = this.getEventIDForKartatID(id);
      var info = this.events[realid];
      info.id = realid;
      info.controls = rg2.controls.getControlCount();
      return info;
    },

    getKartatEventID : function () {
      return this.events[this.activeEventID].kartatid;
    },

    getActiveMapID : function () {
      return this.events[this.activeEventID].mapid;
    },

    getMapFileName : function () {
      return this.events[this.activeEventID].mapfilename;
    },

    setActiveEventID : function (eventid) {
      this.activeEventID = eventid;
    },

    getActiveEventID : function () {
      return this.activeEventID;
    },

    getEventIDForKartatID : function (kartatID) {
      var i;
      for (i = 0; i < this.events.length; i += 1) {
        if (this.events[i].kartatid === kartatID) {
          return i;
        }
      }
      return undefined;
    },

    getActiveEventDate : function () {
      if (this.activeEventID !== null) {
        return this.events[this.activeEventID].date;
      }
      return "";
    },

    getActiveEventName : function () {
      if (this.activeEventID !== null) {
        return this.events[this.activeEventID].name;
      }
      return "Routegadget 2";
    },

    createEventEditDropdown : function () {
      $("#rg2-event-selected").empty();
      var dropdown = document.getElementById("rg2-event-selected");
      var i;
      var len;
      var opt = document.createElement("option");
      opt.value = null;
      opt.text = 'No event selected';
      dropdown.options.add(opt);
      len = this.events.length - 1;
      for (i = len; i > -1; i -= 1) {
        opt = document.createElement("option");
        opt.value = this.events[i].kartatid;
        opt.text = this.events[i].kartatid + ": " + this.events[i].date + ": " + this.events[i].name;
        dropdown.options.add(opt);
      }
    },

    isScoreEvent : function () {
      return (this.events[this.activeEventID].format === rg2.config.SCORE_EVENT);
    },

    hasResults : function () {
      if (this.activeEventID !== null) {
        return (this.events[this.activeEventID].format !== rg2.config.EVENT_WITHOUT_RESULTS);
      }
      return true;
    },

    mapIsGeoreferenced : function () {
      if (this.activeEventID === null) {
        return false;
      }
      return this.events[this.activeEventID].georeferenced;
    },

    getMetresPerPixel : function () {
      var lat1;
      var lat2;
      var lon1;
      var lon2;
      var size;
      var pixels;
      var w;
      if (this.activeEventID === null) {
        // 1 is as harmless as anything else in this serror situation
        return 1;
      }
      size = rg2.getMapSize();
      pixels = rg2.getDistanceBetweenPoints(0, 0, size.width, size.height);
      w = this.events[this.activeEventID].worldFile;
      lon1 = w.C;
      lat1 = w.F;
      lon2 = (w.A * size.width) + (w.B * size.height) + w.C;
      lat2 = (w.D * size.width) + (w.E * size.height) + w.F;
      return (rg2.getLatLonDistance(lat1, lon1, lat2, lon2)) / pixels;
    },

    getWorldFile : function () {
      return this.events[this.activeEventID].worldFile;
    },

    formatEventsAsMenu : function () {
      var title;
      var html = '';
      var i;
      for (i = this.events.length - 1; i >= 0; i -= 1) {
        title = rg2.t(this.events[i].type) + ": " + this.events[i].date;
        if (this.events[i].georeferenced) {
          title += ": " + rg2.t("Map is georeferenced");
        }

        if (this.events[i].comment !== "") {
          title += ": " + this.events[i].comment;
        }
        html += '<li title="' + title + '" id=' + i + "><a href='#" + this.events[i].kartatid + "'>";
        if (this.events[i].comment !== "") {
          html += "<i class='fa fa-info-circle event-info-icon' id='info-" + i + "'></i>";
        }
        if (this.events[i].georeferenced) {
          html += "<i class='fa fa-globe event-info-icon' id='info-" + i + "'>&nbsp</i>";
        }
        html += this.events[i].date + ": " + this.events[i].name + "</a></li>";
      }
      return html;

    }
  };
  rg2.Events = Events;
}());
