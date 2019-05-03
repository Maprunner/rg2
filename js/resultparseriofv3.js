/*global rg2:false */
(function () {
  function ResultParserIOFV3(xml) {
    this.results = [];
    this.valid = true;
    this.processIOFV3Results(xml);
    return { results: this.results, valid: this.valid };
  }

  ResultParserIOFV3.prototype = {

    Constructor: ResultParserIOFV3,

    getID: function (element, index) {
      var temp;
      if (element.length > 0) {
        temp = element[0].textContent;
        // remove new lines from empty <Id> tags
        temp.replace(/[\n\r]/g, '');
        return (temp.trim());
      }
      // no id defined so just use result index
      return index;
    },

    getClub: function (element) {
      if (element.length > 0) {
        if (element[0].getElementsByTagName('Name')[0]) {
          return element[0].getElementsByTagName('Name')[0].textContent;
        }
      }
      return "";
    },

    processIOFV3Results: function (xml) {
      var classlist, personlist, resultlist, i, j, result, course, temp;
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
            result.dbid = this.getID(personlist[j].getElementsByTagName('Id'), j);
            result.club = this.getClub(personlist[j].getElementsByTagName('Organisation'));
            resultlist = personlist[j].getElementsByTagName('Result');
            this.extractIOFV3Results(resultlist, result);
            if (result.status !== 'DidNotStart') {
              this.results.push(result);
            }
          }
        }
      } catch (err) {
        this.valid = false;
        rg2.utils.showWarningDialog("XML parse error", "Error processing XML file. Error is : " + err.message);
        return;
      }
    },

    getStartFinishTimeAsSeconds: function (time) {
      if (time.length >= 19) {
        // format is yyyy-mm-ddThh:mm:ss and might have extra Z or +nn
        return rg2.utils.getSecsFromHHMMSS(time.substr(11, 8));
      }
      return 0;
    },

    getTotalTimeAsSeconds: function (time) {
      if (time.length > 0 && time[0].textContent) {
        var timeInt = parseInt(time[0].textContent, 10);
        return rg2.utils.formatSecsAsMMSS(timeInt);
      }
      return '00:00';
    },

    extractIOFV3Results: function (resultlist, result) {
      var k, finishtime, splitlist;
      for (k = 0; k < resultlist.length; k += 1) {
        result.chipid = rg2.utils.extractTextContentZero(resultlist[k].getElementsByTagName('ControlCard'), 0);
        result.position = rg2.utils.extractTextContentZero(resultlist[k].getElementsByTagName('Position'), '');
        if (result.position === "0") {
          result.position = "";
        }
        result.status = rg2.utils.extractTextContentZero(resultlist[k].getElementsByTagName('Status'), '');
        // assuming first <Time> is the total time...
        // this one is in seconds and might even have tenths...
        result.time = this.getTotalTimeAsSeconds(resultlist[k].getElementsByTagName('Time'));
        result.starttime = this.getStartFinishTimeAsSeconds(rg2.utils.extractTextContentZero(resultlist[k].getElementsByTagName('StartTime'), 0));
        result.splits = "";
        result.codes = [];
        splitlist = resultlist[k].getElementsByTagName('SplitTime');
        this.extractIOFV3Splits(splitlist, result);
        finishtime = this.getStartFinishTimeAsSeconds(rg2.utils.extractTextContentZero(resultlist[k].getElementsByTagName('FinishTime'), 0));
        if (finishtime > 0) {
          result.splits += finishtime - result.starttime;
        } else {
          result.splits += 0;
        }
      }
    },

    extractIOFV3Splits: function (splitlist, result) {
      var x, codes;
      codes = [];
      for (x = 0; x < splitlist.length; x += 1) {
        // only possible attributes are "Missing" and "Additional" so
        // if splitlist has attributes it is invalid and needs to be ignored
        if (splitlist[x].attributes.length === 0) {
          result.splits += rg2.utils.extractTextContentZero(splitlist[x].getElementsByTagName('Time'), 0);
          codes.push(rg2.utils.extractTextContentZero(splitlist[x].getElementsByTagName('ControlCode'), 'X' + x));
          result.splits += ";";
        }
      }
      result.codes = codes;
      result.controls = result.codes.length;
    }
  };
  rg2.ResultParserIOFV3 = ResultParserIOFV3;
}());
