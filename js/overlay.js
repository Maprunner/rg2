// handle drawing of scratchpad overlay
(function () {
  function Overlay() {
    this.overlays = [];
    this.drawingOverlay = false;
    this.units = "m";
    this.metresPerPixel = rg2.events.getMetresPerPixel();
    if (this.metresPerPixel === undefined) {
      this.metresPerPixel = 1;
      this.units = "px";
    }
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
      ol.colour = rg2.config.PURPLE;
      ol.x = [];
      ol.y = [];
      ol.length = 0;
      ol.finished = false;
      this.currentOverlay = ol;
    },

    startOverlay: function () {
      $('#rg2-map-canvas').css('cursor', 'crosshair');
      this.initialiseOverlay();
      this.drawingOverlay = true;
      this.overlays.push(this.currentOverlay);
      this.updateDetails();
    },

    endOverlay: function () {
      $('#rg2-map-canvas').css('cursor', 'auto');
      this.currentOverlay.finished = true;
      this.overlays.splice(this.overlays.length - 1, 1, this.currentOverlay);
      this.initialiseOverlay();
      this.drawingOverlay = false;
      this.updateDetails();
    },

    mouseUp: function (x, y, button) {
      if (this.drawingOverlay) {
        // double click so  treat as an end to drawing
        if ((x === this.currentOverlay.x[this.currentOverlay.x.length - 1]) && (y === this.currentOverlay.y[this.currentOverlay.x.length - 1])) {
          this.endOverlay();
        } else {
          this.currentOverlay.x.push(x);
          this.currentOverlay.y.push(y);
          this.currentOverlay.length = this.calculateLength(this.currentOverlay.x, this.currentOverlay.y) * this.metresPerPixel;
          this.overlays.splice(this.overlays.length - 1, 1, this.currentOverlay);
          this.updateDetails();
          rg2.redraw(false);
        }
      }
    },

    dragEnded: function () {

    },

    initialiseUI: function () {
      var self;
      self = this;
      $("#btn-overlay-start").click(function () {
        self.startOverlay();
      });
      $("#btn-overlay-end").click(function () {
        self.endOverlay();
      });
      // open dialog with ctrl-O
      document.addEventListener('keydown', function(evt) { 
        if (evt.code === "KeyO" && evt.ctrlKey) {
          $("#rg2-overlay-dialog").dialog({
              minWidth: 200,
              title: rg2.t("Overlays"),
              dialogClass: "rg2-overlay-dialog",
              close: function () {
              }
          });
          evt.preventDefault();
        }
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
        const ol = this.overlays[i];
        const del = ol.finished ? "Delete": "";
        details = details + "<div>" + ol.id + "</div>"
        details = details + "<div>" + ol.colour + "</div>"
        details = details + "<div>" + parseInt(ol.length, 10) + " " + this.units + "</div>";
        details = details + "<div>" + del + "</div>";
      }
      $("#rg2-overlay-details").empty().append(details);
    },

    drawOverlays: function () {
      var opt;
      if (this.overlays.length > 0) {
        opt = rg2.getOverprintDetails();
        rg2.ctx.lineWidth = opt.overprintWidth;
        rg2.ctx.font = '10pt Arial';
        rg2.ctx.textAlign = "left";
        rg2.ctx.globalAlpha = 0.6;
        for (let j = 0; j < this.overlays.length; j += 1) {
          const ol = this.overlays[j];
          rg2.ctx.strokeStyle = ol.colour;
          rg2.ctx.fillStyle = ol.colour;
          if (ol.x.length === 1) {
            rg2.ctx.arc(ol.x[0], ol.y[0], 20, 0, 2 * Math.PI, false);
            // fill in with transparent colour to highlight control better
            rg2.ctx.fill();
          }
          if (ol.x.length > 1) {
            rg2.ctx.beginPath();
            rg2.ctx.moveTo(ol.x[0], ol.y[0]);
            for (let i = 1; i < ol.x.length; i += 1) {
              rg2.ctx.lineTo(ol.x[i], ol.y[i]);
            }
            rg2.ctx.stroke();
          }
        }
      }
    }
  };
  rg2.Overlay = Overlay;
}());
