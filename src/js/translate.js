import { getApi } from "./api"
import { generateOption } from "./utils"

// use English until we load something else
let dictionary = {}
dictionary.code = "en"
let keys = []

export function createLanguageDropdown(languages) {
  let dropdown = document.getElementById("rg2-select-language")
  dropdown.innerHTML = ""
  let selected = dictionary.code === "en"
  dropdown.options.add(generateOption("en", "en: English", selected))
  for (let i = 0; i < languages.length; i = i + 1) {
    selected = dictionary.code === languages[i].code
    dropdown.options.add(generateOption(languages[i].code, languages[i].code + ": " + languages[i].language, selected))
  }
  dropdown.addEventListener("change", (e) => {
    const newlang = e.target.value
    if (newlang !== dictionary.code) {
      if (newlang === "en") {
        setNewLanguage("en")
      } else {
        doGetNewLanguage(newlang)
      }
    }
  })
}

function doGetNewLanguage(lang) {
  const params = { type: "lang", lang: lang }
  getApi(params, handleLanguageResponse, "Language request failed")
}

function getEnglishKey(str) {
  // builds an array of everything that has been translated
  // and allocates a key for use in data-rg2t attribute
  const idx = keys.indexOf(str)
  if (idx > -1) {
    return idx
  } else {
    keys.push(str)
    return keys.length - 1
  }
}

function handleLanguageResponse(response) {
  setNewLanguage(response.lang)
}

export function initLanguageOptions() {
  // set available languages and set start language if requested
  if (rg2Config.start_language !== "en") {
    doGetNewLanguage(rg2Config.start_language)
  }
}

export function setNewLanguage(lang) {
  if (lang === "en") {
    dictionary = { code: "en" }
  } else {
    dictionary = lang
  }
  translateAllText()
  translateButtons()
  translateManager()
}

export function t(str, element = "span") {
  const key = getEnglishKey(str)
  // eslint-disable-next-line no-prototype-builtins
  if (dictionary.hasOwnProperty(str)) {
    str = dictionary[str]
  }
  // passing an empty element returns an unformatted string
  if (element === "") {
    return str
  }
  // otherwise add a wrapper with data attribute to allow translation
  return `<${element} data-rg2t='${key}'>${str}</${element}>`
}

function translateAllText() {
  // translates every element that has a data-rg2t attribute
  const elements = document.querySelectorAll("[data-rg2t]")
  for (let el of elements) {
    const key = parseInt(el.dataset.rg2t, 10)
    el.innerText = t(keys[key], "")
  }
}

export function getCurrentLanguage() {
  return dictionary.code
}

function translateButtons() {

    const tooltips = {
      "btn-reset": "Reset",
      "btn-zoom-in": "Zoom in",
      "btn-zoom-out": "Zoom out",
      "btn-rotate-right": "Rotate right",
      "btn-rotate-left": "Rotate left",
      "btn-toggle-controls": "Show controls",
      "btn-stats": "Stats",
      "btn-splitsbrowser": "Splitsbrowser",
      "btn-runners": "Runners",
      "btn-measure": "Measure",
      "btn-settings": "Options",
      "btn-about": "Help"
    };

    Object.entries(tooltips).forEach(([id, text]) => {const el = document.getElementById(id);
      if (el) {el.title = t(text, "");
      }
    });

  document.querySelector("label[for=rg2-user-name]").innerHTML = t("User name")
  document.getElementById("rg2-user-name").placeholder = t("User name")

  document.querySelector("label[for=rg2-password]").innerHTML = t("Password")
  document.getElementById("rg2-password").placeholder = t("Password")

  document.getElementById("btn-login").innerHTML = t("Log in")
}

function translateManager() {

  const set = (selector, text, attr = "innerHTML") => {
    const el = document.querySelector(selector);
    if (el) el[attr] = t(text, "");
  };

  const setById = (id, text, attr = "innerHTML") => {
    const el = document.getElementById(id);
    if (el) el[attr] = t(text, "");
  };

  // --- Add Event ---
  setById("rg2-event-details", "Event details");

  const results = document.getElementById("rg2-manager-results-count");
  if (results) results.innerHTML = t("Results", "") + " (0)";

  const courses = document.getElementById("rg2-manager-courses-count");
  if (courses) courses.innerHTML = t("Courses", "") + " (0)";

  set("label[for=rg2-event-name]", "Event name");
  set("#rg2-event-name", "Event name", "placeholder");

  set("label[for=rg2-select-map]", "Map");

  set("label[for=rg2-select-club-name]", "Club");
  set("#rg2-select-club-name", "Club name", "placeholder");

  set("label[for=rg2-select-event-date]", "Date");
  set("label[for=rg2-select-event-level]", "Event level");

  set("label[for=rg2-enter-event-comments]", "Comments");
  set("#rg2-enter-event-comments", "Comments", "placeholder");

  set("label[for=chk-no-results]", "No results file");
  set("label[for=chk-sort-results]", "Sort results file");

  const sortInfo = document.querySelector("#chk-sort-results")?.closest(".mb-3")?.querySelector(".form-text");
  if (sortInfo) {
    sortInfo.innerHTML = t("Only select if the results file is not already properly sorted.", "");
  }

  set("label[for=chk-enrich-course-names]", "Add classes to course names");
  set("label[for=chk-score-event]", "Individual courses (butterfly/score/relay)");

  set("#btn-draw-courses", "Draw course");

  set("label[for=rg2-new-course-name]", "Course");
  set("#rg2-new-course-name", "Course name", "placeholder");

  set("label[for=chk-move-map-and-controls]", "Move map and controls together");
  set("label[for=chk-read-only]", "Read-only mode");

  set("#btn-create-event", "Create event");

  // --- Edit Event ---
  setById("rg2-select-event", "Select event");
  set("label[for=rg2-edit-event-selected]", "Event");

  setById("rg2-edit-event", "Edit event details");

  set("label[for=rg2-edit-event-name]", "Event name");
  set("#rg2-edit-event-name", "Event name", "placeholder");

  set("label[for=rg2-edit-club-name]", "Club");
  set("#rg2-edit-club-name", "Club name", "placeholder");

  set("label[for=rg2-edit-event-level]", "Event level");

  set("label[for=rg2-edit-event-comments]", "Comments");
  set("#rg2-edit-event-comments", "Comments", "placeholder");

  set("label[for=rg2-edit-exclude]", "Excluded controls");
  set("#rg2-edit-exclude", "Excluded controls", "placeholder");

  set("label[for=chk-edit-read-only]", "Read-only");

  set("#btn-update-event", "Update event details");

  setById("rg2-delete-route", "Delete route");
  set("label[for=rg2-route-selected]", "Route");
  set("#btn-delete-route", "Delete route");

  setById("rg2-delete-event", "Delete event");
  set("#btn-delete-event", "Delete event");

  // --- Add Map ---
  setById("rg2-Map-details", "Map details");

  set("label[for=rg2-map-name]", "Map name");
  set("#rg2-map-name", "Map name", "placeholder");

  set("label[for=rg2-load-map-file]", "Map file");

  setById("rg2-Georeferencing", "Georeferencing");

  set("label[for=rg2-load-georef-file]", "Georeferencing file");
  set("label[for=rg2-georef-type]", "Co-ordinate system");

  const georefSelect = document.getElementById("rg2-georef-type");
  if (georefSelect && georefSelect.options.length > 0) {
    georefSelect.options[0].text = t("Not georeferenced", "");
  }

  set("#btn-add-map", "Add map");

  // --- Delete Map ---
  set("#btn-delete-unused-maps", "Delete selected maps");
}