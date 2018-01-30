/*global rg2:false */
(function () {
  function ResultParser(evt, fileFormat) {
    var parsedResults;
    this.results = [];
    this.resultCourses = [];
    this.valid = true;
    parsedResults = this.processResults(evt, fileFormat);
    this.results = this.sortResults(parsedResults.results);
    this.valid = parsedResults.valid;
    this.getCoursesFromResults();
    return {results: this.results, resultCourses: this.resultCourses, valid: this.valid};
  }

  ResultParser.prototype = {

    Constructor : ResultParser,

    processResults : function (evt, fileFormat) {
      switch (fileFormat) {
      case 'CSV':
        return (new rg2.ResultParserCSV(evt.target.result));
      case 'XML':
        return this.processResultsXML(evt.target.result);
      default:
        // shouldn't ever get here but...
        rg2.utils.showWarningDialog("File type error", "Results file type is not recognised. Please select a valid file.");
        return {results: [], valid: false};
      }
    },

    sortResults : function (unsortedResults) {
    	// Sort un-ordered XML data
    	// sort keys in order are: position, time, name
    	return unsortedResults.sort( function (a, b) {
    		if (a.position != '' && b.position != '' ) {
    			// sort by position, if available
				return a.position - b.position;
    		} else if ( a.position == '' && position != '') {
    			//
    			return 1;
    		} else if ( a.position != '' && position == '') {
    			//
    			return -1;
    		} else {
    			// sort by time, if available
    			if (a.time == 0 && b.time == 0) {
    				// sort by name, when no time
    				return a.name - b.name
    			} else {
    				//
    				return a.time - b.time;
    			}
    		}
    	});
    },

    getCoursesFromResults : function () {
      // creates an array of all course names in the results file
      var i, j, found;
      for (i = 0; i < this.results.length; i += 1) {
        // have we already found this course?
        found = false;
        for (j = 0; j < this.resultCourses.length; j += 1) {
          if (this.resultCourses[j].course === this.results[i].course) {
            found = true;
            break;
          }
        }
        if (!found) {
          // courseid is set later when mapping is known
          this.resultCourses.push({course: this.results[i].course, courseid: rg2.config.DO_NOT_SAVE_COURSE});
        }
      }
    },

    processResultsXML : function (rawXML) {
      var xml, version, nodelist;
      version = "";
      try {
        xml = $.parseXML(rawXML);
        nodelist = xml.getElementsByTagName('ResultList');
        if (nodelist.length === 0) {
          rg2.utils.showWarningDialog("XML file error", "File is not a valid XML results file. ResultList element missing.");
          return {results: [], valid: false};
        }
        // test for IOF Version 2
        version = rg2.utils.extractAttributeZero(xml.getElementsByTagName("IOFVersion"), "version", "");
        if (version === "") {
          // test for IOF Version 3
          version = rg2.utils.extractAttributeZero(xml.getElementsByTagName('ResultList'), "iofVersion", "");
        }
      } catch (err) {
        rg2.utils.showWarningDialog("XML file error", "File is not a valid XML results file.");
        return {results: [], valid: false};
      }

      switch (version) {
      case "2.0.3":
        return (new rg2.ResultParserIOFV2(xml));
      case "3.0":
        return (new rg2.ResultParserIOFV3(xml));
      default:
        rg2.utils.showWarningDialog("XML file error", 'Invalid IOF file format. Version ' + version + ' not supported.');
        return {results: [], valid: false};
      }
    }
  };
  rg2.ResultParser = ResultParser;
}());