import { showWarningDialog } from "./utils"
import { getMapSize } from "./canvas"

export const config = {
  // version gets set automatically by grunt file during build process
  RG2VERSION: '2.0.5',
  DEFAULT_SCALE_FACTOR: 1.1,
  TAB_EVENTS: "event-tab",
  TAB_COURSES: "course-tab",
  TAB_RESULTS: "result-tab",
  TAB_DRAW: "draw-tab",
  TAB_LOGIN: "manage-login-tab",
  TAB_CREATE: "manage-create-tab",
  TAB_EDIT: "manage-edit-tab",
  TAB_MAP: "manage-map-tab",
  TAB_DELETE_MAP: "manage-delete-map-tab",
  INVALID_MAP_ID: 9999,
  // translated when output so leave as English here
  DEFAULT_NEW_COMMENT: "Type your comment",
  // added to resultid when saving a GPS track
  GPS_RESULT_OFFSET: 50000,
  MASS_START_REPLAY: 1,
  REAL_TIME_REPLAY: 2,
  // dropdown selection value
  MASS_START_BY_CONTROL: 99999,
  VERY_HIGH_TIME_IN_SECS: 99999,
  // screen sizes for different layouts
  BIG_SCREEN_BREAK_POINT: 800,
  SMALL_SCREEN_BREAK_POINT: 500,
  MAX_ZOOM: 50,
  MIN_ZOOM: 0.05,
  PURPLE: "#b300ff",
  RED: "#ff0000",
  GREEN: "#00ff00",
  DARK_GREEN: "rgb(34, 139, 34)",
  DARK_GREEN_30: "rgba(34, 139, 34, 0.3)",
  GREY: "#e0e0e0",
  RED_30: "rgba(255,0,0,0.3)",
  GREEN_30: "rgba(0,255,0,0.3)",
  WHITE: "#ffffff",
  BLACK: "#000000",
  RUNNER_DOT_RADIUS: 6,
  HANDLE_DOT_RADIUS: 7,
  HANDLE_COLOUR: "#ff0000",
  // parameters for call to draw courses
  DIM: 0.75,
  FULL_INTENSITY: 1.0,
  TIME_NOT_FOUND: 9999,
  // values for eventt.which
  RIGHT_CLICK: 3,
  DO_NOT_SAVE_COURSE: 9999,
  // values of event format
  FORMAT_NORMAL: 1,
  FORMAT_NORMAL_NO_RESULTS: 2,
  FORMAT_SCORE_EVENT: 3,
  FORMAT_SCORE_EVENT_NO_RESULTS: 4,
  DISPLAY_ALL_COURSES: 99999,
  EXCLUDED_NONE: 0,
  EXCLUDED_ZERO_SPLITS: 1,
  EXCLUDED_REAL_SPLITS: 2,
  //number of drawn routes that can be saved for possible later deletion
  MAX_DRAWN_ROUTES: 10,
  // array of available languages: not great to do it like this but it helps for routegadget.co.uk set-up
  languages: [
    { language: "Čeština", code: "cz" },
    { language: "Deutsch", code: "de" },
    { language: "Suomi", code: "fi" },
    { language: "Français", code: "fr" },
    { language: "Italiano", code: "it" },
    { language: "日本語", code: "ja" },
    { language: "Norsk", code: "no" },
    { language: "Português - Brasil", code: "pt" },
    { language: "Русский", code: "ru" }
  ],
  // Size of map upload in MB that triggers the warning dialog
  FILE_SIZE_WARNING: 2,
  // Size of map upload in pixels that triggers the warning dialog
  // emprically this is easily enough for an A3 sensible map
  PIXEL_SIZE_WARNING: 4000,
  CLASS_NOW_ON: 1,
  CLASS_NOW_OFF: 0,
  managing: () => {
    // presence of keksi in config means we are managing
    // until we find a better way
    return rg2Config.keksi !== undefined
  }
}

export const options = {
  // initialised to default values: overwritten from storage later
  perCentMapIntensity: 100,
  perCentRouteIntensity: 100,
  replayFontSize: 12,
  courseWidth: 3,
  routeWidth: 4,
  circleSize: 20,
  snap: true,
  showThreeSeconds: false,
  showGPSSpeed: false,
  // align map with next control at top when drawing route
  alignMap: false,
  // speeds in min/km
  maxSpeed: 5,
  minSpeed: 15,
  // array of up to MAX_DRAWN_ROUTES entries with details to allow deletion
  drawnRoutes: []
}

export function getOverprintDetails() {
  let opt = {}
  // attempt to scale overprint depending on map image size
  // this avoids very small/large circles, or at least makes things a bit more sensible
  const size = getMapSize()
  // Empirically derived  so open to suggestions. This is based on a nominal 20px circle
  // as default. The square root stops things getting too big too quickly.
  // 1500px is a typical map image maximum size.
  let scaleFact = Math.pow(Math.min(size.height, size.width) / 1500, 0.5)
  // don't get too carried away, although these would be strange map files
  scaleFact = Math.min(scaleFact, 5)
  scaleFact = Math.max(scaleFact, 0.5)
  const circleSize = Math.round(options.circleSize * scaleFact)
  // ratios based on IOF ISOM overprint specification
  opt.controlRadius = circleSize
  opt.finishInnerRadius = circleSize * (5 / 6)
  opt.finishOuterRadius = circleSize * (7 / 6)
  opt.startTriangleLength = circleSize * (7 / 6)
  opt.overprintWidth = options.courseWidth
  opt.font = circleSize + "pt Arial"
  return opt
}

export function loadConfigOptions() {
  try {
    // eslint-disable-next-line no-prototype-builtins
    if (window.hasOwnProperty("localStorage") && window.localStorage !== null) {
      if (localStorage.getItem("rg2-options") !== null) {
        const storedOptions = JSON.parse(localStorage.getItem("rg2-options"))
        // overwrite the options array with saved options from local storage
        // need to do this to allow for new options that people don't yet have
        for (let prop in storedOptions) {
          // eslint-disable-next-line no-prototype-builtins
          if (storedOptions.hasOwnProperty(prop)) {
            options[prop] = storedOptions[prop]
          }
        }
        // best to keep these at default?
        options.circleSize = 20
        if (options.perCentMapIntensity === 0) {
          showWarningDialog(
            "Warning",
            "Your saved settings have 0% map intensity so the map is invisible. You can adjust this on the configuration menu"
          )
        }
      }
    }
  } catch (e) {
    // storage not supported so just continue
  }
}

export function removeDrawnRouteDetails(route) {
  let routes = []
  for (let i = 0; i < options.drawnRoutes.length; i += 1) {
    if (options.drawnRoutes[i].id !== route.id || options.drawnRoutes[i].eventid !== route.eventid) {
      routes.push(options.drawnRoutes[i])
    }
  }
  options.drawnRoutes = routes
  saveConfigOptions()
}

export function saveConfigOptions() {
  try {
    // eslint-disable-next-line no-prototype-builtins
    if (window.hasOwnProperty("localStorage") && window.localStorage !== null) {
      localStorage.setItem("rg2-options", JSON.stringify(options))
    }
  } catch (e) {
    // storage not supported so just return
    return
  }
}

export function saveDrawnRouteDetails(route) {
  // this allows for deletion later
  let routes = options.drawnRoutes
  if (routes.length >= config.MAX_DRAWN_ROUTES) {
    // array is full so delete oldest (=first) entry
    routes.shift()
  }
  routes.push(route)
  options.drawnRoutes = routes
  saveConfigOptions()
}

export function setConfigOption(option, value) {
  options[option] = value
  saveConfigOptions()
}
