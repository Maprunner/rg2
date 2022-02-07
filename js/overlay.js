// handle drawing of scratchpad overlay
(function () {
  function Overlay() {
    this.measuring = false;
    this.colours = ["#ff00ff", "#0000ff", "#00ff00", "#ff0000", "#00ffff" ];
    this.colourIndex = 0;
    // array of completed overlays
    this.overlays = [];
    // overlay being drawn or not yet started
    this.currentOverlay = this.initialiseOverlay();
    // has drawing started fro current overlay?
    this.units = "px";
    this.metresPerPixel = 1;
    this.initialiseUI();
    this.updateDetails();
    rg2.redraw(false);
  }

  Overlay.prototype = {
    Constructor: Overlay,

    initialiseOverlay: function () {
      const ol = {}
      // ids start at A
      ol.id = String.fromCharCode(this.overlays.length + 65)
      ol.colour = this.getNextColour();
      ol.x = [];
      ol.y = [];
      ol.length = 0;
      ol.started = false;
      ol.idx = undefined;
      return ol;
    },

    mapLoaded: function () {
      this.metresPerPixel = rg2.events.getMetresPerPixel();
      if (this.metresPerPixel === undefined) {
        this.metresPerPixel = 1;
        this.units = "px";
      } else {
        this.units = "m";
      }
    },

    getNextColour : function () {
      this.colourIndex = (this.colourIndex + 1) % this.colours.length;
      return this.colours[this.colourIndex];
    },

    startOverlay: function () {
      this.currentOverlay.started = true;
      this.updateDetails();
    },

    endOverlay: function () {
      this.currentOverlay.idx = this.overlays.length;
      this.overlays.push(this.currentOverlay);
      this.currentOverlay = this.initialiseOverlay();
      this.updateDetails();
    },

    deleteOverlay: function (idx) {
      this.overlays.splice(idx, 1);
      this.updateOverlays();
      this.updateDetails();
      rg2.redraw(false);
    },

    updateOverlays: function () {
      this.colourIndex = 0;
      // recolour and reallocate labels starting from A after deletion
      for (let i = 0; i < this.overlays.length; i += 1) {
        this.overlays[i].id = String.fromCharCode(i + 65)
        this.overlays[i].idx = i;
        this.overlays[i].colour = this.getNextColour();
      }
      this.currentOverlay.id = String.fromCharCode(this.overlays.length + 65);
      this.currentOverlay.idx = this.overlays.length;
      this.currentOverlay.colour = this.getNextColour();
    },

    mouseUp: function (x, y, button) {
      if (!this.measuring) {
        return;
      }

      if (!this.currentOverlay.started) {
        this.startOverlay();
      }
      // double click so  treat as an end to drawing
      if ((x === this.currentOverlay.x[this.currentOverlay.x.length - 1]) && (y === this.currentOverlay.y[this.currentOverlay.x.length - 1])) {
        this.endOverlay();
      } else {
        this.currentOverlay.x.push(x);
        this.currentOverlay.y.push(y);
        this.currentOverlay.length = this.calculateLength(this.currentOverlay.x, this.currentOverlay.y) * this.metresPerPixel;
        this.updateDetails();
        rg2.redraw(false);
      }
    },

    dragEnded: function () {

    },

    initialiseUI: function () {
      var self = this;
      $("#btn-measure").click(function() { 
        $('#rg2-map-canvas').css('cursor', 'crosshair');
        self.measuring = true;
        $("#rg2-overlay-dialog").dialog({
            position: { my: "right-10 top+10", at: "right top", of: "#rg2-map-canvas" },
            width: 200,
            minWidth: 150,
            title: rg2.t("Measure"),
            dialogClass: "rg2-overlay-dialog",
          close: function () {
            self.measuring = false;
            $('#rg2-map-canvas').css('cursor', 'auto');
            }
        });
      })
    },

    calculateLength: function (x, y) {
      if (x.length < 2) {
        return 0;
      }
      let length = 0;
      for (let i = 1; i < x.length; i += 1) {
        length = length + rg2.utils.getDistanceBetweenPoints(x[i - 1], y[i - 1], x[i], y[i]);
      }
      return length;
    },

    updateDetails: function () {
      let details = "";
      for (let i = 0; i < this.overlays.length; i += 1) {
        details = details + this.formatOverlay(this.overlays[i], true);
      }
      details = details + this.formatOverlay(this.currentOverlay, false);
      $("#rg2-overlay-details").empty().append(details);
      // reset click handlers for deletion
      var self = this;
      $(".delete-overlay").off().click(function (event) {
        self.deleteOverlay(parseInt(event.target.id, 10));
      });
    },

    formatOverlay: function (ol, completed) {
      let formatted = ""
      if (ol.started) {
        formatted = formatted + "<div>" + ol.id + "</div>";
        formatted = formatted + "<div class='overlay-bar' style='--overlay-colour:" + ol.colour + ";'></div>";
        formatted = formatted + "<div>" + parseInt(ol.length, 10) + this.units + "</div>";
        if (completed) {
          formatted = formatted + "<div><i class='delete-overlay fa fa-trash' id=" + ol.idx + "></i></div>";
        } else {
          formatted = formatted + "<div></div>";
        }
      }
      return formatted;
    },

    drawSingleOverlay: function (ol) {
      rg2.ctx.strokeStyle = ol.colour;
      rg2.ctx.fillStyle = ol.colour;
      rg2.ctx.beginPath();
      rg2.ctx.moveTo(ol.x[0], ol.y[0]);
      for (let i = 1; i < ol.x.length; i += 1) {
        rg2.ctx.lineTo(ol.x[i], ol.y[i]);
      }
      rg2.ctx.stroke();
    },

    drawOverlays: function () {
      rg2.ctx.lineWidth = 5;
      rg2.ctx.globalAlpha = 0.6;
      // draw completed overlays
      if (this.overlays.length > 0) {
        for (let j = 0; j < this.overlays.length; j += 1) {
          this.drawSingleOverlay( this.overlays[j]);
        }
      }
      // draw overlay in progress
      if (this.currentOverlay.started) {
        if (this.currentOverlay.x.length === 1) {
          // only one point so draw dot to mark start
          rg2.ctx.strokeStyle = this.currentOverlay.colour;
          rg2.ctx.fillStyle = this.currentOverlay.colour;
          rg2.ctx.beginPath();
          rg2.ctx.arc(this.currentOverlay.x[0], this.currentOverlay.y[0], 10, 0, 2 * Math.PI, false);
          rg2.ctx.stroke();
        } else {
          this.drawSingleOverlay(this.currentOverlay);
        }
      }
    }
  };
  rg2.Overlay = Overlay;
}());
