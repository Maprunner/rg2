/*global rg2:false */
/*global Proj4js:false */
(function () {

  function Worldfile(a, b, c, d, e, f) {
    // see http://en.wikipedia.org/wiki/World_file
    this.A = parseFloat(a);
    this.B = parseFloat(b);
    this.C = parseFloat(c);
    this.D = parseFloat(d);
    this.E = parseFloat(e);
    this.F = parseFloat(f);
    if ((a !== 0) && (b !== 0) && (c !== 0) && (d !== 0) && (e !== 0) && (f !== 0)) {
      this.valid = true;
      // helps make later calculations easier
      this.AEDB = (a * e) - (d * b);
      this.xCorrection = (b * f) - (e * c);
      this.yCorrection = (d * c) - (a * f);
    } else {
      this.valid = false;
      this.AEDB = 0;
      this.xCorrection = 0;
      this.yCorrection = 0;
    }
  }


  Worldfile.prototype = {

    Constructor : Worldfile,

    // use worldfile to generate X value
    getX : function (x, y) {
      return Math.round(((this.E * x) - (this.B * y) + this.xCorrection) / this.AEDB);
    },

    // use worldfile to generate y value
    getY : function (x, y) {
      return Math.round(((-1 * this.D * x) + (this.A * y) + this.yCorrection) / this.AEDB);
    }
  };

  function Georef(description, name, params) {
    this.description = description;
    this.name = name;
    this.params = params;
  }

  function Map(data) {
    if (data !== undefined) {
      // existing map from database
      this.mapid = data.mapid;
      this.name = data.name;
      // worldfile for GPS to map image conversion (for GPS files)
      this.worldfile = new rg2.Worldfile(data.A, data.B, data.C, data.D, data.E, data.F);
      // worldfile for local co-ords to map image conversion (for georeferenced courses)
      this.localworldfile = new Worldfile(data.localA, data.localB, data.localC, data.localD, data.localE, data.localF);
      if (data.mapfilename === undefined) {
        this.mapfilename = this.mapid + '.' + 'jpg';
      } else {
        this.mapfilename = data.mapfilename;
      }

    } else {
      // new map to be added
      this.mapid = 0;
      this.name = "";
      this.worldfile = new rg2.Worldfile(0, 0, 0, 0, 0, 0);
      this.localworldfile = new rg2.Worldfile(0, 0, 0, 0, 0, 0);
    }
    this.xpx = [];
    this.ypx = [];
    this.lat = [];
    this.lon = [];
  }


  rg2.Georef = Georef;
  rg2.Worldfile = Worldfile;
  rg2.Map = Map;
}());
