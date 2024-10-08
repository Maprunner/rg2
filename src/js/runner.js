import { getDistanceBetweenPoints } from "./utils"
import { config } from "./config"
import { getMetresPerPixel } from "./events"
import { getFullResultforResultID } from "./results"
import { getCourseDetails } from "./courses"

export class Runner {
  constructor(resultid) {
    const res = getFullResultforResultID(resultid)
    this.name = res.name
    this.initials = res.initials
    // careful: we need the index into results, not the resultid from the text file
    this.resultid = resultid
    this.rawid = res.rawid
    this.starttime = res.starttime
    this.splits = res.splits
    this.trackColour = res.trackColour
    this.userColour = res.userColour
    let course
    if (res.isScoreEvent) {
      course = {}
      course.name = res.coursename
      course.x = res.scorex
      course.y = res.scorey
      course.codes = res.scorecodes
    } else {
      course = getCourseDetails(res.courseid)
    }
    this.coursename = course.name
    // used to stop runners when doing replay by control
    this.nextStopTime = config.VERY_HIGH_TIME_IN_SECS
    // map position x,y indexed by running time in seconds
    this.x = []
    this.y = []

    // total distance travelled indexed by running time in seconds
    // in metres if georeferenced, otherwise in pixels
    this.cumulativeDistance = []
    this.cumulativeDistance[0] = 0

    // distance travelled for a leg indexed by control number
    this.legTrackDistance = []
    this.legTrackDistance[0] = 0

    // total distance travelled at end of leg indexed by control number
    this.cumulativeTrackDistance = []
    this.cumulativeTrackDistance[0] = 0

    if (res.hasValidTrack) {
      this.expandTrack(res.trackx, res.tracky, res.xysecs)
    } else {
      // no track so use straight line between controls
      this.expandTrack(course.x, course.y, res.splits)
    }
    this.addTrackDistances(course, res)
  }

  addTrackDistances(course, res) {
    // add track distances for each leg
    const lastPointIndex = this.cumulativeDistance.length - 1
    if (course.codes !== undefined) {
      // if we got no splits then there will just be a finish time
      if (res.splits.length > 1) {
        for (let control = 1; control < course.codes.length; control += 1) {
          // avoid NaN values for GPS tracks that are shorter than the result time
          let ind
          if (res.splits[control] <= lastPointIndex) {
            ind = res.splits[control]
          } else {
            ind = lastPointIndex
          }
          this.cumulativeTrackDistance[control] = this.cumulativeDistance[ind]
          this.legTrackDistance[control] =
            this.cumulativeTrackDistance[control] - this.cumulativeTrackDistance[control - 1]
        }
      } else {
        // allows for tracks at events with no results so no splits: just use start and finish
        this.legTrackDistance[1] = this.cumulativeDistance[lastPointIndex]
        this.cumulativeTrackDistance[1] = this.cumulativeDistance[lastPointIndex]
      }
    }
  }

  expandTrack(itemsx, itemsy, itemstime) {
    // gets passed arrays of x, y and time
    // iterate over item which will be xy or controls
    let timeatprevitem = 0
    let timeatitem = 0
    let fromx = itemsx[0]
    let fromy = itemsy[0]
    let fromdist = 0
    let dist = 0
    this.x[0] = itemsx[0]
    this.y[0] = itemsy[0]
    let metresPerPixel = getMetresPerPixel()
    if (metresPerPixel === undefined) {
      metresPerPixel = 1
    }
    for (let item = 1; item < itemstime.length; item += 1) {
      let tox = itemsx[item]
      let toy = itemsy[item]
      let diffx = tox - fromx
      let diffy = toy - fromy
      dist = dist + getDistanceBetweenPoints(tox, toy, fromx, fromy) * metresPerPixel
      let diffdist = dist - fromdist
      timeatitem = itemstime[item]
      // allow for 0 splits indicating a missed control
      // just assume a 1 second split for now: probably harmless
      if (timeatitem === 0) {
        timeatitem = timeatprevitem + 1
      }
      let difft = timeatitem - timeatprevitem
      for (let t = timeatprevitem + 1; t < timeatitem; t += 1) {
        this.x[t] = Math.round(fromx + ((t - timeatprevitem) * diffx) / difft)
        this.y[t] = Math.round(fromy + ((t - timeatprevitem) * diffy) / difft)
        this.cumulativeDistance[t] = Math.round(fromdist + ((t - timeatprevitem) * diffdist) / difft)
      }
      this.x[timeatitem] = tox
      this.y[timeatitem] = toy
      this.cumulativeDistance[timeatitem] = Math.round(dist)
      fromx = tox
      fromy = toy
      fromdist = dist
      timeatprevitem = timeatitem
    }
  }
}
