// eslint-disable-next-line no-unused-vars
import * as bootstrap from "bootstrap"
import { getApi, postApi } from "./api"
import { ctx, getMapSize, loadNewMap, redraw } from "./canvas"
import { config, getOverprintDetails } from "./config"
import { Controls } from "./controls"
import { CourseParser } from "./courseparser"
import {
  doGetEvents,
  isScoreEvent,
  getEventInfoForKartatID,
  loadEventByKartatID,
  mapIDIsInUse,
  setActiveEventIDByKartatID,
  setEventTitleBar
} from "./events"
import { Georefs } from "./georefs"
import { decode } from "html-entities"
import { MapData } from "./mapdata"
import proj4 from "proj4"
import { ResultParser } from "./resultparser"
import { getRoutesForEvent } from "./results"
import { t } from "./translate"
import { User } from "./user"
import { createModalDialog, generateSelectOption, showWarningDialog, validateValue } from "./utils"
import { Datepicker } from "vanillajs-datepicker"
import { Worldfile } from "./worldfile"
import L from "leaflet"
// TODO import css somewhere else?
import "leaflet/dist/leaflet.css"

let user = null
let newMap = new MapData()
let georefsystems = new Georefs()
let mapIndex = null
let format = null
let newEventIsScoreEvent = false
let hasResults = true
let newcontrols = null
let courses = []
let mapping = []
let isEnrichCourseNames = false
let mapLoaded = false
let coursesGeoreferenced = false
let controlsAdjusted = false
let drawingCourses = false
let drawnCourse = {}
let results = []
let variants = []
let resultCourses = []
let mapFile = undefined
let resultsOrCourseFile = undefined
let resultsFileFormat = ""
// list of possible encodings from results or course file: just add new ones to the array if needed
const encodings = ["UTF-8", "ISO-8859-1", "windows-1251"]
// count of errors when parsing each encoding type
let errorCount = []
// current index into encodings
let encodingIndex = 0
// state flag showing we have found the least worst encoding so use anyway
let useThisEncoding = false
let backgroundLocked = false
let sortResults = false
let handle = { x: null, y: null }
let maps = []
let mapSize = { height: 0, width: 0 }
let localworldfile = new Worldfile(0)
let worldfile = new Worldfile(0)
let georefmap = null
let unusedMaps = []
let eventSelectDatePicker = null
let eventEditDatePicker = null
let activeEditEventID = null
const defaultExcludedText = "e.g. 1|1|6,60|15,60"

function addNewControl(x, y) {
  // add new control: generate a code for it
  let code
  if (newcontrols.controls.length === 0) {
    code = "S" + (newcontrols.controls.length + 1)
  } else {
    code = "X" + (newcontrols.controls.length + 1)
  }
  newcontrols.addControl(code, x, y)
  newcontrols.displayAllControls()
  drawnCourse.codes.push(code)
  drawnCourse.x.push(x)
  drawnCourse.y.push(y)
}

// based on adjustTrack from draw.js
export function adjustManagerControls(p1, p2, button) {
  // console.log (p1.x, p1.y, p2.x, p2.y, handle.x, handle.y, button)
  if (backgroundLocked || button === config.RIGHT_CLICK) {
    // drag track and background
    ctx.translate(p2.x - p1.x, p2.y - p1.y)
  } else {
    controlsAdjusted = true
    if (handle.x !== null) {
      // scale controls
      const scaleX = (p2.x - handle.x) / (p1.x - handle.x)
      const scaleY = (p2.y - handle.y) / (p1.y - handle.y)
      // don't rotate: we are assuming controls and map are already rotated the same
      // console.log (p1.x, p1.y, p2.x, p2.y, handle.x, handle.y, scaleX, scaleY)
      if (isFinite(scaleX) && isFinite(scaleY)) {
        // just ignore very small moves
        for (let i = 0; i < newcontrols.controls.length; i += 1) {
          const x = newcontrols.controls[i].oldX - handle.x
          const y = newcontrols.controls[i].oldY - handle.y
          newcontrols.controls[i].x = x * scaleX + handle.x
          newcontrols.controls[i].y = y * scaleY + handle.y
        }
      }
    } else {
      // drag controls
      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      for (let i = 0; i < newcontrols.controls.length; i += 1) {
        newcontrols.controls[i].x = newcontrols.controls[i].oldX + dx
        newcontrols.controls[i].y = newcontrols.controls[i].oldY + dy
      }
    }
  }
}

function checkResultsFileEncoding(e) {
  // not pretty but it works
  // need to use the array of possible encodings that we want to try if the file is not UTF-8
  // might be better to use a synchronous read, but that needs a worker thread
  const errors = testForInvalidCharacters(e.target.result)
  // if this encoding is clean, or we have tried everything so this is the least worst case
  if (errors === 0 || useThisEncoding) {
    // use this version of the results
    processResultFile(e)
    return
  }
  errorCount[encodingIndex] = errors
  encodingIndex += 1
  // have we tried all the encodings?
  if (encodingIndex === encodings.length) {
    let lowest = 99999
    // no clean encodings found, since we would have escaped by now, so find least worst
    for (let i = 0; i < encodings.length; i += 1) {
      if (lowest > errorCount[i]) {
        encodingIndex = i
        lowest = errorCount[i]
      }
    }
    // force this one to be used next time we get back here
    useThisEncoding = true
  }
  // try a new encoding
  readResults()
}

function confirmAddMap() {
  let dlg = {}
  dlg.body = "Are you sure you want to add this map?"
  dlg.title = "Confirm new map"
  dlg.classes = "rg2-confirm-add-map-dialog"
  dlg.doText = "Add map"
  dlg.onDo = doUploadMapFile
  createModalDialog(dlg)
}

function confirmCreateEvent(e) {
  e.preventDefault()
  const valid = validateData()
  if (valid !== "OK") {
    showWarningDialog(
      "Event set-up incomplete",
      valid + " Please enter all necessary information and make sure controls are aligned before creating the event."
    )
    return
  }
  let dlg = {}
  dlg.body = "Are you sure you want to create this event?"
  dlg.title = "Confirm event creation"
  dlg.classes = "rg2-confirm-create-event-dialog"
  dlg.doText = "Create event"
  dlg.onDo = doCreateEvent
  createModalDialog(dlg)
}

function confirmDeleteEvent() {
  const id = document.getElementById("rg2-edit-event-selected").value
  let dlg = {}
  dlg.body = "Event " + id + " will be deleted. Are you sure?"
  dlg.title = "Confirm event delete"
  dlg.classes = "rg2-confirm-delete-event-dialog"
  dlg.doText = "Delete event"
  dlg.onDo = doDeleteEvent
  createModalDialog(dlg)
}

function confirmDeleteRoute() {
  const routeid = document.getElementById("rg2-route-selected").value
  if (routeid === "undefined") {
    showWarningDialog("Warning", "No route selected.")
    return
  }
  let dlg = {}
  dlg.body = "Route " + routeid + " will be permanently deleted. Are you sure?"
  dlg.title = "Confirm route delete"
  dlg.classes = "rg2-confirm-route-delete-dialog"
  dlg.doText = "Delete route"
  dlg.onDo = doDeleteRoute
  createModalDialog(dlg)
}

function confirmDeleteUnusedMaps() {
  const boxes = document.querySelectorAll(".unused-map input[type=checkbox]:checked")
  let checked = []
  for (let box of boxes) {
    if (box.checked) {
      checked.push(parseInt(box.dataset.mapId, 10))
    }
    for (let i = 0; i < unusedMaps.length; i += 1) {
      if (checked.indexOf(unusedMaps[i].mapid) > -1) {
        unusedMaps[i].delete = true
      } else {
        unusedMaps[i].delete = false
      }
    }
  }
  if (checked.length === 0) {
    showWarningDialog("Warning", "No maps selected.")
    return
  }
  const dlg = {}
  dlg.body = "Selected maps will be deleted. Are you sure?"
  dlg.title = "Confirm map deletion"
  dlg.doText = "Delete maps"
  dlg.onDo = doDeleteUnusedMaps
  createModalDialog(dlg)
}

function confirmUpdateEvent() {
  let dlg = {}
  dlg.body = `Are you sure you want to update ${document.getElementById("rg2-edit-event-name").value}?`
  dlg.title = "Confirm event update"
  dlg.doText = "Update event"
  dlg.onDo = doUpdateEvent
  createModalDialog(dlg)
}

function convertWorldFile(value) {
  // takes in a World file for the map image and translates it to WGS84 (GPS)
  try {
    const system = georefsystems.getGeorefSystem(value)
    //console.log(system)
    mapSize = getMapSize()
    if (!localworldfile.valid || mapSize.width === 0 || system.name === "none") {
      // no map or world file loaded or user selected do not georef
      throw "Do not georeference"
    }
    // set up source which is how map was originally georeferenced
    proj4.defs(system.name, system.params)
    const source = new proj4.Proj(system.name)
    // dest is WGS84 as used by GPS: included by default in proj4.defs
    const dest = new proj4.Proj("EPSG:4326")
    // calculation based on fixed points on map
    // x0, y0 is top left, x1, y1 is bottom right, x2, y2 is top right, x3, y3 is bottom left
    // 0, 1 and 2 are saved by the API, and must have these settings
    // 4 is just used here
    // save pixel values of these locations for map image
    const xpx = [0, mapSize.width, mapSize.width, 0]
    const ypx = [0, mapSize.height, 0, mapSize.height]

    // calculate the same locations using worldfile for the map
    let xsrc = []
    let ysrc = []
    for (let i = 0; i < 4; i += 1) {
      xsrc[i] = localworldfile.getLon(xpx[i], ypx[i])
      ysrc[i] = localworldfile.getLat(xpx[i], ypx[i])
    }

    newMap.xpx.length = 0
    newMap.ypx.length = 0
    newMap.lat.length = 0
    newMap.lon.length = 0
    // translate source georef to WGS84 (as in GPS file) and store with newMap details
    // Careful: p[] has x = lon and y = lat
    let p = []
    for (let i = 0; i < 4; i += 1) {
      let pt = {}
      pt.x = xsrc[i]
      pt.y = ysrc[i]
      p.push(pt)
      const transformed = proj4(source, dest, p[i])
      newMap.xpx.push(xpx[i])
      newMap.ypx.push(ypx[i])
      newMap.lat.push(transformed.y)
      newMap.lon.push(transformed.x)
    }

    let wf = {}
    // X = Ax + By + C, Y = Dx + Ey + F
    // C = X - Ax - By, where x and y are 0
    wf.C = p[0].x
    // F = Y - Dx - Ey, where X and Y are 0
    wf.F = p[0].y
    // A = (X - By - C) / x where y = 0
    wf.A = (p[2].x - wf.C) / xpx[2]
    // B = (X - Ax - C) / y where x = 0
    wf.B = (p[3].x - wf.C) / ypx[3]
    // D = (Y - Ey - F) / x where y = 0
    wf.D = (p[2].y - wf.F) / xpx[2]
    // E = (Y - Dx - F) / y where x = 0
    wf.E = (p[3].y - wf.F) / ypx[3]
    //console.log("Calculated lon diff = " + (((wf.A * xpx[1]) + (wf.B * ypx[1]) + wf.C) - p[1].x))
    //console.log("Calculated lat diff = " + (((wf.D * xpx[1]) + (wf.E * ypx[1]) + wf.F) - p[1].y))
    newMap.worldfile = new Worldfile(wf)
    updateGeorefMap()
  } catch (err) {
    newMap.worldfile = new Worldfile(0)
    updateGeorefMap()
    return
  }
}

function copyXYToOldXY() {
  // rebaseline control locations
  for (let i = 0; i < newcontrols.controls.length; i += 1) {
    newcontrols.controls[i].oldX = newcontrols.controls[i].x
    newcontrols.controls[i].oldY = newcontrols.controls[i].y
  }
}

function createCourseDropdown(course, courseidx) {
  let idx = -1
  // check against list of course names first to default to results by course
  // do known courses include this course name?
  // This covers "Brown" results mapping to a "Brown" course
  for (let i = 0; i < courses.length; i += 1) {
    if (courses[i].name === course) {
      idx = i
      break
    }
  }
  // If we didn't match a course name then try a class name
  // This covers M50 results mapping to course 3 as defined in the course XML
  if (idx === -1 && mapping.length > 0) {
    for (let i = 0; i < mapping.length; i += 1) {
      if (mapping[i].className === course) {
        // now have course name so look it up to get index
        for (let j = 0; j < courses.length; j += 1) {
          if (courses[j].name === mapping[i].course) {
            idx = j
            break
          }
        }
        break
      }
    }
  }
  let html = `<select id='rg2-alloc-${courseidx}' class="form-control form-control-sm">`
  html += `<option value="${config.DO_NOT_SAVE_COURSE}"${idx === -1 ? " selected" : ""}>Do not save</option>`
  for (let i = 0; i < courses.length; i += 1) {
    html += `<option value="${i}"${idx === i ? " selected" : ""}>${enrichCourseName(courses[i].name)}</option>`
  }
  html += `</select >`
  return html
}

function createResultCourseMapping() {
  // create a dummy result-course mapping
  // to allow display of courses with no results
  if (!hasResults) {
    resultCourses.length = 0
    for (let i = 0; i < courses.length; i += 1) {
      resultCourses.push({
        courseid: courses[i].courseid,
        course: courses[i].name
      })
    }
  }
}

function displayCourseAllocations() {
  let html = ""
  if (courses.length && resultCourses.length) {
    html = `<div class="fw-bold">Results</div><div class="fw-bold">Course</div>`
    for (let i = 0; i < resultCourses.length; i += 1) {
      html += `<div>${resultCourses[i].course}</div>`
      html += `<div>${createCourseDropdown(resultCourses[i].course, i)}</div>`
    }
    document.getElementById("rg2-course-allocations").innerHTML = html
  }
}

function displayInfoDialog(title, info) {
  let dlg = {}
  dlg.body = info
  dlg.title = title
  dlg.doText = "Ok"
  // do nothing on close
  dlg.onDo = () => {}
  // false removes cancel button
  createModalDialog(dlg, false)
}

function displayUnusedMaps(maps) {
  let html = "<div class='title'>ID</div><div class='title'>Name</div><div><i class='bi-trash'></i></div>"
  if (maps.length === 0) {
    html += "<div></div><div>None found.</div><div></div>"
    document.getElementById("btn-delete-unused-maps").setAttribute("disabled", "")
  } else {
    for (let i = 0; i < maps.length; i += 1) {
      html += "<div>" + maps[i].mapid + "</div>"
      html += "<div>" + maps[i].name + "</div>"
      html += "<div class='unused-map'><input type='checkbox' data-map-id=" + maps[i].mapid + "></div>"
    }
    document.getElementById("btn-delete-unused-maps").removeAttribute("disabled")
  }
  document.getElementById("rg2-unused-maps").innerHTML = html
}

function doAddMap() {
  const params = { type: "addmap" }
  newMap.localworldfile = localworldfile
  const data = { ...newMap, ...user.encodeUser() }
  postApi(JSON.stringify(data), params, handleMapAdded, "Map save failed")
}

function doCreateEvent() {
  const data = { ...generateNewEventData(), ...user.encodeUser() }
  const params = { type: "createevent" }
  postApi(JSON.stringify(data), params, handleEventAdded, "Event creation failed")
}

function doDeleteEvent() {
  const id = document.getElementById("rg2-edit-event-selected").value
  const params = { type: "deleteevent", id: id }
  postApi(JSON.stringify(user.encodeUser()), params, handleEventDeleted(id), "Event deletion failed")
}

function doDeleteRoute() {
  const id = document.getElementById("rg2-edit-event-selected").value
  const routeid = document.getElementById("rg2-route-selected").value
  const params = { type: "deleteroute", id: id, routeid: routeid }
  postApi(JSON.stringify(user.encodeUser()), params, handleRouteDeleted(id, routeid), "Route delete failed")
}

function doDeleteUnusedMaps() {
  let data = user.encodeUser()
  data.maps = unusedMaps.filter((map) => map.delete === true).map((map) => map.mapid)
  const params = { type: "deleteunusedmaps" }
  postApi(JSON.stringify(data), params, handleUnusedMapsDeleted, "Map deletion failed")
}

export function doGetMaps() {
  const params = { type: "maps" }
  getApi(params, handleMapsLoaded, "Events request failed")
}

function doLogin() {
  const params = { type: "login" }
  postApi(JSON.stringify(user.encodeUser()), params, handleLoginResponse, "Login failed")
}

function doUpdateEvent() {
  const id = document.getElementById("rg2-edit-event-selected").value
  let data = user.encodeUser()
  data.comments = document.getElementById("rg2-edit-event-comments").value
  data.locked = document.getElementById("chk-edit-read-only").checked
  data.name = document.getElementById("rg2-edit-event-name").value
  data.type = document.getElementById("rg2-edit-event-level").value
  data.eventdate = eventEditDatePicker.getDate("yyyy-mm-dd")
  data.club = document.getElementById("rg2-edit-club-name").value
  let exclude = document.getElementById("rg2-edit-exclude").value.trim()
  if (exclude === defaultExcludedText) {
    exclude = ""
  }
  data.exclude = exclude
  const params = { type: "editevent", id: id }
  postApi(JSON.stringify(data), params, handleEventUpdated(id), "Event update failed")
}

function doUploadMapFile() {
  const details = user.encodeUser()
  let formData = new FormData()
  formData.append(mapFile.name, mapFile)
  formData.append("name", mapFile.name)
  formData.append("x", details.x)
  formData.append("user", details.user)

  const params = {
    type: "uploadmapfile",
    headers: {
      "Content-Type": "multipart/form-data"
    }
  }
  postApi(formData, params, handleMapUploaded, "Map upload failed")
}

export function drawManagerControls() {
  if (mapLoaded && newcontrols.controls.length > 0) {
    newcontrols.drawControls(true)
    const opt = getOverprintDetails()
    // locked point for control edit
    if (handle.x !== null) {
      ctx.lineWidth = opt.overprintWidth
      ctx.strokeStyle = config.HANDLE_COLOUR
      ctx.fillStyle = config.HANDLE_COLOUR
      ctx.globalAlpha = 1.0

      ctx.beginPath()
      ctx.arc(handle.x, handle.y, config.HANDLE_DOT_RADIUS, 0, 2 * Math.PI, false)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(handle.x, handle.y, 2 * config.HANDLE_DOT_RADIUS, 0, 2 * Math.PI, false)
      ctx.stroke()
    }
  }
}

export function enableManager() {
  // login tab no longer required so remove it: it is first <li>
  document.querySelector("#rg2-info-panel-tab-headers li").remove()
  document.querySelector("#rg2-manage-login-tab-body").remove()

  document.getElementById(config.TAB_CREATE).classList.remove("d-none")
  document.getElementById(config.TAB_CREATE).click()
  document.getElementById(config.TAB_EDIT).classList.remove("d-none")
  document.getElementById(config.TAB_MAP).classList.remove("d-none")
  document.getElementById(config.TAB_DELETE_MAP).classList.remove("d-none")

  doGetMaps()
  setButtons()
  document.getElementById("rg2-select-event-level").innerHTML = getEventLevelDropdown()
  document.getElementById("rg2-edit-event-level").innerHTML = getEventLevelDropdown()
  document.getElementById("rg2-georef-type").innerHTML = georefsystems.getGeorefDropdown()
  document.getElementById("rg2-select-map").addEventListener("change", (e) => {
    mapIndex = parseInt(e.target.value, 10)
    if (mapIndex !== config.INVALID_MAP_ID) {
      loadNewMap(rg2Config.maps_url + "/" + maps[mapIndex].mapfilename)
    } else {
      mapLoaded = false
      mapSize.width = 0
      mapSize.height = 0
    }
  })

  eventSelectDatePicker = new Datepicker(document.getElementById("rg2-select-event-date"), {
    buttonClass: "btn",
    autohide: true,
    format: "yyyy-mm-dd"
  })

  eventEditDatePicker = new Datepicker(document.getElementById("rg2-edit-event-date"), {
    buttonClass: "btn",
    autohide: true,
    format: "yyyy-mm-dd"
  })

  document.getElementById("rg2-map-name").addEventListener("change", function () {
    setMapName()
  })
  document.getElementById("rg2-new-course-name").addEventListener("change", function () {
    setCourseName()
  })
  document.getElementById("rg2-edit-event-selected").addEventListener("change", (e) => {
    const id = parseInt(e.target.value, 10)
    setEvent(id)
    activeEditEventID = id
  })
  document.getElementById("rg2-georef-type").addEventListener("change", (e) => {
    setGeoref(parseInt(e.target.value, 10))
  })
}

function enrichCourseName(course_name) {
  let classes = ""
  if (mapping && mapping.length > 0 && isEnrichCourseNames) {
    for (let j = 0; j < mapping.length; j += 1) {
      const course = mapping[j].course
      let class_name = ""
      if (course === course_name) {
        if (classes !== "") {
          classes += ", "
        }
        class_name = mapping[j].className
        class_name = class_name.replace(/ /g, "")
        class_name = class_name.replace(/-/g, "")
        classes += class_name
      }
    }
  }

  if (classes !== "") {
    return course_name + ": " + classes
  }
  return course_name
}

function enrichCourseNames() {
  if (!isEnrichCourseNames) {
    return
  }
  for (let i = 0; i < courses.length; i += 1) {
    courses[i].name = enrichCourseName(courses[i].name)
  }
}

export function eventFinishedLoading(kartatid) {
  // called once the requested event has loaded
  const event = getEventInfoForKartatID(kartatid)
  document.getElementById("rg2-edit-event-name").value = decode(event.name)
  document.getElementById("rg2-edit-club-name").value = decode(event.club)
  eventEditDatePicker.setDate(event.date)
  document.getElementById("rg2-edit-event-level").value = event.rawtype
  document.getElementById("rg2-edit-event-comments").value = decode(event.comment)
  if (isScoreEvent()) {
    document.getElementById("rg2-exclude-info").classList.add("d-none")
  } else {
    document.getElementById("rg2-edit-exclude").value = event.exclude
    document.getElementById("rg2-exclude-info").classList.remove("d-none")
  }
  document.getElementById("chk-edit-read-only").checked = event.locked
  document.getElementById("btn-delete-event").removeAttribute("disabled")
  document.getElementById("btn-delete-route").removeAttribute("disabled")
  document.getElementById("btn-update-event").removeAttribute("disabled")
  document.getElementById("rg2-route-selected").innerHTML = getRouteDeleteDropdown(event.id)
}

export function eventListLoaded(events) {
  // called after event list has been updated
  document.getElementById("rg2-edit-event-selected").innerHTML = getEventEditDropdown(events, activeEditEventID)
  // unused maps get set initially when maps are loaded by the manager
  // need to avoid race condition where events load before manager is initialised
  // this bit is needed to deal with maps changing state when events are created or deleted
  if (maps.length > 0) {
    findUnusedMaps(maps)
    displayUnusedMaps(unusedMaps)
  }
}

function extractVariants() {
  // called when saving score/relay courses
  // creates all course variants once courseid has been set
  variants.length = 0
  let course = undefined
  for (let i = 0; i < results.length; i += 1) {
    // codes here are just controls so need to add start and finish
    let codes = results[i].codes
    // courseid - 1 gives courses array index given how we created the array
    for (let j = 0; j < courses.length; j += 1) {
      if (courses[j].courseid === results[i].courseid) {
        course = courses[j]
        break
      }
    }
    // add start code at start
    codes.unshift(course.codes[0])
    // add finish code at end
    codes.push(course.codes[course.codes.length - 1])

    results[i].variantid = getVariantID(results[i].codes, results[i].courseid)
  }
}

function findUnusedMaps(maps) {
  unusedMaps.length = 0
  for (let i = 0; i < maps.length; i += 1) {
    if (!mapIDIsInUse(maps[i].mapid)) {
      const map = {}
      map.mapid = maps[i].mapid
      map.name = maps[i].name
      if (map.name === "") {
        map.name = "(None)"
      }
      map.delete = false
      unusedMaps.push(map)
    }
  }
}

function fitControlsToMap() {
  let georefOK = false
  if (mapLoaded && newcontrols.controls.length > 0) {
    const box = getBoundingBox()
    if (coursesGeoreferenced) {
      // check we are somewhere on the map
      if (box.maxX < 0 || box.minX > mapSize.width || box.minY > mapSize.height || box.maxY < 0) {
        // warn and fit to track
        showWarningDialog(
          "Course file problem",
          "Your course file does not match the map co-ordinates. Please check you have selected the correct file."
        )
      } else {
        georefOK = true
      }
    }
    if (georefOK) {
      // lock background to prevent accidentally moving the aligned controls
      // user can always unlock and adjust
      backgroundLocked = true
      controlsAdjusted = true
      document.getElementById("chk-move-map-and-controls").checked = true
    } else {
      // fit within the map since this is probably needed anyway
      let scale = 0.8
      for (let i = 0; i < newcontrols.controls.length; i += 1) {
        newcontrols.controls[i].x =
          (newcontrols.controls[i].x - box.minX) * (mapSize.width / box.xRange) * scale +
          mapSize.width * (1 - scale) * 0.5
        newcontrols.controls[i].y =
          mapSize.height -
          (newcontrols.controls[i].y - box.minY) * (mapSize.height / box.yRange) * scale -
          mapSize.height * (1 - scale) * 0.5
      }
    }
    copyXYToOldXY()
    newcontrols.displayAllControls()
  }
}

function generateNewEventData() {
  let data = user.encodeUser()
  data.name = document.getElementById("rg2-event-name").value
  data.mapid = maps[mapIndex].mapid
  data.eventdate = eventSelectDatePicker.getDate("yyyy-mm-dd")
  data.comments = document.getElementById("rg2-enter-event-comments").value
  data.locked = document.getElementById("chk-read-only").checked
  data.club = document.getElementById("rg2-select-club-name").value
  if (hasResults) {
    if (newEventIsScoreEvent) {
      data.format = config.FORMAT_SCORE_EVENT
    } else {
      data.format = config.FORMAT_NORMAL
    }
  } else {
    if (newEventIsScoreEvent) {
      data.format = config.FORMAT_SCORE_EVENT_NO_RESULTS
    } else {
      data.format = config.FORMAT_NORMAL_NO_RESULTS
    }
  }
  data.level = document.getElementById("rg2-select-event-level").value
  if (drawingCourses) {
    courses.push(drawnCourse)
    createResultCourseMapping()
  }
  setControlLocations()
  mapResultsToCourses()
  enrichCourseNames()
  renumberResults()
  if (newEventIsScoreEvent) {
    extractVariants()
    data.variants = variants.slice(0)
  }
  data.courses = courses.slice(0)
  if (sortResults) {
    data.results = results.slice(0).sort(sortResultItems)
  } else {
    data.results = results.slice(0)
  }
  // #485 tidy up for results files that have a finish time in the splits list
  // not pretty but it will catch most of the issues
  if (data.format === config.FORMAT_NORMAL) {
    for (let i = 0; i < data.results.length; i += 1) {
      const splits = (data.results[i].splits.match(/;/g) || []).length
      // if we have one too many splits
      if (splits === getControlCount(data.courses, data.results[i].courseid) + 1) {
        // remove last ; and everything after it
        data.results[i].splits = data.results[i].splits.substring(0, data.results[i].splits.lastIndexOf(";"))
      }
    }
  }
  // #386 remove unused data: partial solution to problems with POST size
  for (let i = 0; i < data.results.length; i += 1) {
    delete data.results[i].codes
    delete data.results[i].chipid
    delete data.results[i].club
  }
  return data
}

function getBoundingBox() {
  // find bounding box for controls
  let box = {}
  box.minX = newcontrols.controls[0].x
  box.maxX = newcontrols.controls[0].x
  box.minY = newcontrols.controls[0].y
  box.maxY = newcontrols.controls[0].y
  for (let i = 1; i < newcontrols.controls.length; i += 1) {
    box.maxX = Math.max(box.maxX, newcontrols.controls[i].x)
    box.maxY = Math.max(box.maxY, newcontrols.controls[i].y)
    box.minX = Math.min(box.minX, newcontrols.controls[i].x)
    box.minY = Math.min(box.minY, newcontrols.controls[i].y)
  }
  box.xRange = box.maxX - box.minX
  box.yRange = box.maxY - box.minY
  return box
}

function getControlCount(courses, courseid) {
  for (let i = 0; i < courses.length; i += 1) {
    if (courses[i].courseid === courseid) {
      return courses[i].controlcount
    }
  }
  return 0
}

function getControlXY(code) {
  let c = { x: 0, y: 0 }
  for (let i = 0; i < newcontrols.controls.length; i += 1) {
    if (newcontrols.controls[i].code === code) {
      c.x = Math.round(newcontrols.controls[i].x)
      c.y = Math.round(newcontrols.controls[i].y)
      return c
    }
  }
  return c
}

function getCourseIDForResult(course) {
  for (let i = 0; i < resultCourses.length; i += 1) {
    if (resultCourses[i].course === course) {
      return resultCourses[i].courseid
    }
  }
  return 0
}

function getCourseInfoAsHTML() {
  let html = `<div class="new-courses-table">`
  if (courses.length) {
    html += `<div>${t("Course")}</div><div>${t("Name")}</div><div>${t("Controls")}</div>`
    for (let i = 0; i < courses.length; i += 1) {
      html += `<div>${i + 1}</div><div>${courses[i].name}</div><div>${courses[i].codes.length - 2}</div>`
    }
  }
  html += "</div>"
  return html
}

function getCourseName(id) {
  for (let i = 0; i < courses.length; i += 1) {
    if (courses[i].courseid === id) {
      return courses[i].name
    }
  }
  return 0
}

function getEventEditDropdown(events, activeID) {
  let html = activeID ? "" : generateSelectOption(null, "No event selected", true)
  // loop backwards so most recent event is first in list
  for (let i = events.length - 1; i > -1; i -= 1) {
    html += generateSelectOption(
      events[i].kartatid,
      events[i].kartatid + ": " + events[i].date + ": " + decode(events[i].name),
      activeID === events[i].kartatid
    )
  }
  return html
}

function getEventLevelDropdown() {
  let html = ""
  const text = ["Select level", "Training", "Local", "Regional", "National", "International"]
  const values = ["X", "T", "L", "R", "N", "I"]
  for (let i = 0; i < text.length; i += 1) {
    html += generateSelectOption(values[i], text[i], i === 0)
  }
  return html
}

function getMapDropdown(maps) {
  let html = generateSelectOption(config.INVALID_MAP_ID, "Select map", true)
  // loop backwards so most recent map is first in list
  for (let i = maps.length - 1; i > -1; i -= 1) {
    html += generateSelectOption(i, maps[i].mapid + ": " + decode(maps[i].name))
  }
  return html
}

function getResultInfoAsHTML() {
  let html = ""
  if (results.length) {
    html = `<div class="new-results-table">`
    let runners = 0
    let oldcourse = null
    for (let i = 0; i < results.length; i += 1) {
      if (results[i].course !== oldcourse) {
        if (oldcourse !== null) {
          html += `<div>${runners}</div>`
          runners = 0
        }
        html += `<div>${results[i].course}</div><div>${results[i].name}</div><div>${results[i].time}</div>`
        oldcourse = results[i].course
      }
      runners += 1
    }
    html += `<div>${runners}</div></div>`
  } else {
    html = "No valid results found."
  }
  return html
}

function getRouteDeleteDropdown(id) {
  const routes = getRoutesForEvent(id)
  let html = generateSelectOption("undefined", "Select route")
  for (let i = 0; i < routes.length; i += 1) {
    html += generateSelectOption(
      routes[i].resultid,
      routes[i].resultid + ": " + decode(routes[i].name) + " on " + decode(routes[i].coursename)
    )
  }
  return html
}

function getVariantID(codes, courseid) {
  // checks if a variant array of codes already exists
  // adds it if it doesn't
  // returns variantid
  let x = []
  let y = []
  let id = 0
  for (let i = 0; i < variants.length; i += 1) {
    if (variants[i].codes.length === codes.length) {
      let match = true
      for (let j = 0; j < codes.length; j += 1) {
        if (variants[i].codes[j] !== codes[j]) {
          match = false
          break
        }
      }
      if (match) {
        id = i + 1
        break
      }
    }
  }
  if (id === 0) {
    // didn't find a match so add a new variant
    id = variants.length + 1
    for (let i = 0; i < codes.length; i += 1) {
      const c = getControlXY(codes[i])
      x.push(c.x)
      y.push(c.y)
    }
    variants.push({
      x: x,
      y: y,
      id: id,
      courseid: courseid,
      name: "Variant " + id,
      codes: codes
    })
  }

  return id
}

function handleEventAdded(response) {
  if (response.ok) {
    showWarningDialog(
      "Event created",
      document.getElementById("rg2-event-name").value + " has been added with id " + response.newid + "."
    )
    // open newly created event in a separate window
    window.open(rg2Config.api_url.replace("rg2api.php", "") + "#" + response.newid)
    doGetEvents()
    setEvent()
    // unused map data gets reset in eventListLoaded callback
  } else {
    showWarningDialog("Save failed", response.status_msg + " Failed to create event. Please try again.")
  }
}

const handleEventDeleted = (id) => (response) => {
  if (response.ok) {
    showWarningDialog("Event deleted", "Event " + id + " has been deleted.")
    activeEditEventID = null
    document.getElementById("btn-delete-event").setAttribute("disabled", true)
    document.getElementById("btn-delete-route").setAttribute("disabled", true)
    document.getElementById("btn-update-event").setAttribute("disabled", true)
    doGetEvents()
    setEvent()
    // unused map data gets reset in eventListLoaded callback
    document.getElementById("rg2-edit-event-selected").replaceChildren()
  } else {
    showWarningDialog("Delete failed", response.status_msg + ". Event " + id + " delete failed. Please try again.")
  }
}

const handleEventUpdated = (kartatid) => (response) => {
  if (response.ok) {
    showWarningDialog("Event updated", "Event " + kartatid + " has been updated.")
    setActiveEventIDByKartatID(kartatid)
    setEventTitleBar()
    doGetEvents()
    setEvent(kartatid)
  } else {
    showWarningDialog("Update failed", response.status_msg + ". Event update failed. Please try again.")
  }
}

function handleLoginResponse(response) {
  if (response.ok) {
    enableManager()
  } else {
    showWarningDialog("Login failed", "User name or password incorrect. Please try again.")
  }
}

function handleMapAdded(response) {
  if (response.ok) {
    showWarningDialog("Map added", response.name + " has been added with id " + response.newid + ".")
    // update map dropdown
    doGetMaps()
  } else {
    showWarningDialog("Save failed", response.status_msg + ". Failed to save map. Please try again.")
  }
}

function handleMapUploaded(response) {
  if (response.ok) {
    doAddMap()
  } else {
    showWarningDialog("Upload failed", response.status_msg + ". Failed to upload map. Please try again.")
  }
}

function handleMapsLoaded(response) {
  maps.length = 0
  for (let i = 0; i < response.maps.length; i += 1) {
    maps.push(new MapData(response.maps[i]))
  }
  document.getElementById("rg2-select-map").innerHTML = getMapDropdown(maps)
  findUnusedMaps(maps)
  displayUnusedMaps(unusedMaps)
}

const handleRouteDeleted = (kartatid, routeid) => (response) => {
  if (response.ok) {
    showWarningDialog("Route deleted", "Route " + routeid + " has been deleted.")
    setActiveEventIDByKartatID(kartatid)
    setEventTitleBar()
    doGetEvents()
    setEvent(kartatid)
  } else {
    showWarningDialog(
      "Delete failed",
      response.status_msg + ". Delete failed for route " + routeid + ". Please try again."
    )
  }
}

function handleUnusedMapsDeleted(response) {
  if (response.ok) {
    showWarningDialog("Maps deleted", "Selected maps have been deleted.")
  } else {
    showWarningDialog("Delete failed", response.status_msg + ". Delete failed. Please try again.")
  }
  doGetMaps()
}

function hasZeroTime(time) {
  if (time === 0 || time === "0" || time === "0:00" || time === "00:00") {
    return true
  }
  return false
}

function initialiseData() {
  newcontrols = new Controls()
  mapIndex = config.INVALID_MAP_ID
  format = config.FORMAT_NORMAL
  newEventIsScoreEvent = false
  hasResults = true
  courses = []
  mapping = []
  isEnrichCourseNames = false
  mapLoaded = false
  coursesGeoreferenced = false
  controlsAdjusted = false
  drawingCourses = false
  drawnCourse = {}
  results = []
  variants = []
  resultCourses = []
  mapSize = { height: 0, width: 0 }
  resultsOrCourseFile = undefined
  resultsFileFormat = ""
  backgroundLocked = false
  sortResults = false
  handle = { x: null, y: null }
}

function initialiseEncodings() {
  encodingIndex = 0
  errorCount = []
  useThisEncoding = false
}

export function initialiseManager() {
  user = new User()
  georefmap = L.map("rg2-world-file-map")
  initialiseData()
  initialiseLocationMap()
  document.getElementById("rg2-manager-login-form").addEventListener("submit", (e) => {
    // submission handled here so don't need default form handling
    e.preventDefault()
    const validUser = user.setDetails("rg2-user-name", "rg2-password")
    if (validUser) {
      doLogin()
    } else {
      showWarningDialog("Login failed", "Please enter user name and password of at least five characters")
    }
  })
}

function initialiseLocationMap() {
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(georefmap)
  document.getElementById("rg2-world-file-map-container").classList.remove("d-none")
}

export function managerDragEnded() {
  // console.log("Drag ended")
  if (mapLoaded && newcontrols.controls.length > 0) {
    // rebaseline control locations
    copyXYToOldXY()
  }
}

export function managerMapLoadCallback() {
  //callback when map image is loaded
  mapLoaded = true
  if (mapIndex !== config.INVALID_MAP_ID) {
    localworldfile = maps[mapIndex].localworldfile
    worldfile = maps[mapIndex].worldfile
  }
  mapSize = getMapSize()
  fitControlsToMap()
  redraw()
}

export function managerMouseUp(x, y) {
  // console.log("Mouse up ",x, y)
  if (drawingCourses) {
    addNewControl(x, y)
    controlsAdjusted = true
    return
  }
  if (mapLoaded && newcontrols.controls.length > 0) {
    // adjusting the track
    if (handle.x === null) {
      handle = { x: x, y: y }
    } else {
      handle = { x: null, y: null }
    }
  }
}

function mapResultsToCourses() {
  // read through dropdowns and allocate courseid for each required course
  // also delete unwanted courses
  let newCourses = []
  // courseid historically starts at 1 just to cause endless indexing problems
  let courseid = 1
  for (let i = 0; i < resultCourses.length; i += 1) {
    let id = undefined
    if (drawingCourses) {
      // only handles one course at present, so it is always 0
      id = 0
    } else {
      const selector = document.getElementById("rg2-alloc-" + i)
      if (selector) {
        id = parseInt(selector.value, 10)
      }
    }
    if (id !== undefined && id !== config.DO_NOT_SAVE_COURSE) {
      // check we haven't already saved this course
      if (courses[id].courseid === 0) {
        courses[id].courseid = courseid
        newCourses.push(courses[id])
        resultCourses[i].courseid = courseid
        courseid += 1
      } else {
        resultCourses[i].courseid = courses[id].courseid
      }
    }
  }
  courses = newCourses
}

function processCourseFile(e) {
  coursesGeoreferenced = false
  backgroundLocked = false
  document.getElementById("chk-move-map-and-controls").checked = false
  handle = { x: null, y: null }
  newcontrols.deleteAllControls()
  const parsedCourses = new CourseParser(e, worldfile, localworldfile)
  courses = parsedCourses.courses
  if (courses.length > 0) {
    newcontrols = parsedCourses.newcontrols
    mapping = parsedCourses.mapping
    if (mapping.length > 0) {
      document.getElementById("chk-enrich-course-names").classList.remove("d-none")
    } else {
      document.getElementById("chk-enrich-course-names").classList.add("d-none")
    }
    coursesGeoreferenced = parsedCourses.georeferenced
    displayInfoDialog("Course details", getCourseInfoAsHTML())
    createResultCourseMapping()
    displayCourseAllocations()
    fitControlsToMap()
  }
  redraw()
}

function processMap(e) {
  // called to load a new map locally rather than from server when creating a new map
  loadNewMap(e.target.result, true)
  document.getElementById("rg2-load-map-file").classList.add("is-valid")
  mapLoaded = true
  mapSize = getMapSize()
  fitControlsToMap()
  redraw()
  document.getElementById("btn-add-map").removeAttribute("disabled")
}

function processResultFile(e) {
  const parsedResults = new ResultParser(e, resultsFileFormat)
  results = parsedResults.results
  if (results.length > 0) {
    resultCourses = parsedResults.resultCourses
    displayInfoDialog("Result details", getResultInfoAsHTML())
    displayCourseAllocations()
  }
}

function readCourses(e) {
  let reader = new FileReader()
  reader.onerror = function () {
    showWarningDialog("Course file error", "The selected course file could not be read.")
  }

  reader.onload = function (e) {
    processCourseFile(e)
  }
  //
  // TODO: input charset should be set based on RG_FILE_ENCODING variable
  // reader.readAsText(e.target.files[0], 'ISO-8859-1')
  reader.readAsText(e.target.files[0])
}

function readGeorefFile(e) {
  const reader = new FileReader()
  try {
    reader.readAsText(e.target.files[0])
  } catch (err) {
    showWarningDialog("File read error", "Failed to open selected world file.")
    return
  }
  reader.onerror = function () {
    showWarningDialog("World file error", "The selected world file could not be read.")
  }
  reader.onload = function (e) {
    // see http://en.wikipedia.org/wiki/World_file
    const txt = e.target.result
    const args = txt.split(/[\r\n]+/g)
    localworldfile = new Worldfile({
      A: args[0],
      B: args[2],
      C: args[4],
      D: args[1],
      E: args[3],
      F: args[5]
    })
    const defaultGeorefValue = georefsystems.getDefaultValue()
    document.getElementById("rg2-georef-type").value = defaultGeorefValue
    convertWorldFile(defaultGeorefValue)
  }
}

function readMapFile(e) {
  const reader = new FileReader()
  reader.onload = function (e) {
    processMap(e)
  }
  const format = e.target.files[0].name.substr(-3, 3).toUpperCase()
  if (format === "JPG" || format === "GIF") {
    mapFile = e.target.files[0]
    reader.readAsDataURL(e.target.files[0])
  } else {
    showWarningDialog(
      "File type error",
      e.target.files[0].name + " is not recognised. Only .jpg and .gif files are supported at present."
    )
  }
}

function readResults() {
  let reader = new FileReader()

  reader.onerror = function () {
    showWarningDialog("Results file error", "The selected results file could not be read.")
  }
  reader.onload = function (e) {
    checkResultsFileEncoding(e)
  }
  format = resultsOrCourseFile.name.substr(-3, 3).toUpperCase()
  if (format === "XML" || format === "CSV") {
    resultsFileFormat = format
    reader.readAsText(resultsOrCourseFile, encodings[encodingIndex])
  } else {
    showWarningDialog("File type error", "Results file type is not recognised. Please select a valid file.")
  }
}

function renumberResults() {
  // updates the course id and name when we know the mapping
  // and deletes results for courses not required
  let newResults = []
  for (let i = 0; i < results.length; i += 1) {
    const id = getCourseIDForResult(results[i].course)
    if (id !== config.DO_NOT_SAVE_COURSE) {
      results[i].courseid = id
      results[i].course = getCourseName(id)
      // set null here: overwritten later in extractVariants if this is a variant
      results[i].variantid = ""
      newResults.push(results[i])
    }
  }
  results = newResults
}

function setButtons() {
  document.getElementById("btn-create-event").addEventListener("click", (e) => {
    confirmCreateEvent(e)
  })
  document.getElementById("btn-update-event").addEventListener("click", (e) => {
    confirmUpdateEvent(e)
  })

  document.getElementById("btn-delete-route").addEventListener("click", (e) => {
    confirmDeleteRoute(e)
  })
  document.getElementById("btn-delete-event").addEventListener("click", (e) => {
    confirmDeleteEvent(e)
  })
  document.getElementById("btn-add-map").addEventListener("click", (e) => {
    confirmAddMap(e)
  })
  document.getElementById("btn-delete-unused-maps").addEventListener("click", (e) => {
    confirmDeleteUnusedMaps(e)
  })
  document.getElementById("btn-draw-courses").addEventListener("click", (e) => {
    startDrawingCourses(e)
  })
  document.getElementById("rg2-load-georef-file").addEventListener("input", (e) => {
    readGeorefFile(e)
  })
  document.getElementById("rg2-load-map-file").addEventListener("input", (e) => {
    validateMapUpload(e.target.files[0])
    readMapFile(e)
  })
  const loadResults = document.getElementById("rg2-load-results-file")
  loadResults.addEventListener("click", (e) => {
    if (!mapLoaded) {
      showWarningDialog("No map loaded", "Please load a map file before adding results.")
      e.preventDefault()
    }
  })
  loadResults.addEventListener("change", (e) => {
    resultsOrCourseFile = e.target.files[0]
    initialiseEncodings()
    readResults()
  })
  document.getElementById("chk-move-map-and-controls").addEventListener("click", (e) => {
    toggleMoveAll(e.target.checked)
  })
  document.getElementById("chk-no-results").addEventListener("click", (e) => {
    toggleResultsRequired(e.target.checked)
  })
  document.getElementById("chk-score-event").addEventListener("click", (e) => {
    toggleScoreEvent(e.target.checked)
  })
  document.getElementById("chk-enrich-course-names").addEventListener("click", (e) => {
    toggleEnrichCourseNames(e.target.checked)
  })
  document.getElementById("chk-sort-results").addEventListener("click", (e) => {
    toggleSortResults(e.target.checked)
  })
  const load = document.getElementById("rg2-load-course-file")
  load.addEventListener("click", (e) => {
    if (!mapLoaded) {
      showWarningDialog("No map loaded", "Please load a map file before adding courses.")
      e.preventDefault()
    }
  })
  load.addEventListener("change", (e) => {
    readCourses(e)
  })
}

function setControlLocations() {
  // called when saving courses
  // reads control locations and updates course details
  for (let i = 0; i < courses.length; i += 1) {
    for (let j = 0; j < courses[i].codes.length; j += 1) {
      const c = getControlXY(courses[i].codes[j])
      courses[i].x[j] = c.x
      courses[i].y[j] = c.y
    }
  }
}

function setCourseName() {
  const course = document.getElementById("rg2-new-course-name").value
  if (course) {
    drawnCourse.name = course
  }
}

function setEvent(kartatid) {
  if (kartatid) {
    loadEventByKartatID(kartatid)
  } else {
    // no event selected so initialise everything
    initialiseData()
    document.getElementById("rg2-edit-event-name").value = ""
    document.getElementById("rg2-edit-club-name").value = ""
    eventEditDatePicker.setDate("")
    document.getElementById("rg2-edit-event-level").value = ""
    document.getElementById("rg2-edit-event-comments").value = ""
    document.getElementById("rg2-edit-exclude").value = defaultExcludedText
    document.getElementById("rg2-route-selected").replaceChildren()
    document.getElementById("chk-edit-read-only").checked = false
    document.getElementById("rg2-course-allocations").innerHTML = ""
  }
}

function setGeoref(optionValue) {
  if (optionValue !== 0) {
    convertWorldFile(optionValue)
  }
}

function setMapName() {
  newMap.name = document.getElementById("rg2-map-name").value
  validateValue("rg2-map-name", (value) => {
    // at least one character
    return /./.test(value)
  })
}

function sortResultItems(a, b) {
  // called after final courseids allocated so this is safe
  if (a.courseid !== b.courseid) {
    return a.courseid - b.courseid
  }
  if (a.position !== "" && b.position !== "") {
    // sort by position, if available
    return a.position - b.position
  }
  if (a.position === "" && b.position !== "") {
    return 1
  }
  if (a.position !== "" && b.position === "") {
    return -1
  }
  // sort by time, if available
  if (hasZeroTime(a.time) && hasZeroTime(b.time)) {
    // sort by name, when no time
    return a.name - b.name
  }
  return a.time - b.time
}

function startDrawingCourses() {
  if (mapLoaded) {
    drawingCourses = true
    courses.length = 0
    newcontrols.deleteAllControls()
    drawnCourse.name = "Course"
    drawnCourse.x = []
    drawnCourse.y = []
    drawnCourse.codes = []
    drawnCourse.courseid = 0
    document.getElementById("rg2-new-course-name").value
    document.getElementById("rg2-draw-courses").classList.remove("d-none")
  } else {
    showWarningDialog("No map selected", "Please load a map before drawing courses")
  }
}

function testForInvalidCharacters(rawtext) {
  // takes in text read from a results file and checks it has converted to UTF-8 correctly
  let count = 0
  for (let i = 0; i < rawtext.length; i += 1) {
    // Unicode U+FFFD (65533) is the replacement character used to replace an incoming character whose value is unknown or unrepresentable
    // see http://www.fileformat.info/info/unicode/char/0fffd/index.htm
    if (rawtext.charCodeAt(i) === 65533) {
      count += 1
    }
  }
  return count
}

function toggleEnrichCourseNames(checked) {
  isEnrichCourseNames = checked
  displayCourseAllocations()
}

// locks or unlocks background when adjusting map
function toggleMoveAll(checkedState) {
  backgroundLocked = checkedState
}

function toggleResultsRequired(checked) {
  // check box checked means event does not have results
  hasResults = !checked
  createResultCourseMapping()
  displayCourseAllocations()
}

function toggleScoreEvent(checked) {
  newEventIsScoreEvent = checked
}

function toggleSortResults(checkedState) {
  sortResults = checkedState
}

function updateGeorefMap() {
  // Plot a polygon and recentre the map on the polygon
  const lon = newMap.lon
  const lat = newMap.lat
  //console.log(newMap)
  let poly_coords = []
  // For some reason this is the order the coordinates are stored in.
  const indices = [3, 1, 2, 0]
  indices.forEach(function (i) {
    poly_coords.push([lat[i], lon[i]])
  })
  const poly = L.polygon(poly_coords, { color: "red" })
  poly.addTo(georefmap)
  document.getElementById("rg2-world-file-map-container").classList.remove("d-none")
  georefmap.invalidateSize()
  georefmap.fitBounds(poly.getBounds())
}

function validateData() {
  if (document.getElementById("rg2-event-name").value === "") {
    return "Event name is not valid."
  }
  if (mapIndex === config.INVALID_MAP_ID) {
    return "No map selected."
  }
  if (document.getElementById("rg2-select-club-name").value === "") {
    return "Club name is not valid."
  }
  if (eventSelectDatePicker.getDate("yyyy-mm-dd") === undefined) {
    return "Date is not valid."
  }
  if (document.getElementById("rg2-select-event-level").value === "X") {
    return "Event level is not valid."
  }
  if (!format) {
    return "Event format is not valid."
  }
  if (courses.length === 0) {
    if (!drawingCourses) {
      return "No course information. Check your course XML file."
    }
  }
  if (results.length === 0) {
    if (hasResults) {
      return "No results information. Check your results file."
    }
  }
  if (!controlsAdjusted) {
    return "Controls have not been adjusted on the map."
  }
  return "OK"
}

function validateMapUpload(upload) {
  let reader = new FileReader()
  reader.onload = function (e) {
    let image = new Image()
    image.src = e.target.result
    image.onload = function () {
      const size = Math.round(upload.size / 1024 / 1024)
      if (
        size > config.FILE_SIZE_WARNING ||
        image.height > config.PIXEL_SIZE_WARNING ||
        image.width > config.PIXEL_SIZE_WARNING
      ) {
        let msg = "The uploaded map file is " + size + "MB (" + image.width
        msg += " x " + image.height + "px). It is recommended that you use maps under " + config.FILE_SIZE_WARNING
        msg += "MB with a maximum dimension of " + config.PIXEL_SIZE_WARNING + "px. Please see the "
        msg += "<a href='https://github.com/Maprunner/rg2/wiki/Map-files'>RG2 wiki</a> for "
        msg += "guidance on how to create map files."
        showWarningDialog("Oversized map upload", msg)
      }
    }
  }
  reader.readAsDataURL(upload)
}
