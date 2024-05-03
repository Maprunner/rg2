import { postApi } from "./api"
import { alignMap, ctx, getCentreBottom, getCentreTop, redraw, resetMapState } from "./canvas"
import { config, getOverprintDetails, options, removeDrawnRouteDetails, saveDrawnRouteDetails } from "./config"
import { getCourseDetails, getCourseLegLengths, setCourseDisplay } from "./courses"
import { doGetEvents, getKartatEventID, loadEventByKartatID } from "./events"
import { GPSTrack, RouteData } from "./gpstrack"
import { getActiveTab, resetDrawDialog } from "./rg2ui"
import {
  createNameDropdown,
  getDeletionInfo,
  getFullResultforResultID,
  setScoreCourseDisplay,
  resultIDExists
} from "./results"
import { t } from "./translate"
import {
  createModalDialog,
  formatSecsAsMMSS,
  getAngle,
  getDistanceBetweenPoints,
  getSecsFromHHMMSS,
  showWarningDialog
} from "./utils"

const alignmentTimerInterval = 50
const alignmentLoopCount = 20
let alignmentTimer = null
let alignments = []
let mapIsAligned = false

let trackColour = "#ff0000"
let routeToDelete = null
let trk = new GPSTrack()
trk.routeData = new RouteData()
let pendingCourseID = null
// the RouteData versions of these have the start control removed for saving
let controlx = []
let controly = []
let angles = []
let nextControl = 0
let previousValidControlIndex = 0
let isScoreCourse = false

function addNewPoint(x, y) {
  // ignore input if we are still aligning map
  if (mapIsAligned) {
    if (closeEnough(x, y)) {
      addRouteDataPoint(controlx[nextControl], controly[nextControl])
      // angles will be wrong for missing splits since we don't know angles between non-consecutive controls and I
      // don't intend to start calculating them now...
      alignMapToAngle(nextControl)
      previousValidControlIndex = nextControl
      nextControl = getNextValidControl(nextControl)
      if (nextControl === controlx.length) {
        document.getElementById("btn-save-route").removeAttribute("disabled")
        // show full map now that we have drawn the complete route
        resetMapState()
      }
    } else {
      addRouteDataPoint(Math.round(x), Math.round(y))
    }
    document.getElementById("btn-undo").removeAttribute("disabled")
    redraw()
  }
}

function addRouteDataPoint(x, y) {
  trk.routeData.x.push(x)
  trk.routeData.y.push(y)
}

function adjustBetweenTwoLockedPoints(p1, p2, handle) {
  // case 5: adjust between two locked points
  // see, there is an easier way
  //console.log("Point (", p1.x, ", ", p1.y, ") for handle ", handle.index, handle.basex, handle.basey)
  const previousHandle = trk.handles.getPreviousLockedHandle(handle)
  const nextHandle = trk.handles.getNextLockedHandle(handle)
  // adjust route between previous locked handle and dragged point
  scaleRotateAroundSingleLockedPoint(p1, p2, previousHandle, previousHandle.time, handle.time)
  // adjust route between dragged point and next locked handle
  scaleRotateAroundSingleLockedPoint(p1, p2, nextHandle, handle.time, nextHandle.time)
}

export function adjustOffset(offset) {
  trk.adjustOffset(offset)
}

export function adjustTrack(p1, p2, button = undefined) {
  // called whilst dragging a GPS track
  //console.log("adjustTrack ", p1.x, p1.y, p2.x, p2.y)
  // check if background is locked or right click
  const chk = document.getElementById("chk-move-all")
  const moveAll = chk.checked
  if (moveAll || button === config.RIGHT_CLICK) {
    ctx.translate(p2.x - p1.x, p2.y - p1.y)
  } else {
    if (trk.handles.handlesLocked() > 0) {
      if (trk.handles.handlesLocked() === 1) {
        scaleRotateAroundSingleLockedPoint(
          p1,
          p2,
          trk.handles.getSingleLockedHandle(),
          trk.handles.getStartHandle().time,
          trk.handles.getFinishHandle().time
        )
      } else {
        // check if start of drag is on a handle
        let handle = trk.handles.getHandleClicked(p1)
        // we already know we have at least two points locked: cases to deal with from here
        // 1: drag point not on a handle: exit
        // 2: drag point on a locked handle: exit
        // 3: drag point between start and a locked handle: scale and rotate around single point
        // 4: drag point between locked handle and end: scale and rotate around single handle
        // 5: drag point between two locked handles: shear around two fixed handles
        //case 1
        if (handle === undefined) {
          return
        }
        // case 2
        if (handle.locked) {
          return
        }
        const earliest = trk.handles.getEarliestLockedHandle()
        const latest = trk.handles.getLatestLockedHandle()

        if (earliest.time >= handle.time) {
          // case 3: drag point between start and a locked handle
          scaleRotateAroundSingleLockedPoint(p1, p2, earliest, trk.handles.getStartHandle().time, earliest.time)
        } else if (latest.time < handle.time) {
          // case 4: drag point between locked handle and end
          scaleRotateAroundSingleLockedPoint(p1, p2, latest, latest.time, trk.handles.getFinishHandle().time)
        } else {
          // case 5: adjust between two locked points
          adjustBetweenTwoLockedPoints(p1, p2, handle)
        }
      }
    } else {
      // nothing locked so drag track
      dragTrack(p2.x - p1.x, p2.y - p1.y)
    }
  }
}

function alignMapToAngle(control) {
  if (options.alignMap && control < controlx.length - 1) {
    mapIsAligned = false
    alignments = []
    const x = controlx[control]
    const y = controly[control]
    const x2 = controlx[control + 1]
    const y2 = controly[control + 1]
    // Set up array of transformations to move control to centre bottom of screen and rotate map
    // so next control is straight up and near top of screen.
    const from = getCentreBottom()
    const to = getCentreTop()
    const mapDistance = getDistanceBetweenPoints(x, y, x2, y2)
    const screenDistance = getDistanceBetweenPoints(from.x, from.y, to.x, to.y)
    let scale = Math.min(screenDistance / mapDistance, config.MAX_ZOOM)
    scale = Math.max(scale, config.MIN_ZOOM)
    let controlAngle
    if (isScoreCourse) {
      // need to calculate this here since score courses use variants for
      // each person, not single courses
      controlAngle = getAngle(controlx[control], controly[control], controlx[control + 1], controly[control + 1])
    } else {
      controlAngle = angles[control]
    }
    let angle = (ctx.displayAngle - controlAngle - Math.PI / 2) % (Math.PI * 2)
    if (angle < -1 * Math.PI) {
      angle = angle + 2 * Math.PI
    }
    for (let i = 1; i <= alignmentLoopCount; i = i + 1) {
      let values = {}

      // translations to move current control to centre bottom
      values.x = from.x - ((from.x - x) * i) / alignmentLoopCount
      values.y = from.y - ((from.y - y) * i) / alignmentLoopCount

      // Rotation to get from current display angle to angle with next control straight up.
      // Course angles are based on horizontal as 0: need to reset to north.
      // Angle parameter is absolute angle to draw map.
      values.angle = (ctx.displayAngle - (angle * i) / alignmentLoopCount) % (Math.PI * 2)

      // scale to stretch map: value is a multiplier so use xth root each time and apply it x times
      values.scale = Math.pow(scale, 1 / alignmentLoopCount)

      alignments.push(values)
    }
    alignmentTimer = setInterval(() => {
      incrementAlignmentTime()
    }, alignmentTimerInterval)
  } else {
    alignMap(0, controlx[control], controly[control], false, 1)
    mapIsAligned = true
    alignmentTimer = null
  }
}

export function autofitGPSTrack() {
  trk.autofitTrack()
}

function closeEnough(x, y) {
  // snapto: test if drawn route is close enough to control
  let range = options.snap ? 8 : 2
  console.log(x, y, controlx[nextControl], controly[nextControl])
  if (Math.abs(x - controlx[nextControl]) < range) {
    if (Math.abs(y - controly[nextControl]) < range) {
      return true
    }
  }
  return false
}

function confirmCourseChange() {
  let dlg = {}
  dlg.body = "The route you have started to draw will be discarded. Are you sure you want to change the course?"
  dlg.title = "Confirm course change"
  dlg.doText = "Change course"
  dlg.onDo = doChangeCourse
  dlg.onCancel = doCancelChangeCourse
  createModalDialog(dlg)
}

export function confirmDeleteRoute(id) {
  routeToDelete = id
  let dlg = {}
  dlg.body = "This route will be permanently deleted. Are you sure?"
  dlg.title = "Confirm route delete"
  dlg.doText = "Delete route"
  dlg.onDo = doDeleteRoute
  createModalDialog(dlg)
}

function doCancelChangeCourse() {
  document.getElementById("rg2-select-course").value = trk.routeData.courseid
  document.getElementById("rg2-select-name").value = trk.routeData.resultid
  pendingCourseID = null
}

function doChangeCourse() {
  doDrawingReset()
  initialiseCourse(pendingCourseID)
}

function doDeleteRoute() {
  const info = getDeletionInfo(routeToDelete)
  const params = { type: "deletemyroute", id: getKartatEventID(), routeid: info.id }
  postApi(JSON.stringify({ token: info.token }), params, handleRouteDeleted, "Route save failed")
}

function doDrawingReset() {
  // remove any displayed courses before resetting drawing
  if (trk.routeData.courseid !== null) {
    setCourseDisplay(trk.routeData.courseid, false)
  }
  if (trk.routeData.resultid !== null) {
    setScoreCourseDisplay(trk.routeData.resultid, false)
  }
  initialiseDrawing()
}

function doSaveRoute() {
  setDeltas()
  const params = { type: "addroute", id: trk.routeData.eventid }
  postApi(JSON.stringify(trk.routeData), params, handleRouteSaved(trk.routeData.name), "Route save failed")
  // reset route here to avoid annoying flash of redrawn route
  doDrawingReset()
}

export function dragEnded() {
  if (trk.fileLoaded) {
    // rebaseline GPS track
    trk.savedBaseX = trk.baseX.slice(0)
    trk.savedBaseY = trk.baseY.slice(0)
    trk.baseX = trk.routeData.x.slice(0)
    trk.baseY = trk.routeData.y.slice(0)
    trk.handles.saveForUndo()
    trk.handles.rebaselineXY()
    document.getElementById("btn-undo-gps-adjust").removeAttribute("disabled")
  }
}

export function dragTrack(dx, dy) {
  for (let i = 0; i < trk.baseX.length; i += 1) {
    trk.routeData.x[i] = trk.baseX[i] + dx
    trk.routeData.y[i] = trk.baseY[i] + dy
  }
  trk.handles.dragHandles(dx, dy)
}

export function drawCircle(radius) {
  ctx.arc(controlx[nextControl], controly[nextControl], radius, 0, 2 * Math.PI, false)
  // fill in with transparent colour to highlight control better
  ctx.fill()
}

export function drawNewTrack() {
  const opt = getOverprintDetails()
  ctx.lineWidth = opt.overprintWidth
  ctx.strokeStyle = config.RED
  ctx.fillStyle = config.RED_30
  // highlight next control if we have a course selected
  if (nextControl > 0 && !trk.fileLoaded) {
    ctx.beginPath()
    if (nextControl < controlx.length - 1) {
      // normal control
      drawCircle(opt.controlRadius)
    } else {
      // finish
      drawCircle(opt.finishInnerRadius)
      ctx.stroke()
      ctx.beginPath()
      drawCircle(opt.finishOuterRadius)
    }
    // dot at centre of control circle
    ctx.fillRect(controlx[nextControl] - 1, controly[nextControl] - 1, 3, 3)
    ctx.stroke()
  }
  ctx.strokeStyle = trackColour
  ctx.fillStyle = trackColour
  ctx.font = "10pt Arial"
  ctx.textAlign = "left"
  ctx.globalAlpha = 0.6
  drawRoute()
  trk.handles.drawHandles()
}

function drawRoute() {
  if (trk.routeData.x.length > 1) {
    ctx.beginPath()
    ctx.moveTo(trk.routeData.x[0], trk.routeData.y[0])
    // don't bother with +3 second displays in GPS adjustment
    for (let i = 1; i < trk.routeData.x.length; i += 1) {
      ctx.lineTo(trk.routeData.x[i], trk.routeData.y[i])
    }
    ctx.stroke()
  }
}

export function getControlXY() {
  return { x: controlx, y: controly }
}

function getNextValidControl(thisControl) {
  // look through splits to find next control which has a split time
  // to allow drawing for missed controls where the split time is 0
  const splits = trk.routeData.splits
  // allow for events with no results: splits will be a start and finish time only
  // in this case just move to next control
  if (splits.length === 2) {
    return thisControl + 1
  }
  for (let i = thisControl + 1; i < splits.length; i += 1) {
    if (splits[i] !== splits[i - 1]) {
      return i
    }
  }
  // implies we have no finish time which is unlikely but anyway...
  return splits.length
}

function getPreviousValidControl(thisControl) {
  // look through splits to find previous control which has a split time
  // to allow drawing for missed controls where the split time is 0
  const splits = trk.routeData.splits
  // allow for events with no results: splits will be a start and finish time only
  // in this case just move to previous control
  if (splits.length === 2) {
    return thisControl - 1
  }
  for (let i = thisControl - 1; i > 0; i -= 1) {
    if (splits[i] !== splits[i - 1]) {
      return i
    }
  }
  // go back to start...
  return 0
}

export function gpsFileLoaded() {
  return trk.fileLoaded
}

function handleRouteDeleted(response) {
  if (response.ok) {
    showWarningDialog(t("Route deleted"), t("Route has been deleted"))
    removeDrawnRouteDetails({
      eventid: parseInt(response.eventid, 10),
      id: parseInt(response.routeid, 10)
    })
    doGetEvents()
  } else {
    showWarningDialog(t("Delete failed"), t("Delete failed"))
  }
}

const handleRouteSaved = (name) => (response) => {
  if (response.ok) {
    routeSaved(response, name)
  } else {
    showWarningDialog(name, t("Your route was not saved. Please try again"))
  }
}

function incrementAlignmentTime() {
  if (alignments.length === 0) {
    clearInterval(alignmentTimer)
    alignmentTimer = null
    mapIsAligned = true
  } else {
    const data = alignments.shift()
    alignMap(data.angle, data.x, data.y, true, data.scale)
  }
  redraw()
}

function initialiseCourse(courseid) {
  pendingCourseID = null
  trk.routeData = new RouteData()
  trk.routeData.eventid = getKartatEventID()
  trk.routeData.courseid = courseid
  const course = getCourseDetails(courseid)
  isScoreCourse = course.isScoreCourse
  // save details for normal courses
  // can't do this here for score courses since you need to know the
  // variant for a given runner
  if (!isScoreCourse) {
    setCourseDisplay(courseid, true)
    trk.routeData.coursename = course.name
    if (course.excludeType === config.EXCLUDED_ZERO_SPLITS) {
      trk.routeData.controlsToAdjust = course.exclude.indexOf(true)
    } else {
      trk.routeData.controlsToAdjust = course.x.length - 1
    }
    controlx = course.x.slice()
    controly = course.y.slice()
    trk.routeData.x.length = 0
    trk.routeData.y.length = 0
    trk.routeData.x[0] = controlx[0]
    trk.routeData.y[0] = controly[0]
    trk.routeData.controlx = controlx.slice()
    trk.routeData.controly = controly.slice()
    angles = course.angle.slice()
  }
  document.getElementById("rg2-select-course").value = trk.routeData.courseid
  createNameDropdown(courseid)
  redraw()
}

export function initialiseDrawing() {
  // called when we know we have an event loaded
  trk = new GPSTrack()
  trk.routeData = new RouteData()
  // the RouteData versions of these have the start control removed for saving
  controlx.length = 0
  controly.length = 0
  angles.length = 0
  nextControl = 0
  previousValidControlIndex = 0
  isScoreCourse = false
  trk.initialiseGPS()
  resetDrawDialog()
  redraw()
}

export function mouseUp(x, y, button) {
  // console.log(x, y)
  // called after a click at (x, y)
  const delta = 3
  if (getActiveTab() !== config.TAB_DRAW) {
    return
  }
  if (trk.fileLoaded) {
    const handle = trk.handles.getHandleClicked({ x: x, y: y })
    if (handle !== undefined) {
      // delete or unlock if not first or last entry
      if (button === config.RIGHT_CLICK && handle.index !== 0 && handle.index !== trk.handles.length) {
        if (handle.locked) {
          // unlock, don't delete
          trk.handles.unlockHandle(handle.index)
        } else {
          // delete handle
          trk.handles.deleteHandle(handle.index)
        }
      } else {
        // clicked in a handle area so toggle state
        if (handle.locked) {
          trk.handles.unlockHandle(handle.index)
        } else {
          trk.handles.lockHandle(handle.index)
        }
      }
    } else {
      // not an existing handle so read through track to look for x,y
      for (let i = 0; i < trk.baseX.length; i += 1) {
        if (
          trk.baseX[i] + delta >= x &&
          trk.baseX[i] - delta <= x &&
          trk.baseY[i] + delta >= y &&
          trk.baseY[i] - delta <= y
        ) {
          // found on track so add new handle
          trk.handles.addHandle(x, y, i)
          break
        }
      }
    }
  } else {
    // drawing new track
    // only allow drawing if we have valid name and course
    if (trk.routeData.resultid !== null && trk.routeData.courseid !== null) {
      addNewPoint(x, y)
    } else {
      showWarningDialog(
        "No course/name",
        "Please select course, name and time before you start drawing a route or upload a file."
      )
    }
  }
}

export function readGPS(file) {
  // show full map aligned to north
  resetMapState()
  trk.readGPS(file)
}

export function resetDrawing() {
  let dlg = {}
  dlg.body = "All information you have entered will be removed. Are you sure you want to reset?"
  dlg.title = "Confirm reset"
  dlg.doText = "Reset"
  dlg.onDo = doDrawingReset
  createModalDialog(dlg)
}

function rotatePoint(x, y, angle) {
  // rotation matrix: see http://en.wikipedia.org/wiki/Rotation_matrix
  let pt = {}
  pt.x = Math.cos(angle) * x - Math.sin(angle) * y
  pt.y = Math.sin(angle) * x + Math.cos(angle) * y
  return pt
}

function routeSaved(data, name) {
  // showShareDialog(
  //   trk.routeData.name,
  //   data.newid,
  //   t("Your route has been saved") + "."
  // )
  showWarningDialog(name, t("Your route has been saved"))
  saveDrawnRouteDetails({
    eventid: parseInt(data.eventid, 10),
    id: data.newid,
    token: data.token
  })
  loadEventByKartatID(getKartatEventID())
}

export function saveGPSRoute() {
  // called to save GPS file route
  // tidy up route details
  const t = trk.routeData.time[trk.routeData.time.length - 1] - trk.routeData.time[0]
  trk.routeData.totaltime = formatSecsAsMMSS(t)
  // GPS uses UTC: adjust to local time based on local user setting
  // only affects replay in real time
  let date = new Date()
  // returns offset in minutes, so convert to seconds
  const offset = date.getTimezoneOffset() * 60
  trk.routeData.startsecs = trk.routeData.time[0] - offset

  for (let i = 0; i < trk.routeData.x.length; i += 1) {
    trk.routeData.x[i] = Math.round(trk.routeData.x[i])
    trk.routeData.y[i] = Math.round(trk.routeData.y[i])
    // convert real time seconds to offset seconds from start time
    trk.routeData.time[i] -= trk.routeData.startsecs
  }
  // allow for already having a GPS route for this runner
  trk.routeData.resultid += config.GPS_RESULT_OFFSET
  while (resultIDExists(trk.routeData.resultid)) {
    trk.routeData.resultid += config.GPS_RESULT_OFFSET
    // add marker(s) to name to show it is a duplicate
    trk.routeData.name += "*"
  }
  trk.routeData.comments = document.getElementById("rg2-new-comments").value
  document.getElementById("btn-undo-gps-adjust").setAttribute("disabled", "")
  doSaveRoute()
}

export function saveRoute() {
  // called to save manually entered route
  trk.routeData.comments = document.getElementById("rg2-new-comments").value
  trk.routeData.controlx = controlx
  trk.routeData.controly = controly
  // don't need start control so remove it
  trk.routeData.controlx.splice(0, 1)
  trk.routeData.controly.splice(0, 1)
  doSaveRoute()
}

function scaleRotateAroundSingleLockedPoint(p1, p2, p3, fromTime, toTime) {
  // rotate p1 to p2 around p3
  // scale and rotate track around single locked point
  const scale = getDistanceBetweenPoints(p2.x, p2.y, p3.x, p3.y) / getDistanceBetweenPoints(p1.x, p1.y, p3.x, p3.y)
  const angle = getAngle(p2.x, p2.y, p3.x, p3.y) - getAngle(p1.x, p1.y, p3.x, p3.y)
  //console.log (p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, scale, angle, fromTime, toTime)
  for (let i = fromTime; i <= toTime; i += 1) {
    const pt = rotatePoint(trk.baseX[i] - p3.x, trk.baseY[i] - p3.y, angle)
    trk.routeData.x[i] = pt.x * scale + p3.x
    trk.routeData.y[i] = pt.y * scale + p3.y
  }
  trk.handles.alignHandles(trk.routeData)
}

function setDeltas() {
  // send as differences rather than absolute values: provides almost 50% reduction in size of json file
  for (let i = trk.routeData.x.length - 1; i > 0; i -= 1) {
    trk.routeData.x[i] = trk.routeData.x[i] - trk.routeData.x[i - 1]
    trk.routeData.y[i] = trk.routeData.y[i] - trk.routeData.y[i - 1]
  }
  // in theory time is same length as x and y but why take the risk...
  for (let i = trk.routeData.time.length - 1; i > 0; i -= 1) {
    trk.routeData.time[i] = trk.routeData.time[i] - trk.routeData.time[i - 1]
  }
}

export function setDrawingCourse(courseid) {
  if (!isNaN(courseid)) {
    if (trk.routeData.courseid !== null) {
      // already have a course so we are trying to change it
      if (trk.routeData.x.length > 1) {
        // drawing started so ask to confirm change
        pendingCourseID = courseid
        confirmCourseChange()
      } else {
        // nothing done yet so just change course
        if (trk.routeData.resultid !== null) {
          setScoreCourseDisplay(trk.routeData.resultid, false)
        }
        setCourseDisplay(trk.routeData.courseid, false)
        initialiseCourse(courseid)
      }
    } else {
      // first time course has been selected
      initialiseCourse(courseid)
    }
  }
}

export function setName(resultid) {
  // callback from select box when we have results
  if (!isNaN(resultid)) {
    const res = getFullResultforResultID(resultid)
    if (res.hasValidTrack) {
      const msg =
        t("If you draw a new route it will overwrite the old route for this runner.") +
        " " +
        t("GPS routes are saved separately and will not be overwritten.")
      showWarningDialog(t("Route already drawn"), msg)
    }
    // remove old course from display just in case we missed it somewhere else
    if (trk.routeData.resultid !== null) {
      setScoreCourseDisplay(trk.routeData.resultid, false)
    }
    trk.routeData.resultid = res.resultid
    trk.routeData.name = res.name
    trk.routeData.splits = res.splits
    // set up individual course if this is a score event
    if (isScoreCourse) {
      setScoreCourseDisplay(res.resultid, true)
      controlx = res.scorex
      controly = res.scorey
      trk.routeData.x.length = 0
      trk.routeData.y.length = 0
      trk.routeData.x[0] = controlx[0]
      trk.routeData.y[0] = controly[0]
      trk.routeData.controlx = controlx
      trk.routeData.controly = controly
      nextControl = 1
      redraw()
    } else {
      nextControl = getNextValidControl(0)
      previousValidControlIndex = 0
    }
    startDrawing()
  }
}

export function setNameAndTime() {
  // callback for an entered name when no results available
  const nameEntry = document.getElementById("rg2-name-entry")
  const name = nameEntry.value.trim()
  if (name) {
    nameEntry.classList.add("is-valid")
  } else {
    nameEntry.classList.remove("is-valid")
  }
  const timeEntry = document.getElementById("rg2-time-entry")
  let time = timeEntry.value.trim()
  // matches something like 0:00 to 999:59
  if (time.match(/\d+[:.][0-5]\d$/)) {
    timeEntry.classList.add("is-valid")
  } else {
    timeEntry.classList.remove("is-valid")
    time = null
  }
  if (name && time && trk.routeData.courseid !== null) {
    time = time.replace(".", ":")
    trk.routeData.name = name
    trk.routeData.resultid = 0
    trk.routeData.totaltime = time
    trk.routeData.startsecs = 0
    trk.routeData.time[0] = getSecsFromHHMMSS(time)
    trk.routeData.totalsecs = getSecsFromHHMMSS(time)
    nextControl = 1
    const distanceSoFar = getCourseLegLengths(trk.routeData.courseid)
    const length = distanceSoFar[distanceSoFar.length - 1]
    // generate pro rata splits
    let splits = []
    for (let i = 0; i < distanceSoFar.length; i = i + 1) {
      splits[i] = parseInt((distanceSoFar[i] / length) * trk.routeData.totalsecs, 10)
    }
    trk.routeData.splits = splits
    previousValidControlIndex = 0
    startDrawing()
  }
}

export function showCourseInProgress() {
  if (trk.routeData.courseid !== null) {
    if (isScoreCourse) {
      setScoreCourseDisplay(trk.routeData.resultid, true)
    } else {
      setCourseDisplay(trk.routeData.courseid, true)
    }
  }
}

export function startDrawing() {
  document.getElementById("btn-three-seconds").removeAttribute("disabled")
  document.getElementById("btn-reset-drawing").removeAttribute("disabled", "")
  // setting value to null allows you to open the same file again if needed
  // TODO really???
  const file = document.getElementById("rg2-load-gps-file")
  file.removeAttribute("disabled")
  alignMapToAngle(0)
  redraw()
}

export function undoGPSAdjust() {
  // restore route from before last adjust operation
  trk.baseX = trk.savedBaseX.slice(0)
  trk.baseY = trk.savedBaseY.slice(0)
  trk.routeData.x = trk.savedBaseX.slice(0)
  trk.routeData.y = trk.savedBaseY.slice(0)
  trk.handles.undo()
  const btn = document.getElementById("btn-undo-gps-adjust")
  btn.setAttribute("disabled", "")
  redraw()
}

export function undoLastPoint() {
  // ignore if we are still aligning map
  if (mapIsAligned) {
    // remove last point if we have one
    const points = trk.routeData.x.length
    if (points > 1) {
      // are we undoing from previous control?
      if (
        controlx[previousValidControlIndex] === trk.routeData.x[points - 1] &&
        controly[previousValidControlIndex] === trk.routeData.y[points - 1]
      ) {
        // are we undoing from the finish?
        if (nextControl === controlx.length) {
          document.getElementById("btn-save-route").setAttribute("disabled", "")
        }
        nextControl = previousValidControlIndex
        previousValidControlIndex = getPreviousValidControl(nextControl)
        // don't do anything clever about realigning map: just leave it as it is
      }
      trk.routeData.x.pop()
      trk.routeData.y.pop()
    }
    // note that array length has changed so can't use points
    if (trk.routeData.x.length > 1) {
      document.getElementById("btn-undo").removeAttribute("disabled")
    } else {
      document.getElementById("btn-undo").setAttribute("disabled", "")
    }
    redraw()
  }
}

export function waitThreeSeconds() {
  // insert a new point in the same place as the last point
  addRouteDataPoint(trk.routeData.x[trk.routeData.x.length - 1], trk.routeData.y[trk.routeData.y.length - 1])
  redraw()
}
