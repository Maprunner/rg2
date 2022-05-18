(function () {
  function Courses() {
    // indexed by the provided courseid which omits 0 and hence a sparse array
    // careful when iterating or getting length!
    this.courses = [];
    this.totaltracks = 0;
    this.numberofcourses = 0;
    this.highestControlNumber = 0;
  }


  Courses.prototype = {
    Constructor: Courses,

    getCourseName: function (courseid) {
      return this.courses[courseid].name;
    },

    isValidCourseId: function (courseid) {
      // detects the unused entries in the courses array
      // index 0 never used: some others not used if you only set up certain courses for a set of results
      return courseid in this.courses;
    },

    getCoursesForEvent: function () {
      var i, course, courses;
      courses = [];
      for (i = 0; i < this.courses.length; i += 1) {
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

    getHighestControlNumber: function () {
      return this.highestControlNumber;
    },

    getCourseDetails: function (courseid) {
      return this.courses[courseid];
    },

    getVariantDetails: function (variant) {
      for (let i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i].variant === variant) {
          return this.courses[i];
        }
      }
      return undefined;
    },

    getCourseLegLengths: function (courseid) {
      return this.courses[courseid].getLegLengths();
    },

    getNumberOfControlsOnCourse: function (courseid) {
      // codes list includes "S" and "F", so allow for them
      return this.courses[courseid].codes.length - 2;
    },

    incrementTracksCount: function (courseid) {
      this.courses[courseid].incrementTracksCount();
      this.totaltracks += 1;
    },

    addCourse: function (courseObject) {
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

    updateCourseDropdown: function () {
      $("#rg2-course-select").empty();
      var i, dropdown;
      dropdown = document.getElementById("rg2-course-select");
      dropdown.options.add(rg2.utils.generateOption(null, rg2.t("Select course")));
      for (i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          dropdown.options.add(rg2.utils.generateOption(i, rg2.he.decode(this.courses[i].name)));
        }
      }
    },

    updateControlDropdown: function () {
      var i, dropdown;
      dropdown = document.getElementById("rg2-control-select");
      $("#rg2-control-select").empty();
      dropdown.options.add(rg2.utils.generateOption(0, "S"));
      dropdown.options.add(rg2.utils.generateOption(rg2.config.MASS_START_BY_CONTROL, "By control"));
      for (i = 1; i < this.highestControlNumber; i += 1) {
        dropdown.options.add(rg2.utils.generateOption(i, i));
      }
    },

    deleteAllCourses: function () {
      this.courses.length = 0;
      this.numberofcourses = 0;
      this.totaltracks = 0;
      this.highestControlNumber = 0;
    },

    drawCourses: function (intensity) {
      var i;
      for (i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          this.courses[i].drawCourse(intensity);
        }
      }
    },

    putOnDisplay: function (courseid) {
      if (this.courses[courseid] !== undefined) {
        this.courses[courseid].display = true;
        this.setFilter(courseid);
      }
    },

    putAllOnDisplay: function () {
      for (let i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
            this.putOnDisplay(this.courses[i].courseid);
        }
      }
    },

    removeAllFromDisplay: function () {
      for (let i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
            this.removeFromDisplay(this.courses[i].courseid);
        }
      }
    },

    removeFromDisplay: function (courseid) {
      if (this.courses[courseid] !== undefined) {
        this.courses[courseid].display = false;
        this.setFilter(courseid);
      }
    },

    setFilter: function (courseid) {
      // may come in as string or integer
      courseid = parseInt(courseid, 10)
      // assumes display properties set on courses and results before this call
      const display = this.courses[courseid].display || rg2.results.anyTracksForCourseDisplayed(courseid);
      document.querySelectorAll("[data-filter]").forEach(div => {
        if (parseInt(div.dataset.courseId, 10) === courseid) {
          div.dataset.filter = display;
        }
      });
    },

    setAllFilters: function () {
      for (let i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          this.setFilter(i);
        }
      }
    },

    getCoursesOnDisplay: function () {
      const courses = [];
      for (let i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          if (this.courses[i].display) {
            courses.push(i);
          }
        }
      }
      return courses;
    },

    allCoursesDisplayed: function () {
      for (let i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          if (!this.courses[i].display) {
            return false;
          }
        }
      }
      return true;
    },

    getNumberOfCourses: function () {
      return this.numberofcourses;
    },

    // look through all courses and extract list of controls
    generateControlList: function (controls) {
      var codes, x, y, i, j;
      // for all courses
      for (i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          codes = this.courses[i].codes;
          x = this.courses[i].x;
          y = this.courses[i].y;
          // for all controls on course
          if (codes !== undefined) {
            for (j = 0; j < codes.length; j += 1) {
              controls.addControl(codes[j], x[j], y[j]);
            }
          }
        }
      }
    },

    updateScoreCourse: function (courseid, codes, x, y) {
      var i;
      for (i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          if (this.courses[i].courseid === courseid) {
            this.courses[i].codes = codes;
            this.courses[i].x = x;
            this.courses[i].y = y;
            this.courses[i].setAngles();
            break;
          }
        }
      }
    },

    setResultsCount: function () {
      var i;
      for (i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          this.courses[i].resultcount = rg2.results.countResultsByCourseID(i);
        }
      }
    },

    formatCoursesAsTable: function () {
      var details, html;
      html = "<table class='coursemenutable'><tr><th>" + rg2.t("Course") + "</th><th><i class='fa fa-eye'></i></th>";
      html += "<th>" + rg2.t("Runners") + "</th><th>" + rg2.t("Routes") + "</th><th><i class='fa fa-eye'></i></th><th><i class='fa fa-play'></i></th></tr>";
      details = this.formatCourseDetails();
      // add bottom row for all courses checkboxes
      html += details.html + "<tr class='allitemsrow'><td>" + rg2.t("All") + "</td>";
      html += "<td><input class='showallcourses' id=" + details.coursecount + " type=checkbox name=course></input></td>";
      html += "<td>" + details.res + "</td><td>" + this.totaltracks + "</td><td>";
      if (this.totaltracks > 0) {
        html += "<input id=" + details.coursecount + " class='alltracks' type=checkbox name=track></input>";
      }
      html += "</td><td></td></tr></table>";
      return html;
    },

    formatCourseDetails: function () {
      let details = { html: "", res: 0 };
      let i;
      for (i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          details.html += "<tr><td>" + this.courses[i].name + "</td>" + "<td><input class='showcourse' id=" + i + " type=checkbox name=course></input></td>";
          details.html += "<td>" + this.courses[i].resultcount + "</td>" + "<td>" + this.courses[i].trackcount + "</td><td>";
          details.res += this.courses[i].resultcount;
          if (this.courses[i].trackcount > 0) {
            details.html += "<input id=" + i + " class='allcoursetracks' type=checkbox name=track></input></td>";
            details.html += "<td><input id=" + i + " class='allcoursetracksreplay' type=checkbox name=replay></input>";
          } else {
            details.html += "</td><td>";
          }
          details.html += "</td></tr>";
        }
      }
      details.coursecount = i;
      return details;
    },

    formatCourseFilters: function () {
      let details = "";    
      for (let i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          // only filter for normal events with at least one control as well as start and finish
          if ((!this.courses[i].isScoreCourse) && (this.courses[i].codes.length > 2)) {
            details += "<div class='filter-item' data-course-id=" + this.courses[i].courseid + " data-filter='false'>" + this.courses[i].name;
            details += "</div><div class='filter-item' data-course-id=" + this.courses[i].courseid + " data-filter='false' id='course-filter-";
            details += this.courses[i].courseid + "'></div>";
          }
        }
      }
      return details;
    },

    formatFilterSliders: function () {
      for (let i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          let self = this;
          $("#course-filter-" + this.courses[i].courseid).slider({
            range: true,
            min: 0,
            max: this.courses[i].codes.length,
            values: [0, this.courses[i].codes.length],
            slide: function (event, ui) {
              self.filterChanged(i, ui.values[0], ui.values[1]);
            }
          })
        }
      }
    },

    drawLinesBetweenControls: function (pt, angle, courseid, opt, filter) {
      this.courses[courseid].drawLinesBetweenControls(pt, angle, opt, filter);
    },

    getFilterDetails: function (courseid) {
      const filter = {};
      filter.filterFrom = this.courses[courseid].filterFrom;
      filter.filterTo = this.courses[courseid].filterTo;
      return filter;
    },

    // slider callback
    filterChanged: function (courseid, low, high) {
      this.courses[courseid].filterFrom = low;
      this.courses[courseid].filterTo = high;
      rg2.redraw(false);
    },

    getExcluded: function (courseid) {
      if (rg2.events.isScoreEvent()) {
        return [];
      }
      return this.courses[courseid].exclude;
    },

    getExcludedText: function () {
      // recreates excluded_* text file contents
      // courseid|type|control,time|...
      let text = "";
      for (let i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          if (this.courses[i].excludeType !== rg2.config.EXCLUDED_NONE) {
            text = text + this.courses[i].courseid + "|" + this.courses[i].excludeType;
            text = text + this.courses[i].exclude.reduce((accum, exclude, index) => { 
              return exclude ? accum + "|" + index + "," + this.courses[i].allowed[index]: accum;
            }, "")
            text = text + "\n";
          }
        }
      }
      return text;
    }
  };
  rg2.Courses = Courses;
}());