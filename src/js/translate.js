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
