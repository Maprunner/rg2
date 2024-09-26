import { getMapSize, redraw } from "./canvas"
import { adjustTrack, getControlXY } from "./draw"
import { getWorldFile, mapIsGeoreferenced } from "./events"
import { Handles } from "./handles"
import { getDistanceBetweenPoints, getLatLonDistance, showWarningDialog } from "./utils"

export class RouteData {
  constructor() {
    this.courseid = null
    this.coursename = null
    this.controlsToAdjust = 0
    this.resultid = null
    this.isScoreCourse = false
    this.eventid = null
    this.name = null
    this.comments = null
    this.x = []
    this.y = []
    this.controlx = []
    this.controly = []
    this.time = []
    this.startsecs = 0
    this.totaltime = 0
    this.splits = []
    this.xml = null
  }
}

export class GPSTrack {
  constructor() {
    this.lat = []
    this.lon = []
    this.startOffset = 0
    this.baseX = []
    this.baseY = []
    this.handles = new Handles()
    this.savedBaseX = []
    this.savedBaseY = []
    this.fileLoaded = false
    this.fileName = ""
    this.fileType = ""
    this.routeData = new RouteData()
    this.autofitOffset = null
  }

  adjustOffset(offset) {
    this.autofitOffset = offset
    this.processGPSFile()
    this.autofitTrack()
  }

  addStartAndFinishHandles() {
    // add handles at start and finish of route
    this.handles.addHandle(this.baseX[0], this.baseY[0], 0)
    this.handles.addHandle(this.baseX[this.baseX.length - 1], this.baseY[this.baseY.length - 1], this.baseY.length - 1)
  }

  applyWorldFile() {
    // translate lat/lon to x,y based on world file info: see http://en.wikipedia.org/wiki/World_file
    const worldFile = getWorldFile()
    for (let i = 0; i < this.lat.length; i += 1) {
      this.routeData.x[i] = Math.round(
        (worldFile.E * this.lon[i] - worldFile.B * this.lat[i] + worldFile.xCorrection) / worldFile.AEDB
      )
      this.routeData.y[i] = Math.round(
        (-1 * worldFile.D * this.lon[i] + worldFile.A * this.lat[i] + worldFile.yCorrection) / worldFile.AEDB
      )
    }
  }

  autofitTrack() {
    // fits a GPS track to the course based on split times at control locations
    // unlock map to allow adjustment
    document.getElementById("chk-move-all").checked = false
    this.handles.deleteAllHandles()
    this.addStartAndFinishHandles()
    if (this.autofitOffset === null) {
      this.autofitOffset = this.getOffset()
      //ui.setAutofitSpinner(this.autofitOffset)
    }
    // adjust for each control in turn
    for (let i = 1; i < this.routeData.controlsToAdjust; i += 1) {
      // don't try to adjust missing controls
      if (this.routeData.splits[i] !== this.routeData.splits[i - 1]) {
        const split = this.routeData.splits[i] + this.autofitOffset
        // move track to control location
        if (split < this.baseX.length && split >= 0) {
          // add handle at control on track
          this.handles.addHandle(this.routeData.x[split], this.routeData.y[split], split)
          // drag handle to correct place on map
          adjustTrack(
            { x: this.routeData.x[split], y: this.routeData.y[split] },
            { x: this.routeData.controlx[i], y: this.routeData.controly[i] }
          )
          // lock handle at control
          this.handles.lockHandleByTime(split)
          // rebaseline everything
          this.baseX = this.routeData.x.slice(0)
          this.baseY = this.routeData.y.slice(0)
          this.handles.rebaselineXY()
        }
      }
    }
    document.getElementById("btn-autofit-gps").setAttribute("disabled", "")
    document.getElementById("btn-undo-gps-adjust").setAttribute("disabled", "")
    redraw()
  }

  expandToOneSecondInterval() {
    // convert to one second intervals to make what follows a bit easier since we can index x and y directly
    // time from GPX has already been converted to integer seconds so we don't need to worry about sub-seconds in the expansion
    // gets reset to 3 second intervals on server when saved
    let x = []
    let y = []
    let time = []
    const trk = this.routeData
    let oldtime = trk.time[0]
    let oldx = trk.x[0]
    let oldy = trk.y[0]
    x[0] = oldx
    y[0] = oldy
    time[0] = trk.time[0]
    let nexttime = time[0] + 1
    for (let i = 1; i < trk.x.length; i += 1) {
      const difftime = trk.time[i] - oldtime
      // shouldn't have 0 intervals, but discard them if we do
      if (difftime > 0) {
        const xpersec = (trk.x[i] - oldx) / difftime
        const ypersec = (trk.y[i] - oldy) / difftime
        let secs = 1
        while (secs <= difftime) {
          x.push(oldx + xpersec * secs)
          y.push(oldy + ypersec * secs)
          //
          time.push(nexttime)
          nexttime += 1
          secs += 1
        }
        oldx = trk.x[i]
        oldy = trk.y[i]
        oldtime = nexttime - 1
      }
    }
    this.routeData.x = x.slice(0)
    this.routeData.y = y.slice(0)
    this.routeData.time = time.slice(0)
  }

  fitTrackInsideCourse() {
    // fit track to within limits of course
    // find bounding box for track
    const latLon = this.getLatLonInfo()
    const controlXY = this.getControlInfo()

    // scale GPS track to within bounding box of controls: a reasonable start
    let scaleX = (controlXY.maxX - controlXY.minX) / (latLon.maxLon - latLon.minLon)
    let scaleY = (controlXY.maxY - controlXY.minY) / (latLon.maxLat - latLon.minLat)
    // don't want to skew track so scale needs to be equal in each direction
    // so we need to account for differences between a degree of latitude and longitude
    if (scaleX > scaleY) {
      // pix/lat = pix/lon * m/lat * lon/m
      scaleY = (scaleX * latLon.latCorrection) / latLon.lonCorrection
    } else {
      // pix/lon = pix/lat * m/lon * lat/m
      scaleX = (scaleY * latLon.lonCorrection) / latLon.latCorrection
    }
    // extra offset to put start of track at start location
    this.routeData.x[0] = (this.lon[0] - latLon.minLon) * scaleX + controlXY.minX
    this.routeData.y[0] = -1 * (this.lat[0] - latLon.maxLat) * scaleY + controlXY.minY

    // translate lat/lon to x,y
    const deltaX = controlXY.minX - (this.routeData.x[0] - controlXY.x[0])
    const deltaY = controlXY.minY - (this.routeData.y[0] - controlXY.y[0])

    for (let i = 0; i < this.lat.length; i += 1) {
      this.routeData.x[i] = (this.lon[i] - latLon.minLon) * scaleX + deltaX
      this.routeData.y[i] = -1 * (this.lat[i] - latLon.maxLat) * scaleY + deltaY
    }
  }

  getControlInfo() {
    let controlXY = getControlXY()
    controlXY.minX = Math.min.apply(Math, controlXY.x)
    controlXY.maxX = Math.max.apply(Math, controlXY.x)
    controlXY.minY = Math.min.apply(Math, controlXY.y)
    controlXY.maxY = Math.max.apply(Math, controlXY.y)

    // issue #60: allow for no controls or just a few in a small area
    // 100 is an arbitrary but sensible cut-off
    if (controlXY.maxY - controlXY.minY < 100 || controlXY.maxX - controlXY.minX < 100) {
      controlXY.minX = 0
      controlXY.minY = 0
      const size = getMapSize()
      controlXY.maxX = size.width
      controlXY.maxY = size.height
    }
    //console.log (minControlX, maxControlX, minControlY, maxControlY)
    return controlXY
  }

  getLatLonInfo() {
    let latLon = {}
    latLon.maxLat = Math.max.apply(Math, this.lat)
    latLon.maxLon = Math.max.apply(Math, this.lon)
    latLon.minLat = Math.min.apply(Math, this.lat)
    latLon.minLon = Math.min.apply(Math, this.lon)
    latLon.lonCorrection =
      getLatLonDistance(latLon.minLat, latLon.maxLon, latLon.minLat, latLon.minLon) / (latLon.maxLon - latLon.minLon)
    latLon.latCorrection =
      getLatLonDistance(latLon.minLat, latLon.minLon, latLon.maxLat, latLon.minLon) / (latLon.maxLat - latLon.minLat)
    return latLon
  }

  getOffset() {
    // calculates an offset to split times based on lowest average speed summed across all controls
    const speedAverage = this.getSpeedAverage()
    let speedAtControl = []
    // range of seconds either side to check for "minimum speed" at control
    const range = 10
    for (let i = 0; i <= 2 * range; i += 1) {
      speedAtControl[i] = 0
    }
    // read through each control
    let speedExtract = 0
    for (let i = 1; i < this.routeData.controlsToAdjust; i += 1) {
      const split = this.routeData.splits[i]
      // ignore missing splits
      if (split !== this.routeData.splits[i - 1]) {
        // avoid edge cases near start and finish
        if (split >= range && split + range < speedAverage.length) {
          speedExtract = speedAverage.slice(split - range, split + range + 1)
        }
        for (let j = 0; j <= 2 * range; j += 1) {
          speedAtControl[j] += speedExtract[j]
        }
      }
    }
    let bestGuess = 0
    for (let i = 1; i < speedAtControl.length; i += 1) {
      if (speedAtControl[i] < speedAtControl[bestGuess]) {
        bestGuess = i
      }
    }
    // convert index in bestGuess into offset in x, y, time
    const offset = bestGuess - range
    return offset
  }

  getSecsFromTrackpoint(timestring) {
    // input is 2013-12-03T12:34:56Z (or 56.000Z)
    // needs to offset from midnight to allow replays, and alos needs to handle date (and year!) rollover
    const secs = parseInt(Date.parse(timestring) / 1000, 10)
    if (isNaN(secs)) {
      return 0
    }
    return secs - this.startOffset
  }

  getSpeedAverage() {
    // returns an array showing average speed for each second of the run
    let speed = []
    let speedAverage = []
    speed[0] = 0
    for (let i = 1; i < this.routeData.x.length; i += 1) {
      // stored at second intervals so don't need to divide by time'
      speed[i] = getDistanceBetweenPoints(
        this.routeData.x[i],
        this.routeData.y[i],
        this.routeData.x[i - 1],
        this.routeData.y[i - 1]
      )
    }
    // average over 3 seconds to smooth things out
    for (let i = 1; i < this.routeData.x.length - 1; i += 1) {
      speedAverage[i] = (speed[i - 1] + speed[i] + speed[i + 1]) / 3
    }
    // not really worried about these but set to a sensible value
    speedAverage[0] = speed[0]
    speedAverage[this.routeData.x.length - 1] = speed[this.routeData.x.length - 1]
    return speedAverage
  }

  getStartOffset(timestring) {
    // needs to be set to midnight for supplied timestring
    // input is 2013-12-03T12:34:56Z (or 56.000Z)
    const secs = parseInt(Date.parse(timestring.substr(0, 11) + "00:00:00Z") / 1000, 10)
    if (isNaN(secs)) {
      return 0
    }
    return secs
  }

  initialiseGPS() {
    this.lat.length = 0
    this.lon.length = 0
    this.startOffset = 0
    this.baseX.length = 0
    this.baseY.length = 0
    this.handles.deleteAllHandles()
    this.savedBaseX.length = 0
    this.savedBaseY.length = 0
    this.fileLoaded = false
    this.routeData.x.length = 0
    this.routeData.y.length = 0
    this.routeData.time.length = 0
  }

  processGPSFile() {
    this.initialiseGPS()
    if (this.fileType === "gpx") {
      this.processGPX()
    } else {
      this.processTCX()
    }
    this.processGPSTrack()
  }

  processGPSTrack() {
    if (mapIsGeoreferenced()) {
      this.applyWorldFile()
      if (this.trackMatchesMapCoordinates()) {
        // everything OK so lock background to avoid accidental adjustment
        document.getElementById("chk-move-all").checked = true
      } else {
        // warn and fit to track
        showWarningDialog(
          "GPS file problem",
          "Your GPS file does not match the map co-ordinates. Please check you have selected the correct file."
        )
        this.fitTrackInsideCourse()
      }
    } else {
      this.fitTrackInsideCourse()
    }
    // finished with lat and lon so they can go just in case
    this.lat.length = 0
    this.lon.length = 0
    this.expandToOneSecondInterval()
    this.baseX = this.routeData.x.slice(0)
    this.baseY = this.routeData.y.slice(0)
    this.addStartAndFinishHandles()
    this.fileLoaded = true
    // need more than a start and finish to autofit
    if (this.routeData.splits.length > 2) {
      document.getElementById("btn-autofit-gps").removeAttribute("disabled")
    }
    document.getElementById("btn-save-gps-route").removeAttribute("disabled")
    redraw()
  }

  processGPX() {
    const trksegs = this.xml.getElementsByTagName("trkseg")
    for (let i = 0; i < trksegs.length; i += 1) {
      const trkpts = trksegs[i].getElementsByTagName("trkpt")
      this.startOffset = this.getStartOffset(trkpts[0].getElementsByTagName("time")[0].textContent)
      // #319 allow for GPS files with (lat 0, lon 0)
      for (let j = 0; j < trkpts.length; j += 1) {
        const lat = trkpts[j].getAttribute("lat")
        const lon = trkpts[j].getAttribute("lon")
        // getAttribute returns strings
        if (lat !== "0" && lon !== "0") {
          this.lat.push(lat)
          this.lon.push(lon)
          this.routeData.time.push(this.getSecsFromTrackpoint(trkpts[j].getElementsByTagName("time")[0].textContent))
        }
      }
    }
  }

  processTCX() {
    const trksegs = this.xml.getElementsByTagName("Track")
    for (let i = 0; i < trksegs.length; i += 1) {
      const trkpts = trksegs[i].getElementsByTagName("Trackpoint")
      this.startOffset = this.getStartOffset(trkpts[0].getElementsByTagName("Time")[0].textContent)
      for (let j = 0; j < trkpts.length; j += 1) {
        // allow for <trackpoint> with no position: see #199
        if (trkpts[j].getElementsByTagName("Position").length > 0) {
          const position = trkpts[j].getElementsByTagName("Position")
          // #319 allow for GPS files with (lat 0, lon 0)
          const lat = position[0].getElementsByTagName("LatitudeDegrees")[0].textContent
          const lon = position[0].getElementsByTagName("LongitudeDegrees")[0].textContent
          // textContent returns strings
          if (lat !== "0" && lon !== "0") {
            this.lat.push(lat)
            this.lon.push(lon)
            this.routeData.time.push(this.getSecsFromTrackpoint(trkpts[j].getElementsByTagName("Time")[0].textContent))
          }
        }
      }
    }
  }

  readGPS(file) {
    //console.log ("File" + e.target.files[0].name)
    let reader = new FileReader()
    this.fileName = file.target.files[0].name

    reader.onerror = function (e) {
      showWarningDialog("GPS file problem", "Unable to open GPS file. " + e)
    }
    reader.onload = (text) => {
      try {
        this.fileType = this.fileName.slice(-3).toLowerCase()
        if (this.fileType !== "gpx" && this.fileType !== "tcx") {
          showWarningDialog(
            "GPS file problem",
            "File type not recognised. Please check you have selected the correct file."
          )
          return
        }
        document.getElementById("rg2-load-gps-file").setAttribute("disabled", "")
        this.xml = new DOMParser().parseFromString(text.target.result, "text/xml")
        this.processGPSFile()
      } catch (err) {
        showWarningDialog(
          "GPS file problem",
          "File is not valid XML. Please check you have selected the correct file. " + err
        )
        return
      }
    }
    // read the selected file
    reader.readAsText(file.target.files[0])
  }

  trackMatchesMapCoordinates() {
    // find bounding box for track
    const minX = Math.min.apply(Math, this.routeData.x)
    const maxX = Math.max.apply(Math, this.routeData.x)
    const minY = Math.min.apply(Math, this.routeData.y)
    const maxY = Math.max.apply(Math, this.routeData.y)
    const mapSize = getMapSize()
    // check we are somewhere on the map
    return maxX > 0 && minX < mapSize.width && minY < mapSize.height && maxY > 0
  }
}
