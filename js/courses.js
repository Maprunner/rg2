/*global rg2:false */
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
      return courseid < this.courses.length;
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
      }
    },

    putAllOnDisplay: function () {
      this.setDisplayAllCourses(true);
    },

    removeAllFromDisplay: function () {
      this.setDisplayAllCourses(false);
    },

    setDisplayAllCourses: function (doDisplay) {
      var i;
      for (i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          this.courses[i].display = doDisplay;
        }
      }
    },

    removeFromDisplay: function (courseid) {
      // remove selected course
      this.courses[courseid].display = false;

    },

    getCoursesOnDisplay: function () {
      var i, courses;
      courses = [];
      for (i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          if (this.courses[i].display) {
            courses.push(i);
          }
        }
      }
      return courses;
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
      html += "<td><input class='allcourses' id=" + details.coursecount + " type=checkbox name=course></input></td>";
      html += "<td>" + details.res + "</td><td>" + this.totaltracks + "</td><td>";
      if (this.totaltracks > 0) {
        html += "<input id=" + details.coursecount + " class='alltracks' type=checkbox name=track></input>";
      }
      html += "</td><td></td></tr></table>";
      return html;
    },

    formatCourseDetails: function () {
      var i, details;
      details = { html: "", res: 0 };
      for (i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          details.html += "<tr><td>" + this.courses[i].name + "</td>" + "<td><input class='courselist' id=" + i + " type=checkbox name=course></input></td>";
          details.html += "<td>" + this.courses[i].resultcount + "</td>" + "<td>" + this.courses[i].trackcount + "</td><td>";
          details.res += this.courses[i].resultcount;
          if (this.courses[i].trackcount > 0) {
            details.html += "<input id=" + i + " class='tracklist' type=checkbox name=track></input></td>";
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

    drawLinesBetweenControls: function (pt, angle, courseid, opt) {
      this.courses[courseid].drawLinesBetweenControls(pt, angle, opt);
    }
  };
  rg2.Courses = Courses;
}());