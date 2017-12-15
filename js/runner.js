/*global rg2:false */
/*exported Runner */
// animated runner details
(function () {
  function Runner(resultid) {
    var res, course;
    res = rg2.results.getFullResult(resultid);
    this.name = res.name;
    this.initials = res.initials;
    // careful: we need the index into results, not the resultid from the text file
    this.runnerid = resultid;
    this.starttime = res.starttime;
    this.splits = res.splits;
    this.legpos = res.legpos;
    this.colour = rg2.colours.getNextColour();
    // get course details
    if (res.isScoreEvent) {
      course = {};
      course.name = res.coursename;
      course.x = res.scorex;
      course.y = res.scorey;
      course.codes = res.scorecodes;
    } else {
      course = rg2.courses.getCourseDetails(res.courseid);
    }
    this.coursename = course.name;
    // used to stop runners when doing replay by control
    this.nextStopTime = rg2.config.VERY_HIGH_TIME_IN_SECS;
    // map position x,y indexed by running time in seconds
    this.x = [];
    this.y = [];

    // total distance travelled indexed by running time in seconds
    // in metres if georeferenced, otherwise in pixels
    this.cumulativeDistance = [];
    this.cumulativeDistance[0] = 0;

    // distance travelled for a leg indexed by control number
    this.legTrackDistance = [];
    this.legTrackDistance[0] = 0;

    // total distance travelled at end of leg indexed by control number
    this.cumulativeTrackDistance = [];
    this.cumulativeTrackDistance[0] = 0;

    if (res.hasValidTrack) {
      this.expandTrack(res.trackx, res.tracky, res.xysecs);
    } else {
      // no track so use straight line between controls
      this.expandTrack(course.x, course.y, res.splits);
    }
    this.addTrackDistances(course, res);
    res = 0;
    course = 0;
  }
  Runner.prototype = {
    Constructor : Runner,

    addTrackDistances : function (course, res) {
      // add track distances for each leg
      var control, ind, lastPointIndex;
      lastPointIndex = this.cumulativeDistance.length - 1;
      if (course.codes !== undefined) {
        // if we got no splits then there will just be a finish time
        if (res.splits.length > 1) {
          for (control = 1; control < course.codes.length; control += 1) {
            // avoid NaN values for GPS tracks that are shorter than the result time
            if (res.splits[control] <= lastPointIndex) {
              ind = res.splits[control];
            } else {
              ind = lastPointIndex;
            }
            this.cumulativeTrackDistance[control] = this.cumulativeDistance[ind];
            this.legTrackDistance[control] = this.cumulativeTrackDistance[control] - this.cumulativeTrackDistance[control - 1];
          }
        } else {
          // allows for tracks at events with no results so no splits: just use start and finish
          this.legTrackDistance[1] = this.cumulativeDistance[lastPointIndex];
          this.cumulativeTrackDistance[1] = this.cumulativeDistance[lastPointIndex];
        }
      }
    },

    expandTrack : function (itemsx, itemsy, itemstime) {
      // gets passed arrays of x, y and time
      // iterate over item which will be xy or controls
      var item, diffx, diffy, difft, t, diffdist, tox, toy, dist, timeatprevitem, timeatitem, fromx, fromy, fromdist, metresPerPixel;
      timeatprevitem = 0;
      timeatitem = 0;
      fromx = itemsx[0];
      fromy = itemsy[0];
      fromdist = 0;
      dist = 0;
      this.x[0] = itemsx[0];
      this.y[0] = itemsy[0];
      metresPerPixel = rg2.events.getMetresPerPixel();
      if (metresPerPixel === undefined) {
        metresPerPixel = 1;
      }
      for (item = 1; item < itemstime.length; item += 1) {
        tox = itemsx[item];
        toy = itemsy[item];
        diffx = tox - fromx;
        diffy = toy - fromy;
        dist = dist + (rg2.utils.getDistanceBetweenPoints(tox, toy, fromx, fromy) * metresPerPixel);
        diffdist = dist - fromdist;
        timeatitem = itemstime[item];
        // allow for 0 splits indicating a missed control
        // just assume a 1 second split for now: probably harmless
        if (timeatitem === 0) {
          timeatitem = timeatprevitem + 1;
        }
        difft = timeatitem - timeatprevitem;
        for (t = timeatprevitem + 1; t < timeatitem; t += 1) {
          this.x[t] = Math.round(fromx + ((t - timeatprevitem) * diffx / difft));
          this.y[t] = Math.round(fromy + ((t - timeatprevitem) * diffy / difft));
          this.cumulativeDistance[t] = Math.round(fromdist + ((t - timeatprevitem) * diffdist / difft));
        }
        this.x[timeatitem] = tox;
        this.y[timeatitem] = toy;
        this.cumulativeDistance[timeatitem] = Math.round(dist);
        fromx = tox;
        fromy = toy;
        fromdist = dist;
        timeatprevitem = timeatitem;
      }
    }
  };
  rg2.Runner = Runner;
}());
