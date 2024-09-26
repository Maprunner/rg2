import { getDistanceBetweenPoints } from "./utils"
import { redraw } from "./canvas"
import interact from "interactjs"
import { t } from "./translate"
import { getActiveEventID, getMetresPerPixel } from "./events"

export class Overlay {
  constructor(ctx) {
    this.ctx = ctx
    this.measuring = false
    this.dragging = false
    this.colours = ["#ff00ff", "#0000ff", "#00ff00", "#ff0000", "#00ffff"]
    this.colourIndex = 0
    // array of completed overlays
    this.overlays = []
    // overlay being drawn or not yet started
    this.currentOverlay = this.initialiseOverlay()
    this.units = "px"
    this.metresPerPixel = 1
    // empirical settings
    this.dotSize = 5
    this.lineWidth = 3
    this.measureDialog = document.getElementById("rg2-measure-dialog")
    document.getElementById("btn-measure").addEventListener("click", () => {
      if (getActiveEventID() === null) {
        return
      }
      document.getElementById("rg2-map-canvas").style.cursor = "crosshair"
      this.measureDialog.classList.remove("d-none")
      this.measuring = true
      this.createMeasureDialog()
      redraw()
    })

    document.getElementById("btn-close-measure-dialog").addEventListener("click", () => {
      this.measuring = false
      this.measureDialog.classList.add("d-none")
      document.getElementById("rg2-map-canvas").style.cursor = "auto"
      redraw()
    })

    document.getElementById("btn-measure").addEventListener("click", () => {
      document.getElementById("rg2-map-canvas").style.cursor = "crosshair"
      this.measureDialog.classList.remove("d-none")
      this.measuring = true
      this.createMeasureDialog()
      redraw()
    })

    //  allow dialog to be moved
    let position = { x: 0, y: 0 }
    interact(this.measureDialog).draggable({
      inertia: true,
      listeners: {
        move(e) {
          position.x += e.dx
          position.y += e.dy
          e.target.style.transform = `translate(${position.x}px, ${position.y}px)`
        }
      },
      modifiers: [
        interact.modifiers.restrictRect({
          restriction: "#rg2-container"
        })
      ]
    })
    this.createMeasureDialog()
  }

  calculateLength(x, y) {
    if (x.length < 2) {
      return 0
    }
    let length = 0
    for (let i = 1; i < x.length; i += 1) {
      length = length + getDistanceBetweenPoints(x[i - 1], y[i - 1], x[i], y[i])
    }
    return length
  }

  closeEnough(x1, y1, x2, y2) {
    const range = 10
    if (Math.abs(x1 - x2) < range) {
      if (Math.abs(y1 - y2) < range) {
        return true
      }
    }
    return false
  }

  createMeasureDialog() {
    this.metresPerPixel = getMetresPerPixel()
    if (this.metresPerPixel === undefined) {
      this.metresPerPixel = 1
      this.units = "px"
    } else {
      this.units = "m"
    }
    let details = ""
    for (let i = 0; i < this.overlays.length; i += 1) {
      details = details + this.formatOverlay(this.overlays[i], true)
    }
    details = details + this.formatOverlay(this.currentOverlay, false)
    // show "delete all" if at least two exist
    if (this.overlays.length > 1) {
      details += `<div>${t("All")}</div><div></div><div></div>`
      details += `<div><i class='delete-all-overlays bi-trash'></i></div>`
    }
    document.querySelector(".rg2-overlay-table").innerHTML = details
    let deleteOverlay = document.getElementsByClassName("delete-overlay")
    for (let ol of deleteOverlay) {
      ol.addEventListener("click", (e) => {
        this.deleteOverlay(parseInt(e.target.id, 10))
      })
    }
    let deleteAllOverlays = document.getElementsByClassName("delete-all-overlays")
    for (let ol of deleteAllOverlays) {
      ol.addEventListener("click", (e) => {
        this.deleteAllOverlays(parseInt(e.target.id, 10))
      })
    }
    let endOverlay = document.getElementsByClassName("end-overlay")
    for (let ol of endOverlay) {
      ol.addEventListener("click", (e) => {
        this.endOverlay(parseInt(e.target.id, 10))
      })
    }
  }

  deleteAllOverlays() {
    this.overlays.length = 0
    this.currentOverlay = this.initialiseOverlay()
    this.updateOverlays()
    this.createMeasureDialog()
    redraw()
  }

  deleteOverlay(idx) {
    this.overlays.splice(idx, 1)
    this.updateOverlays()
    this.createMeasureDialog()
    redraw()
  }

  dragEnded() {
    //console.log("Drag ended")
    this.dragging = false
  }

  drawSingleOverlay(ol, finished) {
    this.ctx.strokeStyle = ol.colour
    this.ctx.fillStyle = ol.colour
    // draw lines
    this.ctx.beginPath()
    this.ctx.moveTo(ol.x[0], ol.y[0])
    for (let i = 1; i < ol.x.length; i += 1) {
      this.ctx.lineTo(ol.x[i], ol.y[i])
    }
    this.ctx.stroke()
    // draw dots
    for (let i = 0; i < ol.x.length; i += 1) {
      this.ctx.beginPath()
      this.ctx.arc(ol.x[i], ol.y[i], this.dotSize, 0, 2 * Math.PI, false)
      if (finished) {
        this.ctx.fill()
      } else {
        this.ctx.stroke()
      }
    }
  }

  drawOverlays() {
    // only draw if measuring dialog is open
    if (!this.measuring) {
      return
    }
    this.ctx.lineWidth = this.lineWidth
    this.ctx.globalAlpha = 0.6
    // draw completed overlays
    if (this.overlays.length > 0) {
      for (let j = 0; j < this.overlays.length; j += 1) {
        this.drawSingleOverlay(this.overlays[j], true)
      }
    }
    // draw overlay in progress
    if (this.currentOverlay.started) {
      if (this.currentOverlay.x.length === 1) {
        // only one point so draw ring to mark start
        this.ctx.strokeStyle = this.currentOverlay.colour
        this.ctx.fillStyle = this.currentOverlay.colour
        this.ctx.beginPath()
        this.ctx.arc(this.currentOverlay.x[0], this.currentOverlay.y[0], this.dotSize, 0, 2 * Math.PI, false)
        this.ctx.stroke()
      } else {
        this.drawSingleOverlay(this.currentOverlay, false)
      }
    }
  }

  endOverlay() {
    this.currentOverlay.idx = this.overlays.length
    this.overlays.push(this.currentOverlay)
    this.currentOverlay = this.initialiseOverlay()
    this.createMeasureDialog()
  }

  formatOverlay(ol, completed) {
    let html = ""
    let completedDiv = ""
    let startedDiv = ""
    if (ol.started) {
      startedDiv = `<div>${parseInt(ol.length, 10)}${this.units}</div>`
    } else {
      startedDiv = `<div></div>`
    }

    if (completed) {
      completedDiv = `<div><i class='delete-overlay bi-trash' id="${ol.idx}"></i></div>`
    } else {
      if (ol.started) {
        completedDiv = `<div><i class='end-overlay bi-save' id="${ol.idx}"></i></div>`
      } else {
        completedDiv = `<div></div>`
      }
    }
    html += `<div>${ol.id}</div><div class='overlay-bar' style='--overlay-colour:${ol.colour};'></div>`
    html += `${startedDiv}${completedDiv}`
    return html
  }

  getNextColour() {
    this.colourIndex = (this.colourIndex + 1) % this.colours.length
    return this.colours[this.colourIndex]
  }

  initialiseOverlay() {
    const ol = {}
    // ids start at A
    ol.id = String.fromCharCode(this.overlays.length + 65)
    ol.colour = this.getNextColour()
    ol.x = []
    ol.y = []
    ol.length = 0
    ol.started = false
    ol.idx = undefined
    return ol
  }

  mouseDrag(from, to) {
    // return value indicates if we handled the move or not
    if (!this.measuring) {
      return false
    }
    if (!this.dragging) {
      for (let i = 0; i < this.overlays.length; i += 1) {
        for (let j = 0; j < this.overlays[i].x.length; j += 1) {
          if (this.closeEnough(from.x, from.y, this.overlays[i].x[j], this.overlays[i].y[j])) {
            this.dragging = true
            this.dragOverlay = i
            this.dragPoint = j
          }
        }
      }
    }
    if (this.dragging) {
      this.overlays[this.dragOverlay].x[this.dragPoint] = parseInt(to.x, 10)
      this.overlays[this.dragOverlay].y[this.dragPoint] = parseInt(to.y, 10)
      this.overlays[this.dragOverlay].length =
        this.calculateLength(this.overlays[this.dragOverlay].x, this.overlays[this.dragOverlay].y) * this.metresPerPixel
      this.createMeasureDialog()
      //redraw()
      return true
    }
    return false
  }

  mouseUp(x, y) {
    if (!this.measuring) {
      return
    }
    this.dragging = false
    if (!this.currentOverlay.started) {
      this.startOverlay()
    }
    // double click so  treat as an end to drawing
    if (
      x === this.currentOverlay.x[this.currentOverlay.x.length - 1] &&
      y === this.currentOverlay.y[this.currentOverlay.x.length - 1]
    ) {
      this.endOverlay()
    } else {
      this.currentOverlay.x.push(x)
      this.currentOverlay.y.push(y)
      this.currentOverlay.length =
        this.calculateLength(this.currentOverlay.x, this.currentOverlay.y) * this.metresPerPixel
      this.createMeasureDialog()
      redraw()
    }
  }

  startOverlay() {
    this.currentOverlay.started = true
    this.createMeasureDialog()
  }

  updateOverlays() {
    this.colourIndex = 0
    // recolour and reallocate labels starting from A after deletion
    for (let i = 0; i < this.overlays.length; i += 1) {
      this.overlays[i].id = String.fromCharCode(i + 65)
      this.overlays[i].idx = i
      this.overlays[i].colour = this.getNextColour()
    }
    this.currentOverlay.id = String.fromCharCode(this.overlays.length + 65)
    this.currentOverlay.idx = this.overlays.length
    this.currentOverlay.colour = this.getNextColour()
  }
}
