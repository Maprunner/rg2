/*global rg2:false */
(function () {
  function ResultParser(evt, fileFormat) {
    this.results = [];
    this.processResults(evt, fileFormat);
    return this.results;
  }

  ResultParser.prototype = {

    Constructor : ResultParser,

    processResults : function (evt, fileFormat) {
      switch (fileFormat) {
      case 'CSV':
        this.processResultsCSV(evt);
        $("#rg2-select-results-file").addClass('valid');
        break;
      case 'XML':
        this.processResultsXML(evt);
        $("#rg2-select-results-file").addClass('valid');
        break;
      default:
        // shouldn't ever get here but...
        rg2.utils.showWarningDialog("File type error", "Results file type is not recognised. Please select a valid file.");
        return;
      }
    },

    processResultsCSV : function (evt) {
      var rows, commas, semicolons, separator, format;
      rows = evt.target.result.split(/[\r\n|\n]+/);
      // try and work out what the separator is
      commas = rows[0].split(',').length - 1;
      semicolons = rows[0].split(';').length - 1;
      if (commas > semicolons) {
        separator = ',';
      } else {
        separator = ";";
      }

      // Spklasse has two items on first row, SI CSV has a lot more...
      if (rows[0].split(separator).length === 2) {
        this.processSpklasseCSVResults(rows, separator);
      } else {
        format = this.getCSVFormat(rows[0], separator);
        this.processSICSVResults(rows, format, separator);
      }
    },

    processResultsXML : function (evt) {
      var xml, version, nodelist;
      version = "";
      try {
        xml = $.parseXML(evt.target.result);
        nodelist = xml.getElementsByTagName('ResultList');
        if (nodelist.length === 0) {
          rg2.utils.showWarningDialog("XML file error", "File is not a valid XML results file. ResultList element missing.");
          return;
        }
        // test for IOF Version 2
        nodelist = xml.getElementsByTagName('IOFVersion');
        if (nodelist.length > 0) {
          version = nodelist[0].getAttribute('version');
        }
        if (version === "") {
          // test for IOF Version 3
          nodelist = xml.getElementsByTagName('ResultList');
          if (nodelist.length > 0) {
            version = nodelist[0].getAttribute('iofVersion');
          }
        }
      } catch (err) {
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
        rg2.utils.showWarningDialog("XML parse error", "Error processing XML file. Error is : " + err.message);
        return;
      }

    },

    extractIOFV2XMLResults : function (resultlist, result) {
      var k, temp, time, splitlist;
      for (k = 0; k < resultlist.length; k += 1) {
        temp = resultlist[k].getElementsByTagName('CompetitorStatus');
        if (temp.length > 0) {
          result.status = temp[0].getAttribute("value");
        } else {
          result.status = '';
        }
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
          temp = splitlist[l].getElementsByTagName('ControlCode');
          if (temp.length > 0) {
            result.codes[l] = temp[0].textContent;
          } else {
            result.codes[l] = "";
          }
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
        rg2.utils.showWarningDialog("XML parse error", "Error processing XML file. Error is : " + err.message);
        return;
      }

    },

    extractTextContentZero : function (text, defaultValue) {
      if (text.length > 0) {
        return text[0].textContent.trim();
      }
      return defaultValue;
    },

    extractIOFV3XMLResults : function (resultlist, result) {
      var k, temp, temp2, time, splitlist;
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
        temp = resultlist[k].getElementsByTagName('StartTime');
        if (temp.length > 0) {
          temp2 = temp[0].textContent;
          if (temp2.length >= 19) {
            // format is yyyy-mm-ddThh:mm:ss and might have extra Z or +nn
            result.starttime = rg2.utils.getSecsFromHHMMSS(temp2.substr(11, 8));
          } else {
            result.starttime = 0;
          }
        } else {
          result.starttime = 0;
        }
        result.splits = "";
        result.codes = [];
        splitlist = resultlist[k].getElementsByTagName('SplitTime');
        result.controls = splitlist.length;
        this.extractIOFV3XMLSplits(splitlist, result);

        temp = resultlist[k].getElementsByTagName('FinishTime');
        if (temp.length > 0) {
          temp2 = temp[0].textContent;
          if (temp2.length >= 19) {
            // format is yyyy-mm-ddThh:mm:ss and might have extra Z or +nn
            time = rg2.utils.getSecsFromHHMMSS(temp2.substr(11, 8));
          } else {
            time = 0;
          }
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
    },

    // rows: array of raw lines from SI results csv file
    processSICSVResults : function (rows, format, separator) {
      var i, j, fields, nextsplit, nextcode, result;
      // extract what we need: first row is headers so ignore
      result = {};
      for (i = 1; i < rows.length; i += 1) {
        fields = rows[i].split(separator);
        // need at least this many fields...
        if (fields.length >= format.FIRST_SPLIT_IDX) {
          result.chipid = fields[format.CHIP_IDX];
          // delete quotes from CSV file: output from MERCS
          result.name = (fields[format.FIRST_NAME_IDX] + " " + fields[format.SURNAME_IDX]).trim().replace(/\"/g, '');
          result.dbid = (fields[format.DB_IDX] + "__" + result.name).replace(/\"/g, '');
          result.starttime = rg2.utils.getSecsFromHHMMSS(fields[format.START_TIME_IDX]);
          result.time = fields[format.TOTAL_TIME_IDX];
          result.position = parseInt(fields[format.POSITION_IDX], 10);
          if (isNaN(result.position)) {
            result.position = '';
          }
          result.status = this.getSICSVStatus(fields[format.NC_IDX], fields[format.CLASSIFIER_IDX]);
          result.club = fields[format.CLUB_IDX].trim().replace(/\"/g, '');
          result.course = fields[format.COURSE_IDX];
          result.controls = parseInt(fields[format.NUM_CONTROLS_IDX], 10);
          nextsplit = format.FIRST_SPLIT_IDX;
          nextcode = format.FIRST_CODE_IDX;
          result.splits = "";
          result.codes = [];
          for (j = 0; j < result.controls; j += 1) {
            if (fields[nextcode]) {
              if (j > 0) {
                result.splits += ";";
              }
              result.codes[j] = fields[nextcode];
              result.splits += rg2.utils.getSecsFromHHMMSS(fields[nextsplit]);
            }
            nextsplit += format.STEP;
            nextcode += format.STEP;
          }
          // add finish split
          result.splits += ";" + rg2.utils.getSecsFromHHMMSS(result.time);
          this.results.push(result);
        }
      }
    },

    getCSVFormat : function (headers, separator) {
      // not a pretty function but it should allow some non-standard CSV formats to be processed such as OEScore output
      var a, titles, idx, fields, i, j, found;
      a = {};
      titles = ['SI card', 'Database Id', 'Surname', 'First name', 'nc', 'Start', 'Time', 'Classifier', 'City', 'Short', 'Course', 'Course controls', 'Pl', 'Start punch', 'Control1', 'Punch1', 'Control2'];
      idx = [];
      fields = headers.split(separator);
      for (i = 0; i < titles.length; i += 1) {
        found = false;
        for (j = 0; j < fields.length; j += 1) {
          if (fields[j] === titles[i]) {
            idx[i] = j;
            found = true;
            break;
          }
          // horrid hacks to handle semi-compliant files
          if ('SI card' === titles[i]) {
            if ('Chipno' === fields[j]) {
              idx[i] = j;
              found = true;
              break;
            }
          }
          if ('Pl' === titles[i]) {
            if ('Place' === fields[j]) {
              idx[i] = j;
              found = true;
              break;
            }
          }
        }
        if (!found) {
          // stop if we didn't find what we needed
          break;
        }
      }

      if (!found) {
        // default to BOF CSV format
        idx = [1, 2, 3, 4, 8, 9, 11, 12, 15, 18, 39, 42, 43, 44, 46, 47, 2];
      }
      a.CHIP_IDX = idx[0];
      a.DB_IDX = idx[1];
      a.SURNAME_IDX = idx[2];
      a.FIRST_NAME_IDX = idx[3];
      a.NC_IDX = idx[4];
      a.START_TIME_IDX = idx[5];
      a.TOTAL_TIME_IDX = idx[6];
      a.CLASSIFIER_IDX = idx[7];
      a.CLUB_IDX = idx[8];
      a.CLASS_IDX = idx[9];
      a.COURSE_IDX = idx[10];
      a.NUM_CONTROLS_IDX = idx[11];
      a.POSITION_IDX = idx[12];
      a.START_PUNCH_IDX = idx[13];
      a.FIRST_CODE_IDX = idx[14];
      a.FIRST_SPLIT_IDX = idx[15];
      a.STEP = idx[16] - idx[14];
      return a;
    },

    getSICSVStatus : function (nc, classifier) {
      if ((nc === '0') || (nc === '') || (nc === 'N')) {
        if ((classifier === '') || (classifier === '0')) {
          return 'ok';
        }
        return 'nok';
      }
      return 'nc';
    }
  };
  rg2.ResultParser = ResultParser;
}());