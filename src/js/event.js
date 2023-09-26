import { Worldfile } from "./worldfile"

export class Event {
  constructor(data) {
    this.kartatid = data.id
    this.mapid = data.mapid
    this.format = data.format
    this.name = data.name
    this.date = data.date
    this.club = data.club
    this.rawtype = data.type
    switch (data.type) {
      case "I":
        this.type = "International event"
        break
      case "N":
        this.type = "National event"
        break
      case "R":
        this.type = "Regional event"
        break
      case "L":
        this.type = "Local event"
        break
      case "T":
        this.type = "Training event"
        break
      default:
        this.type = "Unknown"
        break
    }
    this.comment = data.comment
    this.locked = data.locked
    this.courses = 0
    if (data.suffix === undefined) {
      this.mapfilename = this.mapid + "." + "jpg"
    } else {
      this.mapfilename = this.mapid + "." + data.suffix
    }
    this.worldfile = new Worldfile(data)
  }
}
