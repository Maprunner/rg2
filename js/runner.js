/*global rg2:false */
/*exported Runner */
// animated runner details
(function () {
  function Runner(resultid) {
    var res;
    var course;
    res = rg2.results.getFullResult(resultid);
    this.name = res.name;
    this.initials = res.initials;
    // careful: we need the index into results, not the resultid from the text file
    this.runnerid = resultid;
    this.starttime = res.starttime;
    this.splits = res.splits;
    this.legpos = res.legpos;
    if (res.trackColour === null) {
      this.colour = rg2.getNextRouteColour();
    } else {
      this.colour = res.trackColour;
    }
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
    this.x = [];
    this.y = [];
    // x,y are indexed by time in seconds
    this.legTrackDistance = [];
    this.cumulativeTrackDistance = [];
    this.cumulativeDistance = [];
    var control;
    var lastPointIndex;
    var ind;
    this.cumulativeDistance[0] = 0;
    if (res.hasValidTrack) {
      this.expandTrack(res.trackx, res.tracky, res.xysecs);
    } else {
      // no track so use straight line between controls
      this.expandTrack(course.x, course.y, res.splits);
    }
    // add track distances for each leg
    this.legTrackDistance[0] = 0;
    this.cumulativeTrackDistance[0] = 0;
    lastPointIndex = this.cumulativeDistance.length - 1;
    if (course.codes !== undefined) {
      if (res.splits !== rg2.config.SPLITS_NOT_FOUND) {
        for (control = 1; control < course.codes.length; control += 1) {
          // avoid NaN values for GPS tracks that are shorter than the result time
          if (res.splits[control] <= lastPointIndex) {
            ind = res.splits[control];
          } else {
            ind = lastPointIndex;
          }
          this.cumulativeTrackDistance[control] = Math.round(this.cumulativeDistance[ind]);
          this.legTrackDistance[control] = this.cumulativeTrackDistance[control] - this.cumulativeTrackDistance[control - 1];
        }
      } else {
        // allows for tracks at events with no results so no splits: just use start and finish
        this.legTrackDistance[1] = Math.round(this.cumulativeDistance[lastPointIndex]);
        this.cumulativeTrackDistance[1] = Math.round(this.cumulativeDistance[lastPointIndex]);
      }
    }
    res = 0;
    course = 0;
  }
  Runner.prototype = {
    Constructor : Runner,
    expandTrack : function (itemsx, itemsy, itemstime) {
      // gets passed arrays of x, y and time
      // iterate over item which will be xy or controls
      var item;
      var timeatprevitem = 0;
      var timeatitem = 0;
      var diffx;
      var diffy;
      var difft;
      var t;
      var diffdist;
      var tox;
      var toy;
      var fromx = itemsx[0];
      var fromy = itemsy[0];
      var fromdist = 0;
      var dist = 0;
      this.x[0] = itemsx[0];
      this.y[0] = itemsy[0];
      for (item = 1; item < itemstime.length; item += 1) {
        tox = itemsx[item];
        toy = itemsy[item];
        diffx = tox - fromx;
        diffy = toy - fromy;
        dist = dist + Math.sqrt(((tox - fromx) * (tox - fromx)) + ((toy - fromy) * (toy - fromy)));
        diffdist = dist - fromdist;
        timeatitem = itemstime[item];
        difft = timeatitem - timeatprevitem;
        for (t = timeatprevitem + 1; t < timeatitem; t += 1) {
          this.x[t] = Math.round(fromx + ((t - timeatprevitem) * diffx / difft));
          this.y[t] = Math.round(fromy + ((t - timeatprevitem) * diffy / difft));
          this.cumulativeDistance[t] = Math.round(fromdist + ((t - timeatprevitem) * diffdist / difft));
        }
        this.x[timeatitem] = tox;
        this.y[timeatitem] = toy;
        this.cumulativeDistance[timeatitem] = dist;
        fromx = tox;
        fromy = toy;
        fromdist = dist;
        timeatprevitem = timeatitem;
      }
    }
  };
  rg2.Runner = Runner;
}());
