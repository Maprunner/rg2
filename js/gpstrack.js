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
    this.savedHandles = [];
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
      this.savedHandles.length = 0;
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
      var minX, maxX, minY, maxY, i, w, AEDB, xCorrection, yCorrection, mapSize;
      if (rg2.events.mapIsGeoreferenced()) {
        // translate lat/lon to x,y based on world file info: see http://en.wikipedia.org/wiki/World_file
        w = rg2.events.getWorldFile();
        // simplify calculation a little
        AEDB = (w.A * w.E) - (w.D * w.B);
        xCorrection = (w.B * w.F) - (w.E * w.C);
        yCorrection = (w.D * w.C) - (w.A * w.F);
        for (i = 0; i < this.lat.length; i += 1) {
          this.routeData.x[i] = Math.round(((w.E * this.lon[i]) - (w.B * this.lat[i]) + xCorrection) / AEDB);
          this.routeData.y[i] = Math.round(((-1 * w.D * this.lon[i]) + (w.A * this.lat[i]) + yCorrection) / AEDB);
        }
        // find bounding box for track
        minX = Math.min.apply(Math, this.routeData.x);
        maxX = Math.max.apply(Math, this.routeData.x);
        minY = Math.min.apply(Math, this.routeData.y);
        maxY = Math.max.apply(Math, this.routeData.y);

        // check we are somewhere on the map
        mapSize = rg2.getMapSize();
        if ((maxX < 0) || (minX > mapSize.width) || (minY > mapSize.height) || (maxY < 0)) {
          // warn and fit to track
          rg2.utils.showWarningDialog('GPS file problem', 'Your GPS file does not match the map co-ordinates. Please check you have selected the correct file.');
          this.fitTrackInsideCourse();

        } else {
          // everything OK so lock background to avoid accidental adjustment
          $('#btn-move-all').prop('checked', true);
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

    addStartAndFinishHandles : function () {
      // add handles at start and finish of route: will always be index 0 and 1
      this.handles.addHandle(this.baseX[0], this.baseY[0], 0);
      this.handles.addHandle(this.baseX[this.baseX.length - 1], this.baseY[this.baseY.length - 1], this.baseY.length - 1);
    },

    fitTrackInsideCourse : function () {
      // fit track to within limits of course
      // find bounding box for track
      var maxLat, maxLon, minLat, minLon, minControlX, maxControlX, minControlY, maxControlY, size, i, controlx, controly, scaleX, scaleY, lonCorrection, latCorrection, deltaX, deltaY;
      maxLat = Math.max.apply(Math, this.lat);
      maxLon = Math.max.apply(Math, this.lon);
      minLat = Math.min.apply(Math, this.lat);
      minLon = Math.min.apply(Math, this.lon);
      controlx = rg2.drawing.getControlX();
      controly = rg2.drawing.getControlY();

      minControlX = Math.min.apply(Math, controlx);
      maxControlX = Math.max.apply(Math, controlx);
      minControlY = Math.min.apply(Math, controly);
      maxControlY = Math.max.apply(Math, controly);

      // issue #60: allow for no controls or just a few in a small area
      // 100 is an arbitrary but sensible cut-off
      if (((maxControlY - minControlY) < 100) || ((maxControlX - minControlX) < 100)) {
        minControlX = 0;
        minControlY = 0;
        size = rg2.getMapSize();
        maxControlX = size.width;
        maxControlY = size.height;
      }

      //console.log (minControlX, maxControlX, minControlY, maxControlY);

      // scale GPS track to within bounding box of controls: a reasonable start
      scaleX = (maxControlX - minControlX) / (maxLon - minLon);
      scaleY = (maxControlY - minControlY) / (maxLat - minLat);
      lonCorrection = rg2.utils.getLatLonDistance(minLat, maxLon, minLat, minLon) / (maxLon - minLon);
      latCorrection = rg2.utils.getLatLonDistance(minLat, minLon, maxLat, minLon) / (maxLat - minLat);

      // don't want to skew track so scale needs to be equal in each direction
      // so we need to account for differences between a degree of latitude and longitude
      if (scaleX > scaleY) {
        // pix/lat = pix/lon * m/lat * lon/m
        scaleY = scaleX * latCorrection / lonCorrection;
      } else {
        // pix/lon = pix/lat * m/lon * lat/m
        scaleX = scaleY * lonCorrection / latCorrection;
      }
      // extra offset to put start of track at start location
      this.routeData.x[0] = ((this.lon[0] - minLon) * scaleX) + minControlX;
      this.routeData.y[0] = (-1 * (this.lat[0] - maxLat) * scaleY) + minControlY;

      // translate lat/lon to x,y
      deltaX = minControlX - (this.routeData.x[0] - controlx[0]);
      deltaY = minControlY - (this.routeData.y[0] - controly[0]);

      for (i = 0; i < this.lat.length; i += 1) {
        this.routeData.x[i] = ((this.lon[i] - minLon) * scaleX) + deltaX;
        this.routeData.y[i] = (-1 * (this.lat[i] - maxLat) * scaleY) + deltaY;
      }
    }
  };
  rg2.GPSTrack = GPSTrack;
}());