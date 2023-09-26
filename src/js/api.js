import axios from "axios"
import { showWarningDialog } from "./utils"

const rg2Axios = axios.create({
  baseURL: rg2Config.api_url
})

export function getApi(params, onResponse, errorMsg) {
  params.t = new Date().getTime()
  document.getElementById("rg2-container").style.cursor = "wait"
  rg2Axios({
    method: "get",
    url: "",
    params: params
  })
    .then((response) => {
      // handlers that need kartatid (unhelpfully called id in the API) send it as a parameter: otherwise it will go as undefined which is OK
      onResponse(response.data.data, params.id)
    })
    .catch(function (error) {
      reportJSONFail(errorMsg + ": " + error)
    })
    .finally(function () {
      document.getElementById("rg2-container").style.cursor = "auto"
    })
}

export function postApi(data, params, onResponse, errorMsg, handleKeksi = () => {}) {
  let config = { method: "post" }
  config.data = data
  if (params.headers) {
    config.headers = params.headers
    delete params.headers
  }
  params.t = new Date().getTime()
  config.params = params
  document.getElementById("rg2-container").style.cursor = "wait"
  rg2Axios(config)
    .then((response) => {
      if (response.data.keksi) {
        handleKeksi(response.data.keksi)
      }
      onResponse(response.data)
    })
    .catch(function (error) {
      reportJSONFail(errorMsg + ": " + error)
    })
    .finally(function () {
      document.getElementById("rg2-container").style.cursor = "auto"
    })
}

function reportJSONFail(error) {
  document.getElementById("rg2-load-progress").classList.add("d-none")
  document.getElementById("rg2-map-load-progress").classList.add("d-none")
  showWarningDialog("Configuration error", error)
}
