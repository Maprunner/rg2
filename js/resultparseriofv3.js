/*global rg2:false */
(function () {
  function ResultParserIOFV3(xml) {
    this.results = [];
    this.processIOFV3Results(xml);
    this.valid = true;
    return {results: this.results, valid: this.valid};
  }

  ResultParserIOFV3.prototype = {

    Constructor : ResultParserIOFV3,

    processIOFV3Results : function (xml) {
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

    extractIOFV3Results : function (resultlist, result) {
      var k, temp, time, splitlist;
      for (k = 0; k < resultlist.length; k += 1) {
        result.chipid = rg2.utils.extractTextContentZero(resultlist[k].getElementsByTagName('ControlCard'), 0);
        result.position = rg2.utils.extractTextContentZero(resultlist[k].getElementsByTagName('Position'), '');
        result.status = rg2.utils.extractTextContentZero(resultlist[k].getElementsByTagName('Status'), '');
        // assuming first <Time> is the total time...
        // this one is in seconds and might even have tenths...
        temp = resultlist[k].getElementsByTagName('Time');
        if (temp.length > 0) {
          result.time = rg2.utils.formatSecsAsMMSS(parseInt(temp[0].textContent, 10));
        } else {
          result.time = 0;
        }
        temp = rg2.utils.extractTextContentZero(resultlist[k].getElementsByTagName('StartTime'), 0);
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
        this.extractIOFV3Splits(splitlist, result);
        temp = rg2.utils.extractTextContentZero(resultlist[k].getElementsByTagName('FinishTime'), 0);
        if (temp.length >= 19) {
          // format is yyyy-mm-ddThh:mm:ss and might have extra Z or +nn
          time = rg2.utils.getSecsFromHHMMSS(temp.substr(11, 8));
        } else {
          time = 0;
        }
        result.splits += time - result.starttime;
      }
    },

    extractIOFV3Splits : function (splitlist, result) {
      var x;
      for (x = 0; x < splitlist.length; x += 1) {
        if (x > 0) {
          result.splits += ";";
        }
        result.splits += rg2.utils.extractTextContentZero(splitlist[x].getElementsByTagName('Time'), 0);
        result.codes[x] = rg2.utils.extractTextContentZero(splitlist[x].getElementsByTagName('ControlCode'), 'X' + x);
      }
      // add finish split
      result.splits += ";";
    }
  };
  rg2.ResultParserIOFV3 = ResultParserIOFV3;
}());