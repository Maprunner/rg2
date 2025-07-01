import { getDistanceBetweenPoints } from "./utils"
import { config } from "./config"
import { ctx } from "./canvas"
class Handle {
  constructor(x, y, time, index) {
    // current position of handles
    this.x = x
    this.y = y
    // positions before start of adjustment
    this.basex = x
    this.basey = y
    // saved positions to allow undo
    this.undox = x
    this.undoy = y
    this.locked = false
    // not really a time: instead an index into the GPX data
    // this is "time" for 1s intervals, but not if in a different recording mode
    this.time = time
    this.index = index
  }
}
export class Handles {
  constructor() {
    // array of handles used to adjust GPS tracks
    // maintained in time order which means they are also in order along the GPS track
    this.handles = []
  }

  addHandle(x, y, time) {
    this.handles.push(new Handle(x, y, time, this.handles.length))
    this.handles.sort(function (a, b) {
      return a.time - b.time
    })
    this.renumberHandles()
  }

  deleteHandle(index) {
    if (index === 0 || index === this.handles.length - 1) {
      // can't delete start or finish so toggle instead
      this.toggleLock(index)
    } else {
      this.handles.splice(index, 1)
    }
    this.renumberHandles()
  }

  renumberHandles() {
    for (let i = 0; i < this.handles.length; i += 1) {
      this.handles[i].index = i
    }
  }

  lockHandleByTime(time) {
    for (let i = 0; i < this.handles.length; i += 1) {
      if (this.handles[i].time === time) {
        this.handles[i].locked = true
      }
    }
  }

  handlesLocked() {
    let count = 0
    for (let i = 0; i < this.handles.length; i += 1) {
      if (this.handles[i].locked) {
        count += 1
      }
    }
    return count
  }

  deleteAllHandles() {
    this.handles.length = 0
  }

  rebaselineXY() {
    // save new locations at end of drag
    this.copyHandleFields("", "base")
  }

  saveForUndo() {
    this.copyHandleFields("base", "undo")
  }

  toggleLock(index) {
    this.handles[index].locked = !this.handles[index].locked
  }

  undo() {
    // undo last move: reset to saved values
    this.copyHandleFields("undo", "base")
    this.copyHandleFields("undo", "")
  }

  copyHandleFields(from, to) {
    for (let i = 0; i < this.handles.length; i += 1) {
      this.handles[i][to + "x"] = this.handles[i][from + "x"]
      this.handles[i][to + "y"] = this.handles[i][from + "y"]
    }
  }

  getStartHandle() {
    // always the first entry
    return this.handles[0]
  }

  getFinishHandle() {
    // always the last entry
    return this.handles[this.handles.length - 1]
  }

  getHandleClicked(pt) {
    // find if the click was on an existing handle: return handle object or undefined
    // basex and basey are handle locations at the start of the drag which is what we are interested in
    for (let i = 0; i < this.handles.length; i += 1) {
      const distance = getDistanceBetweenPoints(pt.x, pt.y, this.handles[i].basex, this.handles[i].basey)
      if (distance <= config.HANDLE_DOT_RADIUS) {
        return this.handles[i]
      }
    }
    return undefined
  }

  getEarliestLockedHandle() {
    // called to find earliest locked handle: we already know at least one is locked
    for (let i = 0; i < this.handles.length; i += 1) {
      if (this.handles[i].locked) {
        return this.handles[i]
      }
    }
  }

  getLatestLockedHandle() {
    // called to find latest locked handle: we already know at least one is locked
    for (let i = this.handles.length - 1; i > 0; i -= 1) {
      if (this.handles[i].locked) {
        return this.handles[i]
      }
    }
  }

  getPreviousLockedHandle(handle) {
    // called to find previous locked handle: we already know we are between locked handles
    for (let i = handle.index - 1; i >= 0; i -= 1) {
      if (this.handles[i].locked) {
        return this.handles[i]
      }
    }
  }

  getNextLockedHandle(handle) {
    // called to find next locked handle: we already know we are between locked handles
    for (let i = handle.index + 1; i < this.handles.length; i += 1) {
      if (this.handles[i].locked) {
        return this.handles[i]
      }
    }
  }

  getSingleLockedHandle() {
    // called when we know there is only one locked handle, so we can reuse another function
    return this.getEarliestLockedHandle()
  }

  dragHandles(dx, dy) {
    for (let i = 0; i < this.handles.length; i += 1) {
      this.handles[i].x = this.handles[i].basex + dx
      this.handles[i].y = this.handles[i].basey + dy
    }
  }

  drawHandles() {
    for (let i = 0; i < this.handles.length; i += 1) {
      ctx.lineWidth = 1
      if (this.handles[i].locked === true) {
        ctx.fillStyle = config.RED_30
        ctx.strokeStyle = config.RED
      } else {
        ctx.fillStyle = config.GREEN_30
        ctx.strokeStyle = config.GREEN
      }
      ctx.beginPath()
      ctx.arc(this.handles[i].x, this.handles[i].y, config.HANDLE_DOT_RADIUS, 0, 2 * Math.PI, false)
      ctx.fill()
      ctx.stroke()
    }
  }

  alignHandles(points) {
    // move handles back to be on adjusted track
    for (let i = 0; i < this.handles.length; i += 1) {
      this.handles[i].x = points.x[this.handles[i].time]
      this.handles[i].y = points.y[this.handles[i].time]
    }
  }
}
