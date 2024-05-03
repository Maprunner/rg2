import { drawAnimation } from "./animation"
import { config, options } from "./config"
import { controls, drawCourses } from "./courses"
import { adjustTrack, dragEnded, drawNewTrack, gpsFileLoaded, mouseUp } from "./draw"
import { getActiveEventID } from "./events"
import { Overlay } from "./overlay"
import { drawTracks } from "./results"
import { getActiveTab } from "./rg2ui"
import { t } from "./translate"
import { getDistanceBetweenPoints } from "./utils"

let canvas = document.getElementById("rg2-map-canvas")
export let ctx = canvas.getContext("2d")
ctx.displayAngle = 0
let map = new Image()
let overlay = new Overlay(ctx)
let input = {
  dragStart: null,
  // looks odd but this works for initialisation
  dragged: true,
  scaleFactor: 1.1,
  pinched: false
}
let savedRedraws = 0
let redrawTimerID = undefined
document.getElementById("rg2-load-progress").classList.add("d-none")
document.getElementById("rg2-map-load-progress").classList.add("d-none")

function addListeners() {
  canvas.addEventListener("touchstart", handleTouchStart, false)
  canvas.addEventListener("touchmove", handleTouchMove, false)
  canvas.addEventListener("touchend", handleTouchEnd, false)
  canvas.addEventListener("DOMMouseScroll", handleScroll, false)
  canvas.addEventListener("wheel", handleScroll, false)
  canvas.addEventListener("mousedown", handleMouseDown, false)
  canvas.addEventListener("mousemove", handleMouseMove, false)
  canvas.addEventListener("mouseup", handleMouseUp, false)

  map.addEventListener("load", () => mapLoadedCallback())
  let btn = document.getElementById("btn-zoom-in")
  btn.addEventListener("click", () => zoom(1))

  btn = document.getElementById("btn-zoom-out")
  btn.addEventListener("click", () => zoom(-1))

  btn = document.getElementById("btn-rotate-left")
  btn.addEventListener("click", () => rotateMap(-1))

  btn = document.getElementById("btn-rotate-right")
  btn.addEventListener("click", () => rotateMap(1))

  btn = document.getElementById("btn-reset")
  btn.addEventListener("click", () => resetMapState())
}

export function alignMap(angle, x, y, moveMap = true, scale = 1) {
  // align to an absolute angle: 0 is up/north
  // rotate around defined x, y
  applyMapRotation((ctx.displayAngle - angle) % (Math.PI * 2), x, y, moveMap, scale)
}

function applyMapRotation(angle, x, y, moveMap, scale) {
  // save new absolute angle
  ctx.displayAngle = (ctx.displayAngle - angle) % (Math.PI * 2)
  // rotate around given co-ordinates
  ctx.translate(x, y)
  ctx.rotate(angle)
  if (scale !== 1) {
    ctx.scale(scale, scale)
  }
  if (moveMap) {
    // move map so that given point is centre-bottom of screen
    const pt = getCentreBottom()
    ctx.translate(pt.x - x, pt.y - y)
  } else {
    // put map back where it started
    ctx.translate(-1 * x, -1 * y)
  }
  redraw()
}

function drawDefaultText() {
  if (!config.managing() && window.innerWidth >= config.BIG_SCREEN_BREAK_POINT) {
    ctx.font = "16pt Arial"
    ctx.textAlign = "center"
    ctx.fillStyle = config.BLACK
    const pt = ctx.transformedPoint(canvas.width / 2, canvas.height / 2)
    ctx.fillText("Routegadget 2 Version " + config.RG2VERSION, pt.x, pt.y)
  }
}

export function getCentreBottom() {
  const controlsHeight = document.getElementById("rg2-animation-controls").offsetHeight
  return ctx.transformedPoint(canvas.width / 2, (canvas.height - controlsHeight) * 0.85)
}

export function getCentreTop() {
  const controlsHeight = document.getElementById("rg2-animation-controls").offsetHeight
  return ctx.transformedPoint(canvas.width / 2, (canvas.height - controlsHeight) * 0.15)
}

export function getMapSize() {
  return { height: map.height, width: map.width }
}

function handleInputDown(e) {
  input.dragStart = ctx.transformedPoint(input.lastX, input.lastY)
  input.dragged = false
  // need to cache this here since IE and FF don't set it for mousemove events
  input.whichButton = e.which
}

function handleInputMove() {
  if (input.dragStart) {
    const to = ctx.transformedPoint(input.lastX, input.lastY)
    to.x = Math.round(to.x)
    to.y = Math.round(to.y)
    const from = { x: Math.round(input.dragStart.x), y: Math.round(input.dragStart.y) }
    const button = input.whichButton
    // simple debounce so that very small drags are treated as clicks instead
    if (Math.abs(to.x - from.x) + Math.abs(to.y - from.y) > 5) {
      if (gpsFileLoaded()) {
        adjustTrack(from, to, button)
      } else {
        if (getActiveTab() === config.TAB_CREATE) {
          import("./manager.js")
            .then((module) => {
              module.adjustManagerControls(from, to, button)
            })
            .catch((err) => {
              console.log("Error loading manager", err)
            })
        } else {
          const overlayDragged = overlay.mouseDrag(from, to)
          if (!overlayDragged) {
            ctx.translate(to.x - input.dragStart.x, to.y - input.dragStart.y)
          }
        }
      }
      input.dragged = true
      redraw()
    }
  }
}

function handleInputUp(e) {
  // console.log("Up", e.pageX, e.pageY, e)
  const activeTab = getActiveTab()
  if (!input.dragged) {
    if (activeTab === config.TAB_CREATE) {
      const x = Math.round(input.dragStart.x)
      const y = Math.round(input.dragStart.y)
      import("./manager.js")
        .then((module) => {
          module.managerMouseUp(x, y)
        })
        .catch((err) => {
          console.log("Error loading manager", err)
        })
    } else {
      // pass button that was clicked
      if (activeTab === config.TAB_DRAW) {
        mouseUp(Math.round(input.dragStart.x), Math.round(input.dragStart.y), e.which)
      } else {
        // on results or courses tab
        overlay.mouseUp(Math.round(input.dragStart.x), Math.round(input.dragStart.y))
      }
    }
  } else {
    if (activeTab === config.TAB_CREATE) {
      import("./manager.js")
        .then((module) => {
          module.managerDragEnded()
        })
        .catch((err) => {
          console.log("Error loading manager", err)
        })
    } else {
      if (activeTab === config.TAB_DRAW) {
        dragEnded()
      } else {
        // on results or courses tab
        overlay.dragEnded()
      }
    }
  }
  input.dragStart = null
  redraw()
}

function handleMouseDown(e) {
  saveMouseEvent(e)
  handleInputDown(e)
  e.stopPropagation()
  return e.preventDefault()
}

function handleMouseMove(e) {
  saveMouseEvent(e)
  handleInputMove(e)
  e.stopPropagation()
  return e.preventDefault()
}

function handleMouseUp(e) {
  handleInputUp(e)
  e.stopPropagation()
  return e.preventDefault()
}

function handleScroll(e) {
  // console.log(e)
  const delta = e.wheelDelta ? e.wheelDelta / 40 : e.detail ? -e.detail : 0
  if (delta) {
    zoom(delta)
  }
  e.stopPropagation()
  return e.preventDefault()
}

function handleTouchEnd(e) {
  // console.log("Touch end ", e)
  handleInputUp(e)
  input.pinched = false
}

function handleTouchMove(e) {
  // console.log("Touch move ", e)
  if (e.touches.length > 1) {
    if (!input.pinched) {
      savePinchInfo(e)
    }
  } else {
    input.pinched = false
  }
  if (input.pinched && e.touches.length > 1) {
    input.pinchEnd0 = ctx.transformedPoint(e.touches[0].pageX, e.touches[0].pageY)
    input.pinchEnd1 = ctx.transformedPoint(e.touches[1].pageX, e.touches[1].pageY)
    const oldDistance = getDistanceBetweenPoints(
      input.pinchStart0.x,
      input.pinchStart0.y,
      input.pinchStart1.x,
      input.pinchStart1.y
    )
    const newDistance = getDistanceBetweenPoints(
      input.pinchEnd0.x,
      input.pinchEnd0.y,
      input.pinchEnd1.x,
      input.pinchEnd1.y
    )
    // console.log ("Pinch distance", oldDistance / newDistance)
    if (oldDistance / newDistance > 1.1) {
      zoom(-1)
      input.pinchStart0 = input.pinchEnd0
      input.pinchStart1 = input.pinchEnd1
    } else if (oldDistance / newDistance < 0.9) {
      zoom(1)
      input.pinchStart0 = input.pinchEnd0
      input.pinchStart1 = input.pinchEnd1
    }
  } else {
    input.lastX = e.touches[0].pageX
    input.lastY = e.touches[0].pageY
    handleInputMove(e)
  }
}

// homegrown touch handling: seems no worse than adding some other library in
// pinch zoom is primitive but works
function handleTouchStart(e) {
  // console.log("Touch start", e)
  e.preventDefault()
  if (e.touches.length > 1) {
    savePinchInfo(e)
  }
  input.lastX = e.touches[0].pageX
  input.lastY = e.touches[0].pageY
  handleInputDown(e)
}

export function initialiseCanvas() {
  addListeners()
  trackTransforms(ctx)
  resizeCanvas()
}

export function loadNewMap(mapFile, isBeingCreated = false) {
  document.getElementById("rg2-map-load-progress-label").textContent = t("Loading map", "")
  document.getElementById("rg2-map-load-progress").classList.remove("d-none")
  // setting src on an Image automatically triggers a request to load the map
  // if this is a new map being created by the manager then just use the name we got
  // else we are loading an existing map from the server
  // adding date forces reload from server and avoids all sorts of caching problems with images
  map.src = isBeingCreated ? mapFile : mapFile + "?" + Date.now()
}

function mapLoadedCallback() {
  document.getElementById("rg2-map-load-progress").classList.add("d-none")
  resetMapState()
  if (config.managing()) {
    import("./manager.js")
      .then((module) => {
        module.managerMapLoadCallback()
      })
      .catch((err) => {
        console.log("Error loading manager", err)
      })
  }
}

// called whenever anything changes enough to need screen redraw
export function redraw() {
  // timer used to debounce redraw for significant performance improvement
  // if timer not running then schedule a redraw
  if (redrawTimerID === undefined) {
    // console.log(savedRedraws + " saved redraws")
    savedRedraws = 0
    redrawTimerID = setTimeout(() => {
      redrawTimerID = undefined
      doRedraw()
    }, 50)
  } else {
    // timer is already running so redraw will happen when timer expires
    savedRedraws = savedRedraws + 1
  }
}

function doRedraw() {
  // console.time("redraw")
  // Clear the entire canvas
  // first save current transformed state
  ctx.save()
  // reset everything back to initial size/state/orientation
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  // fill canvas to erase things: clearRect doesn't work on Android (?) and leaves the old map as background when changing
  ctx.globalAlpha = config.FULL_INTENSITY
  ctx.fillStyle = config.GREY
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  // go back to where we started
  ctx.restore()
  // using non-zero map height to show we have a map loaded
  if (map.height > 0) {
    // set map background white so that dimmed maps do not have grey showing through
    ctx.fillStyle = config.WHITE
    // this might have been reset by the ctx.restore()
    ctx.globalAlpha = config.FULL_INTENSITY
    ctx.fillRect(0, 0, map.width, map.height)
    // set transparency of map
    ctx.globalAlpha = options.perCentMapIntensity / 100
    ctx.drawImage(map, 0, 0)
    const tab = getActiveTab()
    if (tab === config.TAB_DRAW) {
      drawCourses(config.DIM)
      controls.drawControls(false)
      drawTracks()
      drawNewTrack()
    } else {
      if (tab === config.TAB_CREATE) {
        import("./manager.js")
          .then((module) => {
            module.drawManagerControls()
          })
          .catch((err) => {
            console.log("Error loading manager", err)
          })
      } else {
        drawCourses(config.DIM)
        drawTracks()
        overlay.drawOverlays()
        controls.drawControls(false)
        drawAnimation()
      }
    }
  } else {
    drawDefaultText()
  }
  // console.timeEnd("redraw")
}

export function resetMapState() {
  // place map in centre of canvas and scale it down to fit
  let mapscale = 1
  const heightscale = canvas.height / map.height
  input.lastX = canvas.width / 2
  input.lastY = canvas.height / 2
  input.zoomSize = 1
  input.dragStart = null
  // looks odd but this works for initialisation
  input.dragged = true
  // don't stretch map: just shrink to fit
  if (heightscale < 1) {
    mapscale = heightscale
  }
  // move map into view on small screens
  // avoid annoying jumps on larger screens
  if (window.innerWidth >= config.BIG_SCREEN_BREAK_POINT) {
    // TODO sort out offsets for control panel
    ctx.setTransform(mapscale, 0, 0, mapscale, document.getElementById("rg2-left-info-panel").offsetWidth + 80, 0)
  } else {
    ctx.setTransform(mapscale, 0, 0, mapscale, 0, 0)
  }
  // don't need to rotate here since the call to setTransform above does that for us
  ctx.displayAngle = 0
  redraw()
}

export function resizeCanvas() {
  input.scaleFactor = config.DEFAULT_SCALE_FACTOR
  // allow for header
  const headerHeight = document.getElementById("rg2-header-container").offsetHeight
  document.getElementById("rg2-container").style.height = window.innerHeight - headerHeight + "px"
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight - headerHeight
  resetMapState()
}

function rotateMap(direction) {
  // rotate a little bit from UI control input
  // direction is -1 for left and 1 for right
  const angle = direction * (Math.PI / 36)
  // rotate around centre of map
  ctx.translate(map.width / 2, map.height / 2)
  applyMapRotation(angle, 0, 0, false, 1)
  ctx.translate(-map.width / 2, -map.height / 2)
}

function saveMouseEvent(e) {
  input.lastX = e.pageX - canvas.offsetParent.offsetLeft
  input.lastY = e.pageY - canvas.offsetParent.offsetTop
}

function savePinchInfo(e) {
  input.pinchStart0 = ctx.transformedPoint(e.touches[0].pageX, e.touches[0].pageY)
  input.pinchStart1 = ctx.transformedPoint(e.touches[1].pageX, e.touches[1].pageY)
  input.pinched = true
}

function trackTransforms(oldctx) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  let xform = svg.createSVGMatrix()
  let savedTransforms = []
  let save = oldctx.save
  oldctx.save = function () {
    savedTransforms.push(xform.translate(0, 0))
    return save.call(oldctx)
  }
  let restore = oldctx.restore
  oldctx.restore = function () {
    xform = savedTransforms.pop()
    return restore.call(oldctx)
  }
  let scale = oldctx.scale
  oldctx.scale = function (sx, sy) {
    xform = xform.scale(sx, sy)
    return scale.call(oldctx, sx, sy)
  }
  let translate = oldctx.translate
  oldctx.translate = function (dx, dy) {
    xform = xform.translate(dx, dy)
    return translate.call(oldctx, dx, dy)
  }
  let setTransform = oldctx.setTransform
  oldctx.setTransform = function (a, b, c, d, e, f) {
    xform.a = a
    xform.b = b
    xform.c = c
    xform.d = d
    xform.e = e
    xform.f = f
    return setTransform.call(oldctx, a, b, c, d, e, f)
  }
  let pt = svg.createSVGPoint()
  oldctx.transformedPoint = function (x, y) {
    // converts x, y screen co-ords to x, y in map image
    pt.x = x
    pt.y = y
    return pt.matrixTransform(xform.inverse())
  }
  let rotate = oldctx.rotate
  oldctx.rotate = function (radians) {
    xform = xform.rotate((radians * 180) / Math.PI)
    return rotate.call(oldctx, radians)
  }
}

function zoom(zoomDirection) {
  if (!config.managing() && getActiveEventID() === null) {
    return
  }
  const factor = Math.pow(input.scaleFactor, zoomDirection)
  const tempZoom = input.zoomSize * factor
  // limit zoom to avoid things disappearing
  // chosen values seem reasonable after some quick tests
  if (tempZoom < config.MAX_ZOOM && tempZoom > config.MIN_ZOOM) {
    input.zoomSize = tempZoom
    const pt = ctx.transformedPoint(input.lastX, input.lastY)
    ctx.translate(pt.x, pt.y)
    ctx.scale(factor, factor)
    ctx.translate(-pt.x, -pt.y)
    redraw()
  }
}
