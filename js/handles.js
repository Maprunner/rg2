/*global rg2:false */
(function () {
  function Handle(x, y, time, index) {
    this.x = x;
    this.y = y;
    this.basex = x;
    this.basey = y;
    this.locked = false;
    this.time = time;
    this.index = index;
  }

  function Handles() {
    // array of handles used to adjust GPS tracks
    // maintained in time order which means they are also in order along the GPS track
    this.handles = [];
  }

  Handles.prototype = {
    Constructor : Handles,

    addHandle : function (x, y, time) {
      this.handles.push(new Handle(x, y, time, this.handles.length));
      this.handles.sort(function (a, b) {
        return a.time - b.time;
      });
      this.renumberHandles();
    },

    deleteHandle : function (index) {
      if ((index === 0) || (index === this.handles.length - 1)) {
        // can't delete start or finish
        return;
      }
      this.handles.splice(index, 1);
      this.renumberHandles();
    },

    renumberHandles : function () {
      var i;
      for (i = 0; i < this.handles.length; i += 1) {
        this.handles[i].index = i;
      }
    },

    lockHandle : function (index) {
      this.handles[index].locked = true;
    },

    unlockHandle : function (index) {
      this.handles[index].locked = false;
    },

    handlesLocked : function () {
      var i, count;
      count = 0;
      for (i = 0; i < this.handles.length; i += 1) {
        if (this.handles[i].locked) {
          count += 1;
        }
      }
      return count;
    },

    deleteAllHandles : function () {
      this.handles.length = 0;
    },

    rebaselineXY : function () {
      // save new locations for future undo
      var i;
      for (i = 0; i < this.handles.length; i += 1) {
        this.handles[i].basex = this.handles[i].x;
        this.handles[i].basey = this.handles[i].y;
      }
    },

    revertXY : function () {
      // undo requested so restore previous locations
      var i;
      for (i = 0; i < this.handles.length; i += 1) {
        this.handles[i].x = this.handles[i].basex;
        this.handles[i].y = this.handles[i].basey;
      }
    },

    getStartHandle : function () {
      // always the first entry
      return this.handles[0];
    },

    getFinishHandle : function () {
      // always the last entry
      return this.handles[this.handles.length - 1];
    },

    getHandleClicked : function (x, y) {
      // find if the click was on an existing handle: return handle object or undefined
      // basex and basey are handle locations at the start of the drag which is what we are interested in
      var i, distance;
      for (i = 0; i < this.handles.length; i += 1) {
        distance = rg2.utils.getDistanceBetweenPoints(x, y, this.handles[i].basex, this.handles[i].basey);
        if (distance <= rg2.config.HANDLE_DOT_RADIUS) {
          return this.handles[i];
        }
      }
      return undefined;
    },

    getEarliestLockedHandle : function () {
      // called to find earliest locked handle: we already know at least one is locked
      var i;
      for (i = 0; i < this.handles.length; i += 1) {
        if (this.handles[i].locked) {
          return this.handles[i];
        }
      }
    },

    getLatestLockedHandle : function () {
      // called to find latest locked handle: we already know at least one is locked
      var i;
      for (i = this.handles.length - 1; i > 0; i -= 1) {
        if (this.handles[i].locked) {
          return this.handles[i];
        }
      }
    },

    getPreviousLockedHandle : function (handle) {
      // called to find previous locked handle: we already know we are between locked handles
      var i;
      for (i = handle.index - 1; i >= 0; i -= 1) {
        if (this.handles[i].locked) {
          return this.handles[i];
        }
      }
    },

    getNextLockedHandle : function (handle) {
      // called to find next locked handle: we already know we are between locked handles
      var i;
      for (i = handle.index + 1; i < this.handles.length; i += 1) {
        if (this.handles[i].locked) {
          return this.handles[i];
        }
      }
    },

    getSingleLockedHandle : function () {
    // called when we know there is only one locked handle, so we can reuse another function
      return this.getEarliestLockedHandle();
    },

    dragHandles : function (dx, dy) {
      var i;
      for (i = 0; i < this.handles.length; i += 1) {
        this.handles[i].x = this.handles[i].basex + dx;
        this.handles[i].y = this.handles[i].basey + dy;
      }
    },

    drawHandles : function () {
      var i;
      for (i = 0; i < this.handles.length; i += 1) {
        if (this.handles[i].locked === true) {
          rg2.ctx.fillStyle = rg2.config.RED;
        } else {
          rg2.ctx.fillStyle = rg2.config.GREEN;
        }
        rg2.ctx.strokestyle = rg2.config.PURPLE;
        rg2.ctx.beginPath();
        rg2.ctx.arc(this.handles[i].x, this.handles[i].y, rg2.config.HANDLE_DOT_RADIUS, 0, 2 * Math.PI, false);
        rg2.ctx.fill();
        rg2.ctx.stroke();
      }
    },

    scaleAndRotate : function (lockedHandle, scale, angle, fromTime, toTime) {
      // scale and rotate handles around a single fixed point
      // times determine which side of locked point (or both) this applies to
      var i, pt;
      for (i = 0; i < this.handles.length; i += 1) {
        if (!this.handles[i].locked && (this.handles[i].time >= fromTime) && (this.handles[i].time <= toTime)) {
          pt = rg2.utils.rotatePoint(this.handles[i].basex - lockedHandle.basex, this.handles[i].basey - lockedHandle.basey, angle);
          this.handles[i].x = (pt.x * scale) + lockedHandle.basex;
          this.handles[i].y = (pt.y * scale) + lockedHandle.basey;
        }
      }
    },

    scaleAndRotateBetweenLockedPoints : function (lockedHandle, a, scale, angle, reverseAngle, fromTime, toTime) {
      var i, x, y, pt;
      // scale/rotate/shear around two locked points
      for (i = 0; i < this.handles.length; i += 1) {
        if ((!this.handles[i].locked) && (this.handles[i].time >= fromTime) && (this.handles[i].time <= toTime)) {
          // rotate to give locked points as x-axis
          pt = rg2.utils.rotatePoint(this.handles[i].basex - lockedHandle.basex, this.handles[i].basey - lockedHandle.basey, angle);
          x = pt.x;
          y = pt.y;

          // shear/stretch
          pt = rg2.utils.rotatePoint(x + (y * a), y * scale, reverseAngle);
          this.handles[i].x = pt.x + lockedHandle.basex;
          this.handles[i].y = pt.y + lockedHandle.basey;
        }
      }
    }
  };
  rg2.Handles = Handles;
}());
