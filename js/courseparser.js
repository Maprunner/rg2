/*global rg2:false */
(function () {
  function CourseParser(evt, worldfile, localWorldfile) {
    this.courses = [];
    this.courseClassMapping = [];
    this.newcontrols = new rg2.Controls();
    this.courses.length = 0;
    this.courseClassMapping.length = 0;
    this.fromOldCondes = false;
    this.coursesGeoreferenced = false;
    this.newcontrols.deleteAllControls();
    // holding copies of worldfiles: not ideal but it works
    this.localWorldfile = localWorldfile;
    this.worldfile = worldfile;
    this.processCoursesXML(evt.target.result);
    return {courses: this.courses, newcontrols: this.newcontrols, mapping: this.courseClassMapping, georeferenced: this.coursesGeoreferenced};
  }

  CourseParser.prototype = {

    Constructor : CourseParser,

    processCoursesXML : function (rawXML) {
      var xml, version, nodelist;
      try {
        xml = $.parseXML(rawXML);
      } catch (err) {
        rg2.utils.showWarningDialog("XML file error", "File is not a valid XML course file.");
        return;
      }
      nodelist = xml.getElementsByTagName('CourseData');
      if (nodelist.length === 0) {
        if (xml.documentElement.nodeName === "kml") {
          this.processKMLCourses(xml);
        } else {
          rg2.utils.showWarningDialog("XML file error", "File is not a valid XML course file. CourseData element missing.");
        }
        return;
      }
      version = this.getVersion(xml);
      switch (version) {
      case "2.0.3":
        this.processIOFV2XMLCourses(xml);
        break;
      case "3.0":
        this.processIOFV3XMLCourses(xml);
        break;
      default:
        rg2.utils.showWarningDialog("XML file error", 'Invalid IOF file format. Version ' + version + ' not supported.');
      }
    },

    getVersion : function (xml) {
      var nodelist, version;
      version = "";
      // test for IOF Version 2
      nodelist = xml.getElementsByTagName('IOFVersion');
      if (nodelist.length > 0) {
        version = nodelist[0].getAttribute('version');
      }
      if (version === "") {
        // test for IOF Version 3
        nodelist = xml.getElementsByTagName('CourseData');
        if (nodelist.length > 0) {
          version = nodelist[0].getAttribute('iofVersion').trim();
          this.setCreator(nodelist[0].getAttribute('creator').trim());
        }
      }
      return version;
    },

    setCreator : function (text) {
      var version;
      // creator looks like "Condes version 10.1.1": need to extract version number
      var introLength = 15;
      // allow handling of files from Condes before v10.1 which use original worldfile rather than WGS-84 as expected by IOF scheme
      if (text.indexOf('Condes') > -1) {
        if (text.length > introLength) {
          // parseFloat ignores everything from second decimal poin if it finds one
          // so we will get something like 10.1 from 10.1.1
          version = parseFloat(text.substring(introLength));
          if (version < 10.1) {
            this.fromOldCondes = true;
          }
        }
      }
    },

    processIOFV3XMLCourses : function (xml) {
      // extract all controls
      var nodelist, i, code, pt, latlng, controls, control;
      nodelist = xml.getElementsByTagName('Control');
      // only need first-level Controls
      pt = {x: 0, y: 0};
      controls = [];
      for (i = 0; i < nodelist.length; i += 1) {
        if (nodelist[i].parentNode.nodeName === 'RaceCourseData') {
          code = nodelist[i].getElementsByTagName("Id")[0].textContent;
          latlng = nodelist[i].getElementsByTagName("Position");
          if ((this.localWorldfile.valid) && (latlng.length > 0)) {
            pt = this.getXYFromLatLng(latlng);
            this.coursesGeoreferenced = true;
          } else {
            // only works if all controls have lat/lon or none do: surely a safe assumption...
            pt = this.getXYFromMapPosition(nodelist[i].getElementsByTagName("MapPosition"));
          }
          // don't want to save crossing points
          if (nodelist[i].getAttribute('type') !== 'CrossingPoint') {
            this.newcontrols.addControl(code.trim(), pt.x, pt.y);
            control = {};
            control.id = i;
            if (latlng.length > 0) {
              control.lat = parseFloat(latlng[0].getAttribute('lat'));
              control.lng = parseFloat(latlng[0].getAttribute('lng')); 
            } else {
              control.lat = 0;
              control.lng = 0;
            }
            control.x = pt.x;
            control.y = pt.y;
            controls.push(control);
          }
        }
      }
      // extract all courses
      nodelist = xml.getElementsByTagName('Course');
      this.extractV3Courses(nodelist);
      // extract all course/class mappings
      nodelist = xml.getElementsByTagName('ClassCourseAssignment');
      this.extractV3CourseClassMapping(nodelist);
    },

    processKMLCourses : function (xml) {
      // reads OOM KML files: assumes we have a WGS-84 georeferenced map...
      // extract all controls
      var places, point, coords, code, pt, controls, control, i, codes, className, courseName, lat, lng;
      controls = [];
      this.coursesGeoreferenced = true;
      places = xml.getElementsByTagName('Placemark');
      for (i = 0; i < places.length; i = i + 1 ) {
        pt = {};
        code = places[i].getElementsByTagName('name')[0].childNodes[0].nodeValue.trim();
        point = places[i].getElementsByTagName('Point')[0];
        coords = point.getElementsByTagName('coordinates')[0].childNodes[0].nodeValue.trim().split(",");
        lat = +coords[1];
        lng = +coords[0];
        pt.x = this.worldfile.getX(lng, lat);
        pt.y = this.worldfile.getY(lng, lat);
        this.newcontrols.addControl(code.trim(), pt.x, pt.y);
        control = {};
        control.id = i + 1;
        control.lat = lat;
        control.lng = lng;
        control.x = pt.x;
        control.y = pt.y;
        controls.push(control);
      }
      // set up dummy score course
      codes = [];
      courseName = "Course 1";
      className = "Course 1";
      codes = this.newcontrols.controls.map(function (control) { return control.code;});
      // courseid 0 for now: set when result mapping is known
      this.courses.push({courseid: 0, x: [], y: [], codes: codes, name: courseName});   
      this.courseClassMapping.push({'course': courseName, 'className': className});
      $("#rg2-select-course-file").addClass('valid');
    },

    getXYFromLatLng : function (latLng) {
      var lat, lng, pt;
      pt = {x: 0, y: 0};
      lat = parseFloat(latLng[0].getAttribute('lat'));
      lng = parseFloat(latLng[0].getAttribute('lng'));
      // handle old Condes-specific georeferencing
      if (this.fromOldCondes) {
        // use original map worldfile
        pt.x = this.localWorldfile.getX(lng, lat);
        pt.y = this.localWorldfile.getY(lng, lat);
      } else {
        // use WGS-84 worldfile as expected (?) by IOF V3 schema
        pt.x = this.worldfile.getX(lng, lat);
        pt.y = this.worldfile.getY(lng, lat);
      }
      return pt;
    },

    processIOFV2XMLCourses : function (xml) {
      var i, x, y;
      // extract all start controls
      this.extractV2Controls(xml.getElementsByTagName('StartPoint'), 'StartPointCode');
      // extract all normal controls
      this.extractV2Controls(xml.getElementsByTagName('Control'), 'ControlCode');
      // extract all finish controls
      this.coursesGeoreferenced = this.extractV2Controls(xml.getElementsByTagName('FinishPoint'), 'FinishPointCode');
      if (this.coursesGeoreferenced) {
        if (this.localWorldfile.valid) {
          for (i = 0; i < this.newcontrols.controls.length; i += 1) {
            x = this.newcontrols.controls[i].x;
            y = this.newcontrols.controls[i].y;
            this.newcontrols.controls[i].x = this.localWorldfile.getX(x, y);
            this.newcontrols.controls[i].y = this.localWorldfile.getY(x, y);
          }
        }
      }
      // extract all courses
      this.extractV2Courses(xml.getElementsByTagName('Course'));
    },

    extractV2Courses : function (nodelist) {
      var i, name, codes, x, y;
      for (i = 0; i < nodelist.length; i += 1) {
        codes = [];
        x = [];
        y = [];
        name = nodelist[i].getElementsByTagName('CourseName')[0].textContent.trim();
        codes = this.extractCodesFromControlList(nodelist[i], "ControlCode");
        // add start code at beginning of array
        codes.unshift(nodelist[i].getElementsByTagName('StartPointCode')[0].textContent.trim());
        codes.push(nodelist[i].getElementsByTagName('FinishPointCode')[0].textContent.trim());
        // courseid 0 for now: set when result mapping is known
        this.courses.push({courseid: 0, x: x, y: y, codes: codes, name: name});
      }
      $("#rg2-select-course-file").addClass('valid');
    },

    extractV3Courses : function (nodelist) {
      var i, name, codes, x, y;
      for (i = 0; i < nodelist.length; i += 1) {
        codes = [];
        x = [];
        y = [];
        name = nodelist[i].getElementsByTagName('Name')[0].textContent.trim();
        codes = this.extractCodesFromControlList(nodelist[i], "Control");
        // courseid 0 for now: set when result mapping is known
        this.courses.push({courseid: 0, x: x, y: y, codes: codes, name: name});
      }
      $("#rg2-select-course-file").addClass('valid');
    },

    extractV3CourseClassMapping : function (nodelist) {
      var i, course, className;
      for (i = 0; i < nodelist.length; i += 1) {
        course = nodelist[i].getElementsByTagName('CourseName')[0].textContent.trim();
        className = nodelist[i].getElementsByTagName('ClassName')[0].textContent.trim();
        this.courseClassMapping.push({'course': course, 'className': className});
      }
      $("#rg2-select-course-file").addClass('valid');
    },

    extractCodesFromControlList : function (nodeList, tagName) {
      // tagName depends on IOF version being parsed
      var i, code, codes, controlList;
      controlList = nodeList.getElementsByTagName('CourseControl');
      codes = [];
      for (i = 0; i < controlList.length; i += 1) {
        code = controlList[i].getElementsByTagName(tagName)[0].textContent.trim();
        // if control code doesn't exist it was a crossing point so we don't need it
        if (this.validControlCode(code)) {
          codes.push(code);
        }
      }
      return codes;
    },

    // returns true if controls are georeferenced
    extractV2Controls : function (nodelist, type) {
      var i, pt, code, geopos, isGeoref;
      isGeoref = false;
      pt = {x: 0, y: 0};
      for (i = 0; i < nodelist.length; i += 1) {
        code = nodelist[i].getElementsByTagName(type)[0].textContent;
        geopos = nodelist[i].getElementsByTagName("ControlPosition");
        // subtle bug and a half #190
        // if you have an IOF XML V2 file which has georeferenced controls AND
        // the map file itself isn't georeferenced
        // then you need to use X, Y and not the georeferenced co-ordinates
        if ((geopos.length > 0) && (this.localWorldfile.valid)) {
          pt.x = parseFloat(geopos[0].getAttribute('x'));
          pt.y = parseFloat(geopos[0].getAttribute('y'));
          isGeoref = true;
        } else {
          pt = this.getXYFromMapPosition(nodelist[i].getElementsByTagName("MapPosition"));
        }
        this.newcontrols.addControl(code.trim(), pt.x, pt.y);
      }
      return isGeoref;
    },

    getXYFromMapPosition : function (mapPosition) {
      // #269 allow for getting a comma instead of a decimal point
      return {x: mapPosition[0].getAttribute('x').replace(",", "."), y: mapPosition[0].getAttribute('y').replace(",", ".")};
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