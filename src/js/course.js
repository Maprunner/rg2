import { getAngle, getDistanceBetweenPoints } from "./utils"
import { getMetresPerPixel } from "./events"
import { getOverprintDetails } from "./config"
import { ctx } from "./canvas"
import { controls } from "./courses"

export class Course {
  constructor(data, isScoreCourse) {
    this.name = data.name
    this.trackcount = 0
    this.display = false
    this.courseid = data.courseid
    this.codes = data.codes
    this.setExcluded(data)
    this.filterTo = this.codes.length
    this.filterFrom = 0
    this.x = data.xpos
    this.y = data.ypos
    this.isScoreCourse = isScoreCourse
    this.resultcount = 0
    // save angle to next control to simplify later calculations
    this.angle = []
    // save angle to show control code text
    this.textAngle = []
    this.setAngles()
    this.setLengths()
  }

  drawCourse(intensity) {
    if (this.display) {
      const opt = getOverprintDetails()
      ctx.globalAlpha = intensity
      controls.drawStart(this.x[0], this.y[0], "", this.angle[0], opt)
      // don't join up controls for score events
      if (!this.isScoreCourse) {
        const filter = { from: this.filterFrom, to: this.filterTo }
        this.drawLinesBetweenControls({ x: this.x, y: this.y }, this.angle, opt, filter)
      }
      if (this.isScoreCourse) {
        for (let i = 1; i < this.x.length; i += 1) {
          if (this.codes[i].indexOf("F") === 0 || this.codes[i].indexOf("M") === 0) {
            controls.drawFinish(this.x[i], this.y[i], "", opt)
          } else {
            controls.drawSingleControl(this.x[i], this.y[i], this.codes[i], this.textAngle[i], opt)
          }
        }
      } else {
        // don't want to draw an extra circle round the start or finish
        const from = Math.max(this.filterFrom, 1)
        const to = Math.min(this.filterTo + 1, this.x.length - 1)
        for (let i = from; i < to; i += 1) {
          controls.drawSingleControl(this.x[i], this.y[i], i, this.textAngle[i], opt)
        }
        controls.drawFinish(this.x[this.x.length - 1], this.y[this.y.length - 1], "", opt)
      }
    }
  }

  drawLinesBetweenControls(pt, angle, opt, filter) {
    let radius1
    for (let i = filter.from; i < filter.to; i += 1) {
      if (i === 0) {
        radius1 = opt.startTriangleLength
      } else {
        radius1 = opt.controlRadius
      }
      const c1x = pt.x[i] + radius1 * Math.cos(angle[i])
      const c1y = pt.y[i] + radius1 * Math.sin(angle[i])

      let radius2
      // assume the last control in the array is a finish
      if (i === this.x.length - 2) {
        radius2 = opt.finishOuterRadius
      } else {
        radius2 = opt.controlRadius
      }

      // if the start point of the line is closer to the centre of the second control than its radius then
      // the circles are overlapping so we don't need to draw a line
      if (getDistanceBetweenPoints(c1x, c1y, pt.x[i + 1], pt.y[i + 1]) > radius2) {
        const c2x = pt.x[i + 1] - radius2 * Math.cos(angle[i])
        const c2y = pt.y[i + 1] - radius2 * Math.sin(angle[i])
        ctx.beginPath()
        ctx.moveTo(c1x, c1y)
        ctx.lineTo(c2x, c2y)
        ctx.stroke()
      }
    }
  }

  incrementTracksCount() {
    this.trackcount += 1
  }

  setAngles() {
    for (let i = 0; i < this.x.length - 1; i += 1) {
      if (this.isScoreCourse) {
        // align score event start triangle and controls upwards
        this.angle[i] = Math.PI * 1.5
        this.textAngle[i] = Math.PI * 0.25
      } else {
        // angle of line to next control
        this.angle[i] = getAngle(this.x[i], this.y[i], this.x[i + 1], this.y[i + 1])
        if (i > 0) {
          // create bisector of angle to position number
          const c1x = Math.sin(this.angle[i - 1])
          const c1y = Math.cos(this.angle[i - 1])
          const c2x = Math.sin(this.angle[i]) + c1x
          const c2y = Math.cos(this.angle[i]) + c1y
          const c3x = c2x / 2
          const c3y = c2y / 2
          this.textAngle[i] = getAngle(c3x, c3y, c1x, c1y)
        } else {
          this.textAngle[0] = 0
        }
      }
    }
    // angle for finish aligns to north
    this.angle[this.x.length - 1] = Math.PI * 1.5
    this.textAngle[this.x.length - 1] = Math.PI * 1.5
  }

  setDisplay(display) {
    this.display = display
  }

  setExcluded(data) {
    this.excludeType = data.excludeType
    this.exclude = data.codes.map((control, i) => {
      if (data.exclude.findIndex((ex) => ex === i) > -1) {
        return true
      } else {
        return false
      }
    })
    // need to know which is first excluded control for later drawing purposes
    const firstExcluded = this.exclude.findIndex((ex) => ex === true)
    // setting it to 0 is OK since start cannot be excluded (?!)
    this.firstExcluded = firstExcluded === -1 ? 0 : firstExcluded
    this.allowed = data.codes.map((control, i) => {
      if (data.exclude.findIndex((ex) => ex === i) > -1) {
        return data.allowed[data.exclude.findIndex((ex) => ex === i)]
      } else {
        return 0
      }
    })
  }

  setLengths() {
    let length = 0
    this.lengthValid = true
    this.legLengths = []
    this.cumulativeLegLengths = []
    this.legLengths[0] = 0
    this.cumulativeLegLengths[0] = 0
    let metresPerPixel = getMetresPerPixel()
    if (metresPerPixel === undefined) {
      this.lengthValid = false
      metresPerPixel = 1
    }
    for (let i = 1; i < this.x.length; i += 1) {
      const legLength = parseInt(
        (getDistanceBetweenPoints(this.x[i], this.y[i], this.x[i - 1], this.y[i - 1]) * metresPerPixel).toFixed(0)
      )
      this.legLengths[i] = legLength
      this.cumulativeLegLengths[i] = this.cumulativeLegLengths[i - 1] + legLength
      length += legLength
    }

    this.length = (length / 1000).toFixed(1)
  }
}
