import { generateSelectOption } from "./utils"

export class Georefs {
  constructor() {
    this.georefsystems = []
    this.georefsystems.push({ name: "Not georeferenced", description: "none", params: "", value: 0 })
    this.georefsystems.push({
      name: "GB National Grid",
      description: "EPSG:27700",
      params:
        "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs",
      value: 1
    })
    this.georefsystems.push({
      name: "Google EPSG:900913",
      description: "EPSG:900913",
      params:
        "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs",
      value: 2
    })
    if (rg2Config.epsg_code !== undefined) {
      // if more than one user-defined then they come in as |-separated strings
      const codes = rg2Config.epsg_code.split("|")
      const params = rg2Config.epsg_params.split("|")
      for (let i = 0; i < codes.length; i = i + 1) {
        this.georefsystems.push({
          name: codes[i].replace(" ", ""),
          description: codes[i].replace(" ", ""),
          params: params[i],
          value: i + 3
        })
      }
      // default value for select option is first of the newly added items, afetr None, GBNG and Google
      this.defaultGeorefVal = 3
    } else {
      // default to GB National Grid
      this.defaultGeorefVal = 1
    }
  }

  getDefaultValue() {
    return this.georefsystems[this.defaultGeorefVal].value
  }

  getGeorefDropdown() {
    let html = ""
    for (let i = 0; i < this.georefsystems.length; i += 1) {
      html += generateSelectOption(i, this.georefsystems[i].name, i === 0)
    }
    return html
  }

  getGeorefSystem(index) {
    return this.georefsystems[index]
  }
}
