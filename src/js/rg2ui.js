import { addRunner, animateRunners, removeRunner } from "./animation"
import * as bootstrap from "bootstrap"
import { redraw, resizeCanvas } from "./canvas"
import { config, options, saveConfigOptions, setConfigOption } from "./config"
import {
  allCoursesDisplayed,
  controls,
  createCourseDropdown,
  setCourseDisplay,
  setAllCoursesDisplay,
  setAllFilters,
  setFilter,
  getCoursesOnDisplay
} from "./courses"
import {
  adjustOffset,
  autofitGPSTrack,
  confirmDeleteRoute,
  resetDrawing,
  saveGPSRoute,
  saveRoute,
  showCourseInProgress,
  undoGPSAdjust,
  undoLastPoint,
  readGPS,
  waitThreeSeconds,
  setNameAndTime
} from "./draw"
import { eventHasResults, formatEvents, getEventStats, getKartatEventID, loadEventByKartatID } from "./events"
import { setHashCourses, setHashRoutes } from "./hash"
import {
  allResultsForCourseReplayed,
  allTracksDisplayed,
  allTracksForCourseDisplayed,
  allTracksForCourseReplayed,
  createNameDropdown,
  displayScoreCourse,
  getAllRunnersForCourse,
  getAllRunnersWithTrackForCourse,
  getCourseForResult,
  getTracksOnDisplay,
  resetSpeedColours,
  setTrackDisplayByCourse,
  setTrackDisplayByResult
} from "./results"
import { Runner } from "./runner"
import { getStatsHeader, getStatsLayout, loadStats } from "./stats"
import { t, createLanguageDropdown } from "./translate"

const infoPanelControl = document.getElementById("rg2-show-info-panel-control")
const rightInfoPanelEl = document.getElementById("rg2-right-info-panel")
const rightInfoPanelTitle = document.getElementById("rg2-right-info-panel-title")
//const rightInfoPanelBody = document.getElementById("rg2-right-info-panel-body")
const rightInfoPanel = new bootstrap.Offcanvas(rightInfoPanelEl, { backdrop: false })

const leftInfoPanelEl = document.getElementById("rg2-left-info-panel")
const leftInfoPanelTitle = document.getElementById("rg2-left-info-panel-title")
let leftInfoPanelBody = document.getElementById("rg2-left-info-panel-body")

const leftInfoPanel = new bootstrap.Offcanvas(leftInfoPanelEl, { backdrop: false })
leftInfoPanelEl.style.width = `420px`
leftInfoPanelEl.addEventListener("hidden.bs.offcanvas", () => {
  // display close button when panel has finished closing
  infoPanelControl.classList.remove("d-none")
})
resizePanels()

const MAX_OFFSET = 10
const MIN_OFFSET = -10

function animationPanelDisplayed() {
  const animationPanel = document.getElementById("rg2-animation-controls")
  if (animationPanel.classList.contains("d-none")) {
    return false
  }
  return true
}

export function configureDrawDialog() {
  // sets up all non-changing aspects of draw dialog at start-up
  // variable aspects set by resetDrawDialog when needed

  document.querySelector("label[for=rg2-select-course]").innerHTML = `${t("Select course")}`
  document.querySelector("label[for=rg2-select-name]").innerHTML = `${t("Select name")}`
  // name and time entry for events with no results
  document.querySelector(`label[for=rg2-name-entry]`).innerHTML = t("Name")
  document.querySelector("#rg2-name-entry").addEventListener("input", () => {
    setNameAndTime()
  })
  document.querySelector(`label[for=rg2-time-entry]`).innerHTML = t("Time")
  document.querySelector("#rg2-time-entry").addEventListener("input", () => {
    setNameAndTime()
  })
  const comments = document.getElementById("rg2-new-comments")
  comments.setAttribute("placeholder", t(config.DEFAULT_NEW_COMMENT, ""))
  comments.addEventListener("focus", () => {
    const comments = document.getElementById("rg2-new-comments")
    // Clear placeholder when user focuses on it
    comments.setAttribute("placeholder", "")
  })

  const secs = document.getElementById("btn-three-seconds")
  secs.innerHTML = t("+3 secs")
  secs.addEventListener("click", (e) => {
    e.preventDefault()
    waitThreeSeconds()
  })

  const undo = document.getElementById("btn-undo")
  undo.innerHTML = t("Undo")
  undo.addEventListener("click", (e) => {
    e.preventDefault()
    undoLastPoint()
  })

  const save = document.getElementById("btn-save-route")
  save.innerHTML = t("Save")
  save.addEventListener("click", (e) => {
    e.preventDefault()
    saveRoute()
  })

  const reset = document.getElementById("btn-reset-drawing")
  reset.innerHTML = t("Reset")
  reset.addEventListener("click", (e) => {
    e.preventDefault()
    resetDrawing()
  })

  document.getElementById("rg2-load-gps-title").innerHTML = t("Load GPS file (GPX or TCX)")

  document.getElementById("btn-offset-plus").addEventListener("click", () => {
    const input = document.getElementById("rg2-offset-value")
    let val = parseInt(input.value, 10)
    if (val < MAX_OFFSET) {
      val = val + 1
      input.value = val
      adjustOffset(val)
    }
  })

  document.getElementById("btn-offset-minus").addEventListener("click", () => {
    const input = document.getElementById("rg2-offset-value")
    let val = parseInt(input.value, 10)
    if (val > MIN_OFFSET) {
      val = val - 1
      input.value = val
      adjustOffset(val)
    }
  })

  document.getElementById("rg2-offset-value").addEventListener("input", () => {
    const input = document.getElementById("rg2-offset-value")
    let val = parseInt(input.value, 10)
    if (isNaN(val)) {
      val = 0
    }
    if (val < MIN_OFFSET) {
      val = MIN_OFFSET
    }
    if (val > MAX_OFFSET) {
      val = MAX_OFFSET
    }
    input.value = val
    adjustOffset(val)
  })

  const adjust = document.getElementById("btn-undo-gps-adjust")
  adjust.innerHTML = t("Undo")
  adjust.addEventListener("click", (e) => {
    e.preventDefault()
    undoGPSAdjust()
  })

  const autofit = document.getElementById("btn-autofit-gps")
  autofit.innerHTML = t("Autofit")
  autofit.addEventListener("click", (e) => {
    e.preventDefault()
    autofitGPSTrack()
  })

  document.querySelector(`label[for=chk-move-all]`).innerHTML = t("Move track and map together (or right click-drag)")

  const saveGPS = document.getElementById("btn-save-gps-route")
  saveGPS.innerHTML = t("Save GPS route")
  saveGPS.addEventListener("click", (e) => {
    e.preventDefault()
    saveGPSRoute()
  })

  const help = [
    "Left click to add/lock/unlock a handle",
    "Green - draggable",
    "Red - locked",
    "Right click to delete a handle",
    "Drag a handle to adjust track around locked point(s)"
  ]
  help.forEach((text, i) => {
    const el = document.getElementById(`draw-text-${i + 1}`)
    el.innerHTML = `${t(text)}.`
  })

  const file = document.getElementById("rg2-load-gps-file")
  file.addEventListener("input", (e) => {
    readGPS(e)
  })
}

function configureSettingsDialog() {
  document.querySelector(`label[for=rg2-select-language]`).innerHTML = `${t("Language")}`
  createLanguageDropdown(config.languages)
  configureSettingsCheckbox("chk-show-GPS-speed", "showGPSSpeed", "Show GPS speed colours")
  configureSettingsCheckbox("chk-snap-toggle", "snap", "Snap to control when drawing")
  configureSettingsCheckbox("chk-show-three-seconds", "showThreeSeconds", "Show +3 time loss for GPS routes")
  configureSettingsSlider("map-intensity", "perCentMapIntensity", "Map intensity", "%")
  configureSettingsSlider("route-intensity", "perCentRouteIntensity", "Route intensity", "%")
  configureSettingsSlider("control-circle", "circleSize", "Control circle size")
  configureSettingsSlider("course-width", "courseWidth", "Course overprint width")
  configureSettingsSlider("route-width", "routeWidth", "Route width")
  configureSettingsSlider("name-font-size", "replayFontSize", "Replay label font size")

  const slider = document.getElementById("rg2-gps-speed-slider")
  slider.setAttribute("value1", options.maxSpeed)
  slider.setAttribute("value2", options.minSpeed)
  slider.addEventListener("change", gpsSpeedChanged)

  document.getElementById("rg2-min-gps-speed-label").innerHTML = getMinSpeedLabel()
  document.getElementById("rg2-max-gps-speed-label").innerHTML = getMaxSpeedLabel()
}

function configureSettingsCheckbox(selector, option, text) {
  document.querySelector(`label[for=${selector}]`).innerHTML = `${t(text)}`
  const el = document.getElementById(selector)
  el.addEventListener("click", (e) => {
    options[option] = e.target.checked
    saveConfigOptions()
    redraw()
  })
  el.checked = options[option]
}

function configureSettingsSlider(selector, option, text, units = "") {
  let label = document.querySelector(`label[for=spn-${selector}]`)
  label.innerHTML = `${t(text)} ${options[option]}${units}`
  let el = document.getElementById(`spn-${selector}`)
  el.setAttribute("value", options[option])
  el.addEventListener("change", (e) => {
    setConfigOption(option, parseInt(e.target.value, 10))
    label = document.querySelector(`label[for=spn-${selector}`)
    label.innerHTML = `${t(text)} ${options[option]}${units}`
    redraw()
  })
}

export function configureUI() {
  // disable right click menu: may add our own later
  document.body.addEventListener("contextmenu", (e) => {
    e.preventDefault()
  })

  window.addEventListener("resize", () => {
    resizePanels()
    resizeCanvas()
  })

  document.getElementById("rg2-left-info-panel-body").addEventListener("scroll", (e) => {
    // Save current scroll bar position in tab
    document.getElementById("rg2-info-panel").setAttribute(getScrollPosAttrName(), e.target.scrollTop)
  })

  initialiseInfoPanelDialog()
  if (!config.managing()) {
    configureDrawDialog()
  }
  displayInfoPanelDialog()

  const logo = document.getElementById("rg2-logo")
  logo.addEventListener("click", () => {
    leftInfoPanel.toggle()
  })

  const tabsBody = document.querySelector("#rg2-info-panel-tab-headers")
  const tabs = tabsBody.querySelectorAll('button[data-bs-toggle="tab"]')
  tabs.forEach((tab) => {
    tab.addEventListener("shown.bs.tab", (e) => {
      tabActivated(e)
    })
  })

  infoPanelControl.addEventListener("click", () => {
    displayInfoPanelDialog()
    infoPanelControl.classList.add("d-none")
  })

  initialiseButtons()
}

export function createEventMenu() {
  if (config.managing()) {
    return
  }
  let eventList = document.getElementById("rg2-event-list")
  eventList.innerHTML = formatEvents()
  let eventTable = document.getElementById("rg2-event-table")
  let searchBox = document.getElementById("rg2-event-search")
  searchBox.innerHTML = `<form class="d-flex pb-2" role="search">
  <input class="form-control mr-2" type="search" aria-label="${t("Search")}">
  <i class="bi-search ms-2 mt-2"></i>
  </form>`
  searchBox.addEventListener("keyup", (e) => {
    let filter = e.target.value.toUpperCase()
    let rows = eventTable.getElementsByTagName("tr")
    for (let i = 0; i < rows.length; i += 1) {
      if (rows[i].innerText.toUpperCase().indexOf(filter) > -1) {
        rows[i].classList.remove("d-none")
      } else {
        rows[i].classList.add("d-none")
      }
    }
  })
  eventTable.addEventListener("click", (e) => {
    // get tr that contains element that was clicked
    const row = e.target.closest("tr")
    const kartatid = parseInt(row.dataset.kartatid, 10)
    if (!isNaN(kartatid)) {
      loadEventByKartatID(kartatid)
    }
  })
}

function displayAboutDialog() {
  rightInfoPanelEl.style.width = `800px`
  rightInfoPanelTitle.innerHTML = "RG2 Version " + config.RG2VERSION
  document.getElementById("rg2-about-dialog").classList.remove("d-none")
  document.getElementById("rg2-option-controls").classList.add("d-none")
  document.getElementById("rg2-stats-dialog").classList.add("d-none")
  let eventStats = document.getElementById("rg2-event-stats")
  eventStats.innerHTML = getEventStats()
  document.getElementById("rg2-manager-link").innerHTML = `<a href="${rg2Config.api_url.replace(
    "rg2api.php",
    "?manage"
  )}">Manager Login</a>`
  rightInfoPanel.show()
}

function displayInfoPanelDialog() {
  leftInfoPanel.show()
}

function displaySettingsDialog() {
  rightInfoPanelEl.style.width = `420px`
  rightInfoPanelTitle.innerHTML = t("Configuration options")
  document.getElementById("rg2-about-dialog").classList.add("d-none")
  document.getElementById("rg2-option-controls").classList.remove("d-none")
  document.getElementById("rg2-stats-dialog").classList.add("d-none")
  configureSettingsDialog()
  rightInfoPanel.show()
}

export function displayStatsDialog(resultid) {
  rightInfoPanelEl.style.width = `1000px`
  rightInfoPanelTitle.innerHTML = getStatsHeader()
  document.getElementById("rg2-stats-dialog").innerHTML = getStatsLayout()
  document.getElementById("rg2-about-dialog").classList.add("d-none")
  document.getElementById("rg2-option-controls").classList.add("d-none")
  document.getElementById("rg2-stats-dialog").classList.remove("d-none")
  let statsAvailable = loadStats(resultid)
  if (statsAvailable) {
    rightInfoPanel.show()
  }
}

export function getActiveTab() {
  return document.querySelector("#rg2-info-panel-tab-headers button.active").id
}

function getInfoPanelBodyHTML(tabs) {
  let html = `<div id="rg2-info-panel">`
  html += `<div class="tab-content" id="rg2-info-panel-tab-body">`
  for (let i = 0; i < tabs.length; i = i + 1) {
    const body = document.getElementById(tabs[i].body)
    const active = tabs[i].active ? " active show" : ""
    html += `<div class="tab-pane fade ${active}" id="rg2-${tabs[i].name}-body" role="tabpanel" 
    aria-labelledby="${tabs[i].name}" tabindex="${i}">${body.innerHTML}</div>`
    body.remove()
  }
  html += `</div></div>`
  return html
}

function getInfoPanelHeaderHTML(tabs) {
  let html = `<ul class="nav nav-pills" id="rg2-info-panel-tab-headers" role="tablist">`
  for (let i = 0; i < tabs.length; i = i + 1) {
    const hidden = tabs[i].hidden ? " d-none" : ""
    const active = tabs[i].active ? " active" : ""
    const disabled = tabs[i].disabled ? " disabled " : ""
    html += `
    <li class="nav-item" role="presentation">
      <button class="nav-link${active}${hidden}"${disabled}id="${tabs[i].name}" data-bs-toggle="tab"
      data-bs-target="#rg2-${tabs[i].name}-body"
        type="button" role="tab"><div id="${tabs[i].name}-label">${t(tabs[i].title)}</div>
      </button>
    </li>`
  }
  html += `</ul>`
  return html
}

function getMaxSpeedLabel() {
  return `<i class="bi-emoji-smile rg2-run-green"></i> ${options.maxSpeed.toFixed(1)} min/km`
}

function getMinSpeedLabel() {
  return `<i class="bi-emoji-smile rg2-run-red"></i> ${options.minSpeed.toFixed(1)} min/km`
}

function getScrollPosAttrName() {
  return `scroll-${getActiveTab()}`
}

function gpsSpeedChanged(e) {
  options.maxSpeed = e.detail.value1
  options.minSpeed = e.detail.value2
  const minSpeedLabel = document.getElementById("rg2-min-gps-speed-label")
  minSpeedLabel.innerHTML = getMinSpeedLabel()
  const maxSpeedLabel = document.getElementById("rg2-max-gps-speed-label")
  maxSpeedLabel.innerHTML = getMaxSpeedLabel()
  resetSpeedColours()
  redraw()
}

function initialiseButtons() {
  document.getElementById("btn-about").addEventListener("click", (e) => {
    displayAboutDialog(e)
  })
  document.getElementById("btn-settings").addEventListener("click", (e) => {
    displaySettingsDialog(e)
  })
  document.getElementById("btn-toggle-controls").addEventListener("click", () => {
    controls.toggleControlDisplay()
    redraw()
  })
  document.getElementById("btn-stats").addEventListener("click", () => {
    // stats display: start with first runner in results list
    displayStatsDialog(1)
  })
  document.getElementById("btn-splitsbrowser").addEventListener("click", () => {
    // <timestamp> mimics jQuery cache busting strategy to force reload of event data: needed to get
    // around events that are deleted and then recreated with same number
    window.open(rg2Config.api_url + "?type=splitsbrowser&id=" + getKartatEventID() + "&_=" + Date.now())
  })
  document.getElementById("btn-measure").setAttribute("disabled", "")
  document.getElementById("btn-runners").setAttribute("disabled", "")
  document.getElementById("btn-toggle-controls").setAttribute("disabled", "")
  document.getElementById("btn-stats").setAttribute("disabled", "")
  document.getElementById("btn-splitsbrowser").setAttribute("disabled", "")
}

function initialiseInfoPanelDialog() {
  const normalTabs = [
    { name: config.TAB_EVENTS, title: "Events", body: "rg2-event-body", active: true },
    { name: config.TAB_COURSES, title: "Courses", body: "rg2-course-body", disabled: true },
    { name: config.TAB_RESULTS, title: "Results", body: "rg2-result-body", disabled: true },
    { name: config.TAB_DRAW, title: "Draw", body: "rg2-draw-body", disabled: true }
  ]

  const managerTabs = [
    { name: config.TAB_LOGIN, title: "Login", body: "rg2-login-body", active: true },
    { name: config.TAB_CREATE, title: "Add event", body: "rg2-add-event-body", hidden: true },
    { name: config.TAB_EDIT, title: "Edit event", body: "rg2-edit-event-body", hidden: true },
    { name: config.TAB_MAP, title: "Add map", body: "rg2-add-map-body", hidden: true },
    { name: config.TAB_DELETE_MAP, title: "Delete maps", body: "rg2-delete-maps-body", hidden: true }
  ]

  if (config.managing()) {
    leftInfoPanelTitle.innerHTML = getInfoPanelHeaderHTML(managerTabs)
    leftInfoPanelBody.innerHTML = getInfoPanelBodyHTML(managerTabs)
  } else {
    leftInfoPanelTitle.innerHTML = getInfoPanelHeaderHTML(normalTabs)
    leftInfoPanelBody.innerHTML = getInfoPanelBodyHTML(normalTabs)
  }
}

export function resetDrawDialog() {
  createCourseDropdown()
  // name dialog initialised empty and disabled until course selected
  createNameDropdown(undefined)
  document.getElementById("rg2-select-name").setAttribute("disabled", "")
  if (eventHasResults()) {
    document.getElementById("rg2-name-select").classList.remove("d-none")
    document.getElementById("rg2-enter-name-and-time").classList.add("d-none")
  } else {
    document.getElementById("rg2-name-select").classList.add("d-none")
    document.getElementById("rg2-enter-name-and-time").classList.remove("d-none")
  }

  configureSettingsCheckbox("chk-align-map", "alignMap", "Align map to next control")
  document.getElementById("btn-three-seconds").setAttribute("disabled", "")
  document.getElementById("btn-undo").setAttribute("disabled", "")
  document.getElementById("btn-save-route").setAttribute("disabled", "")
  document.getElementById("btn-reset-drawing").setAttribute("disabled", "")

  document.getElementById("rg2-load-gps-file").setAttribute("disabled", "")
  document.getElementById("btn-autofit-gps").setAttribute("disabled", "")
  document.getElementById("btn-undo-gps-adjust").setAttribute("disabled", "")
  document.getElementById("btn-save-gps-route").setAttribute("disabled", "")

  document.getElementById("chk-move-all").checked = false
}

export function resizePanels() {
  const headerHeight = document.getElementById("rg2-header-container").offsetHeight
  const footerHeight = animationPanelDisplayed() ? document.getElementById("rg2-animation-controls").offsetHeight : 0
  leftInfoPanelEl.style.top = `${headerHeight}px`
  rightInfoPanelEl.style.top = `${headerHeight}px`
  leftInfoPanelEl.style.bottom = `${footerHeight}px`
  rightInfoPanelEl.style.bottom = `${footerHeight}px`
  // maxWidth overrides width in CSS so we can set width elsewhere and this will always clamp to screen size
  leftInfoPanelEl.style.maxWidth = `${window.innerWidth}px`
  rightInfoPanelEl.style.maxWidth = `${window.innerWidth}px`
  document.getElementById("rg2-track-names").style.maxHeight = `${window.innerHeight - headerHeight - 10}px`
}

export function setResultCheckboxes() {
  // checkbox to show a course
  const showCourse = document.querySelectorAll(".showcourse")
  showCourse.forEach((show) => {
    show.addEventListener("click", (e) => {
      const courseid = parseInt(e.target.dataset.courseid, 10)
      setCourseDisplay(courseid, e.target.checked)
      // align courses and results tab
      const showCourse = document.querySelectorAll(".showcourse")
      for (let elem of showCourse) {
        if (parseInt(elem.dataset.courseid, 10) === courseid) {
          elem.checked = e.target.checked
        }
      }
      // align allcourses for this course
      const showAllCourses = document.querySelector(".showallcourses")
      showAllCourses.checked = allCoursesDisplayed()
      setFilter(courseid)
      setHashCourses(getCoursesOnDisplay())
      redraw()
    })
  })

  // checkbox to show all courses
  const showAllCourses = document.querySelector(".showallcourses")
  showAllCourses.addEventListener("click", (e) => {
    setAllCoursesDisplay(e.target.checked)
    // align all the individual checkboxes for each course
    const showCourse = document.querySelectorAll(".showcourse")
    for (let elem of showCourse) {
      elem.checked = e.target.checked
    }
    setAllFilters()
    setHashCourses(getCoursesOnDisplay())
    redraw()
  })

  // checkbox to show an individual score course
  const showScoreCourse = document.querySelectorAll(".showscorecourse")
  showScoreCourse.forEach((show) => {
    show.addEventListener("click", (e) => {
      displayScoreCourse(parseInt(e.target.dataset.courseid, 10), e.target.checked)
      redraw()
    })
  })

  // checkbox to show a track
  const showTrack = document.querySelectorAll(".showtrack")
  showTrack.forEach((show) => {
    show.addEventListener("click", (e) => {
      const id = parseInt(e.target.dataset.id, 10)
      setTrackDisplayByResult(id, e.target.checked)
      const courseid = parseInt(e.target.dataset.courseid, 10)
      // align all routes for this course checkboxes
      const allCourseTracks = document.querySelectorAll(".allcoursetracks")
      allCourseTracks.forEach((course) => {
        if (parseInt(course.dataset.courseid, 10) === courseid) {
          course.checked = allTracksForCourseDisplayed(courseid)
        }
      })
      // align all routes for all courses checkbox
      const allTracks = document.querySelectorAll(".alltracks")
      allTracks.forEach((track) => {
        track.checked = allTracksDisplayed()
      })
      setFilter(courseid)
      setHashRoutes(getTracksOnDisplay())
      redraw()
    })
  })

  // checkbox to delete a route
  const deleteRoute = document.querySelectorAll(".deleteroute")
  for (let route of deleteRoute) {
    route.addEventListener("click", (e) => {
      confirmDeleteRoute(parseInt(e.target.dataset.resultidx, 10))
    })
  }

  // checkbox to display all tracks for course
  const allCourseTracks = document.querySelectorAll(".allcoursetracks")
  for (let course of allCourseTracks) {
    course.addEventListener("click", (e) => {
      let courseid = parseInt(e.target.dataset.courseid, 10)
      setTrackDisplayByCourse(courseid, e.target.checked)
      // align all tabs
      const allCourseTracks = document.querySelectorAll(".allcoursetracks")
      for (let elem of allCourseTracks) {
        if (parseInt(elem.dataset.courseid, 10) === courseid) {
          elem.checked = e.target.checked
        }
      }
      // align individual result checkboxes
      const showTrack = document.querySelectorAll(".showtrack")
      for (let elem of showTrack) {
        if (parseInt(elem.dataset.courseid, 10) === courseid) {
          elem.checked = e.target.checked
        }
      }
      // align all routes for all courses checkbox
      const allTracks = document.querySelectorAll(".alltracks")
      for (let elem of allTracks) {
        elem.checked = allTracksDisplayed()
      }
      setFilter(courseid)
      setHashRoutes(getTracksOnDisplay())
      redraw()
    })
  }

  // checkbox to show all tracks for all courses
  const allTracks = document.querySelectorAll(".alltracks")
  for (let elem of allTracks) {
    elem.addEventListener("click", (e) => {
      setTrackDisplayByCourse(config.DISPLAY_ALL_COURSES, e.target.checked)
      const allCourseTracks = document.querySelectorAll(".allcoursetracks")
      for (let elem of allCourseTracks) {
        elem.checked = e.target.checked
      }
      const showTrack = document.querySelectorAll(".showtrack")
      for (let elem of showTrack) {
        elem.checked = e.target.checked
      }
      setAllFilters(e.target.checked)
      setHashRoutes(getTracksOnDisplay())
      redraw()
    })
  }

  // checkbox to animate a result
  const showReplay = document.querySelectorAll(".showreplay")
  for (let elem of showReplay) {
    elem.addEventListener("click", (e) => {
      let resultid = parseInt(e.target.dataset.id, 10)
      if (e.target.checked) {
        addRunner(new Runner(resultid))
      } else {
        removeRunner(resultid)
      }
      const courseid = getCourseForResult(resultid)
      const allCourseTracksReplay = document.querySelectorAll(".allcoursetracksreplay")
      for (let elem of allCourseTracksReplay) {
        if (parseInt(elem.dataset.courseid, 10) === courseid) {
          elem.checked = allTracksForCourseReplayed(courseid)
        }
      }
      const allCourseReplay = document.querySelectorAll(".allcoursereplay")
      for (let elem of allCourseReplay) {
        elem.checked = allResultsForCourseReplayed(courseid)
      }
      redraw()
    })
  }

  const allCourseTracksReplay = document.querySelectorAll(".allcoursetracksreplay")
  for (let elem of allCourseTracksReplay) {
    elem.addEventListener("click", (e) => {
      let courseid = parseInt(e.target.dataset.courseid, 10)
      const courseresults = getAllRunnersWithTrackForCourse(courseid)
      animateRunners(courseresults, e.target.checked)
      const replay = document.querySelectorAll(".showreplay.showtrackreplay")
      for (let elem of replay) {
        if (parseInt(elem.dataset.courseid, 10) === courseid) {
          elem.checked = e.target.checked
        }
      }
      const allCourseTracksReplay = document.querySelectorAll(".allcoursetracksreplay")
      for (let elem of allCourseTracksReplay) {
        if (parseInt(elem.dataset.courseid, 10) === courseid) {
          elem.checked = e.target.checked
        }
      }
      let allCourseReplay = document.querySelectorAll(".allcoursereplay")
      for (let elem of allCourseReplay) {
        if (parseInt(elem.dataset.courseid, 10) === courseid) {
          elem.checked = allResultsForCourseReplayed(courseid)
        }
      }
      redraw()
    })
  }

  // checkbox to animate all results for course
  // this one draws straight lines between controls for non-drawn routes
  const allCourseReplay = document.querySelectorAll(".allcoursereplay")
  for (let elem of allCourseReplay) {
    elem.addEventListener("click", (e) => {
      const courseid = parseInt(e.target.dataset.courseid, 10)
      const courseresults = getAllRunnersForCourse(courseid)
      animateRunners(courseresults, e.target.checked)
      const replay = document.querySelectorAll(".showreplay")
      for (let elem of replay) {
        if (parseInt(elem.dataset.courseid, 10) === courseid) {
          elem.checked = e.target.checked
        }
      }
      const allCourseTracksReplay = document.querySelectorAll(".allcoursetracksreplay")
      for (let elem of allCourseTracksReplay) {
        if (parseInt(elem.dataset.courseid, 10) === courseid) {
          elem.checked = allTracksForCourseReplayed(courseid)
        }
      }
      redraw()
    })
  }
}

function tabActivated(e) {
  switch (e.target.id) {
    case config.TAB_DRAW:
      setAllCoursesDisplay(false)
      showCourseInProgress()
      break
    default:
      break
  }

  // Set scroll bar position in tab to how it was when user was last looking at it
  const scrollPos = document.getElementById("rg2-info-panel").getAttribute(getScrollPosAttrName())
  document.getElementById("rg2-left-info-panel-body").scrollTop = scrollPos
  redraw()
}
