(function () {
  function Event(data) {
    this.kartatid = data.id;
    this.mapid = data.mapid;
    this.format = data.format;
    this.name = data.name;
    this.date = data.date;
    this.club = data.club;
    this.rawtype = data.type;
    switch (data.type) {
    case "I":
      this.type = "International event";
      break;
    case "N":
      this.type = "National event";
      break;
    case "R":
      this.type = "Regional event";
      break;
    case "L":
      this.type = "Local event";
      break;
    case "T":
      this.type = "Training event";
      break;
    default:
      this.type = "Unknown";
      break;
    }
    this.comment = data.comment;
    this.locked = data.locked;
    this.courses = 0;
    this.setMapDetails(data);
  }


  Event.prototype = {
    Constructor : Event,

    setMapDetails : function (data) {
      if (data.suffix === undefined) {
        this.mapfilename = this.mapid + '.' + 'jpg';
      } else {
        this.mapfilename = this.mapid + '.' + data.suffix;
      }
      this.worldfile = new rg2.Worldfile(data);
    }
  };
  rg2.Event = Event;
}());
