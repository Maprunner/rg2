/*global rg2:false */
(function () {
  function CourseParser(evt, worldfile, localWorldfile) {
    this.courses = [];
    this.newcontrols = new rg2.Controls();
    this.courses.length = 0;
    this.fromCondes = false;
    this.newcontrols.deleteAllControls();
    // holding copies of worldfiles: not ideal but it works
    this.localWorldfile = localWorldfile;
    this.worldfile = worldfile;
    this.processCoursesXML(evt.target.result);
    return {courses: this.courses, newcontrols: this.newcontrols};
  }

  CourseParser.prototype = {

    Constructor : CourseParser,

    processCoursesXML : function (rawXML) {
      var xml, version, nodelist;
      try {
        xml = $.parseXML(rawXML);
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
            version = nodelist[0].getAttribute('iofVersion').trim();
            this.setCreator(nodelist[0].getAttribute('creator').trim());
          }
        }
      } catch (err) {
        rg2.utils.showWarningDialog("XML file error", "File is not a valid XML course file.");
        return;
      }

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

    setCreator : function (text) {
      // allow handling of files from Condes which use original worldfile rather than WGS-84 as expected by IOF scheme
      if (text.indexOf('Condes') > -1) {
        this.fromCondes = true;
      }
    },

    processIOFV3XMLCourses : function (xml) {
      // extract all controls
      var nodelist, i, code, pt, latlng;
      nodelist = xml.getElementsByTagName('Control');
      // only need first-level Controls
      pt = {x: 0, y: 0};
      for (i = 0; i < nodelist.length; i += 1) {
        if (nodelist[i].parentNode.nodeName === 'RaceCourseData') {
          code = nodelist[i].getElementsByTagName("Id")[0].textContent;
          latlng = nodelist[i].getElementsByTagName("Position");
          if ((this.localworldfile.valid) && (latlng.length > 0)) {
            pt = this.getXYFromLatLng(latlng);
            this.coursesGeoreferenced = true;
          } else {
            // only works if all controls have lat/lon or none do: surely a safe assumption...
            pt = this.getXYFromMapPosition(nodelist[i].getElementsByTagName("MapPosition"));
          }
          // don't want to save crossing points
          if (nodelist[i].getAttribute('type') !== 'CrossingPoint') {
            this.newcontrols.addControl(code.trim(), pt.x, pt.y);
          }
        }
      }
      // extract all courses
      nodelist = xml.getElementsByTagName('Course');
      this.extractV3Courses(nodelist);
    },

    getXYFromLatLng : function (latLng) {
      var lat, lng, pt;
      pt = {x: 0, y: 0};
      lat = latLng[0].getAttribute('lat');
      lng = latLng[0].getAttribute('lng');
      // handle Condes-specific georeferencing
      if (this.fromCondes) {
        // use original map worldfile
        pt.x = this.localworldfile.getX(lng, lat);
        pt.y = this.localworldfile.getY(lng, lat);
      } else {
        // use WGS-84 worldfile as expected (?) by IOF V3 schema
        pt.x = this.worldfile.getX(lng, lat);
        pt.y = this.worldfile.getY(lng, lat);
      }
      return pt;
    },

    processIOFV2XMLCourses : function (xml) {
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
        if ((geopos.length > 0) && (this.localworldfile.valid)) {
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
      return {x: mapPosition[0].getAttribute('x'), y: mapPosition[0].getAttribute('y')};
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