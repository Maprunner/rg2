
(function () {
  function ResultParserIOFV2(xml) {
    this.results = [];
    this.valid = true;
    this.processIOFV2Results(xml);
    return {results: this.results, valid: this.valid};
  }

  ResultParserIOFV2.prototype = {

    Constructor : ResultParserIOFV2,

    getDBID : function (element, index) {
      if (element.length === 0) {
        return index;
      }
      // remove new lines from empty <PersonId> tags
      element = element[0].textContent.replace(/[\n\r]/g, '').trim();
      if (element) {
        return element;
      }
      return index;
    },

    getName : function (personlist) {
      var temp;
      temp = personlist.getElementsByTagName('Given')[0].textContent + " " + personlist.getElementsByTagName('Family')[0].textContent;
      // remove new lines from empty <Given> and <Family> tags
      return (temp.replace(/[\n\r]/g, '').trim());
    },

    processIOFV2Results : function (xml) {
      var classlist, personlist, resultlist, i, j, result, course;
      try {
        classlist = xml.getElementsByTagName('ClassResult');
        for (i = 0; i < classlist.length; i += 1) {
          course = classlist[i].getElementsByTagName('ClassShortName')[0].textContent;
          personlist = classlist[i].getElementsByTagName('PersonResult');
          for (j = 0; j < personlist.length; j += 1) {
            result = {};
            result.course = course;
            result.name = this.getName(personlist[j]);
            result.dbid = this.getDBID(personlist[j].getElementsByTagName('PersonId'), j);
            result.club = rg2.utils.extractTextContentZero(personlist[j].getElementsByTagName('ShortName'), '');
            resultlist = personlist[j].getElementsByTagName('Result');
            this.extractIOFV2Results(resultlist, result);
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

    getStartFinishTimeAsSecs : function (element) {
      var time;
      if (element.length > 0) {
        time = element[0].getElementsByTagName('Clock')[0].textContent;
        return rg2.utils.getSecsFromHHMMSS(time);
      }
      return 0;
    },

    getPosition : function (element) {
      if (element.length > 0) {
        return parseInt(element[0].textContent, 10);
      }
      return '';
    },

    getTime : function (element) {
      if (element.length > 0) {
        return element[0].textContent.replace(/[\n\r]/g, '');
      }
      return '';
    },

    extractIOFV2Results : function (resultlist, result) {
      var i, finishtime, splitlist;
      for (i = 0; i < resultlist.length; i += 1) {
        result.status = rg2.utils.extractAttributeZero(resultlist[i].getElementsByTagName('CompetitorStatus'), "value", "");
        result.position = this.getPosition(resultlist[i].getElementsByTagName('ResultPosition'));
        result.chipid = rg2.utils.extractTextContentZero(resultlist[i].getElementsByTagName('CCardId'), 0);
        // assuming first <Time> is the total time...
        result.time = this.getTime(resultlist[i].getElementsByTagName('Time'));
        result.starttime = this.getStartFinishTimeAsSecs(resultlist[i].getElementsByTagName('StartTime'));
        result.splits = "";
        result.codes = [];
        splitlist = resultlist[i].getElementsByTagName('SplitTime');
        result.controls = splitlist.length;
        this.extractIOFV2Splits(splitlist, result);
        finishtime = this.getStartFinishTimeAsSecs(resultlist[i].getElementsByTagName('FinishTime'));
        result.splits += Math.max(finishtime - result.starttime, 0);
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
