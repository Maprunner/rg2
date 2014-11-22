/*global rg2:false */
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

	getCoursesForEvent : function() {
    var courses = [];
    var course;
    for (var i = 0; i < this.courses.length; i += 1) {
      if (this.courses[i] !== undefined) {
        course = {};
        course.id = this.courses[i].courseid;
        course.name = this.courses[i].name;
        course.results = this.courses[i].resultcount;
        courses.push(course);
      }
    }
    return courses;
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
		opt.text = rg2.t("Select course");
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

	getCoursesOnDisplay : function() {
		var courses = [];
		for (var i = 0; i < this.courses.length; i += 1) {
			if (this.courses[i] !== undefined) {
				if (this.courses[i].display) {
					courses.push(i);
				}
			}
		}
		return courses;
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

  updateScoreCourse : function (courseid, codes, x, y) {
    var i;
    for (i = 0; i < this.courses.length; i += 1) {
      if (this.courses[i] !== undefined) {
        if (this.courses[i].courseid === courseid) {
          this.courses[i].codes = codes;
          this.courses[i].x = x;
          this.courses[i].y = y;
          break;
        }
      }
    }
  },
   
   
  setResultsCount : function() {
    var i;
    for (i = 0; i < this.courses.length; i += 1) {
      if (this.courses[i] !== undefined) {
        this.courses[i].resultcount = rg2.countResultsByCourseID(i);
      }
    }
  },
  
	formatCoursesAsTable : function() {
		var res = 0;
		var html = "<table class='coursemenutable'><tr><th>" + rg2.t("Course") + "</th><th>" + rg2.t("Show");
		html += "</th><th>" + rg2.t("Runners") + "</th><th>" + rg2.t("Routes") + "</th><th>" + rg2.t("Show") + "</th></tr>";
		for (var i = 0; i < this.courses.length; i += 1) {
			if (this.courses[i] !== undefined) {
				html += "<tr><td>" + this.courses[i].name + "</td>";
				html += "<td><input class='courselist' id=" + i + " type=checkbox name=course></input></td>";
				html += "<td>" + this.courses[i].resultcount + "</td>";
				res += this.courses[i].resultcount;
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
		html += "<tr class='allitemsrow'><td>" + rg2.t("All") + "</td>";
		html += "<td><input class='allcourses' id=" + i + " type=checkbox name=course></input></td>";
		html += "<td>" + res + "</td>";
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
	this.resultcount = 0;
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
			var i;
			var opt = rg2.getOverprintDetails();
			rg2.ctx.globalAlpha = intensity;
			rg2.ctx.lineWidth = opt.overprintWidth;
			rg2.ctx.strokeStyle = rg2.config.PURPLE;
			if (this.isScoreCourse) {
				// align score event start triangle upwards
				angle = Math.PI * 3 / 2;
			} else {
				angle = rg2.getAngle(this.x[0], this.y[0], this.x[1], this.y[1]);
			}
			rg2.drawStart(this.x[0], this.y[0], "", angle, opt);
      // don't join up controls for score events
      if (!this.isScoreCourse) {
        for ( i = 0; i < (this.x.length - 1); i += 1) {
          angle = rg2.getAngle(this.x[i], this.y[i], this.x[i + 1], this.y[i + 1]);
          if (i === 0) {
            c1x = this.x[i] + (opt.startTriangleLength * Math.cos(angle));
            c1y = this.y[i] + (opt.startTriangleLength * Math.sin(angle));
          } else {
            c1x = this.x[i] + (opt.controlRadius * Math.cos(angle));
            c1y = this.y[i] + (opt.controlRadius * Math.sin(angle));
          }
          //Assume the last control in the array is a finish
          if (i === this.x.length - 2) {
            c2x = this.x[i + 1] - (opt.finishOuterRadius * Math.cos(angle));
            c2y = this.y[i + 1] - (opt.finishOuterRadius * Math.sin(angle));
          } else {
            c2x = this.x[i + 1] - (opt.controlRadius * Math.cos(angle));
            c2y = this.y[i + 1] - (opt.controlRadius * Math.sin(angle));
          }
					rg2.ctx.beginPath();
					rg2.ctx.moveTo(c1x, c1y);
					rg2.ctx.lineTo(c2x, c2y);
					rg2.ctx.stroke();
				}
			}
			
			if (this.isScoreCourse) {
        for (i = 1; i < (this.x.length); i += 1) {
          if ((this.codes[i].indexOf('F') === 0) ||(this.codes[i].indexOf('M') === 0)) {
            rg2.drawFinish(this.x[i], this.y[i], "", opt);
          } else {
            rg2.drawSingleControl(this.x[i], this.y[i], this.codes[i], opt);
          }
        }

			} else {
        for (i = 1; i < (this.x.length - 1); i += 1) {
          rg2.drawSingleControl(this.x[i], this.y[i], i, opt);
        }
        rg2.drawFinish(this.x[this.x.length - 1], this.y[this.y.length - 1], "", opt);
			}
		}
	}
};