/*global rg2:false */
(function () {
  function ResultParserIOFV2(xml) {
    this.results = [];
    this.processIOFV2Results(xml);
    this.valid = true;
    return {results: this.results, valid: this.valid};
  }

  ResultParserIOFV2.prototype = {

    Constructor : ResultParserIOFV2,

    processIOFV2Results : function (xml) {
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
            result.club = rg2.utils.extractTextContentZero(personlist[j].getElementsByTagName('ShortName'), '');
            resultlist = personlist[j].getElementsByTagName('Result');
            this.extractIOFV2Results(resultlist, result);
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

    extractIOFV2Results : function (resultlist, result) {
      var k, temp, time, splitlist;
      for (k = 0; k < resultlist.length; k += 1) {
        result.status = rg2.utils.extractAttributeZero(resultlist[k].getElementsByTagName('CompetitorStatus'), "value", "");
        temp = resultlist[k].getElementsByTagName('ResultPosition');
        if (temp.length > 0) {
          result.position = parseInt(temp[0].textContent, 10);
        } else {
          result.position = '';
        }
        result.chipid = rg2.utils.extractTextContentZero(resultlist[k].getElementsByTagName('CCardId'), 0);
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
        this.extractIOFV2Splits(splitlist, result);
        temp = resultlist[k].getElementsByTagName('FinishTime');
        if (temp.length > 0) {
          time = temp[0].getElementsByTagName('Clock')[0].textContent;
          result.splits += rg2.utils.getSecsFromHHMMSS(time) - result.starttime;
        } else {
          result.splits += 0;
        }
      }
    },

    extractIOFV2Splits : function (splitlist, result) {
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
          result.codes[l] = rg2.utils.extractTextContentZero(splitlist[l].getElementsByTagName('ControlCode'), "");
        } else {
          result.splits += 0;
          result.codes[l] = "";
        }
      }
      // add finish split
      result.splits += ";";
    }
  };
  rg2.ResultParserIOFV2 = ResultParserIOFV2;
}());