/*global rg2:false */
/*exported Runner */
// animated runner details
function Runner(resultid) {
	var res = rg2.getFullResult(resultid);
	this.name = res.name;
	// careful: we need the index into results, not the resultid from the text file
	this.runnerid = resultid;
	this.starttime = res.starttime;
	this.splits = res.splits;
	this.legpos = res.legpos;
	this.colour = res.trackColour;
	// get course details
	var course = rg2.getCourseDetails(res.courseid);
	this.coursename = course.name;
	// used to stop runners when doing replay by control
	this.nextStopTime = rg2.config.VERY_HIGH_TIME_IN_SECS;
	this.x = [];
	this.y = [];
	// x,y are indexed by time in seconds
	this.legTrackDistance = [];
	this.cumulativeTrackDistance = [];
	var cumulativeDistance = [];
	this.x[0] = course.x[0];
	this.y[0] = course.y[0];
	var timeatprevcontrol = 0;
	var timeatcontrol = 0;
	var timeatxy = 0;
	var timeatprevxy = 0;
	var tox;
	var toy;
	var fromx = course.x[0];
	var fromy = course.y[0];
	var fromdist;
	var diffx;
	var diffy;
	var difft;
	var diffdist;
	var control;
	var t;
	var xy;
	var dist;

	if (res.hasValidTrack) {
		// x,y are indexed by time in seconds
		this.x[0] = res.trackx[0];
		this.y[0] = res.tracky[0];
		cumulativeDistance[0] = 0;
		fromx = res.trackx[0];
		fromy = res.tracky[0];
		fromdist = 0;
		dist = 0;
		// for each point on track
		for ( xy = 1; xy < res.xysecs.length; xy += 1) {
			tox = res.trackx[xy];
			toy = res.tracky[xy];
			diffx = tox - fromx;
			diffy = toy - fromy;
			dist = dist + Math.sqrt(((tox - fromx) * (tox - fromx)) + ((toy - fromy) * (toy - fromy)));
			diffdist = dist - fromdist;
			timeatxy = res.xysecs[xy];
			difft = timeatxy - timeatprevxy;
			for ( t = timeatprevxy + 1; t < timeatxy; t += 1) {
				this.x[t] = Math.round(fromx + ((t - timeatprevxy) * diffx / difft));
				this.y[t] = Math.round(fromy + ((t - timeatprevxy) * diffy / difft));
				cumulativeDistance[t] = Math.round(fromdist + ((t - timeatprevxy) * diffdist / difft));
			}
			this.x[timeatxy] = tox;
			this.y[timeatxy] = toy;
			cumulativeDistance[timeatxy] = dist;
			fromx = tox;
			fromy = toy;
			fromdist = dist;
			timeatprevxy = timeatxy;
		}
	} else {
		// no track so use straight line between controls
		// for each control (0 was Start)
		this.x[0] = course.x[0];
		this.y[0] = course.y[0];
		cumulativeDistance[0] = 0;
		fromx = course.x[0];
		fromy = course.y[0];
		fromdist = 0;
		dist = 0;
		for ( control = 1; control < course.codes.length; control += 1) {
			tox = course.x[control];
			toy = course.y[control];
			diffx = tox - fromx;
			diffy = toy - fromy;
			dist = dist + Math.sqrt(((tox - fromx) * (tox - fromx)) + ((toy - fromy) * (toy - fromy)));
			diffdist = dist - fromdist;
			timeatcontrol = res.splits[control];
			difft = timeatcontrol - timeatprevcontrol;
			for ( t = timeatprevcontrol + 1; t < timeatcontrol; t += 1) {
				this.x[t] = Math.round(fromx + ((t - timeatprevcontrol) * diffx / difft));
				this.y[t] = Math.round(fromy + ((t - timeatprevcontrol) * diffy / difft));
				cumulativeDistance[t] = Math.round(fromdist + ((t - timeatprevxy) * diffdist / difft));
			}
			this.x[timeatcontrol] = tox;
			this.y[timeatcontrol] = toy;
			cumulativeDistance[timeatcontrol] = dist;
			fromx = tox;
			fromy = toy;
			fromdist = dist;
			timeatprevcontrol = timeatcontrol;
		}
	}

	// add track distances for each leg
	this.legTrackDistance[0] = 0;
	this.cumulativeTrackDistance[0] = 0;

	if (course.codes !== undefined) {
		for ( control = 1; control < course.codes.length; control += 1) {
			this.cumulativeTrackDistance[control] = Math.round(cumulativeDistance[res.splits[control]]);
			this.legTrackDistance[control] = this.cumulativeTrackDistance[control] - this.cumulativeTrackDistance[control - 1];
		}
	}

	res = 0;
	course = 0;
}
