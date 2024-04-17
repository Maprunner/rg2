import { ctx, redraw } from "./canvas"
import { options, config } from "./config"
import { getLengthUnits } from "./events"
import interact from "interactjs"
import { getDisplayedTrackDetails, setResultColour } from "./results"
import { resizePanels } from "./rg2ui"
import { Runner } from "./runner"
import { t } from "./translate"
import { formatSecsAsHHMMSS, getNextTrackColour } from "./utils"
let runners = []
// possible time increment values in milliseconds when timer expires
const timeDeltas = [100, 200, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 50000, 100000]
// value in milliseconds
const timerInterval = 100
let units = "px"
let timeDelta = 3000
let timer = null
// current time of animation
let animationSecs = 0
// animation time in millisecs to avoid rounding problems at very slow speed
// animationSecs is always int(milliSecs/1000)
let milliSecs = 0
let realTime = false
let earliestStartSecs = 0
let latestFinishSecs = 0
let tailLength = 60
let tailStartTimeSecs = 0
let useFullTails = false
// control to start from if this option selected
let massStartControl = 0
// run each leg as a mass start if true
let massStartByControl = false
let displayNames = false
let displayInitials = true
let startSecs = 0
let slowestTimeSecs = 0
let animationPanel = null
// animation control panel location
// const position = { x: 0, y: 0 }
let clockSlider = undefined

const playIcon = `<i title=${t("Run", "")} class="bi-play-circle-fill"></i>`
const startIcon = `<i title=${t("Start", "")} class="bi-triangle"></i>`
const pauseIcon = `<i title=${t("Pause", "")} class="bi-pause-btn"></i>`
const trackNames = document.getElementById("rg2-track-names")
const trackNamesBody = document.querySelector("#rg2-track-names .card-body")
const btnRunners = document.getElementById("btn-runners")
const btnStartStop = document.getElementById("btn-start-stop")
document.querySelector("#rg2-track-names .card-title").innerHTML = t("Runners")
document.getElementById("btn-close-track-names").addEventListener("click", () => {
  trackNames.classList.add("d-none")
})
btnRunners.addEventListener("click", () => {
  trackNames.classList.toggle("d-none")
})
const replayByControl = document.getElementById("rg2-replay-by-control")
replayByControl.classList.add("d-none")
//  allow dialog to be moved
let namesPosition = { x: 0, y: 0 }
interact(trackNames).draggable({
  inertia: true,
  listeners: {
    move(e) {
      namesPosition.x += e.dx
      namesPosition.y += e.dy
      e.target.style.transform = `translate(${namesPosition.x}px, ${namesPosition.y}px)`
    }
  },
  modifiers: [
    interact.modifiers.restrictRect({
      restriction: "#rg2-container"
    })
  ]
})

// TODO: enabling this interferes with clock slider
// let panelPosition = { x: 0, y: 0 }
// interact(document.getElementById("rg2-animation-controls")).draggable({
//   inertia: true,
//   listeners: {
//     move(e) {
//       panelPosition.x += e.dx
//       panelPosition.y += e.dy
//       e.target.style.transform = `translate(${panelPosition.x}px, ${panelPosition.y}px)`
//     }
//   },
//   modifiers: [
//     interact.modifiers.restrictRect({
//       restriction: "#rg2-container"
//     })
//   ]
// })

// update flag prevents multiple rapid updates to slider which can cause recursion problems
// needs to be set to false if called in a loop, and calling function then needs to call updateAnimationDetails
export function addRunner(runner, update = true) {
  for (let i = 0; i < runners.length; i += 1) {
    if (runners[i].resultid === runner.resultid) {
      // runner already exists so ignore
      return
    }
  }
  if (runner.userColour !== null) {
    runner.trackColour = runner.userColour
  } else {
    runner.trackColour = getNextTrackColour()
  }
  runners.push(runner)
  if (update) {
    updateAnimationDetails()
  }
}

export function animateRunners(courseresults, doAnimate) {
  for (let i = 0; i < courseresults.length; i += 1) {
    if (doAnimate) {
      addRunner(new Runner(courseresults[i]), false)
    } else {
      removeRunner(courseresults[i], false)
    }
  }
  updateAnimationDetails()
}

function calculateAnimationRange() {
  // in theory start time will be less than 24:00
  // TODO: races over midnight: a few other things to sort out before we get to that
  earliestStartSecs = 86400
  latestFinishSecs = 0
  slowestTimeSecs = 0
  for (let i = 0; i < runners.length; i += 1) {
    if (runners[i].starttime < earliestStartSecs) {
      earliestStartSecs = runners[i].starttime
    }
    if (runners[i].starttime + runners[i].x.length > latestFinishSecs) {
      latestFinishSecs = runners[i].starttime + runners[i].x.length
    }
    if (runners[i].x.length > slowestTimeSecs) {
      slowestTimeSecs = runners[i].x.length
    }
  }
}

// see if all runners have reached stop control and reset if they have
function checkForStopControl(currentTime) {
  // avoid problems when changing event with replay by control in progress
  if (runners.length === 0) {
    return
  }

  let allAtControl = true
  // work out if everybody has got to the next control
  for (let i = 0; i < runners.length; i += 1) {
    const legTime = runners[i].splits[massStartControl + 1] - runners[i].splits[massStartControl]
    if (legTime > currentTime) {
      allAtControl = false
      break
    }
  }
  if (allAtControl) {
    //move on to next control
    massStartControl += 1
    setByControlLabel(massStartControl)
    setNextControlDetails()
  }
}

// slider callback
function clockSliderMoved(time) {
  // setting attribute elsewhere triggers synchronous callback via dispatchEvent so best to filter out non-changes here
  if (time !== animationSecs) {
    setAnimationTime(time)
  }
}

function createSpeedDropdown() {
  let dropdown = document.getElementById("rg2-replay-speed-list")
  let html = ""
  for (let i = 0; i < timeDeltas.length; i = i + 1) {
    html += `<li class="dropdown-item" data-speed="${timeDeltas[i]}">${"x" + timeDeltas[i] / 100}</li>`
  }
  dropdown.innerHTML = html
  document.getElementById("rg2-replay-speed-select").addEventListener("hidden.bs.dropdown", (e) => {
    // only need to deal with close caused by a click on a new value
    if (e.clickEvent) {
      setReplaySpeed(parseInt(e.clickEvent.target.dataset.speed, 10))
    }
  })
}

export function createByControlDropdown() {
  let dropdown = document.getElementById("rg2-replay-start-control-list")
  let html = ""
  // find shortest set of splits being animated
  let minSplitsLength = 9999
  const controls = runners.reduce((minLength, r) => {
    return Math.min(r.splits.length, minLength)
  }, minSplitsLength)
  // count includes the finish split which we need to ignore
  for (let i = 0; i < controls - 1; i = i + 1) {
    const control = i === 0 ? `<div>${startIcon}</div>` : i
    html += `<li class="dropdown-item" data-control="${i}">${control}</li>`
  }
  dropdown.innerHTML = html
  document.getElementById("rg2-replay-start-control-select").addEventListener("hidden.bs.dropdown", (e) => {
    // only need to deal with close caused by a click on a new value
    if (e.clickEvent) {
      massStartControl = parseInt(e.clickEvent.target.dataset.control)
      if (isNaN(massStartControl)) {
        massStartControl = 0
      }
      setByControlLabel(massStartControl)
      setNextControlDetails()
    }
  })
}

export function createTailsDropdown() {
  let dropdown = document.getElementById("rg2-tails-length-list")
  let html = ""
  const tails = ["0:00", "0:30", "1:00", "1:30", "2:00", "3:00", t("Full tails", "")]
  const secs = [0, 30, 60, 90, 120, 180, "Full"]
  for (let i = 0; i < tails.length; i = i + 1) {
    html += `<li class="dropdown-item" data-length="${secs[i]}">${tails[i]}</li>`
  }
  dropdown.innerHTML = html
  document.getElementById("rg2-tails-length-select").addEventListener("hidden.bs.dropdown", (e) => {
    // only need to deal with close caused by a click on a new value
    if (e.clickEvent) {
      setTailsLength(e.clickEvent.target.dataset.length)
    }
  })
}

export function drawAnimation() {
  if (runners.length === 0) {
    return
  }
  if (clockSlider) {
    if (clockSlider.value !== animationSecs) {
      clockSlider.value = animationSecs
    }
    const clock = document.getElementById("rg2-clock")
    clock.innerText = formatSecsAsHHMMSS(animationSecs)
  }
  let time = 0
  for (let i = 0; i < runners.length; i += 1) {
    const runner = runners[i]
    let timeOffset = 0
    if (realTime) {
      timeOffset = runner.starttime
    } else {
      if (massStartControl === 0 || runner.splits.length < massStartControl) {
        // no offset since we are starting from the start
        timeOffset = 0
      } else {
        // offset needs to move forward (hence negative) to time at control
        timeOffset = -1 * runner.splits[massStartControl]
      }
    }
    ctx.strokeStyle = runner.trackColour
    ctx.globalAlpha = options.perCentRouteIntensity / 100
    ctx.lineWidth = options.routeWidth
    //ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(runner.x[tailStartTimeSecs - timeOffset], runner.y[tailStartTimeSecs - timeOffset])

    // t runs as real time seconds or 0-based seconds depending on realTime
    // runner.x[] is always indexed in 0-based time so needs to be adjusted for starttime offset
    for (let t = tailStartTimeSecs; t < animationSecs; t += 1) {
      if (t > timeOffset && t - timeOffset < runner.nextStopTime) {
        ctx.lineTo(runner.x[t - timeOffset], runner.y[t - timeOffset])
      }
    }
    ctx.stroke()
    ctx.beginPath()
    time = animationSecs
    if (time - timeOffset < runner.nextStopTime) {
      time = time - timeOffset
    } else {
      time = runner.nextStopTime
    }
    ctx.arc(runner.x[time], runner.y[time], config.RUNNER_DOT_RADIUS, 0, 2 * Math.PI, false)
    ctx.globalAlpha = config.FULL_INTENSITY
    ctx.strokeStyle = config.BLACK
    ctx.fillStyle = runner.trackColour
    ctx.fill()
    ctx.lineWidth = config.RUNNER_DOT_RADIUS / 4
    ctx.stroke()
    drawName(runner, time)
  }
  showDistanceRun(time)
  if (massStartByControl) {
    checkForStopControl(animationSecs)
  }
}

function drawName(runner, time) {
  let text = ""
  if (displayNames || displayInitials) {
    // make sure we have a valid position to display
    if (time < runner.x.length && time >= 0) {
      ctx.fillStyle = "black"
      ctx.strokeStyle = "white"
      ctx.font = options.replayFontSize + "pt Arial"
      ctx.globalAlpha = config.FULL_INTENSITY
      ctx.textAlign = "left"
      if (displayInitials) {
        text = runner.initials
      } else {
        text = runner.name
      }
      ctx.save()
      // centre map on runner location
      ctx.translate(runner.x[time], runner.y[time])
      // rotate map so that text stays horizontal
      ctx.rotate(ctx.displayAngle)
      // no real science: offsets just look OK
      ctx.lineWidth = options.replayFontSize / 8
      ctx.strokeText(text, 12, 6)
      ctx.fillText(text, 12, 6)
      ctx.restore()
    }
  }
}

function getDistanceAtTime(idx, time) {
  const cumDist = runners[idx].cumulativeDistance
  let dist = time > cumDist.length - 1 ? cumDist[cumDist.length - 1] : cumDist[time]
  if (dist === undefined) {
    dist = 0
  }
  return dist
}

function getTrackNames(time) {
  let tracks = []
  for (let i = 0; i < runners.length; i += 1) {
    let info = {}
    info.trackColour = runners[i].trackColour
    info.course = runners[i].coursename
    info.name = runners[i].name
    info.resultid = runners[i].resultid
    info.rawid = runners[i].rawid
    if (realTime) {
      info.distance = getDistanceAtTime(i, animationSecs - runners[i].starttime)
    } else {
      info.distance = getDistanceAtTime(i, time)
    }
    info.distance += units
    tracks.push(info)
  }
  // get all tracks displayed so we can add them if they are not animated as well
  let extraTracks = getDisplayedTrackDetails()
  for (let i = 0; i < extraTracks.length; i += 1) {
    // add tracks not already in tracks list
    if (
      tracks.findIndex((track) => {
        return track.resultid === extraTracks[i].resultid
      }) === -1
    ) {
      let info = {}
      info.trackColour = extraTracks[i].trackColour
      info.course = extraTracks[i].course
      info.name = extraTracks[i].name
      info.resultid = extraTracks[i].resultid
      info.rawid = extraTracks[i].rawid
      info.distance = ""
      tracks.push(info)
    }
  }
  return tracks
}

function getTrackNamesHTML(tracks) {
  if (tracks.length === 0) {
    return ""
  }
  let html = ""
  let oldCourse = ""
  for (let i = 0; i < tracks.length; i += 1) {
    if (oldCourse !== tracks[i].course) {
      html += `<div></div><div><strong>${tracks[i].course}</strong></div><div></div>`
      oldCourse = tracks[i].course
    }
    html += `<input type="color" class="form-control form-control-color" data-rawid="${tracks[i].rawid}"`
    html += ` value = "${tracks[i].trackColour}" ><div>${tracks[i].name}</div><div class="runner-distance text-end"`
    html += ` data-resultid="${tracks[i].resultid}">${tracks[i].distance}</div>`
  }
  return html
}

export function incrementAnimationTime() {
  // only increment time if we haven't got to the end already
  if (realTime) {
    if (animationSecs < latestFinishSecs) {
      milliSecs = Math.min(milliSecs + timeDelta, latestFinishSecs * 1000)
    }
  } else {
    if (animationSecs < slowestTimeSecs) {
      milliSecs = Math.min(milliSecs + timeDelta, slowestTimeSecs * 1000)
    }
  }
  animationSecs = parseInt(milliSecs / 1000, 10)
  // find earliest time we need to worry about when drawing screen
  if (useFullTails) {
    tailStartTimeSecs = startSecs + 1
  } else {
    tailStartTimeSecs = Math.max(animationSecs - tailLength, startSecs + 1)
  }
  redraw()
}

export function initialiseAnimationPanel() {
  if (animationPanel) {
    return
  }
  animationPanel = document.getElementById("rg2-animation-controls")
  const clock = document.getElementById("rg2-clock")
  clock.innerText = "00:00:00"

  initialiseClockSlider(0, 0, 0)

  createSpeedDropdown()
  setReplaySpeed(timeDelta)

  btnStartStop.addEventListener("click", () => {
    toggleAnimation()
  })

  const btnMassStart = document.getElementById("btn-mass-start")
  btnMassStart.addEventListener("click", () => {
    replayByControl.classList.add("d-none")
    setReplayMassStart()
  })

  const btnRealTime = document.getElementById("btn-real-time")
  btnRealTime.setAttribute("title", t("Real time", ""))
  btnRealTime.addEventListener("click", () => {
    replayByControl.classList.add("d-none")
    setReplayRealTime()
  })

  const btnByControl = document.getElementById("btn-by-control")
  btnByControl.addEventListener("click", () => {
    setReplayByControl()
    createByControlDropdown()
    replayByControl.classList.remove("d-none")
  })

  createTailsDropdown()

  let options = document.querySelectorAll("[data-toggle-names]")
  for (let opt of options) {
    opt.innerHTML = t(opt.dataset.toggleNames)
    opt.addEventListener("click", (e) => {
      toggleNameDisplay(e.currentTarget.dataset.toggleNames)
    })
  }
  document.getElementById("rg2-toggle-names-value").setAttribute("title", t("Show names", ""))
}

function initialiseClockSlider(min, max, val) {
  // avoid unnecessary reinitialisation
  if (clockSlider && clockSlider.min === min && clockSlider.max === max && clockSlider.value === val) {
    return
  }
  if (clockSlider) {
    clockSlider.remove()
  }
  const clockSliderContainer = document.getElementById("rg2-clock-slider-container")
  const slider = document.createElement("tc-range-slider")
  slider.setAttribute("id", "rg2-clock-slider")
  slider.setAttribute("min", min)
  slider.setAttribute("max", max)
  slider.setAttribute("value", val)
  slider.setAttribute("step", 1)
  clockSliderContainer.append(slider)
  clockSlider = document.getElementById("rg2-clock-slider")
  clockSlider.addEventListener("change", (e) => {
    clockSliderMoved(e.target.value)
  })
}

export function removeRunner(resultid) {
  for (let i = 0; i < runners.length; i += 1) {
    if (runners[i].resultid === resultid) {
      // delete 1 runner at position i
      runners.splice(i, 1)
    }
  }
  updateAnimationDetails()
}

// called before a new event is loaded
export function resetAnimation() {
  runners.length = 0
  timeDelta = 3000
  animationSecs = 0
  milliSecs = 0
  realTime = false
  earliestStartSecs = 0
  latestFinishSecs = 0
  tailLength = 60
  tailStartTimeSecs = 0
  useFullTails = false
  massStartControl = 0
  massStartByControl = false
  displayNames = false
  displayInitials = true
  startSecs = 0
  slowestTimeSecs = 0
  clearInterval(timer)
  timer = null
  updateAnimationDetails()
  btnStartStop.innerHTML = playIcon
  trackNames.classList.add("d-none")
}

export function resultIsBeingAnimated(resultid) {
  // is given result in the array of animated runners?
  return runners.findIndex((runner) => runner.resultid === resultid) > -1
}

function setAnimationTime(time) {
  units = getLengthUnits()
  // if we got a non-0 time it was from the slider so use it
  // otherwise reset to base time
  let max = 0
  if (realTime) {
    if (time > 0) {
      animationSecs = time
    } else {
      animationSecs = earliestStartSecs
    }
    max = latestFinishSecs
    startSecs = earliestStartSecs
  } else {
    if (time > 0) {
      animationSecs = time
    } else {
      animationSecs = 0
    }
    max = slowestTimeSecs
    startSecs = 0
  }
  milliSecs = animationSecs * 1000
  if (time === 0) {
    initialiseClockSlider(startSecs, max, animationSecs)
  }
  redraw()
}

function setByControlLabel(control) {
  document.getElementById("rg2-replay-start-control").innerHTML = control === 0 ? startIcon : control
}

function setNextControlDetails() {
  let minSplitsLength = 9999
  // not all runners have the same number of controls
  // since they may be on different courses or a score course
  minSplitsLength = runners.reduce((minLength, r) => {
    return Math.min(r.splits.length, minLength)
  }, minSplitsLength)
  // splits array contains entries for S, controls and F
  // stop replaying once we have got to F
  if (massStartControl > minSplitsLength) {
    massStartControl = 0
  }
  // find time at next control
  for (let i = 0; i < runners.length; i += 1) {
    // splits includes a start time so index to control is + 1
    // also need to allow for runners on different courses so not
    // all runners have same number of controls
    if (massStartControl + 1 < runners[i].splits.length) {
      runners[i].nextStopTime = runners[i].splits[massStartControl + 1]
    } else {
      runners[i].nextStopTime = config.VERY_HIGH_TIME_IN_SECS
    }
  }
  setAnimationTime(0)
  // stop animation and wait for next leg
  stopAnimation()
  redraw()
}

// callback when user selects replay by control
function setReplayByControl() {
  // disable slider since moving it during replay by control is open to interpretation
  document.getElementById("rg2-clock-slider").setAttribute("disabled", "")
  realTime = false
  // default to 0 (start) until user selects another control
  massStartControl = 0
  massStartByControl = true
  setByControlLabel(massStartControl)
  setNextControlDetails()
}

function setReplayMassStart() {
  realTime = false
  massStartByControl = false
  massStartControl = 0
  setAnimationTime(0)
  clockSlider.removeAttribute("disabled")
}

function setReplayRealTime() {
  realTime = true
  massStartByControl = false
  massStartControl = 0
  setAnimationTime(0)
  clockSlider.removeAttribute("disabled")
}

function setReplaySpeed(speed) {
  if (isNaN(speed)) {
    speed = 1000
  }
  timeDelta = speed
  document.getElementById("rg2-replay-speed").innerText = "x" + speed / 100
}

function setRunnerColor(rawid, trackColour) {
  // set colour for runners already selected
  for (let i = 0; i < runners.length; i += 1) {
    if (runners[i].rawid === rawid) {
      runners[i].userColour = trackColour
      runners[i].trackColour = trackColour
    }
  }
  // and save colour for next time runner is selected
  setResultColour(rawid, trackColour)
}

function setTailsLength(value) {
  if (value === "Full") {
    useFullTails = true
  } else {
    tailLength = parseInt(value, 10)
    useFullTails = false
  }
  calculateAnimationRange()
  redraw()
}

function showDistanceRun(time) {
  const names = getTrackNames(time)
  if (names.length === 0) {
    return
  }
  const runners = document.querySelectorAll(".track-names .runner-distance")
  if (runners) {
    runners.forEach((runner) => {
      const resultid = parseInt(runner.dataset.resultid)
      const idx = names.findIndex((name) => {
        return name.resultid === resultid
      })
      if (idx > -1) {
        runner.innerText = names[idx].distance
      }
    })
  }
}

function startAnimation() {
  if (timer === null) {
    timer = setInterval(() => {
      incrementAnimationTime()
    }, timerInterval)
  }
  btnStartStop.innerHTML = pauseIcon
}

function stopAnimation() {
  clearInterval(timer)
  timer = null
  btnStartStop.innerHTML = playIcon
}

function toggleAnimation() {
  if (timer === null) {
    startAnimation()
    btnStartStop.innerHTML = pauseIcon
  } else {
    stopAnimation()
    btnStartStop.innerHTML = playIcon
  }
}

function toggleNameDisplay(value) {
  document.getElementById("rg2-toggle-names-value").setAttribute("title", t(value, ""))
  switch (value) {
    case "Show names":
      displayNames = true
      displayInitials = false
      break
    case "Show initials":
      displayNames = false
      displayInitials = true
      break
    default:
      displayNames = false
      displayInitials = false
      break
  }
  redraw()
}

function updateAnimationDetails() {
  initialiseAnimationPanel()
  updateTrackNames()
  if (runners.length > 0) {
    animationPanel.classList.remove("d-none")
  } else {
    animationPanel.classList.add("d-none")
  }
  resizePanels()
  calculateAnimationRange()
  setAnimationTime(0)
}

export function updateTrackNames() {
  const names = getTrackNames(animationSecs)
  if (names.length > 0) {
    trackNamesBody.innerHTML = getTrackNamesHTML(names)
    const colorSelects = document.querySelectorAll(".track-names input")
    colorSelects.forEach((color) => {
      color.addEventListener("input", (e) => {
        setRunnerColor(parseInt(e.target.dataset.rawid, 10), e.target.value)
        redraw()
      })
    })
    trackNames.classList.remove("d-none")
  } else {
    trackNamesBody.innerHTML = ""
    trackNames.classList.add("d-none")
  }
  return names.length
}
