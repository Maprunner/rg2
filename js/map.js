/*global rg2:false */
/*global rg2Config:false */
(function () {
  function Georef(description, name, params) {
    this.description = description;
    this.name = name;
    this.params = params;
  }

  function Georefs() {
    this.georefsystems = [];
    this.georefsystems.push(new Georef("Not georeferenced", "none", ""));
    this.georefsystems.push(new Georef("GB National Grid", "EPSG:27700", "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs"));
    this.georefsystems.push(new Georef("Google EPSG:900913", "EPSG:900913", "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs"));
    if (rg2Config.epsg_code !== undefined) {
      this.georefsystems.push(new Georef(rg2Config.epsg_code, rg2Config.epsg_code.replace(" ", ""), rg2Config.epsg_params));
      this.defaultGeorefVal = rg2Config.epsg_code.replace(" ", "");
    } else {
      this.defaultGeorefVal = "EPSG:27700";
    }
  }

  Georefs.prototype = {
    Constructor : Georefs,

    getDefault : function () {
      return this.defaultGeorefVal;
    },

    getDropdown : function (dropdown) {
      var i;
      for (i = 0; i < this.georefsystems.length; i += 1) {
        dropdown.options.add(rg2.utils.generateOption(this.georefsystems[i].name, this.georefsystems[i].description));
      }
      return dropdown;
    },

    getParams : function (name) {
      var i, params;
      params = "";
      for (i = 0; i < this.georefsystems.length; i += 1) {
        if (this.georefsystems[i].name === name) {
          return this.georefsystems[i].params;
        }
      }
      return params;
    }
  };

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

  function Map(data) {
    if (data !== undefined) {
      // existing map from database
      this.mapid = data.mapid;
      this.name = data.name;
      // worldfile for GPS to map image conversion (for GPS files)
      this.worldfile = new Worldfile(data.A, data.B, data.C, data.D, data.E, data.F);
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
      this.worldfile = new Worldfile(0, 0, 0, 0, 0, 0);
      this.localworldfile = new Worldfile(0, 0, 0, 0, 0, 0);
    }
    this.xpx = [];
    this.ypx = [];
    this.lat = [];
    this.lon = [];
  }
  rg2.Georefs = Georefs;
  rg2.Worldfile = Worldfile;
  rg2.Map = Map;
}());
