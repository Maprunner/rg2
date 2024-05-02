import { getApi } from "./api"
import { resetAnimation } from "./animation"
import { loadNewMap, getMapSize, redraw } from "./canvas"
import { config } from "./config"
import { controls, deleteAllCourses, getExcludedText, saveCourses } from "./courses"
import { initialiseDrawing } from "./draw"
import { Event } from "./event"
import { getHashID, setEventHash } from "./hash"
import { decode } from "html-entities"
import { deleteResultsForEvent, getCommentsForEvent, getResultsStats, saveResults, saveRoutes } from "./results"
import { createEventMenu } from "./rg2ui"
import { t } from "./translate"
import { getDistanceBetweenPoints, getLatLonDistance } from "./utils"

let events = []
let activeEventID = null
let eventRequestInProgress = false

function configureUIForNewEvent(kartatid) {
  const events = document.querySelectorAll("#rg2-event-table tr")
  // highlight active event in event list
  for (let row of events) {
    if (parseInt(row.dataset.kartatid, 10) === kartatid) {
      row.classList.add("table-success")
    } else {
      row.classList.remove("table-success")
    }
  }
  const btnSplitsbrowser = document.getElementById("btn-splitsbrowser")
  if (rg2Config.enable_splitsbrowser && eventHasResults()) {
    btnSplitsbrowser.classList.remove("d-none")
  } else {
    btnSplitsbrowser.classList.add("d-none")
  }
  document.getElementById("btn-toggle-controls").removeAttribute("disabled")
  document.getElementById("btn-runners").removeAttribute("disabled")
  document.getElementById("btn-measure").removeAttribute("disabled")
}

function doGetEvent(kartatid) {
  setActiveEventIDByKartatID(null)
  const params = { type: "event", id: kartatid }
  getApi(params, handleEventResponse, "Event request failed")
}

export function doGetEvents() {
  const params = { type: "events" }
  getApi(params, handleEventsResponse, "Events request failed")
}

export function eventIsLocked() {
  if (activeEventID === null) {
    return false
  }
  return events[activeEventID].locked
}

export function eventLoadFailed() {
  eventRequestInProgress = false
}

export function formatEvents() {
  let html = "<table class='table table-striped table-hover table-sm'><tbody id='rg2-event-table'>"
  for (let i = events.length - 1; i >= 0; i -= 1) {
    let title = t(events[i].type, "") + ": " + events[i].date
    if (events[i].comment !== "") {
      title += ": " + events[i].comment
    }
    let comment = ""
    if (events[i].comment !== "") {
      comment = `<i class='bi-info-circle' id='info-${i}'></i>`
    }
    let georef = ""
    if (events[i].worldfile.valid) {
      georef = `<i class='bi-globe' id='info-${i}'></i>`
    }
    let lock = ""
    if (events[i].locked) {
      lock = `<i class='bi-lock-fill' id='info-${i}'></i>`
    }
    html += `<tr data-kartatid="${events[i].kartatid}"><td class="event-date">${events[i].date}</td><td title='${title}'>`
    html += `${events[i].name} ${lock} ${georef} ${comment}</td ></tr >`
  }
  html += `</tbody></table>`
  return html
}

function getActiveEventDate() {
  if (activeEventID !== null) {
    return events[activeEventID].date
  }
  return ""
}

export function getActiveEventID() {
  return activeEventID
}

export function getActiveKartatID() {
  if (activeEventID !== null) {
    return events[activeEventID].kartatid
  }
  return undefined
}

export function getActiveEventName() {
  if (activeEventID !== null) {
    return events[activeEventID].name
  }
  return "Routegadget 2"
}

export function getActiveMapID() {
  if (activeEventID !== null) {
    return events[activeEventID].mapid
  }
  return null
}

export function getEventIDForKartatID(kartatid) {
  for (let i = 0; i < events.length; i += 1) {
    if (events[i].kartatid === kartatid) {
      return i
    }
  }
  return undefined
}

export function eventHasResults() {
  if (activeEventID !== null) {
    return (
      events[activeEventID].format === config.FORMAT_NORMAL ||
      events[activeEventID].format === config.FORMAT_SCORE_EVENT
    )
  }
  return true
}

export function getEventInfoForKartatID(kartatid) {
  kartatid = kartatid || getKartatEventID()
  const realid = getEventIDForKartatID(kartatid)
  let info = events[realid]
  info.id = realid
  info.controls = controls.getControlCount()
  info.exclude = getExcludedText()
  return info
}

export function getEventStats() {
  // check there is an event to report on
  if (activeEventID === null) {
    return ""
  }
  const id = getKartatEventID()
  const eventinfo = getEventInfoForKartatID(parseInt(id, 10))
  let stats = `<div class='fs-4 fw-bolder pb-3'>${t("Event statistics")}</div>`
  stats += `<table class='table table-sm table-striped-columns table-bordered'><tbody>`
  stats += `<tr><td>${t("Event")}</td><td>${eventinfo.name}:&nbsp;${eventinfo.date}</td></tr>`
  if (eventinfo.comment) {
    stats += `<tr><td>${t("Comments")}</td><td>${eventinfo.comment}</td></tr>`
  }
  stats += getResultsStats(eventinfo.controls, eventinfo.worldfile.valid)
  stats += `</tbody></table>`
  stats += `<hr class="border border-primary opacity-75" />`
  stats += getCommentsForEvent()
  // #177 not pretty but gets round problems of double encoding
  stats = stats.replace(/&amp;/g, "&")
  return stats
}

export function getKartatEventID() {
  if (activeEventID === null) {
    return null
  }
  return events[activeEventID].kartatid
}

export function getLengthUnits() {
  if (activeEventID === null || !mapIsGeoreferenced()) {
    return "px"
  }
  return "m"
}

export function getMapFileName(kartatid) {
  for (let i = 0; i < events.length; i += 1) {
    if (events[i].kartatid === kartatid) {
      return events[i].mapfilename
    }
  }
  return ""
}

export function getMetresPerPixel() {
  if (activeEventID === null || !mapIsGeoreferenced()) {
    return undefined
  }
  const size = getMapSize()
  const pixels = getDistanceBetweenPoints(0, 0, size.width, size.height)
  const w = events[activeEventID].worldfile
  const lon1 = w.C
  const lat1 = w.F
  const lon2 = w.A * size.width + w.B * size.height + w.C
  const lat2 = w.D * size.width + w.E * size.height + w.F
  return getLatLonDistance(lat1, lon1, lat2, lon2) / pixels
}

export function getWorldFile() {
  if (activeEventID === null) {
    return null
  }
  return events[activeEventID].worldfile
}

function handleEventResponse(response, kartatid) {
  eventRequestInProgress = false
  setEventHash(kartatid)
  setActiveEventIDByKartatID(kartatid)
  setEventTitleBar()
  saveCourses(response.courses)
  saveResults(response.results)
  saveRoutes(response.routes)
  initialiseDrawing()
  configureUIForNewEvent(kartatid)
}

function handleEventsResponse(response) {
  events.length = 0
  activeEventID = null
  for (const event of response.events) {
    events.push(new Event(event))
  }
  createEventMenu()
  // load requested event if set
  // input is kartat ID so need to find internal ID first
  const kartatid = getHashID()
  if (kartatid) {
    loadEventByKartatID(kartatid)
  }
  if (config.managing()) {
    import("./manager.js")
      .then((module) => {
        module.eventListLoaded(events)
      })
      .catch(() => {
        console.log("Error loading manager")
      })
  }
}

export function isScoreEvent() {
  if (activeEventID !== null) {
    return (
      events[activeEventID].format === config.FORMAT_SCORE_EVENT ||
      events[activeEventID].format === config.FORMAT_SCORE_EVENT_NO_RESULTS
    )
  }
  return false
}

export function isValidKartatID(id) {
  for (let i = 0; i < events.length; i += 1) {
    if (events[i].kartatid === id) {
      return true
    }
  }
  return false
}

export function loadEventByKartatID(kartatid) {
  // prevent double loading if user double clicks on event or we get a garbage event id from a hash
  if (eventRequestInProgress || !isValidKartatID(kartatid)) {
    return
  }
  eventRequestInProgress = true
  // clear animation first to avoid redraw problems as things get deleted
  resetAnimation()
  deleteResultsForEvent()
  deleteAllCourses()
  loadNewMap(rg2Config.maps_url + getMapFileName(kartatid))
  document.getElementById("rg2-load-progress-label").textContent = t("Loading event", "")
  document.getElementById("rg2-load-progress").classList.remove("d-none")
  doGetEvent(kartatid)
  redraw()
}

export function mapIDIsInUse(mapID) {
  for (let i = 0; i < events.length; i += 1) {
    if (events[i].mapid === mapID) {
      return true
    }
  }
  return false
}

export function mapIsGeoreferenced() {
  if (activeEventID === null) {
    return false
  }
  return events[activeEventID].worldfile.valid
}

export function setActiveEventIDByKartatID(kartatid) {
  activeEventID = null
  for (let i = 0; i < events.length; i += 1) {
    if (events[i].kartatid === kartatid) {
      activeEventID = i
      break
    }
  }
}

export function setEventTitleBar() {
  let title = ""
  title = getActiveEventDate() + " " + decode(getActiveEventName())
  document.title = title
  if (mapIsGeoreferenced()) {
    title = "<i class='bi-globe'>&nbsp;</i>" + title
  }
  if (eventIsLocked()) {
    title = "<i class='bi-lock-fill'>&nbsp;</i>" + title
  }
  document.getElementById("rg2-event-title").innerHTML = title
}
