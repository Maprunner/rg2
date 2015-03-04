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
      var xml, version, nodelist;
      version = "";
      try {
        xml = $.parseXML(rawXML);
        nodelist = xml.getElementsByTagName('ResultList');
        if (nodelist.length === 0) {
          rg2.utils.showWarningDialog("XML file error", "File is not a valid XML results file. ResultList element missing.");
          return;
        }
        // test for IOF Version 2
        version = this.extractAttributeZero(xml.getElementsByTagName("IOFVersion"), "version", "");
        if (version === "") {
          // test for IOF Version 3
          version = this.extractAttributeZero(xml.getElementsByTagName('ResultList'), "iofVersion", "");
        }
      } catch (err) {
        this.valid = false;
        rg2.utils.showWarningDialog("XML file error", "File is not a valid XML results file.");
        return;
      }

      switch (version) {
      case "2.0.3":
        this.processIOFV2XMLResults(xml);
        break;
      case "3.0":
        this.processIOFV3XMLResults(xml);
        break;
      default:
        this.valid = false;
        rg2.utils.showWarningDialog("XML file error", 'Invalid IOF file format. Version ' + version + ' not supported.');
      }
    },

    processIOFV2XMLResults : function (xml) {
      var classlist, personlist, resultlist, i, j, result, course, temp;
      try {
        classlist = xml.getElementsByTagName('ClassResult');
        for (i = 0; i < classlist.length; i += 1) {
          course = classlist[i].getElementsByTagName('ClassShortName')[0].textContent;
          personlist = classlist[i].getElementsByTagName('PersonResult');
          for (j = 0; j < personlist.length; j += 1) {
            result = {};
            result.course = course;
            temp = personlist[j].getElementsByTagName('Given')[0].textContent + " " + personlist[j].getElementsByTagName('Family')[0].textContent;
            // remove new lines from empty <Given> and <Family> tags
            result.name = temp.replace(/[\n\r]/g, '').trim();
            temp = personlist[j].getElementsByTagName('PersonId')[0].textContent;
            // remove new lines from empty <PersonId> tags
            temp = temp.replace(/[\n\r]/g, '').trim();
            if (temp) {
              result.dbid = temp;
            } else {
              result.dbid = result.name;
            }
            result.club = this.extractTextContentZero(personlist[j].getElementsByTagName('ShortName'), '');
            resultlist = personlist[j].getElementsByTagName('Result');
            this.extractIOFV2XMLResults(resultlist, result);
            if (result.status === 'DidNotStart') {
              break;
            }
            this.results.push(result);
          }
        }
      } catch (err) {
        this.valid = false;
        rg2.utils.showWarningDialog("XML parse error", "Error processing XML file. Error is : " + err.message);
        return;
      }

    },

    extractIOFV2XMLResults : function (resultlist, result) {
      var k, temp, time, splitlist;
      for (k = 0; k < resultlist.length; k += 1) {
        result.status = this.extractAttributeZero(resultlist[k].getElementsByTagName('CompetitorStatus'), "value", "");
        temp = resultlist[k].getElementsByTagName('ResultPosition');
        if (temp.length > 0) {
          result.position = parseInt(temp[0].textContent, 10);
        } else {
          result.position = '';
        }
        result.chipid = this.extractTextContentZero(resultlist[k].getElementsByTagName('CCardId'), 0);
        // assuming first <Time> is the total time...
        temp = resultlist[k].getElementsByTagName('Time');
        if (temp.length > 0) {
          result.time = temp[0].textContent.replace(/[\n\r]/g, '');
        } else {
          result.time = 0;
        }
        temp = resultlist[k].getElementsByTagName('StartTime');
        if (temp.length > 0) {
          time = temp[0].getElementsByTagName('Clock')[0].textContent;
          result.starttime = rg2.utils.getSecsFromHHMMSS(time);
        } else {
          result.starttime = 0;
        }
        result.splits = "";
        result.codes = [];
        splitlist = resultlist[k].getElementsByTagName('SplitTime');
        result.controls = splitlist.length;
        this.extractIOFV2XMLSplits(splitlist, result);
        temp = resultlist[k].getElementsByTagName('FinishTime');
        if (temp.length > 0) {
          time = temp[0].getElementsByTagName('Clock')[0].textContent;
          result.splits += rg2.utils.getSecsFromHHMMSS(time) - result.starttime;
        } else {
          result.splits += 0;
        }
      }
    },

    extractIOFV2XMLSplits : function (splitlist, result) {
      var l, temp;
      for (l = 0; l < splitlist.length; l += 1) {
        if (l > 0) {
          result.splits += ";";
        }
        temp = splitlist[l].getElementsByTagName('Time');
        if (temp.length > 0) {
          // previously read timeFormat but some files lied!
          // allow for XML files that don't tell you what is going on
          // getSecsFromHHMMSS copes with MM:SS as well
          result.splits += rg2.utils.getSecsFromHHMMSS(temp[0].textContent);
          result.codes[l] = this.extractTextContentZero(splitlist[l].getElementsByTagName('ControlCode'), "");
        } else {
          result.splits += 0;
          result.codes[l] = "";
        }
      }
      // add finish split
      result.splits += ";";
    },

    processIOFV3XMLResults : function (xml) {
      var classlist, personlist, resultlist, i, j, result, course, temp, temp2;
      try {
        classlist = xml.getElementsByTagName('ClassResult');
        for (i = 0; i < classlist.length; i += 1) {
          temp = classlist[i].getElementsByTagName('Class');
          course = temp[0].getElementsByTagName('Name')[0].textContent;
          personlist = classlist[i].getElementsByTagName('PersonResult');
          for (j = 0; j < personlist.length; j += 1) {
            result = {};
            result.course = course;
            temp = personlist[j].getElementsByTagName('Given')[0].textContent + " " + personlist[j].getElementsByTagName('Family')[0].textContent;
            // remove new lines from empty <Given> and <Family> tags
            result.name = temp.replace(/[\n\r]/g, '').trim();
            temp = personlist[j].getElementsByTagName('Id');
            if (temp.length > 0) {
              temp2 = temp[0].textContent;
              // remove new lines from empty <Id> tags
              temp2.replace(/[\n\r]/g, '');
              result.dbid = temp2.trim() + "__" + result.name;
            } else {
              // no id defined so just use count of runners
              result.dbid = this.results.length + "__" + result.name;
            }
            temp = personlist[j].getElementsByTagName('Organisation');
            if (temp.length > 0) {
              result.club = temp[0].getElementsByTagName('Name')[0].textContent;
            } else {
              result.club = "";
            }
            resultlist = personlist[j].getElementsByTagName('Result');
            this.extractIOFV3XMLResults(resultlist, result);
            this.results.push(result);
          }

        }
      } catch (err) {
        this.valid = false;
        rg2.utils.showWarningDialog("XML parse error", "Error processing XML file. Error is : " + err.message);
        return;
      }

    },

    extractAttributeZero : function (nodelist, attribute, defaultValue) {
      if (nodelist.length > 0) {
        return nodelist[0].getAttribute(attribute).trim();
      }
      return defaultValue;
    },

    extractTextContentZero : function (nodelist, defaultValue) {
      if (nodelist.length > 0) {
        return nodelist[0].textContent.trim();
      }
      return defaultValue;
    },

    extractIOFV3XMLResults : function (resultlist, result) {
      var k, temp, time, splitlist;
      for (k = 0; k < resultlist.length; k += 1) {
        result.chipid = this.extractTextContentZero(resultlist[k].getElementsByTagName('ControlCard'), 0);
        result.position = this.extractTextContentZero(resultlist[k].getElementsByTagName('Position'), '');
        result.status = this.extractTextContentZero(resultlist[k].getElementsByTagName('Status'), '');
        // assuming first <Time> is the total time...
        // this one is in seconds and might even have tenths...
        temp = resultlist[k].getElementsByTagName('Time');
        if (temp.length > 0) {
          result.time = rg2.utils.formatSecsAsMMSS(parseInt(temp[0].textContent, 10));
        } else {
          result.time = 0;
        }
        temp = this.extractTextContentZero(resultlist[k].getElementsByTagName('StartTime'), 0);
        if (temp.length >= 19) {
          // format is yyyy-mm-ddThh:mm:ss and might have extra Z or +nn
          result.starttime = rg2.utils.getSecsFromHHMMSS(temp.substr(11, 8));
        } else {
          result.starttime = 0;
        }
        result.splits = "";
        result.codes = [];
        splitlist = resultlist[k].getElementsByTagName('SplitTime');
        result.controls = splitlist.length;
        this.extractIOFV3XMLSplits(splitlist, result);
        temp = this.extractTextContentZero(resultlist[k].getElementsByTagName('FinishTime'), 0);
        if (temp.length >= 19) {
          // format is yyyy-mm-ddThh:mm:ss and might have extra Z or +nn
          time = rg2.utils.getSecsFromHHMMSS(temp.substr(11, 8));
        } else {
          time = 0;
        }
        result.splits += time - result.starttime;
      }
    },

    extractIOFV3XMLSplits : function (splitlist, result) {
      var x;
      for (x = 0; x < splitlist.length; x += 1) {
        if (x > 0) {
          result.splits += ";";
        }
        result.splits += this.extractTextContentZero(splitlist[x].getElementsByTagName('Time'), 0);
        result.codes[x] = this.extractTextContentZero(splitlist[x].getElementsByTagName('ControlCode'), 'X' + x);
      }
      // add finish split
      result.splits += ";";
    }
  };
  rg2.ResultParser = ResultParser;
}());