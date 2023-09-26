import { ctx } from "./canvas"
import { config, getOverprintDetails } from "./config"
import { getCourses } from "./courses"

export class Controls {
  constructor() {
    this.controls = []
    this.displayControls = false
  }

  addControl(code, x, y) {
    let newCode = true
    for (let i = 0; i < this.controls.length; i += 1) {
      if (this.controls[i].code === code) {
        newCode = false
        break
      }
    }
    if (newCode) {
      this.controls.push({ code: code, x: x, y: y })
    }
  }

  deleteAllControls() {
    this.controls.length = 0
  }

  displayAllControls() {
    this.displayControls = true
  }

  drawControls(drawDot) {
    if (this.displayControls) {
      const opt = getOverprintDetails()
      for (let i = 0; i < this.controls.length; i += 1) {
        // Assume things starting with 'F' or 'M' are Finish or Mal
        if (this.controls[i].code.indexOf("F") === 0 || this.controls[i].code.indexOf("M") === 0) {
          this.drawFinish(this.controls[i].x, this.controls[i].y, this.controls[i].code, opt)
        } else {
          // Assume things starting with 'S' are a Start
          if (this.controls[i].code.indexOf("S") === 0) {
            this.drawStart(this.controls[i].x, this.controls[i].y, this.controls[i].code, 1.5 * Math.PI, opt)
          } else {
            // Else it's a normal control
            this.drawSingleControl(this.controls[i].x, this.controls[i].y, this.controls[i].code, Math.PI * 0.25, opt)
            if (drawDot) {
              ctx.fillRect(this.controls[i].x - 1, this.controls[i].y - 1, 3, 3)
            }
          }
        }
      }
    }
  }

  drawFinish(x, y, code, opt) {
    //Draw the white halo around the finish control
    ctx.strokeStyle = "white"
    ctx.lineWidth = opt.overprintWidth + 2
    ctx.beginPath()
    ctx.arc(x, y, opt.finishInnerRadius, 0, 2 * Math.PI, false)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x, y, opt.finishOuterRadius, 0, 2 * Math.PI, false)
    ctx.stroke()
    //Draw the white halo around the finish code
    ctx.beginPath()
    ctx.font = opt.font
    ctx.textAlign = "left"
    ctx.strokeStyle = "white"
    ctx.miterLimit = 2
    ctx.lineJoin = "circle"
    ctx.lineWidth = 1.5
    ctx.strokeText(code, x + opt.controlRadius * 1.5, y + opt.controlRadius)
    ctx.stroke()
    //Draw the purple finish control
    ctx.beginPath()
    ctx.fillStyle = config.PURPLE
    ctx.strokeStyle = config.PURPLE
    ctx.lineWidth = opt.overprintWidth
    ctx.arc(x, y, opt.finishInnerRadius, 0, 2 * Math.PI, false)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x, y, opt.finishOuterRadius, 0, 2 * Math.PI, false)
    ctx.fillText(code, x + opt.controlRadius * 1.5, y + opt.controlRadius)
    ctx.stroke()
  }

  drawSingleControl(x, y, code, angle, opt) {
    //Draw the white halo around the controls
    ctx.beginPath()
    ctx.strokeStyle = "white"
    ctx.lineWidth = opt.overprintWidth + 2
    ctx.arc(x, y, opt.controlRadius, 0, 2 * Math.PI, false)
    ctx.stroke()
    //Draw the white halo around the control code
    ctx.beginPath()
    ctx.textAlign = "center"
    ctx.font = opt.font
    ctx.strokeStyle = "white"
    ctx.miterLimit = 2
    ctx.lineJoin = "circle"
    ctx.lineWidth = 1.5
    ctx.textBaseline = "middle"
    const metrics = ctx.measureText(code)
    // offset to left if left of centre, to right if right of centre
    let xoffset
    if (angle < Math.PI) {
      xoffset = metrics.width / 2
    } else {
      xoffset = (-1 * metrics.width) / 2
    }
    // control radius is also the control code text height
    // offset up if above half way, down if below half way
    let yoffset
    if (angle >= Math.PI / 2 && angle <= Math.PI * 1.5) {
      yoffset = (-1 * opt.controlRadius) / 2
    } else {
      yoffset = opt.controlRadius / 2
    }
    // empirically looks OK with this scale
    const scale = 1.3
    ctx.strokeText(
      code,
      x + opt.controlRadius * scale * Math.sin(angle) + xoffset,
      y + opt.controlRadius * scale * Math.cos(angle) + yoffset
    )
    //Draw the purple control
    ctx.beginPath()
    ctx.font = opt.font
    ctx.fillStyle = config.PURPLE
    ctx.strokeStyle = config.PURPLE
    ctx.lineWidth = opt.overprintWidth
    ctx.arc(x, y, opt.controlRadius, 0, 2 * Math.PI, false)
    ctx.fillText(
      code,
      x + opt.controlRadius * scale * Math.sin(angle) + xoffset,
      y + opt.controlRadius * scale * Math.cos(angle) + yoffset
    )
    ctx.stroke()
  }

  drawStart(startx, starty, code, angle, opt) {
    //Draw the white halo around the start triangle
    let x = []
    let y = []
    const DEGREES_120 = (2 * Math.PI) / 3
    angle = angle + Math.PI / 2
    ctx.lineCap = "round"
    ctx.strokeStyle = "white"
    ctx.lineWidth = opt.overprintWidth + 2
    ctx.beginPath()
    x[0] = startx + opt.startTriangleLength * Math.sin(angle)
    y[0] = starty - opt.startTriangleLength * Math.cos(angle)
    ctx.moveTo(x[0], y[0])
    x[1] = startx + opt.startTriangleLength * Math.sin(angle + DEGREES_120)
    y[1] = starty - opt.startTriangleLength * Math.cos(angle + DEGREES_120)
    ctx.lineTo(x[1], y[1])
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x[1], y[1])
    x[2] = startx + opt.startTriangleLength * Math.sin(angle - DEGREES_120)
    y[2] = starty - opt.startTriangleLength * Math.cos(angle - DEGREES_120)
    ctx.lineTo(x[2], y[2])
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x[2], y[2])
    ctx.lineTo(x[0], y[0])
    ctx.stroke()
    //Draw the white halo around the start code
    ctx.beginPath()
    ctx.font = opt.font
    ctx.textAlign = "left"
    ctx.strokeStyle = "white"
    ctx.miterLimit = 2
    ctx.lineJoin = "circle"
    ctx.lineWidth = 1.5
    ctx.strokeText(code, x[0] + opt.controlRadius * 1.25, y[0] + opt.controlRadius * 1.25)
    ctx.stroke()
    //Draw the purple start control
    ctx.strokeStyle = config.PURPLE
    ctx.lineWidth = opt.overprintWidth
    ctx.font = opt.font
    ctx.fillStyle = config.PURPLE
    ctx.beginPath()
    ctx.moveTo(x[0], y[0])
    ctx.lineTo(x[1], y[1])
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x[1], y[1])
    ctx.lineTo(x[2], y[2])
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x[2], y[2])
    ctx.lineTo(x[0], y[0])
    ctx.fillText(code, x[0] + opt.controlRadius * 1.25, y[0] + opt.controlRadius * 1.25)
    ctx.stroke()
  }

  generateControlList() {
    this.controls.length = 0
    const courses = getCourses()
    for (let i = 0; i < courses.length; i += 1) {
      if (courses[i] !== undefined) {
        const codes = courses[i].codes
        const x = courses[i].x
        const y = courses[i].y
        // for all controls on course
        if (codes !== undefined) {
          for (let j = 0; j < codes.length; j += 1) {
            this.addControl(codes[j], x[j], y[j])
          }
        }
      }
    }
  }

  getControlCount() {
    return this.controls.length
  }

  toggleControlDisplay() {
    this.displayControls = !this.displayControls
  }
}
