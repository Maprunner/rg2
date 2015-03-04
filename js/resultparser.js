/*global rg2:false */
(function () {
  function ResultParser(evt, fileFormat) {
    this.results = [];
    this.resultCourses = [];
    this.valid = true;
    this.processResults(evt, fileFormat);
    this.getCoursesFromResults();
    return {results: this.results, resultCourses: this.resultCourses, valid: this.valid};
  }

  ResultParser.prototype = {

    Constructor : ResultParser,

    processResults : function (evt, fileFormat) {
      switch (fileFormat) {
      case 'CSV':
        this.results = new rg2.ResultParserCSV(evt.target.result);
        break;
      case 'XML':
        this.processResultsXML(evt.target.result);
        break;
      default:
        // shouldn't ever get here but...
        this.valid = false;
        rg2.utils.showWarningDialog("File type error", "Results file type is not recognised. Please select a valid file.");
        return;
      }
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
      var xml, version, nodelist, parsedResults;
      version = "";
      try {
        xml = $.parseXML(rawXML);
        nodelist = xml.getElementsByTagName('ResultList');
        if (nodelist.length === 0) {
          this.valid = false;
          rg2.utils.showWarningDialog("XML file error", "File is not a valid XML results file. ResultList element missing.");
          return;
        }
        // test for IOF Version 2
        version = rg2.utils.extractAttributeZero(xml.getElementsByTagName("IOFVersion"), "version", "");
        if (version === "") {
          // test for IOF Version 3
          version = rg2.utils.extractAttributeZero(xml.getElementsByTagName('ResultList'), "iofVersion", "");
        }
      } catch (err) {
        this.valid = false;
        rg2.utils.showWarningDialog("XML file error", "File is not a valid XML results file.");
        return;
      }

      switch (version) {
      case "2.0.3":
        parsedResults = new rg2.ResultParserIOFV2(xml);
        this.results = parsedResults.results;
        this.valid = parsedResults.valid;
        break;
      case "3.0":
        parsedResults = new rg2.ResultParserIOFV3(xml);
        this.results = parsedResults.results;
        this.valid = parsedResults.valid;
        break;
      default:
        this.valid = false;
        rg2.utils.showWarningDialog("XML file error", 'Invalid IOF file format. Version ' + version + ' not supported.');
      }
    }
  };
  rg2.ResultParser = ResultParser;
}());