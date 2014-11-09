/*global rg2:false */
/*global rg2Config:false */
/*global Controls:false */
/*global FormData:false */
/*global Proj4js:false */
function User(keksi) {
	this.x = "";
	this.y = keksi;
	this.name = null;
	this.pwd = null;
}

function Worldfile(a, b, c, d, e, f) {
	// see http://en.wikipedia.org/wiki/World_file
	this.A = parseFloat(a);
	this.B = parseFloat(b);
	this.C = parseFloat(c);
	this.D = parseFloat(d);
	this.E = parseFloat(e);
	this.F = parseFloat(f);
	if ((a !== 0) && (b !== 0) && (c !== 0) && (d !== 0) && (e !== 0) && (f !== 0)) {
		this.valid = true;
		// helps make later calculations easier
		this.AEDB = (a * e) - (d * b);
		this.xCorrection = (b * f) - (e * c);
		this.yCorrection = (d * c) - (a * f);
	} else {
		this.valid = false;
		this.AEDB = 0;
		this.xCorrection = 0;
		this.yCorrection = 0;
	}
}

Worldfile.prototype = {

	Constructor : Worldfile,

	// use worldfile to generate X value
	getX : function(x, y) {
		return Math.round(((this.E * x) - (this.B * y) + this.xCorrection) / this.AEDB);
	},

  // use worldfile to generate y value
	getY : function(x, y) {
		return Math.round(((-1 * this.D * x) + (this.A * y) + this.yCorrection) / this.AEDB);
	}
};

function Georef(description, name, params) {
	this.description = description;
	this.name = name;
	this.params = params;
}

function Map(data) {
	if (data !== undefined) {
		// existing map from database
		this.mapid = data.mapid;
		this.name = data.name;
		// worldfile for GPS to map image conversion (for GPS files)
		this.worldfile = new Worldfile(data.A, data.B, data.C, data.D, data.E, data.F);
		// worldfile for local co-ords to map image conversion (for georeferenced courses)
		this.localworldfile = new Worldfile(data.localA, data.localB, data.localC, data.localD, data.localE, data.localF);
		if (data.mapfilename === undefined) {
			this.mapfilename = this.mapid + '.' + 'jpg';
		} else {
			this.mapfilename = data.mapfilename;
		}

	} else {
		// new map to be added
		this.mapid = 0;
		this.name = "";
		this.worldfile = new Worldfile(0, 0, 0, 0, 0, 0);
		this.localworldfile = new Worldfile(0, 0, 0, 0, 0, 0);
	}
	this.xpx = [];
	this.ypx = [];
	this.lat = [];
	this.lon = [];
}

function Manager(keksi) {
	this.DO_NOT_SAVE_COURSE = 9999;
	this.INVALID_MAP_ID = 9999;
	this.FORMAT_NORMAL = 1;
	this.FORMAT_NO_RESULTS = 2;
	this.FORMAT_SCORE_EVENT = 3;
	this.loggedIn = false;
	this.user = new User(keksi);
	this.newMap = new Map();
	this.eventName = null;
	this.eventDate = null;
	this.eventLevel = null;
	this.mapIndex = this.INVALID_MAP_ID;
	this.club = null;
	this.comments = null;
	this.format = this.FORMAT_NORMAL;
	this.newcontrols = new Controls();
	this.courses = [];
	this.mapLoaded = false;
	this.coursesGeoreferenced = false;
	this.drawingCourses = false;
	this.drawnCourse = {};
	this.results = [];
	this.resultCourses = [];
	this.mapWidth = 0;
	this.mapHeight = 0;
	this.mapFile = undefined;
	this.resultsFileFormat = "";
	this.backgroundLocked = false;
	this.handleX = null;
	this.handleY = null;
	this.maps = [];
	this.localworldfile = new Worldfile(0, 0, 0, 0, 0, 0);
	this.HANDLE_DOT_RADIUS = 10;
	this.handleColor = '#ff0000';
	$("#btn-login").button();

	this.georefsystems = [];
	this.DO_NOT_GEOREF = "none";
	this.georefsystems.push(new Georef("Not georeferenced", this.DO_NOT_GEOREF, ""));
	this.georefsystems.push(new Georef("GB National Grid", "EPSG:27700", "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs"));
	this.georefsystems.push(new Georef("Google EPSG:900913", "EPSG:900913", "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs"));
	if ( typeof rg2Config.epsg_code !== 'undefined') {
		this.georefsystems.push(new Georef(rg2Config.epsg_code, rg2Config.epsg_code.replace(" ", ""), rg2Config.epsg_params));
		this.defaultGeorefVal = rg2Config.epsg_code.replace(" ", "");
	} else {
		this.defaultGeorefVal = "EPSG:27700";
	}

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

	encodeUser : function() {
		var data = {};
		data.x = this.alterString(this.user.name + this.user.pwd, this.user.y);
		data.y = this.user.y;
		return data;
	},

	alterString : function(input, pattern) {
		var i;
		var str = "";
		for ( i = 0; i < input.length; i += 1) {
			str += input.charAt(i) + pattern.charAt(i);
		}
		return str;
	},

	logIn : function() {
		var url = rg2Config.json_url + '?type=login';
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

		$("#btn-no-results").click(function(evt) {
			self.toggleResultsRequired(evt.target.checked);
		});

		$('#rg2-draw-courses').hide();

		$("#btn-draw-courses").button().click(function(evt) {
			if (self.mapLoaded) {
				self.drawingCourses = true;
				self.courses.length = 0;
				self.newcontrols.deleteAllControls();
				self.drawnCourse.name = 'Course';
				self.drawnCourse.x = [];
				self.drawnCourse.y = [];
				self.drawnCourse.codes = [];
				$('#rg2-new-course-name').val('Course');
				$('#rg2-draw-courses').show();
			} else {
				rg2.showWarningDialog("No map selected", "Please load a map before drawing courses");
			}
		});

		$("#rg2-new-course-name").on("change", function(evt) {
			self.setCourseName(evt);
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

	getMaps : function() {
		var self = this;
		var i;
		$.getJSON(rg2Config.json_url, {
			type : "maps",
			cache : false
		}).done(function(json) {
			self.maps.length = 0;
			console.log("Maps: " + json.data.length);
			for ( i = 0; i < json.data.length; i += 1) {
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

	setGeoref : function(code) {
		if (code !== null) {
			this.convertWorldFile(code);
		}
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

	eventFinishedLoading : function() {
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
		opt.value = this.INVALID_MAP_ID;
		opt.text = "Select map";
		dropdown.options.add(opt);
		var len = this.maps.length - 1;
		for ( i = len; i > -1; i -= 1) {
			opt = document.createElement("option");
			opt.value = i;
			opt.text = this.maps[i].mapid + ": " + this.maps[i].name;
			dropdown.options.add(opt);
		}
	},

	createGeorefDropdown : function(id) {
		$("#rg2-georef-selected").empty();
		var dropdown = document.getElementById("rg2-georef-selected");
		var opt;
		var i;
		for ( i = 0; i < this.georefsystems.length; i += 1) {
			opt = document.createElement("option");
			opt.value = this.georefsystems[i].name;
			opt.text = this.georefsystems[i].description;
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
		// creates an array of all course names in the results file
		var i;
		var j;
		var a;
		var idx;
		this.resultCourses = [];
		for ( i = 0; i < this.results.length; i += 1) {
			// have we already found this course?
			idx = -1;
			for ( j = 0; j < this.resultCourses.length; j += 1) {
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

	displayCourseAllocations : function() {
		if ((this.courses.length) && (this.resultCourses.length)) {

			// create html for course allocation list
			// using a table to make it easier for now
			var html = "<div id='rg2-course-allocations'><table><thead><tr><th>Course file</th><th>Results</th></tr></thead><tbody>";
			var i;
			for ( i = 0; i < this.courses.length; i += 1) {
				html += "<tr><td>" + this.courses[i].name + "</td><td>" + this.createCourseDropdown(this.courses[i].name, i) + "</td></tr>";
			}
			html += "</tbody></table></div>";
			$("#rg2-course-allocations").empty().append(html);
		}
	},

	validateData : function() {
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
				return 'No course information.';
			}
		}
		if (this.results.length === 0) {
			if (this.format !== this.FORMAT_NO_RESULTS) {
				return 'No results information.';
			}
		}
		return 'OK';

	},

	confirmCreateEvent : function() {
		var valid = this.validateData();
		if (valid !== 'OK') {
			rg2.showWarningDialog("Data missing", valid + " Please enter all necessary information before creating the event.");
			return;
		}
		var msg = "<div id='event-create-dialog'>Are you sure you want to create this event?</div>";
		var me = this;
		$(msg).dialog({
			title : "Confirm event creation",
			modal : true,
			dialogClass : "no-close",
			closeOnEscape : false,
			buttons : [{
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
		var i;
		var codes;
		var x;
		var y;
		var id = $("#rg2-event-selected").val();
		var $url = rg2Config.json_url + "?type=createevent";
		var data = {};
		data.name = this.eventName;
		data.mapid = this.maps[this.mapIndex].mapid;
		data.eventdate = this.eventDate;
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
			// copy in controls
			codes = [];
			x = [];
			y = [];
			for ( i = 0; i < this.newcontrols.controls.length; i += 1) {
				codes.push(this.newcontrols.controls[i].code);
				x.push(Math.round(this.newcontrols.controls[i].x));
				y.push(Math.round(this.newcontrols.controls[i].y));

			}
			for ( i = 0; i < this.courses.length; i += 1) {
				this.courses[i].x = x;
				this.courses[i].y = y;
				this.courses[i].codes = codes;
			}
		}
		data.courses = this.courses.slice(0);
		data.results = this.results.slice(0);
		var user = this.encodeUser();
		data.x = user.x;
		data.y = user.y;
		var json = JSON.stringify(data);
		var self = this;
		$.ajax({
			data : json,
			type : "POST",
			url : $url,
			dataType : "json",
			success : function(data, textStatus, jqXHR) {
				// save new cookie
				self.user.y = data.keksi;
				if (data.ok) {
					rg2.showWarningDialog("Event created", self.eventName + " has been added with id " + data.newid + ".");
				} else {
					rg2.showWarningDialog("Save failed", data.status_msg + ". Failed to create event. Please try again.");
				}
			},
			error : function(jqXHR, textStatus, errorThrown) {
				console.log(textStatus);
			}
		});
	},

	renumberResults : function() {
		// updates the course id when we know the mapping
		// and deletes results for courses not required
		var i;
		var id;
		var newResults = [];

		for ( i = 0; i < this.results.length; i += 1) {
			id = this.getCourseIDForResult(this.results[i].course);
			if (id !== this.DO_NOT_SAVE_COURSE) {
				this.results[i].courseid = id;
				newResults.push(this.results[i]);
			}
		}
		this.results = newResults;
	},

	mapResultsToCourses : function() {
		// called when saving courses
		// generates the necessary course IDs for the results file
		// deletes unwanted courses
		var i;
		var selector;
		var id;
		var newCourses = [];
		var courseid = 1;
		for ( i = 0; i < this.courses.length; i += 1) {
			selector = "#rg2-alloc-" + i;
			// comes back as NaN if selector doesn't exist when we have no results, which works OK
			id = parseInt($(selector).val(), 10);
			if (id !== this.DO_NOT_SAVE_COURSE) {
				this.courses[i].courseid = courseid;
				// handle case where we have courses but no results
				if (this.resultCourses.length > 0) {
					this.resultCourses[id].courseid = courseid;
				}
				newCourses.push(this.courses[i]);
				courseid += 1;
			}
		}
		this.courses = newCourses;
	},

	getCourseIDForResult : function(course) {
		var i;
		for ( i = 0; i < this.resultCourses.length; i += 1) {
			if (this.resultCourses[i].course === course) {
				return this.resultCourses[i].courseid;
			}
		}
		return 0;
	},

	setControlLocations : function() {
		// called when saving courses
		// reads control locations and updates course details
		var i;
		var j;
		var c;
		for ( i = 0; i < this.courses.length; i += 1) {
			for ( j = 0; j < this.courses[i].codes.length; j += 1) {
				c = this.getControlXY(this.courses[i].codes[j]);
				this.courses[i].x[j] = c.x;
				this.courses[i].y[j] = c.y;
			}
		}
	},

	getControlXY : function(code) {
		var i;
		var c = {};
		c.x = 0;
		c.y = 0;
		for ( i = 0; i < this.newcontrols.controls.length; i += 1) {
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
		var $url = rg2Config.json_url + "?type=editevent&id=" + id;
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
			data : json,
			type : "POST",
			url : $url,
			dataType : "json",
			success : function(data, textStatus, jqXHR) {
				// save new cookie
				self.user.y = data.keksi;
				if (data.ok) {
					rg2.showWarningDialog("Event updated", "Event " + id + " has been updated.");
				} else {
					rg2.showWarningDialog("Update failed", data.status_msg + ". Event update failed. Please try again.");
				}
			},
			error : function(jqXHR, textStatus, errorThrown) {
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
			buttons : [{
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
		var $url = rg2Config.json_url + "?type=deletecourse&id=" + id + "&routeid=" + routeid;
		// TODO: add course delete functionality
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
		var $url = rg2Config.json_url + "?type=deleteroute&id=" + id + "&routeid=" + routeid;
		var user = this.encodeUser();
		var json = JSON.stringify(user);
		var self = this;
		$.ajax({
			data : json,
			type : "POST",
			url : $url,
			dataType : "json",
			success : function(data, textStatus, jqXHR) {
				// save new cookie
				var msg;
				self.user.y = data.keksi;
				if (data.ok) {
					rg2.showWarningDialog("Route deleted", "Route " + routeid + " has been deleted.");
				} else {
					rg2.showWarningDialog("Delete failed", data.status_msg + ". Delete failed. Please try again.");
				}
			},
			error : function(jqXHR, textStatus, errorThrown) {
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
		var $url = rg2Config.json_url + "?type=deleteevent&id=" + id;
		var user = this.encodeUser();
		var json = JSON.stringify(user);
		var self = this;
		var msg;
		$.ajax({
			data : json,
			type : "POST",
			url : $url,
			dataType : "json",
			success : function(data, textStatus, jqXHR) {
				// save new cookie
				self.user.y = data.keksi;
				if (data.ok) {
					rg2.showWarningDialog("Event deleted", "Event " + id + " has been deleted.");
					rg2.loadEventList();
					self.setEvent();
					$("#rg2-event-selected").empty();
				} else {
					rg2.showWarningDialog("Delete failed", data.status_msg + ". Event delete failed. Please try again.");
				}
			},
			error : function(jqXHR, textStatus, errorThrown) {
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
			self.results.length = 0;
			switch (self.resultsFileFormat) {
			case 'CSV':
				var csv = evt.target.result;
				var rows = evt.target.result.split(/[\r\n|\n]+/);
				// only one format at present
				self.processSICSVResults(rows);
				$("#rg2-select-results-file").addClass('valid');
				break;
			case 'XML':
				self.processResultsXML(evt);
				$("#rg2-select-results-file").addClass('valid');
				break;
			default:
				// shouldn't ever get here but...
				rg2.showWarningDialog("File type error", "Results file type is not recognised. Please select a valid file.");
				return;
			}
			// extract courses from results
			self.getCoursesFromResults();
			self.displayCourseAllocations();
		};
		var format = evt.target.files[0].name.substr(-3, 3);
		format = format.toUpperCase();
		if ((format === 'XML') || (format === 'CSV')) {
			this.resultsFileFormat = format;
			reader.readAsText(evt.target.files[0]);
		} else {
			rg2.showWarningDialog("File type error", "Results file type is not recognised. Please select a valid file.");
		}
	},

	processResultsXML : function(evt) {
		var xml;
		var version;
		var i;
		var nodelist;
		version = "";
		try {
			xml = $.parseXML(evt.target.result);

			// test for IOF Version 2
			nodelist = xml.getElementsByTagName('IOFVersion');
			if (nodelist.length > 0) {
				version = nodelist[0].getAttribute('version');
			}
			if (version === "") {
				// test for IOF Version 3
				nodelist = xml.getElementsByTagName('ResultList');
				if (nodelist.length > 0) {
					version = nodelist[0].getAttribute('iofVersion');
				}
			}
		} catch (err) {
			rg2.showWarningDialog("XML file error", "File is not a valid XML results file.");
			return;
		}

		switch (version) {
		case "2.0.3":
			this.processIOFV2XMLResults(xml);
			break;
		case "3.0":
			this.processIOFV3XMLResults(xml);
			break;
		default:
			rg2.showWarningDialog("XML file error", 'Invalid IOF file format. Version ' + version + ' not supported.');
		}
	},

	processIOFV2XMLResults : function(xml) {
		var classlist;
		var personlist;
		var resultlist;
		var splitlist;
		var i;
		var j;
		var k;
		var l;
		var result;
		var course;
		var time;
		var timeFormat;
		var temp;
		var status;
		try {
			classlist = xml.getElementsByTagName('ClassResult');
			for ( i = 0; i < classlist.length; i += 1) {
				course = classlist[i].getElementsByTagName('ClassShortName')[0].textContent;
				personlist = classlist[i].getElementsByTagName('PersonResult');
				for ( j = 0; j < personlist.length; j += 1) {
					result = {};
					result.course = course;
					result.name = personlist[j].getElementsByTagName('Given')[0].textContent + " " + personlist[j].getElementsByTagName('Family')[0].textContent;
					temp = personlist[j].getElementsByTagName('PersonId')[0].textContent;
					// remove new lines from empty <PersonId> tags
					temp.replace(/[\n\r]/g, '');
					result.dbid = temp.trim() + "__" + result.name;
					result.club = personlist[j].getElementsByTagName('ShortName')[0].textContent;
					resultlist = personlist[j].getElementsByTagName('Result');
					for ( k = 0; k < resultlist.length; k += 1) {
						temp = resultlist[k].getElementsByTagName('CompetitorStatus');
						if (temp.length > 0) {
							status = temp[0].getAttribute("value");
						} else {
							status = '';
						}
						temp = resultlist[k].getElementsByTagName('CCardId');
						if (temp.length > 0) {
							result.chipid = temp[0].textContent;
						} else {
							result.chipid = 0;
						}
						// assuming first <Time> is the total time...
						temp = resultlist[k].getElementsByTagName('Time')[0].textContent;
						result.time = temp.replace(/[\n\r]/g, '');
						temp = resultlist[k].getElementsByTagName('StartTime');
						if (temp.length > 0) {
							time = temp[0].getElementsByTagName('Clock')[0].textContent;
							result.starttime = rg2.getSecsFromHHMMSS(time);
						} else {
							result.starttime = 0;
						}
						result.splits = "";
						result.codes = [];
						splitlist = resultlist[k].getElementsByTagName('SplitTime');
						result.controls = splitlist.length;
						for ( l = 0; l < splitlist.length; l += 1) {
							if (l > 0) {
								result.splits += ";";
							}
							temp = splitlist[l].getElementsByTagName('Time');
							if (temp.length > 0) {
								// previously read timeFormat but some files lied!
								// allow for XML files that don't tell you what is going on
								// count all colons in time string
								if ((temp[0].textContent.match(/:/g) || []).length > 1) {
									result.splits += rg2.getSecsFromHHMMSS(temp[0].textContent);
								} else {
									result.splits += rg2.getSecsFromMMSS(temp[0].textContent);
								}
								temp = splitlist[l].getElementsByTagName('ControlCode');
								if (temp.length > 0) {
									result.codes[l] = temp[0].textContent;
								} else {
									result.codes[l] = "";
								}
							} else {
								result.splits += 0;
								result.codes[l] = "";
							}
						}
						// add finish split
						result.splits += ";";
						temp = resultlist[k].getElementsByTagName('FinishTime');
						if (temp.length > 0) {
							time = temp[0].getElementsByTagName('Clock')[0].textContent;
							result.splits += rg2.getSecsFromHHMMSS(time) - result.starttime;
						} else {
							result.splits += 0;
						}
					}
					if (status === 'DidNotStart') {
						break;
					} else {
						this.results.push(result);
					}
				}

			}
		} catch(err) {
			rg2.showWarningDialog("XML parse error", "Error processing XML file. Error is : " + err.message);
			return;
		}

	},

	processIOFV3XMLResults : function(xml) {
		var classlist;
		var personlist;
		var resultlist;
		var splitlist;
		var i;
		var j;
		var k;
		var l;
		var result;
		var course;
		var time;
		var temp;
		var temp2;
		var runnerCount;
		try {
			classlist = xml.getElementsByTagName('ClassResult');
			for ( i = 0; i < classlist.length; i += 1) {
				temp = classlist[i].getElementsByTagName('Class');
				course = temp[0].getElementsByTagName('Name')[0].textContent;
				personlist = classlist[i].getElementsByTagName('PersonResult');
				for ( j = 0; j < personlist.length; j += 1) {
					result = {};
					result.course = course;
					result.name = personlist[j].getElementsByTagName('Given')[0].textContent + " " + personlist[j].getElementsByTagName('Family')[0].textContent;
					temp = personlist[j].getElementsByTagName('Id');
					if (temp.length > 0) {
						temp2 = temp[0].textContent;
						// remove new lines from empty <Id> tags
						temp2.replace(/[\n\r]/g, '');
						result.dbid = temp2.trim() + "__" + result.name;
					} else {
						// no id defined so just use count of runners
						result.dbid = this.results.length + "__" + result.name;
					}
					temp = personlist[j].getElementsByTagName('Organisation');
					if (temp.length > 0) {
						result.club = temp[0].getElementsByTagName('Name')[0].textContent;
					} else {
						result.club = "";
					}
					resultlist = personlist[j].getElementsByTagName('Result');
					for ( k = 0; k < resultlist.length; k += 1) {
						temp = resultlist[k].getElementsByTagName('CCardId');
						if (temp.length > 0) {
							result.chipid = temp[0].textContent;
						} else {
							result.chipid = 0;
						}
						// assuming first <Time> is the total time...
						// this one is in seconds and might even have tenths...
						temp = resultlist[k].getElementsByTagName('Time');
						if (temp.length > 0) {
							result.time = rg2.formatSecsAsMMSS(parseInt(temp[0].textContent, 10));
						} else {
							result.time = 0;
						}
						temp = resultlist[k].getElementsByTagName('StartTime');
						if (temp.length > 0) {
							temp2 = temp[0].textContent;
							if (temp2.length >= 19) {
								// format is yyyy-mm-ddThh:mm:ss and might have extra Z or +nn
								result.starttime = rg2.getSecsFromHHMMSS(temp2.substr(11, 8));
							} else {
								result.starttime = 0;
							}
						} else {
							result.starttime = 0;
						}
						result.splits = "";
						result.codes = [];
						splitlist = resultlist[k].getElementsByTagName('SplitTime');
						result.controls = splitlist.length;
						for ( l = 0; l < splitlist.length; l += 1) {
							if (l > 0) {
								result.splits += ";";
							}
							temp = splitlist[l].getElementsByTagName('Time');
							if (temp.length > 0) {
								result.splits += temp[0].textContent;
							} else {
								result.splits += 0;
							}
							temp = splitlist[l].getElementsByTagName('ControlCode');
							if (temp.length > 0) {
								result.codes[l] = temp[0].textContent;
							} else {
								result.codes[l] += 'X' + l;
							}

						}
						// add finish split
						result.splits += ";";
						temp = resultlist[k].getElementsByTagName('FinishTime');
						if (temp.length > 0) {
							temp2 = temp[0].textContent;
							if (temp2.length >= 19) {
								// format is yyyy-mm-ddThh:mm:ss and might have extra Z or +nn
								time = rg2.getSecsFromHHMMSS(temp2.substr(11, 8));
							} else {
								time = 0;
							}
						} else {
							time = 0;
						}
						result.splits += time - result.starttime;
					}
					this.results.push(result);
				}

			}
		} catch(err) {
			rg2.showWarningDialog("XML parse error", "Error processing XML file. Error is : " + err.message);
			return;
		}

	},

	readCourses : function(evt) {

		var reader = new FileReader();
		reader.onerror = function(evt) {
			switch(evt.target.error.code) {
			case evt.target.error.NOT_FOUND_ERR:
				rg2.showWarningDialog('File not found', 'The selected file could not be found.');
				break;
			case evt.target.error.NOT_READABLE_ERR:
				rg2.showWarningDialog('File not readable', 'The selected file could not be read.');
				break;
			default:
				rg2.showWarningDialog('File error.', 'The selected file could not be read.');
			}
		};
		var self = this;
		reader.onload = function(evt) {
			self.courses.length = 0;
			self.coursesGeoreferenced = false;
			self.backgroundLocked = false;
			$('#btn-move-map-and-controls').prop('checked', false);
			self.handleX = null;
			self.handleY = null;
			self.newcontrols.deleteAllControls();
			self.processCoursesXML(evt);
			self.displayCourseAllocations();
			self.fitControlsToMap();
			rg2.redraw(false);
		};

		reader.readAsText(evt.target.files[0]);
	},

	processCoursesXML : function(evt) {
		var xml;
		var version;
		var i;
		var nodelist;
		version = "";
		try {
			xml = $.parseXML(evt.target.result);

			// test for IOF Version 2
			nodelist = xml.getElementsByTagName('IOFVersion');
			if (nodelist.length > 0) {
				version = nodelist[0].getAttribute('version');
			}
			if (version === "") {
				// test for IOF Version 3
				nodelist = xml.getElementsByTagName('CourseData');
				if (nodelist.length > 0) {
					version = nodelist[0].getAttribute('iofVersion');
				}
			}
		} catch (err) {
			rg2.showWarningDialog("XML file error", "File is not a valid XML event file.");
			return;
		}

		switch (version) {
		case "2.0.3":
			this.processIOFV2XML(xml);
			break;
		case "3.0":
			this.processIOFV3XML(xml);
			break;
		default:
			rg2.showWarningDialog("XML file error", 'Invalid IOF file format. Version ' + version + ' not supported.');
		}
	},

	extractV2Courses : function(nodelist) {
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
				tmp = controllist[j].getElementsByTagName('ControlCode')[0].textContent;
				codes.push(tmp.trim());
			}
			tmp = nodelist[i].getElementsByTagName('FinishPointCode')[0].textContent;
			codes.push(tmp.trim());

			course.codes = codes;
			// 0 for now: set when result mapping is known
			course.courseid = 0;
			course.x = x;
			course.y = y;
			this.courses.push(course);
		}
		$("#rg2-select-course-file").addClass('valid');
	},

	extractV3Courses : function(nodelist) {
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
			course.name = nodelist[i].getElementsByTagName('Name')[0].textContent;
			controllist = nodelist[i].getElementsByTagName('CourseControl');
			for ( j = 0; j < controllist.length; j += 1) {
				tmp = controllist[j].getElementsByTagName('Control')[0].textContent;
				codes.push(tmp.trim());
			}

			course.codes = codes;
			// 0 for now: set when result mapping is known
			course.courseid = 0;
			course.x = x;
			course.y = y;
			this.courses.push(course);
		}
		$("#rg2-select-course-file").addClass('valid');
	},

	processIOFV3XML : function(xml) {
		// extract all controls
		var nodelist;
		var i;
		var code;
		var mappos;
		var x;
		var y;

		nodelist = xml.getElementsByTagName('Control');

		var latlng;
		var lat;
		var lng;
		// only need first-level Controls
		for ( i = 0; i < nodelist.length; i += 1) {
			if (nodelist[i].parentNode.nodeName === 'RaceCourseData') {
				code = nodelist[i].getElementsByTagName("Id")[0].textContent;
				latlng = nodelist[i].getElementsByTagName("Position");
				if ((this.localworldfile.valid) && (latlng.length > 0)) {
					lat = latlng[0].getAttribute('lat');
					lng = latlng[0].getAttribute('lng');
					x = this.localworldfile.getX(lng, lat);
					y = this.localworldfile.getY(lng, lat);
					this.coursesGeoreferenced = true;
				} else {
					// only works if all controls have lat/lon or none do: surely a safe assumption...
					mappos = nodelist[i].getElementsByTagName("MapPosition");
					x = mappos[0].getAttribute('x');
					y = mappos[0].getAttribute('y');
				}
				this.newcontrols.addControl(code.trim(), x, y);
			}
		}
		// extract all courses
		nodelist = xml.getElementsByTagName('Course');
		this.extractV3Courses(nodelist);
	},

	processIOFV2XML : function(xml) {
		var nodelist;
		var controlsGeoref;
		var i;
		var x;
		var y;
		// extract all start controls
		nodelist = xml.getElementsByTagName('StartPoint');
		this.extractV2Controls(nodelist, 'StartPointCode');
		// extract all normal controls
		nodelist = xml.getElementsByTagName('Control');
		this.extractV2Controls(nodelist, 'ControlCode');
		// extract all finish controls
		nodelist = xml.getElementsByTagName('FinishPoint');
		controlsGeoref = this.extractV2Controls(nodelist, 'FinishPointCode');

		if (controlsGeoref) {
			if (this.localworldfile.valid) {
				for ( i = 0; i < this.newcontrols.controls.length; i += 1) {
					x = this.newcontrols.controls[i].x;
					y = this.newcontrols.controls[i].y;
					this.newcontrols.controls[i].x = this.localworldfile.getX(x, y);
					this.newcontrols.controls[i].y = this.localworldfile.getY(x, y);
				}
				this.coursesGeoreferenced = true;
			}
		}
		// extract all courses
		nodelist = xml.getElementsByTagName('Course');
		this.extractV2Courses(nodelist);
	},

	// returns true if controls are georeferenced
	extractV2Controls : function(nodelist, type) {
		var i;
		var x;
		var y;
		var code;
		var mappos;
		var geopos;
		var isGeoref = false;
		for ( i = 0; i < nodelist.length; i += 1) {
			code = nodelist[i].getElementsByTagName(type)[0].textContent;
			geopos = nodelist[i].getElementsByTagName("ControlPosition");
			// subtle bug and a half #190
			// if you have an IOF XML V2 file which has georeferenced controls AND
			// the map file itself isn't georeferenced
			// then you need to use X, Y and not the georeferenced co-ordinates
			if ((geopos.length > 0) && (this.localworldfile.valid)) {
				x = parseFloat(geopos[0].getAttribute('x'));
				y = parseFloat(geopos[0].getAttribute('y'));
				isGeoref = true;
			} else {
				mappos = nodelist[i].getElementsByTagName("MapPosition");
				x = mappos[0].getAttribute('x');
				y = mappos[0].getAttribute('y');
			}
			this.newcontrols.addControl(code.trim(), x, y);
		}
		return isGeoref;
	},

	// rows: array of raw lines from SI results csv file
	processSICSVResults : function(rows) {
		var CHIP_IDX = 1;
		var DB_IDX = 2;
		var SURNAME_IDX = 3;
		var FIRST_NAME_IDX = 4;
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
		var SPLIT_IDX_STEP = 2;
		var FIRST_CODE_IDX = 46;
		var CODE_IDX_STEP = 2;

		var i;
		var j;
		var fields = {};
		var result;
		var nextsplit;
		var nextcode;
		var temp;
		// try and work out what the separator is
		var commas = rows[0].split(',').length - 1;
		var semicolons = rows[0].split(';').length - 1;

		var separator;
		if (commas > semicolons) {
			separator = ',';
		} else {
			separator = ";";
		}
		// extract all fields in all rows
		for ( i = 0; i < rows.length; i += 1) {
			fields[i] = rows[i].split(separator);
		}
		// extract what we need: first row is headers so ignore
		for ( i = 1; i < rows.length; i += 1) {
			// need at least this many fields...
			if (fields[i].length >= FIRST_SPLIT_IDX) {
				result = {};
				result.chipid = fields[i][CHIP_IDX];
				// delete quotes from CSV file: output from MERCS
				result.name = (fields[i][FIRST_NAME_IDX] + " " + fields[i][SURNAME_IDX]).trim().replace(/\"/g, '');
				result.dbid = (fields[i][DB_IDX] + "__" + result.name).replace(/\"/g, '');
				result.starttime = rg2.getSecsFromHHMMSS(fields[i][START_TIME_IDX]);
				result.time = fields[i][TOTAL_TIME_IDX];
				result.club = fields[i][CLUB_IDX];
				// if club name not set then it may be in city field instead
				if (!result.club) {
					result.club = fields[i][CITY_IDX];
				}
				result.course = fields[i][COURSE_IDX];
				result.controls = parseInt(fields[i][NUM_CONTROLS_IDX], 10);
				nextsplit = FIRST_SPLIT_IDX;
				nextcode = FIRST_CODE_IDX;
				result.splits = "";
				result.codes = [];
				for ( j = 0; j < result.controls; j += 1) {
					if (j > 0) {
						result.splits += ";";
					}
					if (fields[i][nextcode]) {
						result.codes[j] = fields[i][nextcode];
						result.splits += rg2.getSecsFromMMSS(fields[i][nextsplit]);
					}
					nextsplit += SPLIT_IDX_STEP;
					nextcode += CODE_IDX_STEP;
				}
				// add finish split
				result.splits += ";";
				result.splits += rg2.getSecsFromMMSS(result.time);
				this.results.push(result);
			}
		}
	},

	readMapFile : function(evt) {
		var reader = new FileReader();
		var self = this;
		var format;
		reader.onload = function(event) {
			self.processMap(event);
		};
		format = evt.target.files[0].name.substr(-3, 3);
		format = format.toUpperCase();
		if ((format === 'JPG') || (format === 'GIF')) {
			this.mapFile = evt.target.files[0];
			reader.readAsDataURL(evt.target.files[0]);
		} else {
			rg2.showWarningDialog("File type error", evt.target.files[0].name + " is not recognised. Only .jpg and .gif files are supported at present.");
		}
	},

	mapLoadCallback : function() {
		//callback when map image is loaded
		this.mapLoaded = true;
		if (this.mapIndex !== this.INVALID_MAP_ID) {
			this.localworldfile = this.maps[this.mapIndex].localworldfile;
		}
		var size = rg2.getMapSize();
		this.mapWidth = size.width;
		this.mapHeight = size.height;
		this.fitControlsToMap();
		rg2.redraw(false);
	},

	processMap : function(event) {
		// called to load a new map locally
		rg2.loadNewMap(event.target.result);
		$("#rg2-select-map-file").addClass('valid');
		this.mapLoaded = true;
		var size = rg2.getMapSize();
		this.mapWidth = size.width;
		this.mapHeight = size.height;
		this.fitControlsToMap();
		rg2.redraw(false);
		$("#btn-add-map").button("enable");
	},

	fitControlsToMap : function() {
		var i;
		var georefOK = false;
		if ((this.mapLoaded) && (this.newcontrols.controls.length > 0)) {
			if (this.coursesGeoreferenced) {
				// check we are somewhere on the map
				if ((maxX < 0) || (minX > this.mapWidth) || (minY > this.mapHeight) || (maxY < 0)) {
					// warn and fit to track
					var msg = "<div id='GPS-problem-dialog'>Your course file does not match the map co-ordinates. Please check you have selected the correct file.</div>";
					$(msg).dialog({
						title : "Course file problem"
					});
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
				var scale = 0.8;
				var xRange = (maxX - minX);
				var yRange = (maxY - minY);

				for ( i = 0; i < this.newcontrols.controls.length; i += 1) {
					this.newcontrols.controls[i].x = ((this.newcontrols.controls[i].x - minX) * (this.mapWidth / xRange) * scale) + (this.mapWidth * (1 - scale) * 0.5);
					this.newcontrols.controls[i].y = (this.mapHeight - ((this.newcontrols.controls[i].y - minY) * (this.mapHeight / yRange)) * scale) - (this.mapHeight * (1 - scale) * 0.5);
				}
			}
			for ( i = 0; i < this.newcontrols.controls.length; i += 1) {
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

	setCourseName : function(evt) {
		var course = $("#rg2-new-course-name").val();
		if (course) {
			this.drawnCourse.name = course;
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

	createCourseDropdown : function(course, courseidx) {
		/*
		 * Input: course name to match
		 *
		 * Output: html select
		 */
		var i;
		var idx = -1;
		// do results include this course name?
		for ( i = 0; i < this.resultCourses.length; i += 1) {
			if (this.resultCourses[i].course === course) {
				idx = i;
				break;
			}
		}
		var html = "<select id='rg2-alloc-" + courseidx + "'><option value=" + this.DO_NOT_SAVE_COURSE;
		if (idx === -1) {
			html += " selected";
		}
		html += ">Do not save</option>";
		for ( i = 0; i < this.resultCourses.length; i += 1) {
			html += "<option value=" + i;
			if (idx === i) {
				html += " selected";
			}
			html += ">" + this.resultCourses[i].course + "</option>";
		}
		html += "</select>";
		return html;
	},

	drawControls : function() {
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

	addNewControl : function(x, y) {
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
	toggleMoveAll : function(checkedState) {
		this.backgroundLocked = checkedState;
	},

	// determines if a results file is needed
	// TODO: score events
	toggleResultsRequired : function(noResults) {
		if (noResults) {
			this.format = this.FORMAT_NO_RESULTS;
		} else {
			this.format = this.FORMAT_NORMAL;
		}

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
		var url = rg2Config.json_url + "?type=uploadmapfile";
		var user = this.encodeUser();
		var self = this;
		var formData = new FormData();
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
			success : function(data, textStatus, jqXHR) {
				// save new cookie
				self.user.y = data.keksi;
				if (data.ok) {
					self.doAddMap();
				} else {
					rg2.showWarningDialog("Save failed", data.status_msg + ". Failed to save map. Please try again.");
				}
			},
			error : function(jqXHR, textStatus, errorThrown) {
				console.log(textStatus);
			}
		});
	},

	doAddMap : function() {
		// map file uploaded OK so add new details
		var $url = rg2Config.json_url + "?type=addmap";
		var data = {};
		this.newMap.localworldfile = this.localworldfile;
		data = this.newMap;
		var user = this.encodeUser();
		data.x = user.x;
		data.y = user.y;
		var json = JSON.stringify(data);
		var self = this;
		$.ajax({
			data : json,
			type : "POST",
			url : $url,
			dataType : "json",
			success : function(data, textStatus, jqXHR) {
				// save new cookie
				self.user.y = data.keksi;
				if (data.ok) {
					rg2.showWarningDialog("Map added", self.newMap.name + " has been added with id " + data.newid + ".");
					// update map dropdown
					self.getMaps();
				} else {
					rg2.showWarningDialog("Save failed", data.status_msg + ". Failed to save map. Please try again.");
				}
			},
			error : function(jqXHR, textStatus, errorThrown) {
				console.log(textStatus);
			}
		});
	},

	readGeorefFile : function(evt) {

		var reader = new FileReader();

		var self = this;
		try {
			reader.readAsText(evt.target.files[0]);
		} catch(err) {
			rg2.showWarningDialog("File read error", "Failed to open selected world file.");
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
			delete self.localworldfile;
			self.localworldfile = new Worldfile(args[0], args[2], args[4], args[1], args[3], args[5]);
			$("#rg2-georef-selected").val(self.defaultGeorefVal);
			self.convertWorldFile(self.defaultGeorefVal);
		};
	},

	convertWorldFile : function(type) {
		// takes in a World file for the map image and translates it to WGS84 (GPS)
		try {
			var size = rg2.getMapSize();
			this.mapWidth = size.width;
			this.mapHeight = size.height;
			if ((!this.localworldfile.valid) || (this.mapWidth === 0) || (type === this.DO_NOT_GEOREF)) {
				// no map or world file loaded or user selected do not georef
				this.clearGeorefs();
				return;
			}

			// first entry is no georef so don't initialize it'
			for ( i = 1; i < this.georefsystems.length; i += 1) {
				Proj4js.defs[this.georefsystems[i].name] = this.georefsystems[i].params;
			}

			var source;
			source = new Proj4js.Proj(type);

			// WGS84 as used by GPS
			var dest = new Proj4js.Proj("EPSG:4326");

			var xScale = this.localworldfile.A;
			var ySkew = this.localworldfile.D;
			var xSkew = this.localworldfile.B;
			var yScale = this.localworldfile.E;

			var xsrc = [];
			var ysrc = [];
			var xpx = [];
			var ypx = [];

			// x0, y0 is top left
			xsrc[0] = this.localworldfile.C;
			ysrc[0] = this.localworldfile.F;
			xpx[0] = 0;
			ypx[0] = 0;

			// x1, y1 is bottom right
			xpx[1] = this.mapWidth;
			ypx[1] = this.mapHeight;
			xsrc[1] = (xScale * xpx[1]) + (xSkew * ypx[1]) + xsrc[0];
			ysrc[1] = (yScale * ypx[1]) + (ySkew * xpx[1]) + ysrc[0];

			// x2, y2 is top right
			xpx[2] = this.mapWidth;
			ypx[2] = 0;
			xsrc[2] = (xScale * xpx[2]) + (xSkew * ypx[2]) + xsrc[0];
			ysrc[2] = (yScale * ypx[2]) + (ySkew * xpx[2]) + ysrc[0];

			this.newMap.xpx.length = 0;
			this.newMap.ypx.length = 0;
			this.newMap.lat.length = 0;
			this.newMap.lon.length = 0;
			// translate source to WGS84 (as in GPS file)
			var i;
			var p = [];
			var pt;
			for ( i = 0; i < 3; i += 1) {
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

			var hypot = rg2.getLatLonDistance(p[0].y, p[0].x, p[2].y, p[2].x);
			var adj = rg2.getLatLonDistance(p[0].y, p[0].x, p[0].y, p[2].x);
			var angle1 = Math.acos(adj / hypot);

			var hypot2 = rg2.getLatLonDistance(p[2].y, p[2].x, p[1].y, p[1].x);
			var adj2 = rg2.getLatLonDistance(p[2].y, p[2].x, p[1].y, p[2].x);
			var angle2 = Math.acos(adj2 / hypot2);

			var angle = (angle1 + angle2) / 2;
			//console.log(hypot, hypot2, adj, adj2, angle1, angle2, angle);
			var pixResX = (p[2].x - p[0].x) / this.mapWidth;
			var pixResY = (p[2].y - p[1].y) / this.mapHeight;

			delete this.newMap.worldfile;
			this.newMap.worldfile = new Worldfile(pixResX * Math.cos(angle), pixResX * Math.sin(angle), p[0].x, pixResY * Math.sin(angle), -1 * pixResY * Math.cos(angle), p[0].y);
      this.updateGeorefDisplay();
		} catch (err) {
			delete this.newMap.worldfile;
			this.newMap.worldfile = new Worldfile(0, 0, 0, 0, 0, 0);
      this.updateGeorefDisplay();
			return;
		}
	},

	updateGeorefDisplay : function() {
			$("#georef-A").empty().text("A: " + this.newMap.worldfile.A);
			$("#georef-B").empty().text("B: " + this.newMap.worldfile.B);
			$("#georef-C").empty().text("C: " + this.newMap.worldfile.C);
			$("#georef-D").empty().text("D: " + this.newMap.worldfile.D);
			$("#georef-E").empty().text("E: " + this.newMap.worldfile.E);
			$("#georef-F").empty().text("F: " + this.newMap.worldfile.F);
	}
};

