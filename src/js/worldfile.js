export class Worldfile {
  // see http://en.wikipedia.org/wiki/World_file
  constructor(wf) {
    if (wf.A === undefined) {
      this.valid = false
      this.A = 0
      this.B = 0
      this.C = 0
      this.D = 0
      this.E = 0
      this.F = 0
    } else {
      this.A = parseFloat(wf.A)
      this.B = parseFloat(wf.B)
      this.C = parseFloat(wf.C)
      this.D = parseFloat(wf.D)
      this.E = parseFloat(wf.E)
      this.F = parseFloat(wf.F)
      this.valid = true
      // helps make later calculations easier
      this.AEDB = wf.A * wf.E - wf.D * wf.B
      this.xCorrection = wf.B * wf.F - wf.E * wf.C
      this.yCorrection = wf.D * wf.C - wf.A * wf.F
    }
  }

  // use worldfile to generate latitude
  getLat(x, y) {
    return this.D * x + this.E * y + this.F
  }

  // use worldfile to generate longitude
  getLon(x, y) {
    return this.A * x + this.B * y + this.C
  }

  // use worldfile to generate X value
  getX(lng, lat) {
    return Math.round((this.E * lng - this.B * lat + this.xCorrection) / this.AEDB)
  }

  // use worldfile to generate y value
  getY(lng, lat) {
    return Math.round((-1 * this.D * lng + this.A * lat + this.yCorrection) / this.AEDB)
  }
}
