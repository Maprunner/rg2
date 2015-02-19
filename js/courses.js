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
    Constructor : Courses,

    getCourseName : function (courseid) {
      return this.courses[courseid].name;
    },

    getCoursesForEvent : function () {
      var courses = [];
      var course;
      var i;
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

    getHighestControlNumber : function () {
      return this.highestControlNumber;
    },

    getCourseDetails : function (courseid) {
      return this.courses[courseid];
    },

    incrementTracksCount : function (courseid) {
      this.courses[courseid].incrementTracksCount();
      this.totaltracks += 1;
    },

    addCourse : function (courseObject) {
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

    updateCourseDropdown : function () {
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

    updateControlDropdown : function () {
      var dropdown = document.getElementById("rg2-control-select");
      var opt;
      var i;
      $("#rg2-control-select").empty();
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

    deleteAllCourses : function () {
      this.courses.length = 0;
      this.numberofcourses = 0;
      this.totaltracks = 0;
      this.highestControlNumber = 0;
    },

    drawCourses : function (intensity) {
      var i;
      for (i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          this.courses[i].drawCourse(intensity);
        }
      }
    },

    putOnDisplay : function (courseid) {
      if (this.courses[courseid] !== undefined) {
        this.courses[courseid].display = true;
      }
    },

    putAllOnDisplay : function () {
      this.setDisplayAllCourses(true);
    },

    removeAllFromDisplay : function () {
      this.setDisplayAllCourses(false);
    },

    setDisplayAllCourses : function (doDisplay) {
      var i;
      for (i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          this.courses[i].display = doDisplay;
        }
      }
    },

    removeFromDisplay : function (courseid) {
      // remove selected course
      this.courses[courseid].display = false;

    },

    getCoursesOnDisplay : function () {
      var courses = [];
      var i;
      for (i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          if (this.courses[i].display) {
            courses.push(i);
          }
        }
      }
      return courses;
    },

    getNumberOfCourses : function () {
      return this.numberofcourses;
    },

    // look through all courses and extract list of controls
    generateControlList : function (controls) {
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

    setResultsCount : function () {
      var i;
      for (i = 0; i < this.courses.length; i += 1) {
        if (this.courses[i] !== undefined) {
          this.courses[i].resultcount = rg2.results.countResultsByCourseID(i);
        }
      }
    },

    formatCoursesAsTable : function () {
      var res = 0;
      var i;
      var html = "<table class='coursemenutable'><tr><th>" + rg2.t("Course") + "</th><th><i class='fa fa-eye'></i></th>";
      html += "<th>" + rg2.t("Runners") + "</th><th>" + rg2.t("Routes") + "</th><th><i class='fa fa-eye'></i></th></tr>";
      for (i = 0; i < this.courses.length; i += 1) {
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
    },

    drawLinesBetweenControls : function (x, y, angle, courseid, opt) {
      this.courses[courseid].drawLinesBetweenControls(x, y, angle, opt);
    }
  };
  rg2.Courses = Courses;
}());