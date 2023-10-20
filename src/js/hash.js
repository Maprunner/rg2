import { config } from "./config"
let id = 0
let courses = []
let routes = []

// expand an array of routes or courses into a comma-separated string
function extractItems(items, introText) {
  if (items.length > 0) {
    return introText + items.join(",")
  }
  return ""
}

function generateHash(hashID, hashRoutes, hashCourses) {
  let hash = 0
  if (id !== 0) {
    hash = "#" + hashID + extractItems(hashCourses, "&course=") + extractItems(hashRoutes, "&route=")
  }
  return hash
}

export function getHashCourses() {
  return courses
}

export function getHashID() {
  return id
}

export function getHashRoutes() {
  return routes
}

export function getHashTab() {
  if (routes.length > 0) {
    return config.TAB_RESULTS
  }
  return config.TAB_COURSES
}

function getIDFromLocationHash(locationHash) {
  // id should be numeric and between # and & or end of string whichever comes first
  let id = locationHash.replace(/#([0-9]+)($|&).*/, "$1")
  //console.log("hash ", locationHash, "id ", id)
  if (id.length > 0) {
    return parseInt(id, 10)
  }
  return id
}

export function parseLocationHash(hash) {
  id = 0
  courses.length = 0
  routes.length = 0
  // input looks like #id&course=a,b,c&result=x,y,z
  let fields = hash.split("&")
  for (let i = 0; i < fields.length; i += 1) {
    fields[i] = fields[i].toLowerCase()
    if (fields[i].search("#") !== -1) {
      // remove # and anything else non-numeric before trying to convert to an integer
      id = parseInt(fields[i].replace(/\D/g, ""), 10)
    }
    if (fields[i].search("course=") !== -1) {
      courses = fields[i].replace("course=", "").split(",")
    }
    if (fields[i].search("route=") !== -1) {
      routes = fields[i].replace("route=", "").split(",")
    }
  }
  // convert to integers: NaNs sort themselves out on display so don't check here
  courses = courses.map(Number)
  routes = routes.map(Number)

  if (isNaN(id)) {
    id = 0
    courses.length = 0
    routes.length = 0
  }
  setLocationHash()
  return id
}

export function setEventHash(newid) {
  id = newid
  setLocationHash()
}

export function setHashCourses(displayedCourses) {
  courses = displayedCourses
  setLocationHash()
}

export function setHashRoutes(displayedRoutes) {
  routes = displayedRoutes
  setLocationHash()
}

function setLocationHash() {
  let hash = ""
  if (getIDFromLocationHash(window.location.hash) === id) {
    hash = generateHash(id, routes, courses)
    // console.log("Replace" + hash)
    window.history.replaceState({ hash: hash }, "", hash)
  } else {
    courses.length = 0
    routes.length = 0
    hash = generateHash(id, routes, courses)
    // console.log("Push " + hash)
    window.history.pushState({ hash: hash }, "", hash)
  }
}
