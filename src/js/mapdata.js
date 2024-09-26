import { Worldfile } from "./worldfile"

// can't call this Map since that is a built-in class
export class MapData {
  constructor(data) {
    if (data !== undefined) {
      // existing map from database
      this.mapid = data.mapid
      this.name = data.name
      // worldfile for GPS to map image conversion (for GPS files)
      this.worldfile = new Worldfile(data)
      // worldfile for local co-ords to map image conversion (for georeferenced courses)
      this.localworldfile = new Worldfile({
        A: data.localA,
        B: data.localB,
        C: data.localC,
        D: data.localD,
        E: data.localE,
        F: data.localF
      })
      if (data.mapfilename === undefined) {
        this.mapfilename = this.mapid + "." + "jpg"
      } else {
        this.mapfilename = data.mapfilename
      }
    } else {
      // new map to be added
      this.mapid = 0
      this.name = ""
      this.worldfile = new Worldfile(0)
      this.localworldfile = new Worldfile(0)
    }
    this.xpx = []
    this.ypx = []
    this.lat = []
    this.lon = []
  }
}
