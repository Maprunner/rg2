/* exported getLatLonDistance */
/* exported getDistanceBetweenPoints */
/* exported getAngle */
/* exported rg2WarningDialog */
/* exported formatSecsAsMMSS */
/* exported getSecsFromMMSS */
/* exported getSecsFromHHMMSS */
/* exported trackTransforms */
/* global rg2:false */
// Avoid `console` errors in browsers that lack a console.
( function() {
    var method;
    var noop = function() {
    };
    var methods = ['assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error', 'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log', 'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd', 'timeStamp', 'trace', 'warn'];
    var length = methods.length;
    var console = (window.console = window.console || {});

    while (length) {
      length -= 1;
      method = methods[length];

      // Only stub undefined methods.
      if (!console[method]) {
        console[method] = noop;
      }
    }
  }());

function Colours() {
  // used to generate track colours: add extra colours as necessary
  this.colours = ["#ff0000", "#ff8000",  "#ff00ff", "#ff0080", "#008080", "#008000", "#00ff00", "#0080ff", "#0000ff", "#8000ff", "#00ffff", "#808080"];
  this.colourIndex = 0;
}

Colours.prototype = {
  Constructor : Colours,

  getNextColour : function() {
    this.colourIndex += 1;
    if (this.colourIndex === this.colours.length) {
      this.colourIndex = 0;
    }
    return this.colours[this.colourIndex];
  }
};

Number.prototype.toRad = function() {
  return this * Math.PI / 180;
};


function rg2WarningDialog(title, text) {
  var msg = '<div>' + rg2.t(text) + '</div>';
  $(msg).dialog({
    title : rg2.t(title)
  });
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

function getDistanceBetweenPoints(x1, y1, x2, y2) {
  // Pythagoras
  return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));
}

// converts seconds to MM:SS
function formatSecsAsMMSS(secs) {
  var formattedtime;
  var minutes = Math.floor(secs / 60);
  formattedtime = minutes;
  var seconds = secs - (minutes * 60);
  if (seconds < 10) {
    formattedtime += ":0" + seconds;
  } else {
    formattedtime += ":" + seconds;
  }
  return formattedtime;

}

function getSecsFromHHMMSS(time) {
  var secs = 0;
  var bits = time.split(":");
  secs = (parseInt(bits[0], 10) * 3600) + (parseInt(bits[1], 10) * 60) + parseInt(bits[2], 10);
  if (isNaN(secs)) {
    return 0;
  } else {
    return secs;
  }
}

// converts MM:SS to seconds
function getSecsFromMMSS(time) {
  var secs = 0;
  var bits = time.split(":");
  secs = (parseInt(bits[0], 10) * 60) + parseInt(bits[1], 10);
  if (isNaN(secs)) {
    return 0;
  } else {
    return secs;
  }
}

// Adds ctx.getTransform() - returns an SVGMatrix
// Adds ctx.transformedPoint(x,y) - returns an SVGPoint
function trackTransforms(ctx) {
  var svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
  var xform = svg.createSVGMatrix();
  ctx.getTransform = function() {
    return xform;
  };

  var savedTransforms = [];
  var save = ctx.save;
  ctx.save = function() {
    savedTransforms.push(xform.translate(0, 0));
    return save.call(ctx);
  };
  var restore = ctx.restore;
  ctx.restore = function() {
    xform = savedTransforms.pop();
    return restore.call(ctx);
  };
  var scale = ctx.scale;
  ctx.scale = function(sx, sy) {
    xform = xform.scaleNonUniform(sx, sy);
    return scale.call(ctx, sx, sy);
  };
  var rotate = ctx.rotate;
  ctx.rotate = function(radians) {
    xform = xform.rotate(radians * 180 / Math.PI);
    return rotate.call(ctx, radians);
  };
  var translate = ctx.translate;
  ctx.translate = function(dx, dy) {
    xform = xform.translate(dx, dy);
    return translate.call(ctx, dx, dy);
  };
  var transform = ctx.transform;
  ctx.transform = function(a, b, c, d, e, f) {
    var m2 = svg.createSVGMatrix();
    m2.a = a;
    m2.b = b;
    m2.c = c;
    m2.d = d;
    m2.e = e;
    m2.f = f;
    xform = xform.multiply(m2);
    return transform.call(ctx, a, b, c, d, e, f);
  };
  var setTransform = ctx.setTransform;
  ctx.setTransform = function(a, b, c, d, e, f) {
    xform.a = a;
    xform.b = b;
    xform.c = c;
    xform.d = d;
    xform.e = e;
    xform.f = f;
    return setTransform.call(ctx, a, b, c, d, e, f);
  };
  var pt = svg.createSVGPoint();
  ctx.transformedPoint = function(x, y) {
    pt.x = x;
    pt.y = y;
    return pt.matrixTransform(xform.inverse());
  };
}
