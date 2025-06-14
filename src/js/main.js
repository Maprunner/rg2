import "../scss/rg2.scss"
// eslint-disable-next-line no-unused-vars
import * as bootstrap from "bootstrap"
import { initialiseCanvas } from "./canvas"
import { config, loadConfigOptions } from "./config"
import { initialiseCourses } from "./courses"
import { doGetEvents, getActiveKartatID, isValidKartatID, loadEventByKartatID } from "./events"
import { parseLocationHash } from "./hash"
import { configureUI } from "./rg2ui"
import { initLanguageOptions } from "./translate"
import { showWarningDialog } from "./utils.js"

window.assetUrl = function (filename) {
  return rg2Config.asset_url + filename
}

if (document.readyState !== "loading") {
  rg2init()
} else {
  document.addEventListener("DOMContentLoaded", rg2init)
}

function rg2init() {
  // everything now loaded: trigger CSS transitions on start-up screen
  const startup = document.querySelector(".rg2-startup")
  startup.style.opacity = 0
  startup.style.backgroundColor = config.GREY
  document.querySelector(".rg2-startup-content").classList.add("startup-transform")
  startup.addEventListener(
    "transitionend",
    () => {
      document.getElementById("rg2-header-container").classList.remove("d-none")
      startup.remove()
      // looks odd to do this inmediateky but needed to avoid problems with Controls class
      initialiseCourses()
      loadConfigOptions()
      configureUI()
      initLanguageOptions()
      if (config.managing()) {
        import("./manager.js")
          .then((module) => {
            rg2Config.manager = module
            rg2Config.manager.initialiseManager()
            finishInit()
          })
          .catch(() => {
            console.log("Error loading manager")
            showWarningDialog("Error loading manager", "Manager functionality failed to  load.")
          })
      } else {
        finishInit()
      }
    },
    // only need to run initialistaion once even if we have multiple transitions
    { once: true }
  )
}

function finishInit() {
  initialiseCanvas()
  window.onpopstate = handleNavigation
  // check if a specific event has been requested
  if (window.location.hash && !config.managing()) {
    parseLocationHash(window.location.hash)
  }
  document.getElementById("rg2-event-title").innerHTML = "Routegadget 2"
  doGetEvents()
}

function handleNavigation() {
  // console.log("Pop " + window.location.hash)
  // strange null popstates get generated when you toggle the left info panel via the rg2 logo
  // so just protect against it for now
  if (window.location.hash === "") {
    return
  }
  // don't try to do anything clever in manager
  if (!config.managing()) {
    // find out where we are trying to go
    const requestedKartatID = parseLocationHash(window.location.hash)
    if (isValidKartatID(requestedKartatID)) {
      // prevent double loading of events for cases where we get popstate for a change
      // triggered via RG2 interaction rather than browser navigation
      // ... or something like that: at least this seems to work in FF, Chrome and Edge
      // which is a start
      if (getActiveKartatID() !== requestedKartatID) {
        loadEventByKartatID(requestedKartatID)
      }
    }
  }
}
