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
//import { initialiseManager } from "./manager"

if (document.readyState !== "loading") {
  rg2init()
} else {
  document.addEventListener("DOMContentLoaded", rg2init)
}

function rg2init() {
  const startup = document.querySelector(".rg2-startup")
  startup.addEventListener("transitionend", () => {
    startup.remove()
    // TODO: looks odd but needed to avoid problems with Controls class
    initialiseCourses()
    loadConfigOptions()
    configureUI()
    initLanguageOptions()
    if (config.managing()) {
      import("./manager.js")
        .then((module) => {
          module.initialiseManager(rg2Config.keksi)
        })
        .catch(() => {
          console.log("Error loading manager")
        })
    }
    initialiseCanvas()
    window.onpopstate = handleNavigation
    // check if a specific event has been requested
    if (window.location.hash && !config.managing()) {
      parseLocationHash(window.location.hash)
    }
    document.getElementById("rg2-event-title").innerHTML = "Routegadget 2"
    doGetEvents()
  })
  startup.style.opacity = 0
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
