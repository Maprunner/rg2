function GPSTrack() {
	this.lat = [];
	this.lon = [];
	this.time = [];
	this.baseX = [];
	this.baseY = [];
	this.fileLoaded = false;
	this.routeData = new RouteData();
}

GPSTrack.prototype = {

	Constructor : GPSTrack,

	initialiseGPS : function() {
		this.lat.length = 0;
		this.lon.length = 0;
		this.time.length = 0;
		this.baseX.length = 0;
		this.baseY.length = 0;
		this.fileLoaded = false;
	},

	uploadGPS : function(evt) {
		//console.log ("File" + evt.target.files[0].name);
		var reader = new FileReader();

		reader.onerror = function(evt) {
			switch(evt.target.error.code) {
				case evt.target.error.NOT_FOUND_ERR:
					alert('File not found');
					break;
				case evt.target.error.NOT_READABLE_ERR:
					alert('File not readable');
					break;
				default:
					alert('An error occurred reading the file.');
			}
		};

		var self = this;

		reader.onload = function(evt) {
			var trksegs;
			var trkpts;
			var xml;
			var i;
			var j;
			var timestring;
			xml = $.parseXML(evt.target.result);
			trksegs = xml.getElementsByTagName('trkseg');
			for ( i = 0; i < trksegs.length; i++) {
				trkpts = trksegs[i].getElementsByTagName('trkpt');
				for ( j = 0; j < trkpts.length; j++) {
					self.lat.push(trkpts[j].getAttribute('lat'));
					self.lon.push(trkpts[j].getAttribute('lon'));
					timestring = trkpts[j].childNodes[3].textContent;
					self.time.push(self.getSecsFromTrackpoint(timestring));
				}
			}
			self.processGPSTrack();
			$("#rg2-load-gps-file").button('disable');
			console.log("File loaded");
		};

		// read the selected file
		reader.readAsText(evt.target.files[0]);

	},

	getSecsFromTrackpoint : function(timestring) {
		// input is 2013-12-03T12:34:56Z
		var hrs = parseInt(timestring.substr(11, 2), 10);
		var mins = parseInt(timestring.substr(14, 2), 10);
		var secs = parseInt(timestring.substr(17, 2), 10);
		return (hrs * 3600) + (mins * 60) + secs;
	},

	processGPSTrack : function() {
		var x;
		var y;

		if (rg2.mapIsGeoreferenced()) {
			// translate lat/lon to x,y based on world file info: see http://en.wikipedia.org/wiki/World_file
			var w = rg2.getWorldFile();
			// simplify calculation a little
			var AEDB = (w.A * w.E) - (w.D * w.B);
			var xCorrection = (w.B * w.F) - (w.E * w.C);
			var yCorrection = (w.D * w.C) - (w.A * w.F);
			var i;
			for ( i = 0; i < this.lat.length; i++) {
				this.routeData.x[i] = Math.round(((w.E * this.lon[i]) - (w.B * this.lat[i]) + xCorrection) / AEDB);
				this.routeData.y[i] = Math.round(((-1 * w.D * this.lon[i]) + (w.A * this.lat[i]) + yCorrection) / AEDB);
			}
			// find bounding box for track
			var minX = this.routeData.x[0];
			var maxX = this.routeData.x[0];
			var minY = this.routeData.y[0];
			var maxY = this.routeData.y[0];

			for ( i = 1; i < this.routeData.x.length; i++) {
				maxX = Math.max(maxX, this.routeData.x[i]);
				maxY = Math.max(maxY, this.routeData.y[i]);
				minX = Math.min(minX, this.routeData.x[i]);
				minY = Math.min(minY, this.routeData.y[i]);
			}
			// check we are somewhere on the map
			if ((maxX < 0) || (minX > map.width) || (minY > map.height) || (maxY < 0)) {
				// warn and fit to track
				var msg = "<div id='GPS-problem-dialog'>Your GPS file does not match the map co-ordinates. Please check you have selected the correct file.</div>";
				$(msg).dialog({
					title : "GPS file problem"
				});
				this.fitTrackInsideCourse();

			}
		} else {
			this.fitTrackInsideCourse();
		}
		this.baseX = this.routeData.x.slice(0);
		this.baseY = this.routeData.y.slice(0);
		this.routeData.time = this.time;
		this.fileLoaded = true;
		$("#btn-save-gps-route").button("enable");
		rg2.redraw(false);
	},

	fitTrackInsideCourse : function() {
		// fit track to within limits of course
		// find bounding box for track
		var maxLat = this.lat[0];
		var maxLon = this.lon[0];
		var minLat = this.lat[0];
		var minLon = this.lon[0];
		var x;
		var y;
		for (var i = 1; i < this.lat.length; i++) {
			maxLat = Math.max(maxLat, this.lat[i]);
			maxLon = Math.max(maxLon, this.lon[i]);
			minLat = Math.min(minLat, this.lat[i]);
			minLon = Math.min(minLon, this.lon[i]);
			x = this.lon[i] - this.lon[0];
			y = this.lat[i] - this.lat[0];
		}

		var controlx = rg2.getControlX();
		var controly = rg2.getControlY();

		// find bounding box for course
		var minControlX = controlx[0];
		var maxControlX = controlx[0];
		var minControlY = controly[0];
		var maxControlY = controly[0];

		for ( i = 1; i < controlx.length; i++) {
			maxControlX = Math.max(maxControlX, controlx[i]);
			maxControlY = Math.max(maxControlY, controly[i]);
			minControlX = Math.min(minControlX, controlx[i]);
			minControlY = Math.min(minControlY, controly[i]);
		}
		//console.log (minControlX, maxControlX, minControlY, maxControlY);

		// scale GPS track to within bounding box of controls: a reasonable start
		var scaleX = (maxControlX - minControlX) / (maxLon - minLon);
		var scaleY = (maxControlY - minControlY) / (maxLat - minLat);
		var lonCorrection = getLatLonDistance(minLat, maxLon, minLat, minLon) / (maxLon - minLon);
		var latCorrection = getLatLonDistance(minLat, minLon, maxLat, minLon) / (maxLat - minLat);

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
		var deltaX = minControlX - (this.routeData.x[0] - controlx[0]);
		var deltaY = minControlY - (this.routeData.y[0] - controly[0]);

		for ( i = 0; i < this.lat.length; i++) {
			this.routeData.x[i] = ((this.lon[i] - minLon) * scaleX) + deltaX;
			this.routeData.y[i] = (-1 * (this.lat[i] - maxLat) * scaleY) + deltaY;
		}

	},
};