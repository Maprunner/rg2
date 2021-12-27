
(function () {
  function GPSTrack() {
    this.lat = [];
    this.lon = [];
    this.startOffset = 0;
    this.baseX = [];
    this.baseY = [];
    this.handles = new rg2.Handles();
    this.savedBaseX = [];
    this.savedBaseY = [];
    this.fileLoaded = false;
    this.fileName = "";
    this.fileType = "";
    this.routeData = new rg2.RouteData();
    this.xml = "";
    this.autofitOffset = null;
  }


  GPSTrack.prototype = {

    Constructor : GPSTrack,

    initialiseGPS : function () {
      this.lat.length = 0;
      this.lon.length = 0;
      this.startOffset = 0;
      this.baseX.length = 0;
      this.baseY.length = 0;
      this.handles.deleteAllHandles();
      this.savedBaseX.length = 0;
      this.savedBaseY.length = 0;
      this.fileLoaded = false;
      this.routeData.x.length = 0;
      this.routeData.y.length = 0;
      this.routeData.time.length = 0;
    },

    uploadGPS : function (evt) {
      //console.log ("File" + evt.target.files[0].name);
      var reader, self;
      reader = new FileReader();
      this.fileName = evt.target.files[0].name;

      reader.onerror = function () {
        rg2.utils.showWarningDialog('GPS file problem', 'Unable to open GPS file.');
      };
      self = this;
      reader.onload = function (evt) {
        try {
          self.fileType = self.fileName.slice(-3).toLowerCase();
          if ((self.fileType !== 'gpx') && (self.fileType !== 'tcx')) {
            rg2.utils.showWarningDialog('GPS file problem', 'File type not recognised. Please check you have selected the correct file.');
            return;
          }
          $("#rg2-load-gps-file").button('disable');
          self.xml = $.parseXML(evt.target.result);
          self.processGPSFile();
        } catch (err) {
          rg2.utils.showWarningDialog('GPS file problem', 'File is not valid XML. Please check you have selected the correct file.');
          return;
        }
      };
      // read the selected file
      reader.readAsText(evt.target.files[0]);
    },

    processGPSFile : function () {
      this.initialiseGPS();
      if (this.fileType === "gpx") {
        this.processGPX();
      } else {
        this.processTCX();
      }
      this.processGPSTrack();
    },

    processGPX : function () {
      var trksegs, trkpts, i, j, lat, lon;
      trksegs = this.xml.getElementsByTagName('trkseg');
      for (i = 0; i < trksegs.length; i += 1) {
        trkpts = trksegs[i].getElementsByTagName('trkpt');
        this.startOffset = this.getStartOffset(trkpts[0].getElementsByTagName('time')[0].textContent);
        // #319 allow for GPS files with (lat 0, lon 0)
        for (j = 0; j < trkpts.length; j += 1) {
          lat = trkpts[j].getAttribute('lat');
          lon = trkpts[j].getAttribute('lon');
        // getAttribute returns strings
          if ((lat !== "0") && (lon !== "0")) {
            this.lat.push(lat);
            this.lon.push(lon);
            this.routeData.time.push(this.getSecsFromTrackpoint(trkpts[j].getElementsByTagName('time')[0].textContent));
          }
        }
      }
    },

    processTCX : function () {
      var trksegs, trkpts, i, j, position, lat, lon;
      trksegs = this.xml.getElementsByTagName('Track');
      for (i = 0; i < trksegs.length; i += 1) {
        trkpts = trksegs[i].getElementsByTagName('Trackpoint');
        this.startOffset = this.getStartOffset(trkpts[0].getElementsByTagName('Time')[0].textContent);
        for (j = 0; j < trkpts.length; j += 1) {
          // allow for <trackpoint> with no position: see #199
          if (trkpts[j].getElementsByTagName('Position').length > 0) {
            position = trkpts[j].getElementsByTagName('Position');
            // #319 allow for GPS files with (lat 0, lon 0)
            lat = position[0].getElementsByTagName('LatitudeDegrees')[0].textContent;
            lon = position[0].getElementsByTagName('LongitudeDegrees')[0].textContent;
            // textContent returns strings
            if ((lat !== "0") && (lon !== "0")) {
              this.lat.push(lat);
              this.lon.push(lon);
              this.routeData.time.push(this.getSecsFromTrackpoint(trkpts[j].getElementsByTagName('Time')[0].textContent));
            }
          }
        }
      }
    },

    getStartOffset : function (timestring) {
      var secs;
      // needs to be set to midnight for supplied timestring
      // input is 2013-12-03T12:34:56Z (or 56.000Z)
      secs = parseInt(Date.parse(timestring.substr(0, 11) + "00:00:00Z") / 1000, 10);
      if (isNaN(secs)) {
        return 0;
      }
      return secs;
    },

    getSecsFromTrackpoint : function (timestring) {
      var secs;
      // input is 2013-12-03T12:34:56Z (or 56.000Z)
      // needs to offset from midnight to allow replays, and alos needs to handle date (and year!) rollover
      secs = parseInt(Date.parse(timestring) / 1000, 10);
      if (isNaN(secs)) {
        return 0;
      }
      return secs - this.startOffset;
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
      // finished with lat and lon so they can go just in case
      this.lat.length = 0;
      this.lon.length = 0;
      this.expandToOneSecondInterval();
      this.baseX = this.routeData.x.slice(0);
      this.baseY = this.routeData.y.slice(0);
      this.addStartAndFinishHandles();
      this.fileLoaded = true;
      // need more than a start and finish to autofit
      if (this.routeData.splits.length > 2) {
        $("#btn-autofit-gps").button("enable");
      }
      $("#btn-save-gps-route").button("enable");
      rg2.redraw(false);
    },

    adjustOffset : function (offset) {
      this.autofitOffset = offset;
      this.processGPSFile();
      this.autofitTrack();
    },


    expandToOneSecondInterval : function () {
      // convert to one second intervals to make what follows a bit easier since we can index x and y directly
      // time from GPX has already been converted to integer seconds so we don't need to worry about sub-seconds in the expansion
      // gets reset to 3 second intervals on server when saved
      var i, x, y, time, oldtime, nexttime, oldx, oldy, difftime, xpersec, ypersec, trk, secs;
      x = [];
      y = [];
      time = [];
      trk = this.routeData;
      oldtime = trk.time[0];
      oldx = trk.x[0];
      oldy = trk.y[0];
      x[0] = oldx;
      y[0] = oldy;
      time[0] = trk.time[0];
      nexttime = time[0] + 1;
      for (i = 1; i < trk.x.length; i += 1) {
        difftime = trk.time[i] - oldtime;
        // shouldn't have 0 intervals, but discard them if we do
        if (difftime > 0) {
          xpersec = (trk.x[i] - oldx) / difftime;
          ypersec = (trk.y[i] - oldy) / difftime;
          secs = 1;
          while (secs <= difftime) {
            x.push(oldx + (xpersec * secs));
            y.push(oldy + (ypersec * secs));
            //
            time.push(nexttime);
            nexttime += 1;
            secs += 1;
          }
          oldx = trk.x[i];
          oldy = trk.y[i];
          oldtime = nexttime - 1;
        }
      }
      this.routeData.x = x.slice(0);
      this.routeData.y = y.slice(0);
      this.routeData.time = time.slice(0);
    },

    autofitTrack : function () {
      // fits a GPS track to the course based on split times at control locations
      var i, split;
      // unlock map to allow adjustment
      $('#btn-move-all').prop('checked', false);
      this.handles.deleteAllHandles();
      this.addStartAndFinishHandles();
      if (this.autofitOffset === null) {
        this.autofitOffset = this.getOffset();
        rg2.ui.setAutofitSpinner(this.autofitOffset);
      }
      // adjust for each control in turn
      for (i = 1; i < (this.routeData.splits.length - 1); i += 1) {
        // don't try to adjust missing controls
        if (this.routeData.splits[i] !== this.routeData.splits[i - 1]) {
          split = this.routeData.splits[i] + this.autofitOffset;
          // move track to control location
          if ((split < this.baseX.length) && (split >= 0)) {
            // add handle at control on track
            this.handles.addHandle(this.routeData.x[split], this.routeData.y[split], split);
            // drag handle to correct place on map
            rg2.drawing.adjustTrack({x: this.routeData.x[split], y: this.routeData.y[split]}, {x: this.routeData.controlx[i], y: this.routeData.controly[i]});
            // lock handle at control
            this.handles.lockHandleByTime(split);
            // rebaseline everything
            this.baseX = this.routeData.x.slice(0);
            this.baseY = this.routeData.y.slice(0);
            this.handles.rebaselineXY();
          }
        }
      }
      $("#btn-autofit-gps").button("disable");
      $("#btn-undo-gps-adjust").button("disable");
      rg2.redraw(false);
    },

    getOffset : function () {
      // calculates an offset to split times based on lowest average speed summed across all controls
      var i, j, split, speedAverage, speedAtControl, speedExtract, range, bestGuess, offset;
      speedAverage = this.getSpeedAverage();
      speedAtControl = [];
      // range of seconds either side to check for "minimum speed" at control
      range = 10;
      for (i = 0; i <= (2 * range); i += 1) {
        speedAtControl[i] = 0;
      }
      // read through each control
      for (i = 1; i < (this.routeData.splits.length - 1); i += 1) {
        split = this.routeData.splits[i];
        // ignore missing splits
        if (split !== this.routeData.splits[i - 1]) {
          // avoid edge cases near start and finish
          if ((split >= range) && ((split + range) < speedAverage.length)) {
            speedExtract = speedAverage.slice(split - range, split + range + 1);
          }
          for (j = 0; j <= (2 * range); j += 1) {
            speedAtControl[j] += speedExtract[j];
          }
        }
      }
      bestGuess = 0;
      for (i = 1; i < speedAtControl.length; i += 1) {
        if (speedAtControl[i] < speedAtControl[bestGuess]) {
          bestGuess = i;
        }
      }
      // convert index in bestGuess into offset in x, y, time
      offset = bestGuess - range;
      //console.log("Offset = " + offset);
      return offset;
    },

    getSpeedAverage : function () {
      // returns an array showing average speed for each second of the run
      var i, speed, speedAverage;
      speed = [];
      speedAverage = [];
      speed[0] = 0;
      for (i = 1; i < this.routeData.x.length; i += 1) {
        // stored at second intervals so don't need to divide by time'
        speed[i] = rg2.utils.getDistanceBetweenPoints(this.routeData.x[i], this.routeData.y[i], this.routeData.x[i - 1], this.routeData.y[i - 1]);
      }
      // average over 3 seconds to smooth things out
      for (i = 1; i < this.routeData.x.length - 1; i += 1) {
        speedAverage[i] = (speed[i - 1] + speed[i] + speed[i + 1]) / 3;
      }
      // not really worried about these but set to a sensible value
      speedAverage[0] = speed[0];
      speedAverage[this.routeData.x.length - 1] = speed[this.routeData.x.length - 1];
      return speedAverage;
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
      // add handles at start and finish of route
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
