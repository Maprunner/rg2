/*global rg2:false */
(function () {
  function ResultParserCSV(rawCSV) {
    this.results = [];
    this.formatCSV = {};
    this.separator = "";
    this.processResultsCSV(rawCSV);
    return this.results;
  }

  ResultParserCSV.prototype = {

    Constructor : ResultParserCSV,

    processResultsCSV : function (rawCSV) {
      var rows, commas, semicolons;
      rows = rawCSV.split(/[\r\n|\n]+/);
      // try and work out what the separator is
      commas = rows[0].split(',').length - 1;
      semicolons = rows[0].split(';').length - 1;
      if (commas > semicolons) {
        this.separator = ',';
      } else {
        this.separator = ";";
      }
      // Spklasse has two items on first row, SI CSV has a lot more...
      if (rows[0].split(this.separator).length === 2) {
        this.processSpklasseCSVResults(rows);
      } else {
        this.getCSVFormat(rows[0]);
        this.processCSVResults(rows);
      }
    },

    // rows: array of raw lines from SI results csv file
    processCSVResults : function (rows) {
      var i, fields;
      // extract what we need: first row is headers so ignore
      for (i = 1; i < rows.length; i += 1) {
        fields = rows[i].split(this.separator);
        // need at least this many fields...
        if (fields.length >= this.formatCSV.FIRST_SPLIT_IDX) {
          this.results.push(this.extractSingleCSVResult(fields));
        }
      }
    },

    extractSingleCSVResult: function (fields) {
      var i, result, nextcode, nextsplit;
      result = {};
      result.chipid = fields[this.formatCSV.CHIP_IDX];
      // delete quotes from CSV file: output from MERCS
      result.name = (fields[this.formatCSV.FIRST_NAME_IDX] + " " + fields[this.formatCSV.SURNAME_IDX]).trim().replace(/\"/g, '');
      result.dbid = (fields[this.formatCSV.DB_IDX] + "__" + result.name).replace(/\"/g, '');
      result.starttime = rg2.utils.getSecsFromHHMMSS(fields[this.formatCSV.START_TIME_IDX]);
      result.time = fields[this.formatCSV.TOTAL_TIME_IDX];
      result.position = parseInt(fields[this.formatCSV.POSITION_IDX], 10);
      if (isNaN(result.position)) {
        result.position = '';
      }
      result.status = this.getSICSVStatus(fields[this.formatCSV.NC_IDX], fields[this.formatCSV.CLASSIFIER_IDX]);
      result.club = fields[this.formatCSV.CLUB_IDX].trim().replace(/\"/g, '');
      result.course = fields[this.formatCSV.COURSE_IDX];
      result.controls = parseInt(fields[this.formatCSV.NUM_CONTROLS_IDX], 10);
      nextsplit = this.formatCSV.FIRST_SPLIT_IDX;
      nextcode = this.formatCSV.FIRST_CODE_IDX;
      result.splits = "";
      result.codes = [];
      for (i = 0; i < result.controls; i += 1) {
        if (fields[nextcode]) {
          if (i > 0) {
            result.splits += ";";
          }
          result.codes[i] = fields[nextcode];
          result.splits += rg2.utils.getSecsFromHHMMSS(fields[nextsplit]);
        }
        nextsplit += this.formatCSV.STEP;
        nextcode += this.formatCSV.STEP;
      }
      // add finish split
      result.splits += ";" + rg2.utils.getSecsFromHHMMSS(result.time);
      return result;
    },

    getCSVFormat : function (headers) {
      // not a pretty function but it should allow some non-standard CSV formats to be processed such as OEScore output
      var titles, idx, fields, i, j, found;
      titles = ['SI card', 'Database Id', 'Surname', 'First name', 'nc', 'Start', 'Time', 'Classifier', 'City', 'Short', 'Course', 'Course controls', 'Pl', 'Start punch', 'Control1', 'Punch1', 'Control2'];
      idx = [];
      fields = headers.split(this.separator);
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
            if (('Chipno' === fields[j]) || ('SIcard' === fields[j])) {
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
      this.formatCSV.CHIP_IDX = idx[0];
      this.formatCSV.DB_IDX = idx[1];
      this.formatCSV.SURNAME_IDX = idx[2];
      this.formatCSV.FIRST_NAME_IDX = idx[3];
      this.formatCSV.NC_IDX = idx[4];
      this.formatCSV.START_TIME_IDX = idx[5];
      this.formatCSV.TOTAL_TIME_IDX = idx[6];
      this.formatCSV.CLASSIFIER_IDX = idx[7];
      this.formatCSV.CLUB_IDX = idx[8];
      this.formatCSV.CLASS_IDX = idx[9];
      this.formatCSV.COURSE_IDX = idx[10];
      this.formatCSV.NUM_CONTROLS_IDX = idx[11];
      this.formatCSV.POSITION_IDX = idx[12];
      this.formatCSV.START_PUNCH_IDX = idx[13];
      this.formatCSV.FIRST_CODE_IDX = idx[14];
      this.formatCSV.FIRST_SPLIT_IDX = idx[15];
      this.formatCSV.STEP = idx[16] - idx[14];
    },

    getSICSVStatus : function (nc, classifier) {
      if ((nc === '0') || (nc === '') || (nc === 'N')) {
        if ((classifier === '') || (classifier === '0')) {
          return 'ok';
        }
        return 'nok';
      }
      return 'nc';
    },

    // rows: array of raw lines from Spklasse results csv file
    processSpklasseCSVResults : function (rows) {
      // fields in course row
      var COURSE_IDX = 0, NUM_CONTROLS_IDX = 1, FIRST_NAME_IDX = 0, SURNAME_IDX = 1, CLUB_IDX = 2,
        START_TIME_IDX = 3, FIRST_SPLIT_IDX = 4, course, controls, i, j, fields, result, len, totaltime;
      fields = [];
      try {
        course = '';
        controls = 0;

        // read through all rows
        for (i = 0; i < rows.length; i += 1) {
          fields = rows[i].split(this.separator);
          // discard blank lines
          if (fields.length > 0) {
            // check for new course
            if (fields.length === 2) {
              course = fields[COURSE_IDX];
              controls = parseInt(fields[NUM_CONTROLS_IDX], 10);
            } else {
              // assume everything else is a result
              result = {};
              result.chipid = 0;
              result.name = (fields[FIRST_NAME_IDX] + " " + fields[SURNAME_IDX] + " " + fields[CLUB_IDX]).trim();
              result.dbid = (result.chipid + "__" + result.name);
              result.starttime = rg2.utils.getSecsFromHHMM(fields[START_TIME_IDX]);
              result.club = fields[CLUB_IDX];
              result.course = course;
              result.controls = controls;
              result.splits = '';
              result.codes = [];
              len = fields.length - FIRST_SPLIT_IDX;
              totaltime = 0;
              for (j = 0; j < len; j += 1) {
                if (j > 0) {
                  result.splits += ";";
                }
                result.codes[j] = 'X';
                totaltime += rg2.utils.getSecsFromHHMMSS(fields[j + FIRST_SPLIT_IDX]);
                result.splits += totaltime;
              }
              result.time = rg2.utils.formatSecsAsMMSS(totaltime);
              this.results.push(result);
            }
          }
        }
      } catch (err) {
        rg2.utils.showWarningDialog("Spklasse csv file contains invalid information");
      }
    }
  };
  rg2.ResultParserCSV = ResultParserCSV;
}());