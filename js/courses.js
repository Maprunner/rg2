/*global rg2:false */
/*global getAngle:false */
function Courses() {
	// indexed by the provided courseid which omits 0 and hence a sparse array
	// careful when iterating or getting length!
	this.courses = [];
	this.totaltracks = 0;
	this.numberofcourses = 0;
	this.highestControlNumber = 0;
}

Courses.prototype = {
	Constructor : Courses,

	getCourseName : function(courseid) {
		return this.courses[courseid].name;
	},

	getHighestControlNumber : function() {
		return this.highestControlNumber;
	},

	getFullCourse : function(courseid) {
		return this.courses[courseid];
	},

	incrementTracksCount : function(courseid) {
		this.courses[courseid].incrementTracksCount();
		this.totaltracks += 1;
	},

	gettrackcountCount : function(courseid) {
		return this.courses[courseid].trackcount;
	},

	getTotalTracksCount : function() {
		return this.totaltracks;
	},

	addCourse : function(courseObject) {
		this.courses[courseObject.courseid] = courseObject;
		this.numberofcourses += 1;
		// allow for courses with no defined controls
		// careful here: != catches null and undefined, but !== just catches undefined
		if (this.courses[courseObject.courseid].codes !== undefined) {
			if (this.courses[courseObject.courseid].codes.length > this.highestControlNumber) {
				// the codes includes Start and Finish: we don't need F so subtract 1 to get controls
				this.highestControlNumber = this.courses[courseObject.courseid].codes.length - 1;
				this.updateControlDropdown();
			}
		}
	},

	updateCourseDropdown : function() {
		$("#rg2-course-select").empty();
		var i;
		var dropdown = document.getElementById("rg2-course-select");
		var opt = document.createElement("option");
		opt.value = null;
		opt.text = "Select course";
		dropdown.options.add(opt);

		for (i = 0; i < this.courses.length; i += 1) {
			if (this.courses[i] !== undefined) {
				opt = document.createElement("option");
				opt.value = i;
				opt.text = this.courses[i].name;
				dropdown.options.add(opt);
			}
		}
		//dropdown.options.add(opt);
	},

	updateControlDropdown : function() {
		$("#rg2-control-select").empty();
		var dropdown = document.getElementById("rg2-control-select");
		var opt;
		var i;
		for (i = 0; i < this.highestControlNumber; i += 1) {
			opt = document.createElement("option");
			opt.value = i;
			if (i === 0) {
				opt.text = "S";
			} else {
				opt.text = i;
			}
			dropdown.options.add(opt);
		}
		opt = document.createElement("option");
		opt.value = rg2.config.MASS_START_BY_CONTROL;
		opt.text = "By control";
		dropdown.options.add(opt);
	},

	deleteAllCourses : function() {
		this.courses.length = 0;
		this.numberofcourses = 0;
		this.totaltracks = 0;
		this.highestControlNumber = 0;
	},

	drawCourses : function(intensity) {
		for (var i = 0; i < this.courses.length; i += 1) {
			if (this.courses[i] !== undefined) {
				this.courses[i].drawCourse(intensity);
			}
		}
	},

	putOnDisplay : function(courseid) {
		if (this.courses[courseid] !== undefined) {
			this.courses[courseid].display = true;
		}
	},

	putAllOnDisplay : function() {
		for (var i = 0; i < this.courses.length; i += 1) {
			if (this.courses[i] !== undefined) {
				this.courses[i].display = true;
			}
		}
	},

	removeAllFromDisplay : function() {
		for (var i = 0; i < this.courses.length; i += 1) {
			if (this.courses[i] !== undefined) {
				this.courses[i].display = false;
			}
		}
	},

	removeFromDisplay : function(courseid) {
		// remove selected course
		this.courses[courseid].display = false;

	},

	isOnDisplay : function(courseid) {
		return this.courses[courseid].display;
	},

	toggleDisplay : function(courseid) {
		this.courses[courseid].toggleDisplay();
	},

	getNumberOfCourses : function() {
		return this.numberofcourses;
	},

	// look through all courses and extract list of controls
	generateControlList : function(controls) {
		var codes;
		var x;
		var y;
		// for all courses
		for (var i = 0; i < this.courses.length; i += 1) {
			if (this.courses[i] !== undefined) {
				codes = this.courses[i].codes;
				x = this.courses[i].x;
				y = this.courses[i].y;
				// for all controls on course
				if (codes !== undefined) {
					for (var j = 0; j < codes.length; j += 1) {
						controls.addControl(codes[j], x[j], y[j]);
					}
				}
			}
		}
	},

	formatCoursesAsTable : function() {
		var html = "<table class='coursemenutable'><tr><th>Course</th><th>Show</th><th>Runners</th><th>Tracks</th><th>Show</th></tr>";
		for (var i = 0; i < this.courses.length; i += 1) {
			if (this.courses[i] !== undefined) {
				html += "<tr><td>" + this.courses[i].name + "</td>";
				html += "<td><input class='courselist' id=" + i + " type=checkbox name=course></input></td>";
				html += "<td>" + rg2.getResultsByCourseID(i) + "</td>";
				html += "<td>" + this.courses[i].trackcount + "</td>";
				if (this.courses[i].trackcount > 0) {
					html += "<td><input id=" + i + " class='tracklist' type=checkbox name=track></input></td>";
				} else {
					html += "<td></td>";
				}
				html += "</tr>";
			}
		}
		// add bottom row for all courses checkboxes
		html += "<tr><td>All</td>";
		html += "<td><input class='allcourses' id=" + i + " type=checkbox name=course></input></td>";
		html += "<td>" + rg2.getTotalResults() + "</td>";
		if (this.totaltracks > 0) {
			html += "<td>" + this.totaltracks + "</td><td><input id=" + i + " class='alltracks' type=checkbox name=track></input></td>";
		} else {
			html += "<td>" + this.totaltracks + "</td><td></td>";
		}
		html += "</tr></table>";
		return html;
	}
};

function Course(data, isScoreCourse) {
	this.name = data.name;
	this.trackcount = 0;
	this.display = false;
	this.courseid = data.courseid;
	this.codes = data.codes;
	this.x = data.xpos;
	this.y = data.ypos;
	this.isScoreCourse = isScoreCourse;
}

Course.prototype = {
	Constructor : Course,

	incrementTracksCount : function() {
		this.trackcount += 1;
	},
	getCourseID : function() {
		return this.courseid;
	},

	toggleDisplay : function() {
		this.display = !this.display;
	},

	drawCourse : function(intensity) {
		if (this.display) {
			var angle;
			var c1x;
			var c1y;
			var c2x;
			var c2y;
			rg2.ctx.globalAlpha = intensity;
			rg2.ctx.lineWidth = rg2.getOverprintWidth();
			rg2.ctx.strokeStyle = rg2.config.PURPLE;
			if (this.isScoreCourse) {
				// align score event start triangle upwards
				angle = Math.PI * 3 / 2;
			} else {
				angle = getAngle(this.x[0], this.y[0], this.x[1], this.y[1]);
			}
			rg2.drawStart(this.x[0], this.y[0], "", angle);
			for ( i = 0; i < (this.x.length - 1); i += 1) {
				angle = getAngle(this.x[i], this.y[i], this.x[i + 1], this.y[i + 1]);
				if (i === 0) {
					c1x = this.x[i] + (rg2.config.START_TRIANGLE_LENGTH * Math.cos(angle));
					c1y = this.y[i] + (rg2.config.START_TRIANGLE_LENGTH * Math.sin(angle));
				} else {
					c1x = this.x[i] + (rg2.config.CONTROL_CIRCLE_RADIUS * Math.cos(angle));
					c1y = this.y[i] + (rg2.config.CONTROL_CIRCLE_RADIUS * Math.sin(angle));
				}
				//Assume the last control in the array is a finish
				if (i === this.x.length - 2) {
					c2x = this.x[i + 1] - (rg2.config.FINISH_OUTER_RADIUS * Math.cos(angle));
					c2y = this.y[i + 1] - (rg2.config.FINISH_OUTER_RADIUS * Math.sin(angle));
				} else {
					c2x = this.x[i + 1] - (rg2.config.CONTROL_CIRCLE_RADIUS * Math.cos(angle));
					c2y = this.y[i + 1] - (rg2.config.CONTROL_CIRCLE_RADIUS * Math.sin(angle));
				}
				// don't join up controls for score events
				if (!this.isScoreCourse) {
					rg2.ctx.beginPath();
					rg2.ctx.moveTo(c1x, c1y);
					rg2.ctx.lineTo(c2x, c2y);
					rg2.ctx.stroke();
				}

			}
			for (var i = 1; i < (this.x.length - 1); i += 1) {
				rg2.drawSingleControl(this.x[i], this.y[i], i);
			}
			rg2.drawFinish(this.x[this.x.length - 1], this.y[this.y.length - 1], "");
		}
	}
};