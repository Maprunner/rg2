
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

    getEventInfo : function (kartatid) {
      var realid, info;
      kartatid = kartatid || this.getKartatEventID();
      realid = this.getEventIDForKartatID(kartatid);
      info = this.events[realid];
      info.id = realid;
      info.controls = rg2.controls.getControlCount();
      info.exclude = rg2.courses.getExcludedText();
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
      if (eventid === null) {
        this.activeEventID = null;
      } else {
        this.activeEventID = parseInt(eventid, 10);
      }
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

    getEventEditDropdown : function (dropdown) {
      var i;
      dropdown.options.add(rg2.utils.generateOption(null, 'No event selected'));
      for (i = (this.events.length - 1); i > -1; i -= 1) {
        dropdown.options.add(rg2.utils.generateOption(this.events[i].kartatid, this.events[i].kartatid + ": " + this.events[i].date + ": " + rg2.he.decode(this.events[i].name)));
      }
      return dropdown;
    },

    isScoreEvent : function () {
      if (this.activeEventID !== null) {
        return ((this.events[this.activeEventID].format === rg2.config.FORMAT_SCORE_EVENT) || 
          (this.events[this.activeEventID].format === rg2.config.FORMAT_SCORE_EVENT_NO_RESULTS));
      }
      return false;
    },

    hasResults : function () {
      if (this.activeEventID !== null) {
        return ((this.events[this.activeEventID].format === rg2.config.FORMAT_NORMAL) ||
          (this.events[this.activeEventID].format === rg2.config.FORMAT_SCORE_EVENT));
      }
      return true;
    },

    mapIsGeoreferenced : function () {
      if (this.activeEventID === null) {
        return false;
      }
      return this.events[this.activeEventID].worldfile.valid;
    },

    eventIsLocked : function () {
      if (this.activeEventID === null) {
        return false;
      }
      return this.events[this.activeEventID].locked;
    },

    getLengthUnits : function () {
      if ((this.activeEventID === null) || (!this.mapIsGeoreferenced())) {
        return "px";
      }
      return "m";
    },

    getMetresPerPixel : function () {
      var lat1, lat2, lon1, lon2, size, pixels, w;
      if ((this.activeEventID === null) || (!this.mapIsGeoreferenced())) {
        return undefined;
      }
      size = rg2.getMapSize();
      pixels = rg2.utils.getDistanceBetweenPoints(0, 0, size.width, size.height);
      w = this.events[this.activeEventID].worldfile;
      lon1 = w.C;
      lat1 = w.F;
      lon2 = (w.A * size.width) + (w.B * size.height) + w.C;
      lat2 = (w.D * size.width) + (w.E * size.height) + w.F;
      return rg2.utils.getLatLonDistance(lat1, lon1, lat2, lon2) / pixels;
    },

    getWorldFile : function () {
      return this.events[this.activeEventID].worldfile;
    },

    formatEventsAsMenu : function () {
      var title, html, i;
      html = '';
      for (i = this.events.length - 1; i >= 0; i -= 1) {
        title = rg2.t(this.events[i].type) + ": " + this.events[i].date;
        if (this.events[i].worldfile.valid) {
          title += ": " + rg2.t("Map is georeferenced");
        }

        if (this.events[i].comment !== "") {
          title += ": " + this.events[i].comment;
        }
        html += '<li title="' + title + '" id=event-' + i + "><a href='#" + this.events[i].kartatid + "'>";
        if (this.events[i].comment !== "") {
          html += "<i class='fa fa-info-circle event-info-icon' id='info-" + i + "'></i>";
        }
        if (this.events[i].worldfile.valid) {
          html += "<i class='fa fa-globe-americas event-info-icon' id='info-" + i + "'>&nbsp</i>";
        }
        if (this.events[i].locked) {
          html += "<i class='fa fa-lock event-info-icon' id='info-" + i + "'>&nbsp</i>";
        }
        html += this.events[i].date + ": " + this.events[i].name + "</a></li>";
      }
      return html;

    },

    mapIDIsInUse : function (mapID) {
      for (let i = 0; i < this.events.length; i += 1) {
        if (this.events[i].mapid === mapID) {
          return true;
        }
      }
      return false;
    },
  };
  rg2.Events = Events;
}());
