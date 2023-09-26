// eslint-disable-next-line no-unused-vars
import * as bootstrap from "bootstrap"
import { t } from "./translate"

export function extractAttributeZero(nodelist, attribute, defaultValue) {
  if (nodelist.length > 0) {
    return nodelist[0].getAttribute(attribute).trim()
  }
  return defaultValue
}

// converts seconds to MM:SS
export function formatSecsAsMMSS(secs) {
  const minutes = Math.floor(secs / 60)
  let formattedtime = minutes
  const seconds = secs - minutes * 60
  if (seconds < 10) {
    formattedtime += ":0" + seconds
  } else {
    formattedtime += ":" + seconds
  }
  return formattedtime
}

// returns seconds as hh:mm:ss
export function formatSecsAsHHMMSS(secs) {
  let formattedtime
  const hours = Math.floor(secs / 3600)
  if (hours < 10) {
    formattedtime = "0" + hours + ":"
  } else {
    formattedtime = hours + ":"
  }
  secs = secs - hours * 3600
  const minutes = Math.floor(secs / 60)
  if (minutes < 10) {
    formattedtime += "0" + minutes
  } else {
    formattedtime += minutes
  }
  secs = secs - minutes * 60
  if (secs < 10) {
    formattedtime += ":0" + secs
  } else {
    formattedtime += ":" + secs
  }
  return formattedtime
}

export function generateOption(value, text, selected = false) {
  let opt = document.createElement("option")
  opt.value = value
  opt.text = text
  if (selected) {
    opt.selected = true
  }
  return opt
}

export function generateSelectOption(value, text, selected = false) {
  // returns an option line for a Bootstrap select dropdown
  // <option value="0" selected>Not georeferenced</option>
  return `<option value="${value}"${selected ? " selected" : ""}>${text}</option>`
}

export function getAngle(x1, y1, x2, y2) {
  let angle = Math.atan2(y2 - y1, x2 - x1)
  if (angle < 0) {
    angle = angle + 2 * Math.PI
  }
  return angle
}

export function getDistanceBetweenPoints(x1, y1, x2, y2) {
  // Pythagoras
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2))
}

export function getLatLonDistance(lat1, lon1, lat2, lon2) {
  // Haversine formula (http://www.codecodex.com/wiki/Calculate_distance_between_two_points_on_a_globe)
  const dLat = (lat2 - lat1).toRad()
  const dLon = (lon2 - lon1).toRad()
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  // multiply by IUUG earth mean radius (http://en.wikipedia.org/wiki/Earth_radius) in metres
  return 6371009 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function getSecsFromHHMM(time) {
  if (!time) {
    return 0
  }
  let secs = 0
  const bits = time.split(":")
  secs = parseInt(bits[0], 10) * 3600 + parseInt(bits[1], 10) * 60
  if (isNaN(secs)) {
    return 0
  }
  return secs
}

// converts MM:SS or HH:MM:SS to seconds based on number of :
export function getSecsFromHHMMSS(time) {
  if (!time) {
    return 0
  }
  let secs = 0
  // force format to use : if it came in with .
  let bits = time.replace(/\./g, ":").split(":")
  if (bits.length === 2) {
    secs = parseInt(bits[0], 10) * 60 + parseInt(bits[1], 10)
  } else {
    if (bits.length === 3) {
      secs = parseInt(bits[0], 10) * 3600 + parseInt(bits[1], 10) * 60 + parseInt(bits[2], 10)
    }
  }
  if (isNaN(secs)) {
    return 0
  }
  return secs
}

export const showWarningDialog = (title, text) => {
  showToast(title, text)
}

const toast = document.getElementById("rg2-toast-container")
export const showToast = (title, text) => {
  const newToast = document.createElement("div")
  newToast.classList.add("toast")
  newToast.setAttribute("data-bs-autohide", "false")
  newToast.innerHTML = `<div class="toast-header">
      <strong class="me-auto">${title}</strong>
      <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
    <div class="toast-body">
      ${text}
    </div>`
  toast.appendChild(newToast)
  const toastElList = document.querySelectorAll(".toast")
  const toastList = [...toastElList].map((toastEl) => {
    const newToast = new bootstrap.Toast(toastEl, {})
    toastEl.addEventListener("hidden.bs.toast", () => {
      if (toastEl.parentNode) {
        toastEl.parentNode.removeChild(toastEl)
      }
    })
    newToast.show()
  })
}

export function extractTextContentZero(nodelist, defaultValue) {
  if (nodelist.length > 0) {
    return nodelist[0].textContent.trim()
  }
  return defaultValue
}

let modalDialog = undefined
export function createModalDialog(dlg, showCancelButton = true) {
  if (modalDialog) {
    modalDialog.dispose()
  }
  const modalContainer = document.getElementById("rg2-modal-container")
  modalContainer.innerHTML = ""
  const cancelButton = showCancelButton
    ? `<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${t("Cancel")}</button>`
    : ""
  const modalContent = `<div class="modal fade" id="rg2-modal-dialog" data-bs-backdrop="static" data-bs-keyboard="false"
    tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h1 class="modal-title fs-5" id="staticBackdropLabel">${dlg.title}</h1>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          ${dlg.body}
        </div>
        <div class="modal-footer">
          <button id="rg2-do-modal-action" type="button" class="btn btn-primary">${t(dlg.doText)}</button>
          ${cancelButton}
        </div>
      </div>
    </div>
    </div > `
  modalContainer.innerHTML = modalContent
  // create null cancel function if we din't get anything
  if (typeof dlg.onCancel !== "function") {
    dlg.onCancel = () => {}
  }
  let doIt = false
  const dialog = document.getElementById("rg2-modal-dialog")
  document.getElementById("rg2-do-modal-action").addEventListener("click", () => {
    doIt = true
    modalDialog.hide()
  })
  const options = { keyboard: true }
  modalDialog = new bootstrap.Modal(dialog, options)
  dialog.addEventListener("hidden.bs.modal", () => {
    if (doIt) {
      dlg.onDo()
    } else {
      dlg.onCancel()
    }
  })
  modalDialog.show()
}

export function validateValue(selector, isValid) {
  const elem = document.getElementById(selector)
  const valid = isValid(elem.value)
  if (valid) {
    elem.classList.add("is-valid")
    elem.classList.remove("is-invalid")
  } else {
    elem.classList.add("is-invalid")
    elem.classList.remove("is-valid")
  }
  return valid
}

Number.prototype.toRad = function () {
  return (this * Math.PI) / 180
}

// used to generate track colours
const colours = [
  "#ff0000",
  "#00ff00",
  "#0000ff",
  "#800000",
  "#008000",
  "#000080",
  "#ffff00",
  "#ff00ff",
  "#00ffff",
  "#808000",
  "#800080",
  "#008080"
]
let colourIndex = 0

export function getNextTrackColour() {
  colourIndex = (colourIndex + 1) % colours.length
  return colours[colourIndex]
}
