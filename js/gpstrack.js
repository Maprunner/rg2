/*global rg2:false */
(function () {
  function GPSTrack() {
    this.lat = [];
    this.lon = [];
    this.time = [];
    this.baseX = [];
    this.baseY = [];
    this.handles = new rg2.Handles();
    this.savedBaseX = [];
    this.savedBaseY = [];
    this.fileLoaded = false;
    this.fileName = '';
    this.routeData = new rg2.RouteData();
  }


  GPSTrack.prototype = {

    Constructor : GPSTrack,

    initialiseGPS : function () {
      this.lat.length = 0;
      this.lon.length = 0;
      this.time.length = 0;
      this.baseX.length = 0;
      this.baseY.length = 0;
      this.handles.deleteAllHandles();
      this.savedBaseX.length = 0;
      this.savedBaseY.length = 0;
      this.fileLoaded = false;
    },

    uploadGPS : function (evt) {
      //console.log ("File" + evt.target.files[0].name);
      var reader, self, xml, fileType;
      reader = new FileReader();
      this.fileName = evt.target.files[0].name;

      reader.onerror = function () {
        rg2.utils.showWarningDialog('GPS file problem', 'Unable to open GPS file.');
      };
      self = this;
      reader.onload = function (evt) {
        fileType = self.fileName.slice(-3).toLowerCase();
        if ((fileType !== 'gpx') && (fileType !== 'tcx')) {
          rg2.utils.showWarningDialog('GPS file problem', 'File type not recognised. Please check you have selected the correct file.');
          return;
        }
        try {
          xml = $.parseXML(evt.target.result);
          if (fileType === "gpx") {
            self.processGPX(xml);
          } else {
            self.processTCX(xml);
          }
          self.processGPSTrack();
        } catch (err) {
          rg2.utils.showWarningDialog('GPS file problem', 'File is not valid XML. Please check you have selected the correct file.');
          return;
        }
        $("#rg2-load-gps-file").button('disable');
      };

      // read the selected file
      reader.readAsText(evt.target.files[0]);

    },

    processGPX : function (xml) {
      var trksegs, trkpts, i, j;
      trksegs = xml.getElementsByTagName('trkseg');
      for (i = 0; i < trksegs.length; i += 1) {
        trkpts = trksegs[i].getElementsByTagName('trkpt');
        for (j = 0; j < trkpts.length; j += 1) {
          this.lat.push(trkpts[j].getAttribute('lat'));
          this.lon.push(trkpts[j].getAttribute('lon'));
          this.time.push(this.getSecsFromTrackpoint(trkpts[j].getElementsByTagName('time')[0].textContent));
        }
      }
    },

    processTCX : function (xml) {
      var trksegs, trkpts, i, j, len, position;
      trksegs = xml.getElementsByTagName('Track');
      for (i = 0; i < trksegs.length; i += 1) {
        trkpts = trksegs[i].getElementsByTagName('Trackpoint');
        len = trkpts.length;
        for (j = 0; j < len; j += 1) {
          // allow for <trackpoint> with no position: see #199
          if (trkpts[j].getElementsByTagName('Position').length > 0) {
            position = trkpts[j].getElementsByTagName('Position');
            this.lat.push(position[0].getElementsByTagName('LatitudeDegrees')[0].textContent);
            this.lon.push(position[0].getElementsByTagName('LongitudeDegrees')[0].textContent);
            this.time.push(this.getSecsFromTrackpoint(trkpts[j].getElementsByTagName('Time')[0].textContent));
          }
        }
      }
    },

    getSecsFromTrackpoint : function (timestring) {
      var secs;
      // input is 2013-12-03T12:34:56Z (or 56.000Z)
      secs = (parseInt(timestring.substr(11, 2), 10) * 3600) + (parseInt(timestring.substr(14, 2), 10) * 60) + parseInt(timestring.substr(17, 2), 10);
      if (isNaN(secs)) {
        return 0;
      }
      return secs;
    },

    processGPSTrack : function () {
      if (rg2.events.mapIsGeoreferenced()) {
        this.applyWorldFile();
        if (this.trackMatchesMapCoordinates()) {
          // everything OK so lock background to avoid accidental adjustment
          $('#btn-move-all').prop('checked', true);
        } else {
          // warn and fit to track
          rg2.utils.showWarningDialog('GPS file problem', 'Your GPS file does not match the map co-ordinates. Please check you have selected the correct file.');
          this.fitTrackInsideCourse();
        }
      } else {
        this.fitTrackInsideCourse();
      }
      this.baseX = this.routeData.x.slice(0);
      this.baseY = this.routeData.y.slice(0);
      this.addStartAndFinishHandles();
      this.routeData.time = this.time;
      this.fileLoaded = true;
      $("#btn-save-gps-route").button("enable");
      rg2.redraw(false);
    },

    trackMatchesMapCoordinates : function () {
      var minX, maxX, minY, maxY, mapSize;
      // find bounding box for track
      minX = Math.min.apply(Math, this.routeData.x);
      maxX = Math.max.apply(Math, this.routeData.x);
      minY = Math.min.apply(Math, this.routeData.y);
      maxY = Math.max.apply(Math, this.routeData.y);
      mapSize = rg2.getMapSize();
      // check we are somewhere on the map
      return ((maxX > 0) && (minX < mapSize.width) && (minY < mapSize.height) && (maxY > 0));
    },

    applyWorldFile : function () {
      var i, worldFile;
      // translate lat/lon to x,y based on world file info: see http://en.wikipedia.org/wiki/World_file
      worldFile = rg2.events.getWorldFile();
      for (i = 0; i < this.lat.length; i += 1) {
        this.routeData.x[i] = Math.round(((worldFile.E * this.lon[i]) - (worldFile.B * this.lat[i]) + worldFile.xCorrection) / worldFile.AEDB);
        this.routeData.y[i] = Math.round(((-1 * worldFile.D * this.lon[i]) + (worldFile.A * this.lat[i]) + worldFile.yCorrection) / worldFile.AEDB);
      }
    },

    addStartAndFinishHandles : function () {
      // add handles at start and finish of route: will always be index 0 and 1
      this.handles.addHandle(this.baseX[0], this.baseY[0], 0);
      this.handles.addHandle(this.baseX[this.baseX.length - 1], this.baseY[this.baseY.length - 1], this.baseY.length - 1);
    },

    fitTrackInsideCourse : function () {
      // fit track to within limits of course
      // find bounding box for track
      var i, latLon, controlXY, scaleX, scaleY, deltaX, deltaY;
      latLon = this.getLatLonInfo();
      controlXY = this.getControlInfo();

      // scale GPS track to within bounding box of controls: a reasonable start
      scaleX = (controlXY.maxX - controlXY.minX) / (latLon.maxLon - latLon.minLon);
      scaleY = (controlXY.maxY - controlXY.minY) / (latLon.maxLat - latLon.minLat);
      // don't want to skew track so scale needs to be equal in each direction
      // so we need to account for differences between a degree of latitude and longitude
      if (scaleX > scaleY) {
        // pix/lat = pix/lon * m/lat * lon/m
        scaleY = scaleX * latLon.latCorrection / latLon.lonCorrection;
      } else {
        // pix/lon = pix/lat * m/lon * lat/m
        scaleX = scaleY * latLon.lonCorrection / latLon.latCorrection;
      }
      // extra offset to put start of track at start location
      this.routeData.x[0] = ((this.lon[0] - latLon.minLon) * scaleX) + controlXY.minX;
      this.routeData.y[0] = (-1 * (this.lat[0] - latLon.maxLat) * scaleY) + controlXY.minY;

      // translate lat/lon to x,y
      deltaX = controlXY.minX - (this.routeData.x[0] - controlXY.x[0]);
      deltaY = controlXY.minY - (this.routeData.y[0] - controlXY.y[0]);

      for (i = 0; i < this.lat.length; i += 1) {
        this.routeData.x[i] = ((this.lon[i] - latLon.minLon) * scaleX) + deltaX;
        this.routeData.y[i] = (-1 * (this.lat[i] - latLon.maxLat) * scaleY) + deltaY;
      }
    },

    getLatLonInfo : function () {
      var latLon;
      latLon = {};
      latLon.maxLat = Math.max.apply(Math, this.lat);
      latLon.maxLon = Math.max.apply(Math, this.lon);
      latLon.minLat = Math.min.apply(Math, this.lat);
      latLon.minLon = Math.min.apply(Math, this.lon);
      latLon.lonCorrection = rg2.utils.getLatLonDistance(latLon.minLat, latLon.maxLon, latLon.minLat, latLon.minLon) / (latLon.maxLon - latLon.minLon);
      latLon.latCorrection = rg2.utils.getLatLonDistance(latLon.minLat, latLon.minLon, latLon.maxLat, latLon.minLon) / (latLon.maxLat - latLon.minLat);
      return latLon;
    },

    getControlInfo : function () {
      var controlXY, size;
      controlXY = rg2.drawing.getControlXY();
      controlXY.minX = Math.min.apply(Math, controlXY.x);
      controlXY.maxX = Math.max.apply(Math, controlXY.x);
      controlXY.minY = Math.min.apply(Math, controlXY.y);
      controlXY.maxY = Math.max.apply(Math, controlXY.y);

      // issue #60: allow for no controls or just a few in a small area
      // 100 is an arbitrary but sensible cut-off
      if (((controlXY.maxY - controlXY.minY) < 100) || ((controlXY.maxX - controlXY.minX) < 100)) {
        controlXY.minX = 0;
        controlXY.minY = 0;
        size = rg2.getMapSize();
        controlXY.maxX = size.width;
        controlXY.maxY = size.height;
      }
      //console.log (minControlX, maxControlX, minControlY, maxControlY);
      return controlXY;
    }
  };
  rg2.GPSTrack = GPSTrack;
}());