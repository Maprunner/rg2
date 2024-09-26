import { Controls } from "./controls"
import { showWarningDialog } from "./utils"

export class CourseParser {
  constructor(e, worldfile, localWorldfile) {
    this.courses = []
    this.courseClassMapping = []
    this.newcontrols = new Controls()
    this.courses.length = 0
    this.courseClassMapping.length = 0
    this.fromOldCondes = false
    this.coursesGeoreferenced = false
    this.newcontrols.deleteAllControls()
    // holding copies of worldfiles: not ideal but it works
    this.localWorldfile = localWorldfile
    this.worldfile = worldfile
    this.processCoursesXML(e.target.result)
    this.addControlCount()
    return {
      courses: this.courses,
      newcontrols: this.newcontrols,
      mapping: this.courseClassMapping,
      georeferenced: this.coursesGeoreferenced
    }
  }

  processCoursesXML(rawXML) {
    let xml = null
    try {
      xml = new DOMParser().parseFromString(rawXML, "text/xml")
    } catch (err) {
      showWarningDialog("XML file error", "File is not a valid XML course file.")
      return
    }
    const nodelist = xml.getElementsByTagName("CourseData")
    if (nodelist.length === 0) {
      if (xml.documentElement.nodeName === "kml") {
        this.processKMLCourses(xml)
      } else {
        showWarningDialog("XML file error", "File is not a valid XML course file. CourseData element missing.")
      }
      return
    }
    const version = this.getVersion(xml)
    switch (version) {
      case "2.0.3":
        this.processIOFV2XMLCourses(xml)
        break
      case "3.0":
        this.processIOFV3XMLCourses(xml)
        break
      default:
        showWarningDialog("XML file error", "Invalid IOF file format. Version " + version + " not supported.")
    }
  }

  getVersion(xml) {
    let version = ""
    // test for IOF Version 2
    let nodelist = xml.getElementsByTagName("IOFVersion")
    if (nodelist.length > 0) {
      version = nodelist[0].getAttribute("version")
    }
    if (version === "") {
      // test for IOF Version 3
      nodelist = xml.getElementsByTagName("CourseData")
      if (nodelist.length > 0) {
        version = nodelist[0].getAttribute("iofVersion").trim()
        this.setCreator(nodelist[0].getAttribute("creator").trim())
      }
    }
    return version
  }

  setCreator(text) {
    // creator looks like "Condes version 10.1.1": need to extract version number
    const introLength = 15
    // allow handling of files from Condes before v10.1 which use original worldfile rather than WGS-84 as expected by IOF scheme
    if (text.indexOf("Condes") > -1) {
      if (text.length > introLength) {
        // parseFloat ignores everything from second decimal poin if it finds one
        // so we will get something like 10.1 from 10.1.1
        const version = parseFloat(text.substring(introLength))
        if (version < 10.1) {
          this.fromOldCondes = true
        }
      }
    }
  }

  processIOFV3XMLCourses(xml) {
    // extract all controls
    let nodelist = xml.getElementsByTagName("Control")
    // only need first-level Controls
    let pt = { x: 0, y: 0 }
    let controls = []
    for (let i = 0; i < nodelist.length; i += 1) {
      if (nodelist[i].parentNode.nodeName === "RaceCourseData") {
        const code = nodelist[i].getElementsByTagName("Id")[0].textContent
        const latlng = nodelist[i].getElementsByTagName("Position")
        if (this.localWorldfile.valid && latlng.length > 0) {
          pt = this.getXYFromLatLng(latlng)
          this.coursesGeoreferenced = true
        } else {
          // only works if all controls have lat/lon or none do: surely a safe assumption...
          pt = this.getXYFromMapPosition(nodelist[i].getElementsByTagName("MapPosition"))
        }
        let control = {}
        // don't want to save crossing points
        if (nodelist[i].getAttribute("type") !== "CrossingPoint") {
          this.newcontrols.addControl(code.trim(), pt.x, pt.y)
          control.id = i
          if (latlng.length > 0) {
            control.lat = parseFloat(latlng[0].getAttribute("lat"))
            control.lng = parseFloat(latlng[0].getAttribute("lng"))
          } else {
            control.lat = 0
            control.lng = 0
          }
          control.x = pt.x
          control.y = pt.y
          controls.push(control)
        }
      }
    }
    // extract all courses
    nodelist = xml.getElementsByTagName("Course")
    this.extractV3Courses(nodelist)
    // extract all course/class mappings
    nodelist = xml.getElementsByTagName("ClassCourseAssignment")
    this.extractV3CourseClassMapping(nodelist)
  }

  processKMLCourses(xml) {
    // reads OOM KML files: assumes we have a WGS-84 georeferenced map...
    // extract all controls
    let controls = []
    this.coursesGeoreferenced = true
    const places = xml.getElementsByTagName("Placemark")
    for (let i = 0; i < places.length; i = i + 1) {
      let pt = {}
      const code = places[i].getElementsByTagName("name")[0].childNodes[0].nodeValue.trim()
      const point = places[i].getElementsByTagName("Point")[0]
      const coords = point.getElementsByTagName("coordinates")[0].childNodes[0].nodeValue.trim().split(",")
      const lat = +coords[1]
      const lng = +coords[0]
      pt.x = this.worldfile.getX(lng, lat)
      pt.y = this.worldfile.getY(lng, lat)
      this.newcontrols.addControl(code.trim(), pt.x, pt.y)
      let control = {}
      control.id = i + 1
      control.lat = lat
      control.lng = lng
      control.x = pt.x
      control.y = pt.y
      controls.push(control)
    }
    // set up dummy score course
    let codes = []
    const courseName = "Course 1"
    const className = "Course 1"
    codes = this.newcontrols.controls.map(function (control) {
      return control.code
    })
    // courseid 0 for now: set when result mapping is known
    this.courses.push({
      courseid: 0,
      x: [],
      y: [],
      codes: codes,
      name: courseName
    })
    this.courseClassMapping.push({ course: courseName, className: className })
    document.getElementById("rg2-select-course-file").classList.add("is-valid")
  }

  getXYFromLatLng(latLng) {
    let pt = { x: 0, y: 0 }
    const lat = parseFloat(latLng[0].getAttribute("lat"))
    const lng = parseFloat(latLng[0].getAttribute("lng"))
    // handle old Condes-specific georeferencing
    if (this.fromOldCondes) {
      // use original map worldfile
      pt.x = this.localWorldfile.getX(lng, lat)
      pt.y = this.localWorldfile.getY(lng, lat)
    } else {
      // use WGS-84 worldfile as expected (?) by IOF V3 schema
      pt.x = this.worldfile.getX(lng, lat)
      pt.y = this.worldfile.getY(lng, lat)
    }
    return pt
  }

  processIOFV2XMLCourses(xml) {
    // extract all start controls
    this.extractV2Controls(xml.getElementsByTagName("StartPoint"), "StartPointCode")
    // extract all normal controls
    this.extractV2Controls(xml.getElementsByTagName("Control"), "ControlCode")
    // extract all finish controls
    this.coursesGeoreferenced = this.extractV2Controls(xml.getElementsByTagName("FinishPoint"), "FinishPointCode")
    if (this.coursesGeoreferenced) {
      if (this.localWorldfile.valid) {
        for (let i = 0; i < this.newcontrols.controls.length; i += 1) {
          const x = this.newcontrols.controls[i].x
          const y = this.newcontrols.controls[i].y
          this.newcontrols.controls[i].x = this.localWorldfile.getX(x, y)
          this.newcontrols.controls[i].y = this.localWorldfile.getY(x, y)
        }
      }
    }
    // extract all courses
    this.extractV2Courses(xml.getElementsByTagName("Course"))
  }

  extractV2Courses(nodelist) {
    for (let i = 0; i < nodelist.length; i += 1) {
      let codes = []
      let x = []
      let y = []
      const name = nodelist[i].getElementsByTagName("CourseName")[0].textContent.trim()
      codes = this.extractCodesFromControlList(nodelist[i], "ControlCode")
      // add start code at beginning of array
      codes.unshift(nodelist[i].getElementsByTagName("StartPointCode")[0].textContent.trim())
      codes.push(nodelist[i].getElementsByTagName("FinishPointCode")[0].textContent.trim())
      // courseid 0 for now: set when result mapping is known
      this.courses.push({ courseid: 0, x: x, y: y, codes: codes, name: name })
    }
    document.getElementById("rg2-select-course-file").classList.add("is-valid")
  }

  extractV3Courses(nodelist) {
    for (let i = 0; i < nodelist.length; i += 1) {
      let codes = []
      let x = []
      let y = []
      const name = nodelist[i].getElementsByTagName("Name")[0].textContent.trim()
      codes = this.extractCodesFromControlList(nodelist[i], "Control")
      // courseid 0 for now: set when result mapping is known
      this.courses.push({ courseid: 0, x: x, y: y, codes: codes, name: name })
    }
    document.getElementById("rg2-select-course-file").classList.add("is-valid")
  }

  extractV3CourseClassMapping(nodelist) {
    for (let i = 0; i < nodelist.length; i += 1) {
      const course = nodelist[i].getElementsByTagName("CourseName")[0].textContent.trim()
      const className = nodelist[i].getElementsByTagName("ClassName")[0].textContent.trim()
      this.courseClassMapping.push({ course: course, className: className })
    }
    document.getElementById("rg2-select-course-file").classList.add("is-valid")
  }

  extractCodesFromControlList(nodeList, tagName) {
    // tagName depends on IOF version being parsed
    const controlList = nodeList.getElementsByTagName("CourseControl")
    let codes = []
    for (let i = 0; i < controlList.length; i += 1) {
      // OCAD course files add a "Start" control at map changes which shows
      // shows up as a spurious control unless we ignore it here
      if (i === 0 || controlList[i].getAttribute("type") !== "Start") {
        const code = controlList[i].getElementsByTagName(tagName)[0].textContent.trim();
        // if control code doesn't exist it was a crossing point so we don't need it
        if (this.validControlCode(code)) {
          codes.push(code);
        }
      }
    }
    return codes
  }

  // returns true if controls are georeferenced
  extractV2Controls(nodelist, type) {
    let isGeoref = false
    let pt = { x: 0, y: 0 }
    for (let i = 0; i < nodelist.length; i += 1) {
      const code = nodelist[i].getElementsByTagName(type)[0].textContent
      const geopos = nodelist[i].getElementsByTagName("ControlPosition")
      // subtle bug and a half #190
      // if you have an IOF XML V2 file which has georeferenced controls AND
      // the map file itself isn't georeferenced
      // then you need to use X, Y and not the georeferenced co-ordinates
      if (geopos.length > 0 && this.localWorldfile.valid) {
        pt.x = parseFloat(geopos[0].getAttribute("x"))
        pt.y = parseFloat(geopos[0].getAttribute("y"))
        isGeoref = true
      } else {
        pt = this.getXYFromMapPosition(nodelist[i].getElementsByTagName("MapPosition"))
      }
      this.newcontrols.addControl(code.trim(), pt.x, pt.y)
    }
    return isGeoref
  }

  getXYFromMapPosition(mapPosition) {
    // #269 allow for getting a comma instead of a decimal point
    return {
      x: mapPosition[0].getAttribute("x").replace(",", "."),
      y: mapPosition[0].getAttribute("y").replace(",", ".")
    }
  }

  // check if a given control code is in the list of known controls
  validControlCode(code) {
    const controls = this.newcontrols.controls
    for (let i = 0; i < controls.length; i += 1) {
      if (controls[i].code === code) {
        return true
      }
    }
    return false
  }

  addControlCount() {
    for (let i = 0; i < this.courses.length; i += 1) {
      // codes include S and F so need to subtract 2 from length
      this.courses[i].controlcount = this.courses[i].codes.length - 2
    }
  }
}
