/*global rg2:false */
(function () {
  function CourseParser(evt, worldfile, localWorldfile) {
    this.courses = [];
    this.newcontrols = new rg2.Controls();
    this.courses.length = 0;
    this.newcontrols.deleteAllControls();
    // holding copies of worldfiles: not ideal but it works
    this.localWorldfile = localWorldfile;
    this.worldfile = worldfile;
    this.processCoursesXML(evt);
    return {courses: this.courses, newcontrols: this.newcontrols};
  }

  CourseParser.prototype = {

    Constructor : CourseParser,

    processCoursesXML : function (evt) {
      var xml, version, nodelist, creator;
      version = "";
      creator = "";
      try {
        xml = $.parseXML(evt.target.result);
        nodelist = xml.getElementsByTagName('CourseData');
        if (nodelist.length === 0) {
          rg2.utils.showWarningDialog("XML file error", "File is not a valid XML course file. CourseData element missing.");
          return;
        }

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
            creator = nodelist[0].getAttribute('creator');
          }
        }
      } catch (err) {
        rg2.utils.showWarningDialog("XML file error", "File is not a valid XML course file.");
        return;
      }

      switch (version) {
      case "2.0.3":
        this.processIOFV2XML(xml);
        break;
      case "3.0":
        this.processIOFV3XML(xml, creator);
        break;
      default:
        rg2.utils.showWarningDialog("XML file error", 'Invalid IOF file format. Version ' + version + ' not supported.');
      }
    },

    extractV3Courses : function (nodelist) {
      var i, j, course, codes, x, y, controllist, tmp;
      for (i = 0; i < nodelist.length; i += 1) {
        course = {};
        codes = [];
        x = [];
        y = [];
        course.name = nodelist[i].getElementsByTagName('Name')[0].textContent;
        controllist = nodelist[i].getElementsByTagName('CourseControl');
        for (j = 0; j < controllist.length; j += 1) {
          tmp = controllist[j].getElementsByTagName('Control')[0].textContent;
          // if control code doesn't exist it was a crossing point so we don't need it
          if (this.validControlCode(tmp)) {
            codes.push(tmp.trim());
          }
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

    processIOFV3XML : function (xml, creator) {
      // extract all controls
      var nodelist, i, code, mappos, x, y, condes, latlng, lat, lng;
      condes = false;
      // handle files from Condes which use original worldfile rather than WGS-84 as expected by IOF scheme
      if (creator) {
        if (creator.indexOf('Condes') > -1) {
          condes = true;
        }
      }
      nodelist = xml.getElementsByTagName('Control');
      // only need first-level Controls
      for (i = 0; i < nodelist.length; i += 1) {
        if (nodelist[i].parentNode.nodeName === 'RaceCourseData') {
          code = nodelist[i].getElementsByTagName("Id")[0].textContent;
          latlng = nodelist[i].getElementsByTagName("Position");
          if ((this.localworldfile.valid) && (latlng.length > 0)) {
            lat = latlng[0].getAttribute('lat');
            lng = latlng[0].getAttribute('lng');
            // handle Condes-specific georeferencing
            if (condes) {
              // use original map worldfile
              x = this.localworldfile.getX(lng, lat);
              y = this.localworldfile.getY(lng, lat);
            } else {
              // use WGS-84 worldfile as expected (?) by IOF V3 schema
              x = this.worldfile.getX(lng, lat);
              y = this.worldfile.getY(lng, lat);
            }
            this.coursesGeoreferenced = true;
          } else {
            // only works if all controls have lat/lon or none do: surely a safe assumption...
            mappos = nodelist[i].getElementsByTagName("MapPosition");
            x = mappos[0].getAttribute('x');
            y = mappos[0].getAttribute('y');
          }
          // don't want to save crossing points
          if (nodelist[i].getAttribute('type') !== 'CrossingPoint') {
            this.newcontrols.addControl(code.trim(), x, y);
          }
        }
      }
      // extract all courses
      nodelist = xml.getElementsByTagName('Course');
      this.extractV3Courses(nodelist);
    },

    processIOFV2XML : function (xml) {
      var nodelist, controlsGeoref, i, x, y;
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
          for (i = 0; i < this.newcontrols.controls.length; i += 1) {
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

    extractV2Courses : function (nodelist) {
      var i, j, course, codes, x, y, controllist, tmp;
      for (i = 0; i < nodelist.length; i += 1) {
        course = {};
        codes = [];
        x = [];
        y = [];
        course.name = nodelist[i].getElementsByTagName('CourseName')[0].textContent.trim();
        codes.push(nodelist[i].getElementsByTagName('StartPointCode')[0].textContent.trim());
        controllist = nodelist[i].getElementsByTagName('CourseControl');
        for (j = 0; j < controllist.length; j += 1) {
          tmp = controllist[j].getElementsByTagName('ControlCode')[0].textContent.trim();
          // if control code doesn't exist it was a crossing point so we don't need it
          if (this.validControlCode(tmp)) {
            codes.push(tmp);
          }
        }
        codes.push(nodelist[i].getElementsByTagName('FinishPointCode')[0].textContent.trim());

        course.codes = codes;
        // 0 for now: set when result mapping is known
        course.courseid = 0;
        course.x = x;
        course.y = y;
        this.courses.push(course);
      }
      $("#rg2-select-course-file").addClass('valid');
    },

    // returns true if controls are georeferenced
    extractV2Controls : function (nodelist, type) {
      var i, x, y, code, mappos, geopos, isGeoref;
      isGeoref = false;
      for (i = 0; i < nodelist.length; i += 1) {
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

    // check if a given control code is in the list of known controls
    validControlCode : function (code) {
      var i, controls;
      controls = this.newcontrols.controls;
      for (i = 0; i < controls.length; i += 1) {
        if (controls[i].code === code) {
          return true;
        }
      }
      return false;
    }
  };
  rg2.CourseParser = CourseParser;
}());