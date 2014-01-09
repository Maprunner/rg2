$("#rg2-load-jgw-file").button().change(function(evt) {
	// read the selected file
	readJGW(evt);
});

function readJGW(evt) {

	var reader = new FileReader();

	reader.readAsText(evt.target.files[0]);

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

	reader.onload = function(evt) {
		// see http://en.wikipedia.org/wiki/World_file
		// read JGW world file
		var txt = evt.target.result;
		var args = txt.split(/[\r\n]+/g);

		// image file size
		var pxWidth = 1554;
		var pxHeight = 1140;

		var xScale = parseFloat(args[0]);
		var ySkew = parseFloat(args[1]);
		var xSkew = parseFloat(args[2]);
		var yScale = parseFloat(args[3]);

		var xos = [];
		var yos = [];
		var xpx = [];
		var ypx = [];

		// x0, y0 is top left
		xos[0] = parseFloat(args[4]);
		yos[0] = parseFloat(args[5]);
		xpx[0] = 0;
		ypx[0] = 0;

		// x1, y1 is bottom right
		xpx[1] = pxWidth;
		ypx[1] = pxHeight;
		xos[1] = (xScale * xpx[1]) + (xSkew * ypx[1]) + xos[0];
		yos[1] = (yScale * ypx[1]) + (ySkew * xpx[1]) + yos[0];

		// x2, y2 is top right
		xpx[2] = pxWidth;
		ypx[2] = 0;
		xos[2] = (xScale * xpx[2]) + (xSkew * ypx[2]) + xos[0];
		yos[2] = (yScale * ypx[2]) + (ySkew * xpx[2]) + yos[0];

		// x3, y3 is bottom left
		xpx[3] = 0;
		ypx[3] = pxHeight;
		xos[3] = (xScale * xpx[3]) + (xSkew * ypx[3]) + xos[0];
		yos[3] = (yScale * ypx[3]) + (ySkew * xpx[3]) + yos[0];

		// translate OS Grid ref to WGS84 (as in GPS file)
		var o;
		var osgb36 = [];
		var ct = [];
		var WGS84 = [];
		var i;
		for (i = 0; i < 4; i++) {
			o = new OsGridRef(parseInt(xos[i] + 0.5, 10), parseInt(yos[i] + 0.5, 10));
			osgb36[i] = o.osGridToLatLong(o);
			ct[i] = CoordTransform;
			WGS84[i] = ct[i].convertOSGB36toWGS84(osgb36[i]);
		}

		var hypot = getLatLonDistance(WGS84[0]._lat, WGS84[0]._lon, WGS84[2]._lat, WGS84[2]._lon);
		var adj = getLatLonDistance(WGS84[0]._lat, WGS84[0]._lon, WGS84[0]._lat, WGS84[2]._lon);
		var angle1 = Math.acos(adj / hypot);

		var hypot2 = getLatLonDistance(WGS84[2]._lat, WGS84[2]._lon, WGS84[1]._lat, WGS84[1]._lon);
		var adj2 = getLatLonDistance(WGS84[2]._lat, WGS84[2]._lon, WGS84[1]._lat, WGS84[2]._lon);
		var angle2 = Math.acos(adj2 / hypot2);

		var angle = (angle1 + angle2) / 2;

		var pixResX = (WGS84[2]._lon - WGS84[0]._lon) / pxWidth;
		var pixResY = (WGS84[2]._lat - WGS84[1]._lat) / pxHeight;

		var A = pixResX * Math.cos(angle);
		var D = pixResY * Math.sin(angle);
		var B = pixResX * Math.sin(angle);
		var E = -1 * pixResY * Math.cos(angle);
		var C = WGS84[0]._lon;
		var F = WGS84[0]._lat;

		var newx = [];
		var newy = [];

		for ( i = 0; i < 4; i++) {
			newx[i] = Math.round(((E * WGS84[i]._lon) - (B * WGS84[i]._lat) + (B * F) - (E * C)) / ((A * E) - (D * B)));
			console.log("X: " + xpx[i] + " becomes " + WGS84[i]._lon + " becomes " + newx[i]);
			newy[i] = Math.round(((-1 * D * WGS84[i]._lon) + (A * WGS84[i]._lat) + (D * C) - (A * F)) / ((A * E) - (D * B)));
			console.log("Y: " + ypx[i] + " becomes " + WGS84[i]._lat + " becomes " + newy[i]);
		}

		// UK National Grid
		Proj4js.defs["EPSG:27700"] = "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs ";
		var EPSG27700 = new Proj4js.Proj("EPSG:27700");
		// WGS84
		var EPSG4326 = new Proj4js.Proj("EPSG:4326");
		var p = [];

		for ( i = 0; i < 4; i++) {
			p[i] = new pt(xos[i], yos[i]);
			Proj4js.transform(EPSG27700, EPSG4326, p[i]);
		}

	};

}

function pt(x, y) {
	this.x = x;
	this.y = y;
}

function getLatLonDistance(lat1, lon1, lat2, lon2) {
	// Haversine formula (http://www.codecodex.com/wiki/Calculate_distance_between_two_points_on_a_globe)
	var x = lat2 - lat1;
	var dLat = x.toRad();
	var y = lon2 - lon1;
	var dLon = y.toRad();
	var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1).toRad()) * Math.cos((lat2.toRad())) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	// multiply by IUUG earth mean radius (http://en.wikipedia.org/wiki/Earth_radius) in metres
	return 6371009 * c;
}

function getAngle(x1, y1, x2, y2) {
	var angle = Math.atan2((y2 - y1), (x2 - x1));
	if (angle < 0) {
		angle = angle + (2 * Math.PI);
	}
	return angle;
}

function OsGridRef(easting, northing) {
	this.easting = parseInt(easting, 10);
	this.northing = parseInt(northing, 10);
}

OsGridRef.prototype = {

	Constructor : OsGridRef,
	/**
	 * Convert Ordnance Survey grid reference easting/northing coordinate to (OSGB36) latitude/longitude
	 *
	 * @param {OsGridRef} easting/northing to be converted to latitude/longitude
	 * @return {LatLon} latitude/longitude (in OSGB36) of supplied grid reference
	 */
	osGridToLatLong : function(gridref) {
		var E = gridref.easting;
		var N = gridref.northing;

		var a = 6377563.396, b = 6356256.910;
		// Airy 1830 major & minor semi-axes
		var F0 = 0.9996012717;
		// NatGrid scale factor on central meridian
		var lat0 = 49 * Math.PI / 180, lon0 = -2 * Math.PI / 180;
		// NatGrid true origin
		var N0 = -100000, E0 = 400000;
		// northing & easting of true origin, metres
		var e2 = 1 - (b * b) / (a * a);
		// eccentricity squared
		var n = (a - b) / (a + b), n2 = n * n, n3 = n * n * n;

		var lat = lat0, M = 0;
		do {
			lat = (N - N0 - M) / (a * F0) + lat;

			var Ma = (1 + n + (5 / 4) * n2 + (5 / 4) * n3) * (lat - lat0);
			var Mb = (3 * n + 3 * n * n + (21 / 8) * n3) * Math.sin(lat - lat0) * Math.cos(lat + lat0);
			var Mc = ((15 / 8) * n2 + (15 / 8) * n3) * Math.sin(2 * (lat - lat0)) * Math.cos(2 * (lat + lat0));
			var Md = (35 / 24) * n3 * Math.sin(3 * (lat - lat0)) * Math.cos(3 * (lat + lat0));
			M = b * F0 * (Ma - Mb + Mc - Md);
			// meridional arc

		} while (N-N0-M >= 0.00001);// ie until < 0.01mm

		var cosLat = Math.cos(lat), sinLat = Math.sin(lat);
		var nu = a * F0 / Math.sqrt(1 - e2 * sinLat * sinLat);
		// transverse radius of curvature
		var rho = a * F0 * (1 - e2) / Math.pow(1 - e2 * sinLat * sinLat, 1.5);
		// meridional radius of curvature
		var eta2 = nu / rho - 1;

		var tanLat = Math.tan(lat);
		var tan2lat = tanLat * tanLat, tan4lat = tan2lat * tan2lat, tan6lat = tan4lat * tan2lat;
		var secLat = 1 / cosLat;
		var nu3 = nu * nu * nu, nu5 = nu3 * nu * nu, nu7 = nu5 * nu * nu;
		var VII = tanLat / (2 * rho * nu);
		var VIII = tanLat / (24 * rho * nu3) * (5 + 3 * tan2lat + eta2 - 9 * tan2lat * eta2);
		var IX = tanLat / (720 * rho * nu5) * (61 + 90 * tan2lat + 45 * tan4lat);
		var X = secLat / nu;
		var XI = secLat / (6 * nu3) * (nu / rho + 2 * tan2lat);
		var XII = secLat / (120 * nu5) * (5 + 28 * tan2lat + 24 * tan4lat);
		var XIIA = secLat / (5040 * nu7) * (61 + 662 * tan2lat + 1320 * tan4lat + 720 * tan6lat);

		var dE = (E - E0), dE2 = dE * dE, dE3 = dE2 * dE, dE4 = dE2 * dE2, dE5 = dE3 * dE2, dE6 = dE4 * dE2, dE7 = dE5 * dE2;
		lat = lat - VII * dE2 + VIII * dE4 - IX * dE6;
		var lon = lon0 + X * dE - XI * dE3 + XII * dE5 - XIIA * dE7;

		return new LatLon(lat.toDeg(), lon.toDeg());
	}
}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Latitude/longitude spherical geodesy formulae & scripts (c) Chris Veness 2002-2012            */
/*   - www.movable-type.co.uk/scripts/latlong.html                                                */
/*                                                                                                */
/*  Sample usage:                                                                                 */
/*    var p1 = new LatLon(51.5136, -0.0983);                                                      */
/*    var p2 = new LatLon(51.4778, -0.0015);                                                      */
/*    var dist = p1.distanceTo(p2);          // in km                                             */
/*    var brng = p1.bearingTo(p2);           // in degrees clockwise from north                   */
/*    ... etc                                                                                     */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Note that minimal error checking is performed in this example code!                           */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/**
 * @requires Geo
 */

/**
 * Creates a point on the earth's surface at the supplied latitude / longitude
 *
 * @constructor
 * @param {Number} lat: latitude in numeric degrees
 * @param {Number} lon: longitude in numeric degrees
 * @param {Number} [rad=6371]: radius of earth if different value is required from standard 6,371km
 */
function LatLon(lat, lon, rad) {
	if ( typeof (rad) == 'undefined')
		rad = 6371;
	// earth's mean radius in km
	// only accept numbers or valid numeric strings
	this._lat = typeof (lat) == 'number' ? lat : typeof (lat) == 'string' && lat.trim() != '' ? +lat : NaN;
	this._lon = typeof (lon) == 'number' ? lon : typeof (lon) == 'string' && lon.trim() != '' ? +lon : NaN;
	this._radius = typeof (rad) == 'number' ? rad : typeof (rad) == 'string' && trim(lon) != '' ? +rad : NaN;
}

/**
 * Returns the latitude of this point; signed numeric degrees if no format, otherwise format & dp
 * as per Geo.toLat()
 *
 * @param   {String} [format]: Return value as 'd', 'dm', 'dms'
 * @param   {Number} [dp=0|2|4]: No of decimal places to display
 * @returns {Number|String} Numeric degrees if no format specified, otherwise deg/min/sec
 */
LatLon.prototype.lat = function(format, dp) {
	if ( typeof format == 'undefined')
		return this._lat;

	return Geo.toLat(this._lat, format, dp);
}
/**
 * Returns the longitude of this point; signed numeric degrees if no format, otherwise format & dp
 * as per Geo.toLon()
 *
 * @param   {String} [format]: Return value as 'd', 'dm', 'dms'
 * @param   {Number} [dp=0|2|4]: No of decimal places to display
 * @returns {Number|String} Numeric degrees if no format specified, otherwise deg/min/sec
 */
LatLon.prototype.lon = function(format, dp) {
	if ( typeof format == 'undefined')
		return this._lon;

	return Geo.toLon(this._lon, format, dp);
}
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

// ---- extend Number object with methods for converting degrees/radians

/** Converts numeric degrees to radians */
if ( typeof Number.prototype.toRad == 'undefined') {
	Number.prototype.toRad = function() {
		return this * Math.PI / 180;
	}
}

/** Converts radians to numeric (signed) degrees */
if ( typeof Number.prototype.toDeg == 'undefined') {
	Number.prototype.toDeg = function() {
		return this * 180 / Math.PI;
	}
}

/**
 * Formats the significant digits of a number, using only fixed-point notation (no exponential)
 *
 * @param   {Number} precision: Number of significant digits to appear in the returned string
 * @returns {String} A string representation of number which contains precision significant digits
 */
if ( typeof Number.prototype.toPrecisionFixed == 'undefined') {
	Number.prototype.toPrecisionFixed = function(precision) {

		// use standard toPrecision method
		var n = this.toPrecision(precision);

		// ... but replace +ve exponential format with trailing zeros
		n = n.replace(/(.+)e\+(.+)/, function(n, sig, exp) {
			sig = sig.replace(/\./, '');
			// remove decimal from significand
			l = sig.length - 1;
			while (exp-- > l)
			sig = sig + '0';
			// append zeros from exponent
			return sig;
		});

		// ... and replace -ve exponential format with leading zeros
		n = n.replace(/(.+)e-(.+)/, function(n, sig, exp) {
			sig = sig.replace(/\./, '');
			// remove decimal from significand
			while (exp-- > 1)
			sig = '0' + sig;
			// prepend zeros from exponent
			return '0.' + sig;
		});

		return n;
	}
}

/** Trims whitespace from string (q.v. blog.stevenlevithan.com/archives/faster-trim-javascript) */
if ( typeof String.prototype.trim == 'undefined') {
	String.prototype.trim = function() {
		return String(this).replace(/^\s\s*/, '').replace(/\s\s*$/, '');
	}
}

var CoordTransform = {};
// CoordTransform namespace, representing static class

// ellipse parameters
CoordTransform.ellipse = {
	WGS84 : {
		a : 6378137,
		b : 6356752.3142,
		f : 1 / 298.257223563
	},
	GRS80 : {
		a : 6378137,
		b : 6356752.314140,
		f : 1 / 298.257222101
	},
	Airy1830 : {
		a : 6377563.396,
		b : 6356256.910,
		f : 1 / 299.3249646
	},
	AiryModified : {
		a : 6377340.189,
		b : 6356034.448,
		f : 1 / 299.32496
	},
	Intl1924 : {
		a : 6378388.000,
		b : 6356911.946,
		f : 1 / 297.0
	}
};

// helmert transform parameters from WGS84 to other datums
CoordTransform.datumTransform = {
	toOSGB36 : {
		tx : -446.448,
		ty : 125.157,
		tz : -542.060, // m
		rx : -0.1502,
		ry : -0.2470,
		rz : -0.8421, // sec
		s : 20.4894
	}, // ppm
	toED50 : {
		tx : 89.5,
		ty : 93.8,
		tz : 123.1, // m
		rx : 0.0,
		ry : 0.0,
		rz : 0.156, // sec
		s : -1.2
	}, // ppm
	toIrl1975 : {
		tx : -482.530,
		ty : 130.596,
		tz : -564.557, // m
		rx : -1.042,
		ry : -0.214,
		rz : -0.631, // sec
		s : -8.150
	}
};
// ppm
// ED50: og.decc.gov.uk/en/olgs/cms/pons_and_cop/pons/pon4/pon4.aspx
// strictly, Ireland 1975 is from ETRF89: qv
// www.osi.ie/OSI/media/OSI/Content/Publications/transformations_booklet.pdf
// www.ordnancesurvey.co.uk/oswebsite/gps/information/coordinatesystemsinfo/guidecontents/guide6.html#6.5

/**
 * Convert lat/lon point in OSGB36 to WGS84
 *
 * @param  {LatLon} pOSGB36: lat/lon in OSGB36 reference frame
 * @return {LatLon} lat/lon point in WGS84 reference frame
 */
CoordTransform.convertOSGB36toWGS84 = function(pOSGB36) {
	var eAiry1830 = CoordTransform.ellipse.Airy1830;
	var eWGS84 = CoordTransform.ellipse.WGS84;
	var txToOSGB36 = CoordTransform.datumTransform.toOSGB36;
	var txFromOSGB36 = {};
	// negate the 'to' transform to get the 'from'
	for (var param in txToOSGB36)
	txFromOSGB36[param] = -txToOSGB36[param];
	var pWGS84 = CoordTransform.convertEllipsoid(pOSGB36, eAiry1830, txFromOSGB36, eWGS84);
	return pWGS84;
}
/**
 * Convert lat/lon point in WGS84 to OSGB36
 *
 * @param  {LatLon} pWGS84: lat/lon in WGS84 reference frame
 * @return {LatLon} lat/lon point in OSGB36 reference frame
 */
CoordTransform.convertWGS84toOSGB36 = function(pWGS84) {
	var eWGS84 = CoordTransform.ellipse.WGS84;
	var eAiry1830 = CoordTransform.ellipse.Airy1830;
	var txToOSGB36 = CoordTransform.datumTransform.toOSGB36;
	var pOSGB36 = CoordTransform.convertEllipsoid(pWGS84, eWGS84, txToOSGB36, eAiry1830);
	return pOSGB36;
}
/**
 * Convert lat/lon from one ellipsoidal model to another
 *
 * q.v. Ordnance Survey 'A guide to coordinate systems in Great Britain' Section 6
 *      www.ordnancesurvey.co.uk/oswebsite/gps/docs/A_Guide_to_Coordinate_Systems_in_Great_Britain.pdf
 *
 * @private
 * @param {LatLon}   point: lat/lon in source reference frame
 * @param {Number[]} e1:    source ellipse parameters
 * @param {Number[]} t:     Helmert transform parameters
 * @param {Number[]} e1:    target ellipse parameters
 * @return {Coord} lat/lon in target reference frame
 */
CoordTransform.convertEllipsoid = function(point, e1, t, e2) {

	// -- 1: convert polar to cartesian coordinates (using ellipse 1)

	var lat = point.lat().toRad();
	var lon = point.lon().toRad();

	var a = e1.a, b = e1.b;

	var sinPhi = Math.sin(lat);
	var cosPhi = Math.cos(lat);
	var sinLambda = Math.sin(lon);
	var cosLambda = Math.cos(lon);
	var H = 24.7;
	// for the moment

	var eSq = (a * a - b * b) / (a * a);
	var nu = a / Math.sqrt(1 - eSq * sinPhi * sinPhi);

	var x1 = (nu + H) * cosPhi * cosLambda;
	var y1 = (nu + H) * cosPhi * sinLambda;
	var z1 = ((1 - eSq) * nu + H) * sinPhi;

	// -- 2: apply helmert transform using appropriate params

	var tx = t.tx, ty = t.ty, tz = t.tz;
	var rx = (t.rx / 3600).toRad();
	// normalise seconds to radians
	var ry = (t.ry / 3600).toRad();
	var rz = (t.rz / 3600).toRad();
	var s1 = t.s / 1e6 + 1;
	// normalise ppm to (s+1)

	// apply transform
	var x2 = tx + x1 * s1 - y1 * rz + z1 * ry;
	var y2 = ty + x1 * rz + y1 * s1 - z1 * rx;
	var z2 = tz - x1 * ry + y1 * rx + z1 * s1;

	// -- 3: convert cartesian to polar coordinates (using ellipse 2)

	a = e2.a, b = e2.b;
	var precision = 4 / a;
	// results accurate to around 4 metres

	eSq = (a * a - b * b) / (a * a);
	var p = Math.sqrt(x2 * x2 + y2 * y2);
	var phi = Math.atan2(z2, p * (1 - eSq)), phiP = 2 * Math.PI;
	while (Math.abs(phi - phiP) > precision) {
		nu = a / Math.sqrt(1 - eSq * Math.sin(phi) * Math.sin(phi));
		phiP = phi;
		phi = Math.atan2(z2 + eSq * nu * Math.sin(phi), p);
	}
	var lambda = Math.atan2(y2, x2);
	H = p / Math.cos(phi) - nu;

	return new LatLon(phi.toDeg(), lambda.toDeg(), H);
}

