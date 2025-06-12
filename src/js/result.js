import { ctx } from "./canvas"
import { config, options, getOverprintDetails } from "./config"
import { controls, getCourseDetails, incrementTracksCount, drawLinesBetweenControls } from "./courses"
import { getMetresPerPixel } from "./events"
import { decode } from "html-entities"
import { getTimeAndSplitsForID } from "./results"
import { getAngle, getDistanceBetweenPoints, getNextTrackColour } from "./utils"

export class Result {
  constructor(data, isScoreEvent, scorecodes, scorex, scorey) {
    // resultid is the kartat id value
    this.resultid = data.resultid
    this.rawid = this.resultid % config.GPS_RESULT_OFFSET
    this.isScoreEvent = isScoreEvent
    this.name = decode(data.name).trim()
    this.initials = this.getInitials(this.name)
    this.starttime = data.starttime
    this.time = data.time
    if (this.time === "00" || this.time === "0") {
      this.time = ""
    }
    this.timeInSecs = data.secs
    this.position = data.position
    this.status = data.status
    this.canDelete = false
    this.showResult = true
    this.token = 0
    // get round iconv problem in API for now: unescape special characters to get sensible text
    if (data.comments) {
      this.comments = decode(data.comments)
    } else {
      this.comments = ""
    }
    this.coursename = data.coursename
    if (this.coursename === "") {
      // need to force this to be a string for use elsewhere
      this.coursename = data.courseid.toString()
    }
    this.courseid = data.courseid
    this.variant = data.variant
    this.splits = this.adjustRawSplits(data.splits)
    if (this.isScoreEvent) {
      // save control locations for score course result
      this.scorex = scorex
      this.scorey = scorey
      this.scorecodes = scorecodes
    }
    // colours set when track is displayed
    this.trackColour = null
    this.userColour = null
    this.initialiseTrack(data)
  }

  addInterpolatedTimes(startindex, endindex, cumulativeDistance) {
    // add interpolated time at each point based on cumulative distance; this assumes uniform speed...
    const oldt = this.xysecs[startindex]
    const deltat = this.xysecs[endindex] - oldt
    const olddist = cumulativeDistance[startindex]
    const deltadist = cumulativeDistance[endindex] - olddist
    for (let i = startindex; i <= endindex; i += 1) {
      this.xysecs[i] = oldt + Math.round(((cumulativeDistance[i] - olddist) * deltat) / deltadist)
    }
  }

  addTrack(data) {
    this.trackx = data.x.split(",").map(function (n) {
      return parseInt(n, 10)
    })
    this.tracky = data.y.split(",").map(function (n) {
      return parseInt(n, 10)
    })
    // co-ords sent as differences, so recreate absolute values
    for (let i = 1; i < this.trackx.length; i += 1) {
      this.trackx[i] = this.trackx[i - 1] + this.trackx[i]
      this.tracky[i] = this.tracky[i - 1] + this.tracky[i]
    }
    let trackOK
    if (this.isGPSTrack) {
      trackOK = this.expandGPSTrack()
    } else {
      // handle events that just have a start and finish time
      if (this.splits.length === 2) {
        trackOK = this.expandTrackWithNoSplits()
      } else {
        trackOK = this.expandNormalTrack()
      }
    }
    if (trackOK) {
      incrementTracksCount(this.courseid)
    }
  }

  adjustRawSplits(rawSplits) {
    // insert a 0 split at the start to make life much easier elsewhere
    rawSplits.splice(0, 0, 0)
    // splits are time in seconds at control, but may have 0 for missing controls
    // make life easier elsewhere by replacing 0 with time at previous valid control
    for (let i = 1; i < rawSplits.length; i += 1) {
      // also allow for negative splits
      if (rawSplits[i] <= 0) {
        rawSplits[i] = rawSplits[i - 1]
      }
    }
    // for some excluded events the finish split is unadjusted (bug in results system?)
    // so safer to copy in running time
    // ...but don't get any slower than we already are (random missing splits or something)
    rawSplits[rawSplits.length - 1] = Math.max(this.timeInSecs, rawSplits[rawSplits.length - 2])
    return rawSplits
  }

  calculateTotalTrackLength() {
    // read through track to find total distance
    let cumulativeDistance = []
    cumulativeDistance[0] = 0
    let oldx = this.trackx[0]
    let oldy = this.tracky[0]
    for (let i = 1; i < this.trackx.length; i += 1) {
      cumulativeDistance[i] =
        cumulativeDistance[i - 1] + Math.round(getDistanceBetweenPoints(this.trackx[i], this.tracky[i], oldx, oldy))
      oldx = this.trackx[i]
      oldy = this.tracky[i]
    }
    return cumulativeDistance
  }

  calculateTrackTimes(course) {
    let cumulativeDistance = []
    cumulativeDistance[0] = 0
    let nextcontrol = this.getNextValidControl(0)
    let nextx = course.x[nextcontrol]
    let nexty = course.y[nextcontrol]
    let dist = 0
    let oldx = this.trackx[0]
    let oldy = this.tracky[0]
    let x = 0
    let y = 0
    let previouscontrolindex = 0
    // read through list of controls and copy in split times
    // we are assuming the track starts at the start which is index 0...
    // look at each track point and see if it matches the next control location
    for (let i = 1; i < this.trackx.length; i += 1) {
      // calculate distance while we are looping through
      x = this.trackx[i]
      y = this.tracky[i]
      dist += getDistanceBetweenPoints(x, y, oldx, oldy)
      cumulativeDistance[i] = Math.round(dist)
      oldx = x
      oldy = y
      // track ends at control
      if (nextx === x && nexty === y) {
        this.xysecs[i] = this.splits[nextcontrol]
        this.addInterpolatedTimes(previouscontrolindex, i, cumulativeDistance)
        previouscontrolindex = i
        nextcontrol = this.getNextValidControl(nextcontrol)
        if (nextcontrol === course.x.length) {
          // we have found all the controls
          this.hasValidTrack = true
          break
        }
        nextx = course.x[nextcontrol]
        nexty = course.y[nextcontrol]
      }
    }
  }

  drawScoreCourse() {
    // draws a score course for an individual runner to show where they went
    // based on drawCourse in course.js
    // could refactor in future...
    // > 1 since we need at least a start and finish to draw something
    if (this.displayScoreCourse && this.scorex.length > 1) {
      const opt = getOverprintDetails()
      ctx.globalAlpha = config.FULL_INTENSITY
      let angle = getAngle(this.scorex[0], this.scorey[0], this.scorex[1], this.scorey[1])
      controls.drawStart(this.scorex[0], this.scorey[0], "", angle, opt)
      angle = []
      for (let i = 0; i < this.scorex.length - 1; i += 1) {
        angle[i] = getAngle(this.scorex[i], this.scorey[i], this.scorex[i + 1], this.scorey[i + 1])
      }
      // draw all controls for a score course: too complicated to filter individuals
      const filter = { from: 0, to: this.scorex.length }
      drawLinesBetweenControls({ x: this.scorex, y: this.scorey }, angle, this.courseid, opt, filter)
      for (let i = 1; i < this.scorex.length - 1; i += 1) {
        controls.drawSingleControl(this.scorex[i], this.scorey[i], i, Math.PI * 0.25, opt)
      }
      controls.drawFinish(this.scorex[this.scorex.length - 1], this.scorey[this.scorey.length - 1], "", opt)
    }
  }

  drawTrack(filter) {
    // lots of scope for problems drawing incomplete results so just trap and move on
    try {
      let oldx, oldy, stopCount
      if (this.displayTrack) {
        if (this.isGPSTrack && options.showGPSSpeed) {
          // set speed colours if we haven't done it yet
          if (this.speedColour.length === 0) {
            this.setSpeedColours()
          }
          // add circle to show where control should be on GPS track based on split times
          const opt = getOverprintDetails()
          ctx.lineWidth = 2
          ctx.strokeStyle = config.PURPLE
          ctx.fillStyle = config.PURPLE_30
          // get time at first control
          let nextControlIndex = 1
          let nextSplit = this.splits[nextControlIndex]
          for (let i = 1; i < this.xysecs.length - 1; i += 1) {
            if (this.xysecs[i] >= nextSplit) {
              // draw control circle
              ctx.beginPath()
              ctx.arc(this.trackx[i], this.tracky[i], opt.controlRadius * 0.33, 0, 2 * Math.PI, false)
              // fill in with transparent colour to highlight control better
              ctx.fill()
              ctx.stroke()
              nextControlIndex = nextControlIndex + 1
              if (nextControlIndex >= this.splits.length) {
                break
              }
              nextSplit = this.splits[nextControlIndex]
            }
          }
        }
        let startIndex = 0
        let endIndex = this.xysecs.length
        const fromSplit = this.splits[filter.filterFrom]
        const toSplit = this.splits[filter.filterTo]
        // attempt at loop optimisation since drawing is quite slow...
        for (let f = 0; f < this.xysecs.length; f += 1) {
          if (this.xysecs[f] >= fromSplit) {
            startIndex = f
            break
          }
        }
        for (let f = this.xysecs.length - 1; f >= 0; f -= 1) {
          if (this.xysecs[f] <= toSplit) {
            endIndex = f
            break
          }
        }
        ctx.lineWidth = options.routeWidth
        ctx.strokeStyle = this.trackColour
        ctx.globalAlpha = options.perCentRouteIntensity / 100
        ctx.fillStyle = this.trackColour
        ctx.font = "10pt Arial"
        ctx.textAlign = "left"
        ctx.beginPath()
        ctx.moveTo(this.trackx[startIndex], this.tracky[startIndex])
        oldx = this.trackx[startIndex]
        oldy = this.tracky[startIndex]
        stopCount = 0
        for (let i = startIndex + 1; i <= endIndex; i += 1) {
          // lines
          ctx.lineTo(this.trackx[i], this.tracky[i])
          if (this.trackx[i] === oldx && this.tracky[i] === oldy) {
            // we haven't moved
            stopCount += 1
          } else {
            // we have started moving again
            if (stopCount > 0) {
              if (!this.isGPSTrack || (this.isGPSTrack && options.showThreeSeconds)) {
                ctx.fillText("+" + 3 * stopCount, oldx + 5, oldy + 5)
              }
              stopCount = 0
            }
          }
          oldx = this.trackx[i]
          oldy = this.tracky[i]
          if (this.isGPSTrack && options.showGPSSpeed) {
            // draw partial track since we need to keep changing colour
            ctx.strokeStyle = this.speedColour[i]
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(oldx, oldy)
          }
        }
        ctx.stroke()
      }
    } catch (e) {
      //  console.log("Problem drawing track for result ID " + this.resultid)
      return
    }
  }

  expandGPSTrack() {
    // in theory we get one point every three seconds
    for (let t = 0; t < this.trackx.length; t += 1) {
      this.xysecs[t] = 3 * t
    }
    // colours now set the first time we try to draw the track: major time saving on initial event load
    this.speedColour.length = 0
    this.hasValidTrack = true
    return this.hasValidTrack
  }

  expandNormalTrack() {
    // allow for getting two tracks for same result: should have been filtered in API...
    this.xysecs.length = 0
    // add times and distances at each position
    this.xysecs[0] = 0
    // get course details
    let course = {}
    // each person has their own defined score course
    if (this.isScoreEvent) {
      course.x = this.scorex
      course.y = this.scorey
    } else {
      course = getCourseDetails(this.courseid)
    }
    this.calculateTrackTimes(course)
    // treat all score tracks as valid for now
    // may need a complete rethink on score course handling later
    if (this.isScoreEvent) {
      this.hasValidTrack = true
    }
    return this.hasValidTrack
  }

  expandTrackWithNoSplits() {
    // based on ExpandNormalTrack, but deals with event format 2: no results
    // this means we have a course and a finish time but no split times
    this.xysecs.length = 0
    // only have finish time, which is in [1] at present
    const totaltime = this.splits[1]
    let currenttime = 0
    this.xysecs[0] = 0
    // get course details: can't be a score course since they aren't supported for format 2
    const course = {}
    course.x = getCourseDetails(this.courseid).x
    course.y = getCourseDetails(this.courseid).y
    let nextcontrol = 1
    let nextx = course.x[nextcontrol]
    let nexty = course.y[nextcontrol]
    let lastx = course.x[course.x.length - 1]
    let lasty = course.y[course.y.length - 1]
    // add finish location to track just in case...
    this.trackx.push(lastx)
    this.tracky.push(lasty)
    let previouscontrolindex = 0
    const cumulativeDistance = this.calculateTotalTrackLength()
    const totaldist = cumulativeDistance[cumulativeDistance.length - 1]
    // read through track to generate splits
    let x = 0
    let y = 0
    let moved = false
    for (let i = 1; i < this.trackx.length; i += 1) {
      x = this.trackx[i]
      y = this.tracky[i]
      // cope with routes that have start and finish in same place, and where the first point in a route is a repeat of the start
      if (x !== this.trackx[0] || y !== this.tracky[0]) {
        moved = true
      }
      // track ends at control, as long as we have moved away from the start
      if (nextx === x && nexty === y && moved) {
        currenttime = parseInt((cumulativeDistance[i] / totaldist) * totaltime, 10)
        this.xysecs[i] = currenttime
        this.splits[nextcontrol] = currenttime
        this.addInterpolatedTimes(previouscontrolindex, i, cumulativeDistance)
        previouscontrolindex = i
        nextcontrol += 1
        if (nextcontrol === course.x.length) {
          // we have found all the controls
          this.hasValidTrack = true
          break
        }
        nextx = course.x[nextcontrol]
        nexty = course.y[nextcontrol]
      }
    }
    return this.hasValidTrack
  }

  getColour(value) {
    // RGB Hex values
    //   Red Or  Yel LGr Gre PaG LBl Bl  DBl
    // R 255 255 255 128 0   0   0   0   0
    // G 0   128 255 255 255 255 255 128 0
    // B 0   0   0   0   0   128 255 255 255
    let colour = "#"
    // using range 0 = Red to 1 = Green
    // gets in a value between 0 (slowest) and 1 (fastest) and returns a colour string
    if (value === 0) {
      return "#0080ff"
    }
    if (value < 0.5) {
      colour += "ff"
    } else {
      const red = parseInt((1 - value) * 255 * 2, 10)
      if (red < 16) {
        colour += "0"
      }
      colour += red.toString(16)
    }
    if (value >= 0.5) {
      colour += "ff"
    } else {
      const green = 255 - parseInt((0.5 - value) * 255 * 2, 10)
      if (green < 16) {
        colour += "0"
      }
      colour += green.toString(16)
    }
    colour += "00"
    // console.log(value, colour)
    return colour
  }

  getInitials(name) {
    // converts name to initials
    if (name === null) {
      return "??"
    }
    // replace GPS with * so that we get *SE rather than GSE for initials
    name = name.replace(/GPS/g, "*")
    let initials = ""
    let addNext = true
    for (let i = 0; i < name.length; i += 1) {
      if (addNext) {
        initials += name.substr(i, 1)
        addNext = false
      }
      if (name.charAt(i) === " ") {
        addNext = true
      }
    }
    return initials
  }

  getNextValidControl(thisControl) {
    // look through splits to find next control which has a split time
    // to allow drawing for missed controls where the split time is 0
    for (let i = thisControl + 1; i < this.splits.length; i += 1) {
      if (this.splits[i] !== this.splits[i - 1]) {
        return i
      }
    }
    // implies we have no finish time which is unlikely but anyway...
    return this.splits.length
  }

  initialiseTrack(data) {
    this.legpos = []
    this.racepos = []
    // set true if track includes all expected controls in correct order or is a GPS track
    this.hasValidTrack = false
    this.displayTrack = false
    this.displayScoreCourse = false
    // raw track data
    this.trackx = []
    this.tracky = []
    this.speedColour = []
    // interpolated times
    this.xysecs = []
    // GPS track ids are normal resultid + GPS_RESULT_OFFSET
    if (this.resultid >= config.GPS_RESULT_OFFSET) {
      this.isGPSTrack = true
      // don't get time or splits so need to copy them in from original result
      const info = getTimeAndSplitsForID(this.rawid)
      this.time = info.time
      this.splits = info.splits
      // allow for events with no results where there won't be a non-GPS result
      if (this.time === config.TIME_NOT_FOUND) {
        this.time = data.time
      }
    } else {
      //this.name = data.name
      this.isGPSTrack = false
    }
  }

  mapSpeedColours() {
    // speed options are in min/km
    const maxMetresPerSecond = 16.667 / options.maxSpeed
    const minMetresPerSecond = 16.667 / options.minSpeed
    const secondsPerSample = 3
    // converts speed to RGB value
    const sorted = this.speedColour.slice().sort(function (a, b) {
      return a - b
    })
    const metresPerPixel = getMetresPerPixel()
    let maxspeed = 0
    let minspeed = 0
    if (metresPerPixel !== undefined) {
      maxspeed = (secondsPerSample * maxMetresPerSecond) / metresPerPixel
      minspeed = (secondsPerSample * minMetresPerSecond) / metresPerPixel
    } else {
      maxspeed = sorted[sorted.length - 1]
      // arbitrary limit below which everything will be red
      minspeed = sorted[Math.floor(sorted.length / 95)]
    }
    const range = maxspeed - minspeed
    // speedColour comes in with speeds at each point and gets updated to the associated colour
    for (let i = 0; i < this.speedColour.length; i += 1) {
      // force value into allowable range
      let value = Math.max(this.speedColour[i], minspeed)
      value = Math.min(value, maxspeed)
      //console.log(value, (value - minspeed) / range)
      this.speedColour[i] = this.getColour((value - minspeed) / range)
    }
  }

  setSpeedColours() {
    //calculate distance between each point in pixels, averaged over 2 points
    this.speedColour[0] = 0
    let oldDelta = 0
    for (let t = 1; t < this.trackx.length; t += 1) {
      const delta = getDistanceBetweenPoints(this.trackx[t], this.tracky[t], this.trackx[t - 1], this.tracky[t - 1])
      this.speedColour[t] = (delta + oldDelta) / 2
      oldDelta = delta
    }
    this.mapSpeedColours()
  }

  setTrackDisplay(display) {
    if (this.hasValidTrack) {
      if (display) {
        if (this.userColour !== null) {
          this.trackColour = this.userColour
        } else {
          this.trackColour = getNextTrackColour()
        }
      } else {
        this.trackColour = null
      }
      this.displayTrack = display
    }
  }
}
