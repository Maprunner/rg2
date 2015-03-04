/*global rg2:false */
(function () {
  function handleInputDown(evt) {
    rg2.input.dragStart = rg2.ctx.transformedPoint(rg2.input.lastX, rg2.input.lastY);
    rg2.input.dragged = false;
    // need to cache this here since IE and FF don't set it for mousemove events
    rg2.input.whichButton = evt.which;
    //console.log ("InputDown " + rg2.input.lastX + " " + rg2.input.lastY + " " + rg2.input.dragStart.x + " " + rg2.input.dragStart.y);
  }

  function handleInputMove() {
    var pt;
    if (rg2.input.dragStart) {
      pt = rg2.ctx.transformedPoint(rg2.input.lastX, rg2.input.lastY);
      Math.round(pt.x);
      Math.round(pt.y);
      // console.log ("Mousemove after " + pt.x + ": " + pt.y);
      // simple debounce so that very small drags are treated as clicks instead
      if ((Math.abs(pt.x - rg2.input.dragStart.x) + Math.abs(pt.y - rg2.input.dragStart.y)) > 5) {
        if (rg2.drawing.gpsFileLoaded()) {
          rg2.drawing.adjustTrack({x: Math.round(rg2.input.dragStart.x), y: Math.round(rg2.input.dragStart.y)}, pt, rg2.input.whichButton);
        } else {
          if ($("#rg2-info-panel").tabs("option", "active") === rg2.config.TAB_CREATE) {
            rg2.manager.adjustControls({x: Math.round(rg2.input.dragStart.x), y: Math.round(rg2.input.dragStart.y)}, pt, rg2.input.whichButton);
          } else {
            rg2.ctx.translate(pt.x - rg2.input.dragStart.x, pt.y - rg2.input.dragStart.y);
          }
        }
        rg2.input.dragged = true;
        rg2.redraw(false);
      }
    }
  }

  function handleInputUp(evt) {
    // console.log("Input up " + rg2.input.dragged);
    var active = $("#rg2-info-panel").tabs("option", "active");
    if (!rg2.input.dragged) {
      if (active === rg2.config.TAB_CREATE) {
        rg2.manager.mouseUp(Math.round(rg2.input.dragStart.x), Math.round(rg2.input.dragStart.y));
      } else {
        // pass button that was clicked
        rg2.drawing.mouseUp(Math.round(rg2.input.dragStart.x), Math.round(rg2.input.dragStart.y), evt.which);
      }
    } else {
      if (active === rg2.config.TAB_CREATE) {
        rg2.manager.dragEnded();
      } else {
        rg2.drawing.dragEnded();
      }
    }
    rg2.input.dragStart = null;
    rg2.redraw(false);
  }

  function savePinchInfo(evt) {
    rg2.input.pinchStart0 = rg2.ctx.transformedPoint(evt.touches[0].pageX, evt.touches[0].pageY);
    rg2.input.pinchStart1 = rg2.ctx.transformedPoint(evt.touches[1].pageX, evt.touches[1].pageY);
    rg2.input.pinched = true;
  }

  // homegrown touch handling: seems no worse than adding some other library in
  // pinch zoom is primitive but works
  function handleTouchStart(evt) {
    evt.preventDefault();
    if (evt.touches.length > 1) {
      savePinchInfo(evt);
    }
    rg2.input.lastX = evt.touches[0].pageX;
    rg2.input.lastY = evt.touches[0].pageY;
    handleInputDown(evt);
  }

  function handleTouchMove(evt) {
    var oldDistance, newDistance;
    if (evt.touches.length > 1) {
      if (!rg2.input.pinched) {
        savePinchInfo(evt);
      }
    } else {
      rg2.input.pinched = false;
    }
    if (rg2.input.pinched && (evt.touches.length > 1)) {
      rg2.input.pinchEnd0 = rg2.ctx.transformedPoint(evt.touches[0].pageX, evt.touches[0].pageY);
      rg2.input.pinchEnd1 = rg2.ctx.transformedPoint(evt.touches[1].pageX, evt.touches[1].pageY);
      oldDistance = rg2.utils.getDistanceBetweenPoints(rg2.input.pinchStart0.x, rg2.input.pinchStart0.y, rg2.input.pinchStart1.x, rg2.input.pinchStart1.y);
      newDistance = rg2.utils.getDistanceBetweenPoints(rg2.input.pinchEnd0.x, rg2.input.pinchEnd0.y, rg2.input.pinchEnd1.x, rg2.input.pinchEnd1.y);
      if ((oldDistance / newDistance) > 1.1) {
        rg2.zoom(-1);
        rg2.input.pinchStart0 = rg2.input.pinchEnd0;
        rg2.input.pinchStart1 = rg2.input.pinchEnd1;
      } else if ((oldDistance / newDistance) < 0.9) {
        rg2.zoom(1);
        rg2.input.pinchStart0 = rg2.input.pinchEnd0;
        rg2.input.pinchStart1 = rg2.input.pinchEnd1;
      }
    } else {
      rg2.input.lastX = evt.touches[0].pageX;
      rg2.input.lastY = evt.touches[0].pageY;
      handleInputMove(evt);
    }
  }

  function handleTouchEnd(evt) {
    handleInputUp(evt);
    rg2.input.pinched = false;
  }

  function handleScroll(evt) {
    var delta = evt.wheelDelta ? evt.wheelDelta / 40 : evt.detail ? -evt.detail : 0;
    if (delta) {
      rg2.zoom(delta);
    }
    evt.stopPropagation();
    return evt.preventDefault() && false;
  }

  function saveMouseEvent(evt) {
    rg2.input.lastX = evt.offsetX || (evt.layerX - rg2.canvas.offsetLeft);
    rg2.input.lastY = evt.offsetY || (evt.layerY - rg2.canvas.offsetTop);
  }

  function handleMouseDown(evt) {
    saveMouseEvent(evt);
    handleInputDown(evt);
    evt.stopPropagation();
    return evt.preventDefault() && false;
  }

  function handleMouseMove(evt) {
    saveMouseEvent(evt);
    handleInputMove(evt);
    evt.stopPropagation();
    return evt.preventDefault() && false;
  }

  function handleMouseUp(evt) {
    handleInputUp(evt);
    evt.stopPropagation();
    return evt.preventDefault() && false;
  }

  rg2.handleMouseDown = handleMouseDown;
  rg2.handleMouseUp = handleMouseUp;
  rg2.handleMouseMove = handleMouseMove;
  rg2.handleTouchEnd = handleTouchEnd;
  rg2.handleTouchStart = handleTouchStart;
  rg2.handleTouchMove = handleTouchMove;
  rg2.handleScroll = handleScroll;
}());
