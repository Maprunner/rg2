
(function () {
  var input = {
    dragStart: null,
    // looks odd but this works for initialisation
    dragged: true,
    infoPanelMaximised: true,
    scaleFactor: 1.1
  };

  function handleInputDown(evt) {
    input.dragStart = rg2.ctx.transformedPoint(input.lastX, input.lastY);
    input.dragged = false;
    // need to cache this here since IE and FF don't set it for mousemove events
    input.whichButton = evt.which;
    //console.log ("InputDown " + input.lastX + " " + input.lastY + " " + input.dragStart.x + " " + input.dragStart.y);
  }

  function handleInputMove() {
    var pt;
    if (input.dragStart) {
      pt = rg2.ctx.transformedPoint(input.lastX, input.lastY);
      Math.round(pt.x);
      Math.round(pt.y);
      // console.log ("Mousemove after " + pt.x + ": " + pt.y);
      // simple debounce so that very small drags are treated as clicks instead
      if ((Math.abs(pt.x - input.dragStart.x) + Math.abs(pt.y - input.dragStart.y)) > 5) {
        if (rg2.drawing.gpsFileLoaded()) {
          rg2.drawing.adjustTrack({x: Math.round(input.dragStart.x), y: Math.round(input.dragStart.y)}, pt, input.whichButton);
        } else {
          if ($("#rg2-info-panel").tabs("option", "active") === rg2.config.TAB_CREATE) {
            rg2.manager.adjustControls({x: Math.round(input.dragStart.x), y: Math.round(input.dragStart.y)}, pt, input.whichButton);
          } else {
            let overlayDragged = rg2.overlay.mouseDrag(input.dragStart, pt);
            if (!overlayDragged) {
              rg2.ctx.translate(pt.x - input.dragStart.x, pt.y - input.dragStart.y);
            }
          }
        }
        input.dragged = true;
        rg2.redraw(false);
      }
    }
  }

  function handleInputUp(evt) {
    // console.log("Input up " + input.dragged);
    var active = $("#rg2-info-panel").tabs("option", "active");
    if (!input.dragged) {
      if (active === rg2.config.TAB_CREATE) {
        rg2.manager.mouseUp(Math.round(input.dragStart.x), Math.round(input.dragStart.y));
      } else {
        // pass button that was clicked
        if (active === rg2.config.TAB_DRAW) {
          rg2.drawing.mouseUp(Math.round(input.dragStart.x), Math.round(input.dragStart.y), evt.which);
        } else {
          // on results or courses tab
          rg2.overlay.mouseUp(Math.round(input.dragStart.x), Math.round(input.dragStart.y), evt.which); 
        }
      }
    } else {
      if (active === rg2.config.TAB_CREATE) {
        rg2.manager.dragEnded();
      } else {
        if (active === rg2.config.TAB_DRAW) {
          rg2.drawing.dragEnded();
        } else { 
          // on results or courses tab
          rg2.overlay.dragEnded();
        }
      }
    }
    input.dragStart = null;
    rg2.redraw(false);
  }

  function savePinchInfo(evt) {
    input.pinchStart0 = rg2.ctx.transformedPoint(evt.touches[0].pageX, evt.touches[0].pageY);
    input.pinchStart1 = rg2.ctx.transformedPoint(evt.touches[1].pageX, evt.touches[1].pageY);
    input.pinched = true;
  }

  // homegrown touch handling: seems no worse than adding some other library in
  // pinch zoom is primitive but works
  function handleTouchStart(evt) {
    evt.preventDefault();
    if (evt.touches.length > 1) {
      savePinchInfo(evt);
    }
    input.lastX = evt.touches[0].pageX;
    input.lastY = evt.touches[0].pageY;
    handleInputDown(evt);
  }

  function handleTouchMove(evt) {
    var oldDistance, newDistance;
    if (evt.touches.length > 1) {
      if (!input.pinched) {
        savePinchInfo(evt);
      }
    } else {
      input.pinched = false;
    }
    if (input.pinched && (evt.touches.length > 1)) {
      input.pinchEnd0 = rg2.ctx.transformedPoint(evt.touches[0].pageX, evt.touches[0].pageY);
      input.pinchEnd1 = rg2.ctx.transformedPoint(evt.touches[1].pageX, evt.touches[1].pageY);
      oldDistance = rg2.utils.getDistanceBetweenPoints(input.pinchStart0.x, input.pinchStart0.y, input.pinchStart1.x, input.pinchStart1.y);
      newDistance = rg2.utils.getDistanceBetweenPoints(input.pinchEnd0.x, input.pinchEnd0.y, input.pinchEnd1.x, input.pinchEnd1.y);
      if ((oldDistance / newDistance) > 1.1) {
        rg2.zoom(-1);
        input.pinchStart0 = input.pinchEnd0;
        input.pinchStart1 = input.pinchEnd1;
      } else if ((oldDistance / newDistance) < 0.9) {
        rg2.zoom(1);
        input.pinchStart0 = input.pinchEnd0;
        input.pinchStart1 = input.pinchEnd1;
      }
    } else {
      input.lastX = evt.touches[0].pageX;
      input.lastY = evt.touches[0].pageY;
      handleInputMove(evt);
    }
  }

  function handleTouchEnd(evt) {
    handleInputUp(evt);
    input.pinched = false;
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
    input.lastX = evt.offsetX || (evt.layerX - rg2.canvas.offsetLeft);
    input.lastY = evt.offsetY || (evt.layerY - rg2.canvas.offsetTop);
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
  rg2.input = input;
  rg2.handleMouseDown = handleMouseDown;
  rg2.handleMouseUp = handleMouseUp;
  rg2.handleMouseMove = handleMouseMove;
  rg2.handleTouchEnd = handleTouchEnd;
  rg2.handleTouchStart = handleTouchStart;
  rg2.handleTouchMove = handleTouchMove;
  rg2.handleScroll = handleScroll;
}());
