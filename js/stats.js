/*global rg2:false */
(function () {
  function Stats() {
    'use strict';
    this.result = null;
    this.codes = [];
    this.controls = [];
    this.legLeader = [];
    this.raceLeader = [];
  }

  Stats.prototype = {
    Constructor : Stats,

    showStats : function () {
      var i, html, headings, data, row;

      this.result = rg2.results.getFullResult(97);
      this.analyseCourse(this.result.courseid);

      headings = ['Control', 'Code', 'Leg',  'Position', 'Best', 'Who', 'Elapsed', 'Position', 'Best'];

      html = 'Name: ' + this.result.name + '<br>Course:' + this.result.coursename + '<br>';
      html += 'Total time: ' + this.result.time + '<br>Position: ' + this.result.position + '<br>';  
      
      row = [];
      data = [];
      for (i = 0; i < this.result.splits.length;  i += 1) {
        row.length = 0;
        if (i == 0) {
          row.push('S');
        } else {
          if (i == (this.result.splits.length - 1)) {
            row.push('F');
          } else {
            row.push(i);
          }
        }
        row.push(this.codes[i]);   
        if (i == 0) {
          row.push('0.00');
        } else {
          row.push(rg2.utils.formatSecsAsMMSS(this.result.splits[i] - this.result.splits[i - 1]));
        }
        if (i == 0) {
          row.push('-');
        } else {
          row.push(this.result.legpos[i]);
        }
        row.push(this.legLeader[i].time);
        row.push(this.legLeader[i].name);
        if (i == 0) {
          row.push('0.00');
        } else {
          row.push(rg2.utils.formatSecsAsMMSS(this.result.splits[i]));
        }
        if (i == 0) {
          row.push('-');
        } else {
          row.push(this.result.racepos[i]);
        }
        row.push('?');        
        data.push(row.slice());
      }

      html += this.getHTMLTable(headings, data);

      $("#rg2-stats-info").empty().append(html);
      $("#rg2-stats-table").dialog({
        width : 'auto',
        maxHeight: $("#rg2-map-canvas").height(),
        height: 'auto',
        position: {my: "top", at: "top", of: "#rg2-map-canvas"},
        dialogClass : "rg2-stats-table",
        modal: true,
        buttons : {
          Ok : function () {
            $("#rg2-stats-table").dialog('close');
          }
        }
      });
    },

    analyseCourse : function (courseid) {
      var i, k, results, course, legTimes, raceTimes;

      results = rg2.results.getAllResultsForCourse(courseid);
      course = rg2.courses.getCourseDetails(courseid);
      this.codes = course.codes;
      legTimes = [];
      raceTimes = [];
      for (i = 1; i < course.codes.length; i += 1) {
        legTimes.length = 0;
        raceTimes.length = 0;
        for (k = 0; k < results.length; k += 1) {
          legTimes.push({t: results[k].splits[i] - results[k].splits[i - 1], resid: k, pos: results[k].legpos[i]});
          raceTimes.push({t: results[k].splits[i], resid: k, pos: results[k].racepos[i]});
        }
        this.controls.push({leg: legTimes, race: raceTimes});
      }
      this.legLeader.push({name: "", time: "-"});
      for (i = 1; i < course.codes.length; i += 1) {
        for (k = 0; k < results.length; k += 1) {
          if (this.controls[i].leg[k].pos === 1) {
            this.legLeader.push({name: this.controls[i].leg[k].resid, time: this.controls[i].leg[k].pos});
          }
        }
      }
    },

    getHTMLTable : function (headings, data) {
    // converts an array of headings and an array of arrays of rows into an HTML table
    var i, j, row, html;
    html = '<table><thead><tr>';
    for (i = 0; i < headings.length; i += 1) {
      html += '<th>' + headings[i] + '</th>';
    }
    html += '</thead><tbody>';

    for (j = 0; j < data.length; j += 1) {
      row = data[j];
      html += '<tr>';
      for (i = 0; i < row.length; i += 1) {
        html += '<td>' + row[i] + '</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table>';

    return html;
    }
  };
  rg2.Stats = Stats;
}());
