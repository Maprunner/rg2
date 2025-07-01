import { decode } from "html-entities"
import { generateSelectOption, createModalDialog, showWarningDialog } from "./utils"

export function confirmDeleteEvent(doDeleteEvent) {
  const id = document.getElementById("rg2-edit-event-selected").value
  let dlg = {}
  dlg.body = "Event " + id + " will be deleted. Are you sure?"
  dlg.title = "Confirm event delete"
  dlg.classes = "rg2-confirm-delete-event-dialog"
  dlg.doText = "Delete event"
  dlg.onDo = doDeleteEvent
  createModalDialog(dlg)
}

export function confirmDeleteRoute(doDeleteRoute) {
  const routeid = document.getElementById("rg2-route-selected").value
  if (routeid === "undefined") {
    showWarningDialog("Warning", "No route selected.")
    return
  }
  let dlg = {}
  dlg.body = "Route " + routeid + " will be permanently deleted. Are you sure?"
  dlg.title = "Confirm route delete"
  dlg.classes = "rg2-confirm-route-delete-dialog"
  dlg.doText = "Delete route"
  dlg.onDo = doDeleteRoute
  createModalDialog(dlg)
}

export function confirmDeleteUnusedMaps(unusedMaps, doDeleteUnusedMaps) {
  const boxes = document.querySelectorAll(".unused-map input[type=checkbox]:checked")
  let checked = []
  for (let box of boxes) {
    if (box.checked) {
      checked.push(parseInt(box.dataset.mapId, 10))
    }
    for (let i = 0; i < unusedMaps.length; i += 1) {
      if (checked.indexOf(unusedMaps[i].mapid) > -1) {
        unusedMaps[i].delete = true
      } else {
        unusedMaps[i].delete = false
      }
    }
  }
  if (checked.length === 0) {
    showWarningDialog("Warning", "No maps selected.")
    return unusedMaps
  }
  const dlg = {}
  dlg.body = "Selected maps will be deleted. Are you sure?"
  dlg.title = "Confirm map deletion"
  dlg.doText = "Delete maps"
  dlg.onDo = doDeleteUnusedMaps
  createModalDialog(dlg)
  return unusedMaps
}

export function displayUnusedMaps(maps) {
  let html = "<div class='title'>ID</div><div class='title'>Name</div><div><i class='bi-trash'></i></div>"
  if (maps.length === 0) {
    html += "<div></div><div>None found.</div><div></div>"
    document.getElementById("btn-delete-unused-maps").setAttribute("disabled", "")
  } else {
    for (let i = 0; i < maps.length; i += 1) {
      html += "<div>" + maps[i].mapid + "</div>"
      html += "<div>" + maps[i].name + "</div>"
      html += "<div class='unused-map'><input type='checkbox' data-map-id=" + maps[i].mapid + "></div>"
    }
    document.getElementById("btn-delete-unused-maps").removeAttribute("disabled")
  }
  document.getElementById("rg2-unused-maps").innerHTML = html
}

export function getEventEditDropdown(events, activeID) {
  let html = activeID ? "" : generateSelectOption(null, "No event selected", true)
  // loop backwards so most recent event is first in list
  for (let i = events.length - 1; i > -1; i -= 1) {
    html += generateSelectOption(
      events[i].kartatid,
      events[i].kartatid + ": " + events[i].date + ": " + decode(events[i].name),
      activeID === events[i].kartatid
    )
  }
  return html
}

export function getEventLevelDropdown() {
  let html = ""
  const text = ["Select level", "Training", "Local", "Regional", "National", "International"]
  const values = ["X", "T", "L", "R", "N", "I"]
  for (let i = 0; i < text.length; i += 1) {
    html += generateSelectOption(values[i], text[i], i === 0)
  }
  return html
}

function hasZeroTime(time) {
  if (time === 0 || time === "0" || time === "0:00" || time === "00:00") {
    return true
  }
  return false
}

export function sortResultItems(a, b) {
  // called after final courseids allocated so this is safe
  if (a.courseid !== b.courseid) {
    return a.courseid - b.courseid
  }
  if (a.position !== "" && b.position !== "") {
    // sort by position, if available
    return a.position - b.position
  }
  if (a.position === "" && b.position !== "") {
    return 1
  }
  if (a.position !== "" && b.position === "") {
    return -1
  }
  // sort by time, if available
  if (hasZeroTime(a.time) && hasZeroTime(b.time)) {
    // sort by name, when no time
    return a.name - b.name
  }
  return a.time - b.time
}

export function testForInvalidCharacters(rawtext) {
  // takes in text read from a results file and checks it has converted to UTF-8 correctly
  let count = 0
  for (let i = 0; i < rawtext.length; i += 1) {
    // Unicode U+FFFD (65533) is the replacement character used to replace an incoming character whose value is unknown or unrepresentable
    // see http://www.fileformat.info/info/unicode/char/0fffd/index.htm
    if (rawtext.charCodeAt(i) === 65533) {
      count += 1
    }
  }
  return count
}
