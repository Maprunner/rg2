/*global rg2:false */
/*global agGrid:false */
(function () {
  function Stats() {
    'use strict';
    this.result = null;
    this.results = [];
    this.course = null;
    this.byLegPos = [];
    this.byRacePos = [];
    this.resultIndex = null;
  }

  Stats.prototype = {
    Constructor: Stats,

    initialise: function (rawid) {
      var i, k;

      this.result = rg2.results.getFullResultForRawID(rawid);
      if (this.result.position === "") {
        this.result.position = '--';
      }
      this.results = rg2.results.getAllResultsForCourse(this.result.courseid);
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].rawid === rawid) {
          this.resultIndex = i;
        }
        this.results[i].timeInSecs = rg2.utils.getSecsFromHHMMSS(this.results[i].time);
        this.results[i].legSplits = [];
        this.results[i].legSplits[0] = 0;
        for (k = 1; k < this.results[i].splits.length; k += 1) {
          this.results[i].legSplits[k] = this.results[i].splits[k] - this.results[i].splits[k - 1];
        }
      }
      this.course = rg2.courses.getCourseDetails(this.result.courseid);
      // includes start and finish
      this.controls = this.course.codes.length;
      this.byLegPos.length = 0;
      this.byRacePos.length = 0;
      this.analyseCourse();
    },

    showStats: function (rawid) {
      // all sorts of possible data consistency errors that might turn up
      try {
        this.initialise(rawid);
        this.generateSummary();
        this.generateTableByLegPos();
        this.generateTableByRacePos();
        this.displayStats();
      } catch (err) {
        rg2.utils.showWarningDialog("Data inconsistency", "Cannot generate statistics.");
        return;
      }
    },

    displayStats: function () {
      $("#rg2-stats-table").dialog({
        width: 'auto',
        resizable: false,
        maxHeight: $("#rg2-map-canvas").height(),
        position: { my: "top", at: "top", of: "#rg2-map-canvas" },
        dialogClass: "rg2-stats-table",
        modal: false,
        buttons: {
          Ok: function () {
            $("#rg2-stats-table").dialog('close');
          }
        }
      });
    },

    generateSummary: function () {
      var html, info;
      info = this.getLegPosInfo();
      html = 'Name: <strong>' + this.result.name + '</strong><br>Course:<strong>' + this.result.coursename + '</strong><br>';
      html += 'Total time: <strong>' + this.result.time + '</strong><br>';
      html += 'Position: <strong>' + this.result.position + ' out of ' + this.results.length + '</strong><br>';
      html += 'Average leg position: <strong>' + info.average + '</strong>';
      html += ' (Best: <strong>' + info.best + '</strong>, Worst: <strong>' + info.worst + ')</strong><br>';
      html += 'Estimated loss: <strong>' + rg2.utils.formatSecsAsMMSS(this.results[this.resultIndex].totalLoss);
      html += ' (' + (100 * this.results[this.resultIndex].totalLoss / this.result.timeInSecs).toFixed(1) + ' %)</strong>';
      $("#rg2-stats-summary").empty().append(html);
    },

    generateTableByLegPos: function () {
      var i, j, row, rowData, behind, names;

      rowData = [];
      for (i = 0; i < this.results[this.resultIndex].splits.length; i += 1) {
        row = {};
        if (i === 0) {
          row.control = 'S';
        } else {
          if (i == (this.results[this.resultIndex].splits.length - 1)) {
            row.control = 'F';
          } else {
            row.control = i + ' (' + this.course.codes[i] + ')';
          }
        }
        if (i === 0) {
          row.time = '0.00';
        } else {
          row.time = rg2.utils.formatSecsAsMMSS(this.results[this.resultIndex].legSplits[i]);
        }
        if (i == 0) {
          row.position = '-';
        } else {
          row.position = this.results[this.resultIndex].legpos[i];
        }
        row.best = rg2.utils.formatSecsAsMMSS(this.byLegPos[i][0].t);
        if (i === 0) {
          row.who = "-";
        } else {
          names = this.results[this.byLegPos[i][0].resid].name;
          for (j = 1; j < this.byLegPos[i].length; j += 1) {
            if (this.byLegPos[i][0].t === this.byLegPos[i][j].t) {
              names += ', ' + this.results[this.byLegPos[i][j].resid].name;
            } else {
              break;
            }
          }
          row.who = names;
        }
        behind = this.results[this.resultIndex].legSplits[i] - this.byLegPos[i][0].t;
        if (i === 0) {
          row.behind = "-";
        } else {
          if (this.results[this.resultIndex].legSplits[i] === 0) {
            row.behind = '-';
          } else {
            row.behind = rg2.utils.formatSecsAsMMSS(behind);
          }
        }
        if (i === 0) {
          row.percent = 0;
        } else {
          if (this.results[this.resultIndex].legSplits[i] === 0) {
            row.percent = '-';
          } else {
            row.percent = parseInt((behind * 100 / this.byLegPos[i][0].t), 10);
          }
        }
        row.predicted = rg2.utils.formatSecsAsMMSS(this.results[this.resultIndex].predictedSplit[i]);
        row.loss = rg2.utils.formatSecsAsMMSS(this.results[this.resultIndex].loss[i]);
        rowData.push(row);
      }

      var gridOptions = {
        columnDefs: [
          { headerName: "Control", field: "control", headerClass: "align-center", cellClass: "align-center", width: 88 },
          { headerName: "Time", field: "time", headerClass: "align-center", cellClass: "align-center", width: 85 },
          { headerName: "Position", field: "position", headerClass: "align-center", cellClass: "align-center", width: 100 },
          { headerName: "Best", field: "best", headerClass: "align-center", cellClass: "align-center", width: 85 },
          { headerName: "Who", field: "who", width: 200, tooltipField: "who" },
          { headerName: "Behind", field: "behind", headerClass: "align-center", cellClass: "align-center", width: 85 },
          { headerName: "%", field: "percent", headerClass: "align-center", cellClass: "align-center", width: 60 },
          { headerName: "Predicted", field: "predicted", headerClass: "align-center", cellClass: "align-center", width: 110 },
          { headerName: "Loss", field: "loss", headerClass: "align-center", cellClass: "align-center", width: 85 }
        ],
        rowData: rowData,
        domLayout: 'autoHeight',
        enableColResize: true,
        onFirstDataRendered: this.autosizeColumns
      };

      $('#rg2-leg-table').empty();
      new agGrid.Grid(document.querySelector('#rg2-leg-table'), gridOptions);
    },

    autosizeColumns: function (params) {
      var allColumnIds = [];
      params.columnApi.getAllColumns().forEach(function (column) {
        allColumnIds.push(column.colId);
      });
      //params.columnApi.autoSizeColumns(allColumnIds);
    },

    getTimeFromLegPos: function (legpos) {
      return legpos.t;
    },

    getAverages: function (data, perCent, getValue) {
      var i, total, count, adjustedCount, median;
      // sort incoming values used supplied sort function
      data.sort(function compare(a, b) {
        return a - b;
      });
      total = 0;
      count = data.length;
      // select top perCent items
      if (perCent < 100) {
        adjustedCount = parseInt(count * perCent / 100, 10);
        // arbitrary choice to keep at least three entries
        if (adjustedCount > 3) {
          data.splice(adjustedCount);
          count = data.length;
        }
      }

      for (i = 0; i < count; i += 1) {
        total = total + getValue(data[i]);
      }
      if (count === 0) {
        return ({ mean: 0, median: 0 });
      }
      if (count === 1) {
        median = getValue(data[0]);
      } else {
        if (count % 2 === 0) {
          median = (getValue(data[(count / 2) - 1]) + getValue(data[(count / 2)])) / 2;
        } else {
          median = getValue(data[Math.floor(count / 2)]);
        }
      }
      return ({ mean: total / count, median: median });
    },

    generateTableByRacePos: function () {
      var i, j, row, rowData, behind, names;

      rowData = [];
      for (i = 0; i < this.results[this.resultIndex].splits.length; i += 1) {
        row = {};
        if (i == 0) {
          row.control = 'S';
        } else {
          if (i == (this.results[this.resultIndex].splits.length - 1)) {
            row.control = 'F';
          } else {
            row.control = i + ' (' + this.course.codes[i] + ')';
          }
        }
        if (i == 0) {
          row.time = '0.00';
        } else {
          row.time = rg2.utils.formatSecsAsMMSS(this.results[this.resultIndex].splits[i]);
        }
        if (i == 0) {
          row.position = '-';
        } else {
          row.position = this.results[this.resultIndex].racepos[i];
        }
        row.best = rg2.utils.formatSecsAsMMSS(this.byRacePos[i][0].t);
        if (i === 0) {
          row.who = "-";
        } else {
          names = this.results[this.byRacePos[i][0].resid].name;
          for (j = 1; j < this.byRacePos[i].length; j += 1) {
            if (this.byRacePos[i][0].t === this.byRacePos[i][j].t) {
              names += ', ' + this.results[this.byRacePos[i][j].resid].name;
            } else {
              break;
            }
          }
          row.who = names;
        }
        behind = this.results[this.resultIndex].splits[i] - this.byRacePos[i][0].t;
        if (i === 0) {
          row.behind = "-";
        } else {
          row.behind = rg2.utils.formatSecsAsMMSS(behind);
        }
        if (i === 0) {
          row.percent = 0;
        } else {
          row.percent = parseInt((behind * 100 / this.byRacePos[i][0].t), 10);
        }
        rowData.push(row);
      }

      var gridOptions = {
        columnDefs: [
          { headerName: "Control", field: "control", headerClass: "align-center", cellClass: "align-center", width: 88 },
          { headerName: "Time", field: "time", headerClass: "align-center", cellClass: "align-center", width: 85 },
          { headerName: "Position", field: "position", headerClass: "align-center", cellClass: "align-center", width: 100 },
          { headerName: "Best", field: "best", headerClass: "align-center", cellClass: "align-center", width: 85 },
          { headerName: "Who", field: "who", width: 200, tooltipField: "who" },
          { headerName: "Behind", field: "behind", headerClass: "align-center", cellClass: "align-center", width: 85 },
          { headerName: "%", field: "percent", headerClass: "align-center", cellClass: "align-center", width: 85 }
        ],
        rowData: rowData,
        domLayout: 'autoHeight',
        enableColResize: true,
        onFirstDataRendered: this.autosizeColumns
      };

      $('#rg2-race-table').empty();
      new agGrid.Grid(document.querySelector('#rg2-race-table'), gridOptions);
    },

    getLegPosInfo: function () {
      var i, total, count, best, worst;
      total = 0;
      count = 0;
      worst = 0;
      best = 9999;
      for (i = 1; i < this.result.legpos.length; i += 1) {
        total += this.result.legpos[i];
        count += 1;
        if (best > this.result.legpos[i]) {
          best = this.result.legpos[i];
        }
        if (worst < this.result.legpos[i]) {
          worst = this.result.legpos[i];
        }
      }
      return ({ best: best, worst: worst, average: (total / count).toFixed(1) });
    },

    analyseCourse: function () {
      var i, k, legTimes, raceTimes;
      this.calculateLostTime();
      legTimes = [];
      raceTimes = [];
      for (i = 0; i < this.controls; i += 1) {
        legTimes.length = 0;
        raceTimes.length = 0;
        for (k = 0; k < this.results.length; k += 1) {
          if (i === 0) {
            legTimes.push({ t: 0, resid: 0, pos: 0 });
            raceTimes.push({ t: 0, resid: 0, pos: 0 });
          } else {
            if (this.results[k].legSplits[i] !== 0) {
              legTimes.push({ t: this.results[k].legSplits[i], resid: k, pos: this.results[k].legpos[i] });
            }
            if (this.results[k].splits[i] !== 0) {
              raceTimes.push({ t: this.results[k].splits[i], resid: k, pos: this.results[k].racepos[i] });
            }
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

    calculateLostTime: function () {
      var i, k, averages, times, ratios, loss;
      // find reference times for each leg
      this.course.refLegTime = [];
      times = [];
      for (i = 0; i < this.controls; i += 1) {
        times.length = 0;
        for (k = 0; k < this.results.length; k += 1) {
          if (this.results[k].legSplits[i] !== 0) {
            times.push(this.results[k].legSplits[i]);
          }
        }
        // using average of best 25% of times for the leg
        averages = this.getAverages(times, 25, function (a) { return a; });
        this.course.refLegTime[i] = averages.median;
      }
      // find ratio to reference times
      ratios = [];
      for (i = 0; i < this.results.length; i += 1) {
        this.results[i].refRatio = [];
        this.results[i].refRatio[0] = 0;
        ratios.length = 0;
        for (k = 1; k < this.controls; k += 1) {
          this.results[i].refRatio[k] = this.results[i].legSplits[k] / this.course.refLegTime[k];
          ratios.push(this.results[i].refRatio[k]);
        }
        averages = this.getAverages(ratios, 100, function (a) { return a; });
        this.results[i].medianRefRatio = averages.median;
      }

      // find predicted times and losses
      for (i = 0; i < this.results.length; i += 1) {
        this.results[i].predictedSplit = [];
        this.results[i].predictedSplit[0] = 0;
        this.results[i].loss = [];
        this.results[i].loss[0] = 0;
        loss = 0;
        for (k = 1; k < this.controls; k += 1) {
          this.results[i].predictedSplit[k] = parseInt(this.results[i].medianRefRatio * this.course.refLegTime[k], 10);
          this.results[i].loss[k] = this.results[i].legSplits[k] - this.results[i].predictedSplit[k];
          if (this.results[i].loss[k] < 0) {
            this.results[i].loss[k] = 0;
          }
          loss = loss + this.results[i].loss[k];
        }
        this.results[i].totalLoss = loss;
      }
    }
  };
  rg2.Stats = Stats;
}());
