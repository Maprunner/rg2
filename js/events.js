function Events() {
	this.events = [];
	this.activeEventID = null;
}

Events.prototype = {
	Constructor : Events,

	addEvent : function(eventObject) {
		this.events.push(eventObject);
	},

	getKartatEventID : function() {
		return this.events[this.activeEventID].kartatid;
	},

	getActiveMapID : function() {
		return this.events[this.activeEventID].mapid;
	},

	setActiveEventID : function(eventid) {
		this.activeEventID = eventid;
	},

	getActiveEventID : function() {
		return this.activeEventID;
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
			return "Routegadget 2.0";
		}
	},

	createEventEditDropdown : function() {
		$("#rg2-manager-event-select").empty();
		var dropdown = document.getElementById("rg2-manager-event-select");
		var i;
		for (i = 0; i < this.events.length; i += 1) {
			var opt = document.createElement("option");
			opt.value = this.events[i].kartatid;
			opt.text = this.events[i].date + ": " + this.events[i].name;
			dropdown.options.add(opt);
		}
	},

	isScoreEvent : function() {
		return (this.events[this.activeEventID].format === rg2.config.SCORE_EVENT);
	},

  isValidEventID : function (eventid) {
    if ((this.events.length >= eventid) && (eventid > 0)) {
        return true;
    } else {
      return false;
    } 
  },

	mapIsGeoreferenced : function() {
		return this.events[this.activeEventID].georeferenced;
	},

	getWorldFile : function() {
		return this.events[this.activeEventID].worldFile;
	},

	formatEventsAsMenu : function() {
		var title;
		var html = '';
		var i; 
		for (i = this.events.length - 1; i >= 0; i--) {
			if (this.events[i].comment !== "") {
				title = this.events[i].type + " event on " + this.events[i].date + ": " + this.events[i].comment;
			} else {
				title = this.events[i].type + " event on " + this.events[i].date;
			}
			html += "<li title='" + title + "' id=" + i + "><a href='#" + i + "'>";
			if (this.events[i].comment !== "") {
				html += "<i class='fa fa-info-circle event-info-icon' id='info-" + i + "'></i>";
			}
			html += this.events[i].name + "</a></li>";
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
	switch(data.type) {
		case "I":
			this.type = "International";
			break;
		case "N":
			this.type = "National";
			break;
		case "R":
			this.type = "Regional";
			break;
		case "L":
			this.type = "Local";
			break;
		case "T":
			this.type = "Training";
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