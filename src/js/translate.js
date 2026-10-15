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

export function getCurrentLanguage() {
  return dictionary.code
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
  // set up translations for various element types
  let elements = document.querySelectorAll("legend")
  for (let el of elements) {
    el.innerHTML =t(el.innerText, "legend")
  }

  for (let placeholderEl of ["text", "textarea", "input"]) {
    elements = document.querySelectorAll(placeholderEl)
    for (let el of elements) {
      if (el.getAttribute("placeholder")) {
        const [text, key] = tAttribute(el.getAttribute("placeholder"))
        el.setAttribute("data-rg2t", key)
        el.setAttribute("placeholder", text)
      }
    }
  }

  elements = document.querySelectorAll("button")
  for (let el of elements) {
    // only do this if button only contains text
    if (el.childElementCount === 0) {
      const [text, key] = tAttribute(el.innerHTML)
      if (key !== "") {
        el.setAttribute("data-rg2t", key)
        el.innerHTML = text
      }
    }
  }
  elements = document.querySelectorAll("label")
  for (let el of elements) {
    // only do this if label only contains text
    if (el.childElementCount === 0) {
      const [text, key] = tAttribute(el.innerHTML)
      if (key !== "") {
        el.setAttribute("data-rg2t", key)
        el.innerHTML = text
      }
    }
  }

  elements = document.querySelectorAll("option")
  for (let el of elements) {
    const [text, key] = tAttribute(el.innerHTML)
    // only do this if option only contains text
    if (el.childElementCount === 0) {
      if (key !== "") {
        el.setAttribute("data-rg2t", key)
        el.innerHTML = text
      }
    }
  }

  // set up translations for tooltips on <i> elements (button icons)
  elements = document.querySelectorAll("i")
  for (let el of elements) {
    if (el.title) {
      const [text, key] = tAttribute(el.title)
      if (key !== "") {
        el.setAttribute("data-rg2t", key)
        el.title = text
      }
    }
  }

  // set start language if requested
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
  translate()
}

// Translation is done by adding a data-rg2t attribute to all relevant elements at start-up.
// The attribute value is a key to the English string in the keys array.

// Translation set-up function for pure text elements mostly used for
// HTML generated in code during start-up such as table headings.
// Returns a formatted element for insertion in the generated HTML which contains the relevant
// text in the current language.
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
  return `<${element} data-rg2t='${key}'>${str}</${element}>`
}

// Translation set-up function for more complicated scenarios such as attributes.
// Returns the relevant text in the current language and the data attribute key to be added.
export function tAttribute(str) {
  const key = getEnglishKey(str)
  // eslint-disable-next-line no-prototype-builtins
  if (dictionary.hasOwnProperty(str)) {
    str = dictionary[str]
  }
  return [str, key]
}

// To change language you extract all elements with a data-rg2t attribute and replace
// the relevant field with the translation from the current dictionary.
function translate() {
  const elements = document.querySelectorAll("[data-rg2t]")
  for (let el of elements) {
    const key = parseInt(el.dataset.rg2t, 10)
    const english = keys[key]
    let translation = english
    if (Object.prototype.hasOwnProperty.call(dictionary, english)) {
      translation = dictionary[english]
    }
    if (el.localName === "i") {
      el.setAttribute("title", translation)
    } else {
      el.innerText = translation
    }
  }
}

