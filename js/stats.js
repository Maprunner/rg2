/*global rg2:false */
/*global d3:false */
(function () {
  function Stats() {
    'use strict';
    this.result = null;
    this.results = [];
    this.course = null;
    this.byLegPos = [];
    this.byRacePos = [];
  }

  Stats.prototype = {
    Constructor : Stats,

    initialise : function (rawid) {
      var i;

      this.result = rg2.results.getFullResultForRawID(rawid);
      this.result.legSplits = [];
      // make life easier by creating leg splits from race splits
      this.result.legSplits[0] = 0;
      for (i = 1; i < this.result.splits.length; i += 1) {
        this.result.legSplits[i] = this.result.splits[i] - this.result.splits[i - 1];
      }
      this.results = rg2.results.getAllResultsForCourse(this.result.courseid);
      this.course = rg2.courses.getCourseDetails(this.result.courseid);
      this.byLegPos.length = 0;
      this.byRacePos.length = 0;
      this.analyseCourse();
    },

    showStats : function (rawid) {
      var html;
      // all sorts of possible data consistency errors that might turn up
      //try {
        this.initialise(rawid);
        html = this.generateSummary();
        html += this.generateTableByLegPos();
        html += this.generateTableByRacePos();
        this.displayStats(html);
        //this.addCharts();
      //} catch (err) {
      //  rg2.utils.showWarningDialog("Data inconsistency", "Cannot generate statistics.");
      //  return;
      //}
    },

    addCharts : function () {
      var i;
      for (i = 1; i < this.byLegPos.length; i += 1) {
        this.drawChart(i, this.byLegPos[i]);
      }
    },

    drawChart : function (leg,data) {
      var margin, height, width;
      margin = {top: 10, right: 30, bottom: 30, left: 40};
      width = 960 - margin.left - margin.right;
      height = 240 - margin.top - margin.bottom;
      
      var x = d3.scaleLinear().domain([0, data.length]).range([0, width]);
      var y = d3.scaleLinear().domain([0, d3.max(data, function(datum) 
        {return datum.t;})]).rangeRound([0, height]);
        
      var svg = d3.select("#rg2-stats-info").
        append("svg:svg").
        attr("width", width + margin.left + margin.right).
        attr("height", height + margin.top + margin.bottom).
        append("g").
        attr("transform", 
              "translate(" + margin.left + "," + margin.top + ")");
    
      svg.selectAll("rect").
        data(data).
        enter().
        append("svg:rect").
        attr("x", function(datum, index) { return x(index); }).
        attr("y", function(datum) { return height - y(datum.t); }).
        attr("height", function(datum) { return y(datum.t); }).
        attr("width", 5).
        attr("fill", "purple");

      svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

      svg.append("g")
        .call(d3.axisLeft(y));  
    },

    displayStats : function (html) {
      $("#rg2-stats-info").empty().append(html);
      $("#rg2-stats-table").dialog({
        width : 'auto',
        maxHeight: $("#rg2-map-canvas").height(),
        height: 'auto',
        position: {my: "top", at: "top", of: "#rg2-map-canvas"},
        dialogClass : "rg2-stats-table",
        modal: false,
        buttons : {
          Ok : function () {
            $("#rg2-stats-table").dialog('close');
          }
        }
      });
    },

    generateSummary : function () {
      var html;
      html = '<h2>Summary</h2>';
      html += 'Name: ' + this.result.name + '<br>Course:' + this.result.coursename + '<br>';
      html += 'Total time: ' + this.result.time + '<br>';
      html += 'Position: ' + this.result.position + ' out of ' + this.results.length + '<br>';
      html += 'Average leg position: ' + this.getAverageLegPos();
      return html;
    },

    generateTableByLegPos : function () {
      var i, html, headings, data, row, behind;

      headings = ['Control', 'Code', 'Leg',  'Position', 'Best', 'Who', 'Behind', '%']; 
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
        row.push(this.course.codes[i]);   
        if (i == 0) {
          row.push('0.00');
        } else {
          row.push(rg2.utils.formatSecsAsMMSS(this.result.legSplits[i]));
        }
        if (i == 0) {
          row.push('-');
        } else {
          row.push(this.result.legpos[i]);
        }
        row.push(rg2.utils.formatSecsAsMMSS(this.byLegPos[i][0].t));
        if (i === 0) {
          row.push("-");
        } else {
          row.push(this.results[this.byLegPos[i][0].resid].name);
        }
        behind = this.result.legSplits[i] - this.byLegPos[i][0].t;
        if (i === 0) {
          row.push("-");
        } else {
          if (this.result.legSplits[i] === 0){
            row.push ('-');
          } else {
            row.push(rg2.utils.formatSecsAsMMSS(behind));
          }
        }
        if (i === 0) {
          row.push(0);
        } else {
          if (this.result.legSplits[i] === 0){
            row.push ('-');
          } else {
            row.push(parseInt((behind * 100 / this.byLegPos[i][0].t), 10));
          }
        }
        data.push(row.slice());
      }

      html = '<h2>Leg Times</h2>';
      html += this.getHTMLTable(headings, data);
      return html;
    },

    generateTableByRacePos : function () {
      var i, html, headings, data, row, behind;

      headings = ['Control', 'Code', 'Elapsed', 'Position', 'Best', 'Who', 'Behind', '%']; 
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
        row.push(this.course.codes[i]);   
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
        row.push(rg2.utils.formatSecsAsMMSS(this.byRacePos[i][0].t));
        if (i === 0) {
          row.push("-");
        } else {
          row.push(this.results[this.byRacePos[i][0].resid].name);
        }
        behind = this.result.splits[i] - this.byRacePos[i][0].t;
        if (i === 0) {
          row.push("-");
        } else {
          row.push(rg2.utils.formatSecsAsMMSS(behind));
        }
        if (i === 0) {
          row.push(0);
         } else {
          row.push(parseInt((behind * 100 / this.byRacePos[i][0].t), 10));
        }
        data.push(row.slice());
      }

      html = '<h2>Cumulative Times</h2>';
      html += this.getHTMLTable(headings, data);
      return html;
    },

    getAverageLegPos : function () {
      var i, total, count;
      total = 0;
      count = 0;
      for (i = 1; i < this.result.legpos.length; i += 1) {
        total += this.result.legpos[i];
        count += 1; 
      }
      return (total/count).toFixed(1);
    },

    analyseCourse : function () {
      var i, k, legTimes, raceTimes;

      legTimes = [];
      raceTimes = [];
      for (i = 0; i < this.course.codes.length; i += 1) {
        legTimes.length = 0;
        raceTimes.length = 0;
        for (k = 0; k < this.results.length; k += 1) {
          if (i === 0) {
            legTimes.push({t: 0, resid: 0, pos: 0});
            raceTimes.push({t: 0, resid: 0, pos: 0});
          } else {
            legTimes.push({t: this.results[k].splits[i] - this.results[k].splits[i - 1], resid: k, pos: this.results[k].legpos[i]});
            raceTimes.push({t: this.results[k].splits[i], resid: k, pos: this.results[k].racepos[i]});
          }
        }
        legTimes.sort(function (a, b) {
          return a.pos - b.pos;
        });
        raceTimes.sort(function (a, b) {
          return a.pos - b.pos;
        });
        this.byLegPos.push(legTimes.slice());
        this.byRacePos.push(raceTimes.slice());
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
