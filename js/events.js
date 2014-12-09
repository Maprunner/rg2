/*global rg2:false */
function Events() {
	this.events = [];
	this.activeEventID = null;
}

Events.prototype = {
	Constructor : Events,

  deleteAllEvents: function() {
    this.events.length = 0;
    this.activeEventID = null;
  },
  
	addEvent : function(eventObject) {
		this.events.push(eventObject);
	},

	getEventInfo : function(id) {
    var realid = this.getEventIDForKartatID(id);
    var info = this.events[realid];
    info.id = realid;
    return info;
	},
	
	getKartatEventID : function() {
		return this.events[this.activeEventID].kartatid;
	},

	getActiveMapID : function() {
		return this.events[this.activeEventID].mapid;
	},

	getMapFileName : function() {
		return this.events[this.activeEventID].mapfilename;
	},
	
	setActiveEventID : function(eventid) {
		this.activeEventID = eventid;
	},

	getActiveEventID : function() {
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

	getActiveEventDate : function() {
		if (this.activeEventID !== null) {
			return this.events[this.activeEventID].date;
		} else {
			return "";
		}
	},

	getActiveEventName : function() {
		if (this.activeEventID !== null) {
			return this.events[this.activeEventID].name;
		} else {
			return "Routegadget 2";
		}
	},

	createEventEditDropdown : function() {
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

	isScoreEvent : function() {
		return (this.events[this.activeEventID].format === rg2.config.SCORE_EVENT);
	},
	
	hasResults: function () {
    if (this.activeEventID !== null) {
      return (this.events[this.activeEventID].format !== rg2.config.EVENT_WITHOUT_RESULTS);
    } else {
      return true;
    }
	},

	mapIsGeoreferenced : function() {
		if (this.activeEventID === null) {
      return false;
		} else {
      return this.events[this.activeEventID].georeferenced;
		}
	},

	getWorldFile : function() {
		return this.events[this.activeEventID].worldFile;
	},

	formatEventsAsMenu : function() {
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

function Event(data) {
	this.kartatid = parseInt(data.id, 10);
	this.mapid = data.mapid;
	this.format = parseInt(data.format, 10);
	this.name = data.name;
	this.date = data.date;
	this.club = data.club;
	if (data.suffix === undefined) {
		this.mapfilename = this.mapid + '.' + 'jpg';
	} else {
		this.mapfilename = this.mapid + '.' + data.suffix;
	}
	this.worldFile = [];
	if ( typeof (data.A) === 'undefined') {
		this.georeferenced = false;
	} else {
		this.georeferenced = true;
		this.worldFile.A = data.A;
		this.worldFile.B = data.B;
		this.worldFile.C = data.C;
		this.worldFile.D = data.D;
		this.worldFile.E = data.E;
		this.worldFile.F = data.F;
	}
	this.rawtype = data.type;
	switch(data.type) {
		case "I":
			this.type = "International event";
			break;
		case "N":
			this.type = "National event";
			break;
		case "R":
			this.type = "Regional event";
			break;
		case "L":
			this.type = "Local event";
			break;
		case "T":
			this.type = "Training event";
			break;
		default:
			this.type = "Unknown";
			break;
	}
	this.comment = data.comment;
	this.courses = 0;

}

Event.prototype = {
	Constructor : Event
};