
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
    // empirical setting for how often to iterate loss assessment
    this.iterations = 3;
  }

  Stats.prototype = {
    Constructor: Stats,

    initialise: function (rawid) {
      var i;

      this.result = rg2.results.getFullResultForRawID(rawid);
      this.results = rg2.results.getAllResultsForCourse(this.result.courseid);
      for (i = 0; i < this.results.length; i += 1) {
        if (this.results[i].rawid === rawid) {
          // index for runner we are analysing
          this.resultIndex = i;
        }
      }
      this.course = rg2.courses.getCourseDetails(this.result.courseid);
      // includes start and finish
      this.controls = this.course.codes.length;
      if (this.controls <= 2) {
        throw new this.rg2Exception(rg2.t('No splits available.'));
      }
      this.analyseCourse();
    },

    rg2Exception: function (msg) {
      this.message = msg;
    },

    showStats: function (rawid) {
      // all sorts of possible data consistency errors that might turn up
      try {
        this.initialise(rawid);
        this.generateSummary();
        this.generateTableByLegPos();
        this.generateTableByRacePos();
        this.generateSplitsTable();
        this.displayStats();
      } catch (err) {
        if (err instanceof this.rg2Exception) {
          // one we trapped ourselves
          rg2.utils.showWarningDialog(rg2.t("Statistics"), err.message);
        } else {
          // general problem: probably an index out of bounds on an array somewhere: dodgy results files
          rg2.utils.showWarningDialog(rg2.t("Statistics"), rg2.t("Data inconsistency."));
        }
        return;
      }
    },

    displayStats: function () {
      $("#rg2-stats-summary-text").empty().text(rg2.t("Summary"));
      $("#rg2-stats-leg-text").empty().text(rg2.t("Leg times"));
      $("#rg2-stats-cumulative-text").empty().text(rg2.t("Cumulative times"));
      $("#rg2-stats-splits-text").empty().text(rg2.t("Splits"));
      // width and height adjustments based on what looks OK when testing...
      $("#rg2-stats-tabs").tabs({
        active: 0
      });
      $("#rg2-stats-table").dialog({
        title: this.result.name,
        resizable: false,
        maxHeight: $("#rg2-map-canvas").height() * 0.98,
        width: Math.min($("#rg2-map-canvas").width() * 0.8, 1000),
        position: { my: "top", at: "top", of: "#rg2-map-canvas" },
      });
    },

    generateSummary: function () {
      var html, info, ratios;
      info = this.getLegPosInfo();
      html = rg2.t('Name') + ': <strong>' + this.result.name + '</strong><br>' + rg2.t('Course') + ':<strong>' + this.result.coursename + '</strong><br>';
      html += rg2.t('Time') + ': <strong>' + this.result.time + '</strong><br>';
      html += rg2.t('Position') + ': <strong>' + this.results[this.resultIndex].racepos[this.controls - 1] + ' / ' + this.results.length + '</strong><br>';
      html += rg2.t('Average leg position') + ': <strong>' + info.average + '</strong> (';
      html += rg2.t('Best') + ': <strong>' + info.best + '</strong>, ' + rg2.t('Worst') + ': <strong>' + info.worst + ')</strong><br>';
      html += rg2.t('Estimated loss') + ': <strong>' + rg2.utils.formatSecsAsMMSS(this.results[this.resultIndex].totalLoss);
      if (this.isNumberOverZero(this.result.timeInSecs)) {
        html += ' (' + (100 * this.results[this.resultIndex].totalLoss / this.result.timeInSecs).toFixed(1) + ' %)';
      }
      html += '</strong><br>';
      html += rg2.t('Performance') + ': <strong>' + (this.result.performanceIndex[this.iterations - 1] * 100).toFixed(1) + '%</strong><br>';
      // first entry is 0 for start control, so throw that away    
      ratios = this.results[this.resultIndex].refRatio.slice(1);
      html += rg2.t('Consistency') + ': <strong>' + (100 * this.getStandardDeviation(ratios)).toFixed(1) + '%</strong>';
      $("#rg2-stats-summary").empty().append(html);
    },

    getMean: function (data) {
      return data.reduce(function (a, b) {
        return a + b;
      }, 0) / data.length;
    },

    getStandardDeviation: function (values) {
      var mean;
      mean = this.getMean(values);
      return Math.sqrt(values.reduce(function (sq, n) {
        return sq + Math.pow(n - mean, 2);
      }, 0) / (values.length));
    },

    isNumberOverZero: function (n) {
      if (!isNaN(parseFloat(n)) && isFinite(n)) {
        if (n > 0) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
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
          row.time = '0:00';
        } else {
          row.time = rg2.utils.formatSecsAsMMSS(this.results[this.resultIndex].legSplits[i]);
        }
        if ((i === 0) || (this.results[this.resultIndex].legpos[i] === 0)) {
          row.position = '-';
        } else {
          row.position = this.results[this.resultIndex].legpos[i];
        }
        if (i === 0) {
          row.performance = '-';
        } else {
          row.performance = (100 * this.results[this.resultIndex].refRatio[i]).toFixed(1);
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
        row.predicted = rg2.utils.formatSecsAsMMSS(this.results[this.resultIndex].predictedSplits[i]);
        if (this.results[this.resultIndex].legSplits[i] === 0) {
          row.loss = '-';
        } else {
          row.loss = rg2.utils.formatSecsAsMMSS(this.results[this.resultIndex].loss[i]);
        }
        rowData.push(row);
      }

      var gridOptions = {
        columnDefs: [
          { headerName: rg2.t("Control"), field: "control", width: 80 },
          { headerName: rg2.t("Time"), field: "time", width: 80, comparator: this.timeComparator.bind(this) },
          { headerName: rg2.t("Position"), field: "position", width: 75 },
          { headerName: rg2.t("Performance"), field: "performance", width: 95, comparator: this.perfComparator.bind(this) },
          { headerName: rg2.t("Best"), field: "best", width: 80 },
          { headerName: rg2.t("Who"), field: "who", headerClass: "align-left", cellClass: "align-left", width: 180, tooltipField: "who" },
          { headerName: rg2.t("Behind"), field: "behind", width: 80, comparator: this.timeComparator.bind(this) },
          { headerName: "%", field: "percent", width: 60 },
          { headerName: rg2.t("Predicted"), field: "predicted", width: 100, comparator: this.timeComparator.bind(this) },
          { headerName: rg2.t("Loss"), field: "loss", width: 75, comparator: this.timeComparator.bind(this) }
        ],
        rowData: rowData,
        domLayout: 'autoHeight',
        defaultColDef: {
          headerClass: "align-center",
          cellClass: "align-center",
          sortable: true
        }
      };

      $('#rg2-leg-table').empty();
      new agGrid.Grid(document.querySelector('#rg2-leg-table'), gridOptions);
    },

    timeComparator: function (t1, t2) {
      return (this.getTimeValue(t1) - this.getTimeValue(t2));
    },

    getTimeValue: function (t) {
      // gets "-" or "mm:ss"
      if (t === "-") {
        return 0;
      } else {
        return parseFloat(t.replace(":", "."));
      }
    },

    perfComparator: function (p1, p2) {
      return (this.getPerfValue(p1) - this.getPerfValue(p2));
    },

    getPerfValue: function (p) {
      if (p === "-") {
        return 0;
      } else {
        return parseFloat(p);
      }
    },

    getTimeFromLegPos: function (legpos) {
      return legpos.t;
    },

    getAverages: function (data, perCent) {
      var i, total, count, adjustedCount, median;
      if (data.length === 0) {
        return ({ mean: 0, median: 0 });
      }
      // sort incoming values
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
        total = total + data[i];
      }
      if (count === 1) {
        median = data[0];
      } else {
        if (count % 2 === 0) {
          median = (data[(count / 2) - 1] + data[count / 2]) / 2;
        } else {
          median = data[Math.floor(count / 2)];
        }
      }
      return ({ mean: total / count, median: median });
    },

    generateTableByRacePos: function () {
      var i, j, row, rowData, behind, names, loss;

      rowData = [];
      loss = 0;
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
          row.time = '0:00';
        } else {
          if (this.results[this.resultIndex].splits[i] === this.results[this.resultIndex].splits[i - 1]) {
            row.time = "";
          } else {
            row.time = rg2.utils.formatSecsAsMMSS(this.results[this.resultIndex].splits[i]);
          }
        }
        if ((i === 0) || (this.results[this.resultIndex].racepos[i] === 0)) {
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
        if ((i === 0) || (this.results[this.resultIndex].racepos[i] === 0)) {
          row.behind = "-";
        } else {
          row.behind = rg2.utils.formatSecsAsMMSS(behind);
        }
        if ((i === 0) || (this.results[this.resultIndex].racepos[i] === 0)) {
          row.percent = '-';
        } else {
          row.percent = parseInt((behind * 100 / this.byRacePos[i][0].t), 10);
        }
        loss = loss + this.results[this.resultIndex].loss[i];
        row.loss = rg2.utils.formatSecsAsMMSS(loss);
        rowData.push(row);
      }

      var gridOptions = {
        columnDefs: [
          { headerName: rg2.t("Control"), field: "control", width: 88 },
          { headerName: rg2.t("Time"), field: "time", width: 85 },
          { headerName: rg2.t("Position"), field: "position", width: 100 },
          { headerName: rg2.t("Best"), field: "best", width: 85 },
          { headerName: rg2.t("Who"), field: "who", headerClass: "align-left", cellClass: "align-left", width: 200, tooltipField: "who" },
          { headerName: rg2.t("Behind"), field: "behind", width: 85 },
          { headerName: "%", field: "percent", width: 85 },
          { headerName: "Loss", field: "loss", width: 100 }
        ],
        rowData: rowData,
        domLayout: 'autoHeight',
        defaultColDef: {
          headerClass: "align-center",
          cellClass: "align-center"
        }
      };

      $('#rg2-race-table').empty();
      new agGrid.Grid(document.querySelector('#rg2-race-table'), gridOptions);
    },

    generateSplitsTable: function () {
      var i, j, r, height, row, rowData, columnDefs, ratios;
      columnDefs = [
        { headerName: rg2.t("Pos"), field: "position", width: 60, pinned: "left", sortable: true },
        { headerName: rg2.t("Name"), field: "name", headerClass: "align-left", cellClass: "align-left", width: 150, pinned: "left" },
        { headerName: rg2.t("Time"), field: "time", width: 85 },
      ];
      for (j = 1; j < this.controls - 1; j += 1) {
        columnDefs.push({ headerName: j, field: 'C' + j, cellRenderer: this.renderSplits, width: 110 });
      }
      columnDefs.push({ headerName: rg2.t('F'), field: 'finish', cellRenderer: this.renderSplits, width: 110 });
      columnDefs.push({ headerName: rg2.t('Loss'), field: 'loss', width: 100 });
      columnDefs.push({ headerName: rg2.t('Performance'), field: 'performance', width: 100 });
      columnDefs.push({ headerName: rg2.t('Consistency'), field: 'consistency', width: 100 });

      rowData = [];
      // sort results table: this gets round problems of having multiple classes on one course where results were by class
      this.results.sort(function (a, b) {
        // sort valid times in ascending order
        // sometimes end up with negative or 0 splits so handle those first
        if (a.racepos[a.splits.length - 1] <= 0) {
          return 1;
        } else {
          if (b.racepos[b.splits.length - 1] <= 0) {
            return -1;
          } else {
            return a.racepos[a.splits.length - 1] - b.racepos[b.splits.length - 1];
          }
        }
      });
      for (i = 0; i < this.results.length; i += 1) {
        row = {};
        r = this.results[i];
        if (r.racepos[this.controls - 1] == 0) {
          row.position = "";
        } else {
          row.position = r.racepos[this.controls - 1];
        }
        row.name = r.name;
        row.time = r.time;
        for (j = 1; j < this.controls - 1; j += 1) {
          if (r.splits[j] === r.splits[j - 1]) {
            // no valid split for this control
            row['C' + j] = { split: "0:00", pos: r.racepos[j] };
          } else {
            row['C' + j] = { split: rg2.utils.formatSecsAsMMSS(r.splits[j]), pos: r.racepos[j] };
          }
        }
        row.finish = { split: rg2.utils.formatSecsAsMMSS(r.splits[this.controls - 1]), pos: r.racepos[this.controls - 1] };
        row.loss = rg2.utils.formatSecsAsMMSS(r.timeInSecs - r.totalLoss);
        row.performance = (r.performanceIndex[this.iterations - 1] * 100).toFixed(1);
        // first entry is 0 for start control, so throw that away    
        ratios = r.refRatio.slice(1);
        row.consistency = (100 * this.getStandardDeviation(ratios)).toFixed(1);
        rowData.push(row);
        row = {};
        for (j = 1; j < this.controls - 1; j += 1) {
          row['C' + j] = { split: rg2.utils.formatSecsAsMMSS(r.legSplits[j]), pos: r.legpos[j] };
        }
        row.finish = { split: rg2.utils.formatSecsAsMMSS(r.legSplits[this.controls - 1]), pos: r.legpos[this.controls - 1] };
        row.loss = rg2.utils.formatSecsAsMMSS(r.totalLoss);
        rowData.push(row);
      }

      var gridOptions = {
        columnDefs: columnDefs,
        rowData: rowData,
        defaultColDef: {
          headerClass: "align-center",
          cellClass: "align-center"
        }
      };

      // can't get ag-grid examples to work in terms of height adjustment so this is
      // the quick and dirty fix: 175 is content/padding/margin etc. for everything else in the dialog
      height = ($("#rg2-map-canvas").height() * 0.98) - 175;
      $('#rg2-results-grid-wrapper').removeAttr("style").attr("style", "height: " + height + "px;");
      $('#rg2-results-grid').empty();
      new agGrid.Grid(document.querySelector('#rg2-results-grid'), gridOptions);
    },

    renderSplits: function (params) {
      var html;
      if (params.value.split === "0:00") {
        return "";
      }
      html = params.value.split;
      if (params.value.pos !== 0) {
        html += ' (' + params.value.pos + ')';
        if (params.value.pos === 1) {
          html = '<span class="rg2-first">' + html + '</span>';
        }
        if (params.value.pos === 2) {
          html = '<span class="rg2-second">' + html + '</span>';
        }
        if (params.value.pos === 3) {
          html = '<span class="rg2-third">' + html + '</span>';
        }
      }
      return html;
    },

    getLegPosInfo: function () {
      var i, total, count, best, worst, average;
      total = 0;
      count = 0;
      worst = 0;
      best = 9999;
      for (i = 1; i < this.result.legpos.length; i += 1) {
        if (this.result.legpos[i] === 0) {
          continue;
        }
        total += this.result.legpos[i];
        count += 1;
        if (best > this.result.legpos[i]) {
          best = this.result.legpos[i];
        }
        if (worst < this.result.legpos[i]) {
          worst = this.result.legpos[i];
        }
      }

      // allow for people with no valid leg times
      if (count > 0) {
        average = (total / count).toFixed(1);
      } else {
        average = 0;
        best = 0;
        worst = 0;
      }
      return ({ best: best, worst: worst, average: average });
    },

    analyseCourse: function () {
      var i, k, legTimes, raceTimes;
      this.calculateLostTime();
      this.byLegPos.length = 0;
      this.byRacePos.length = 0;
      legTimes = [];
      raceTimes = [];
      // for each leg
      for (i = 0; i < this.controls; i += 1) {
        legTimes.length = 0;
        raceTimes.length = 0;
        // for each runner
        for (k = 0; k < this.results.length; k += 1) {
          // create array of valid splits to this control
          if (i === 0) {
            // start control
            legTimes.push({ t: 0, resid: 0, pos: 0 });
            raceTimes.push({ t: 0, resid: 0, pos: 0 });
          } else {
            // leg split of 0 means invalid split for this runner for this leg
            if (this.results[k].legSplits[i] !== 0) {
              legTimes.push({ t: this.results[k].legSplits[i], resid: k, pos: this.results[k].legpos[i] });
            }
            // race position only valid if all controls to that point are valid
            if (i <= this.results[k].lastValidSplit) {
              raceTimes.push({ t: this.results[k].splits[i], resid: k, pos: this.results[k].racepos[i] });
            }
          }
        }
        legTimes.sort(function (a, b) {
          return a.t - b.t;
        });
        raceTimes.sort(function (a, b) {
          return a.t - b.t;
        });
        this.byLegPos.push(legTimes.slice());
        this.byRacePos.push(raceTimes.slice());
      }
    },

    calculateLostTime: function () {
      var i, k, iter, splits;
      this.course.refLegTime = [];
      for (i = 0; i < this.results.length; i += 1) {
        this.results[i].performanceIndex = [];
        this.results[i].iterSplits = [];
        splits = [];
        for (k = 0; k < this.controls; k += 1) {
          splits.push(this.results[i].legSplits[k]);
        }
        this.results[i].iterSplits.push(splits.slice(0));
      }

      for (iter = 0; iter < this.iterations; iter += 1) {
        this.iterateLostTime(iter);
        for (i = 0; i < this.results.length; i += 1) {
          splits.length = 0;
          for (k = 0; k < this.controls; k += 1) {
            splits.push(Math.min(this.results[i].predictedSplits[k], this.results[i].legSplits[k]));
          }
          this.results[i].iterSplits.push(splits.slice(0));
        }
      }
    },

    iterateLostTime: function (iter) {

      var i, k, averages, times, ratios, loss, refTimes;
      // find reference times for each leg
      times = [];
      refTimes = [];
      for (i = 0; i < this.controls; i += 1) {
        times.length = 0;
        for (k = 0; k < this.results.length; k += 1) {
          if (this.results[k].iterSplits[iter][i] !== 0) {
            times.push(this.results[k].iterSplits[iter][i]);
          }
        }
        // using average of best 25% of times for the leg
        averages = this.getAverages(times, 25);
        refTimes.push(averages.median);
      }
      this.course.refLegTime.push(refTimes);

      // find ratio to reference times
      ratios = [];
      for (i = 0; i < this.results.length; i += 1) {
        this.results[i].refRatio = [];
        this.results[i].refRatio[0] = 0;
        ratios.length = 0;
        for (k = 0; k < this.controls; k += 1) {
          if (this.results[i].iterSplits[iter][k] === 0) {
            this.results[i].refRatio[k] = 0;
          } else {
            this.results[i].refRatio[k] = this.course.refLegTime[iter][k] / this.results[i].iterSplits[iter][k];
          }
          ratios.push(this.results[i].refRatio[k]);
        }
        averages = this.getAverages(ratios, 100);
        this.results[i].performanceIndex.push(averages.median);
      }

      // find predicted times and losses
      for (i = 0; i < this.results.length; i += 1) {
        this.results[i].predictedSplits = [];
        this.results[i].predictedSplits[0] = 0;
        this.results[i].loss = [];
        this.results[i].loss[0] = 0;
        loss = 0;
        for (k = 0; k < this.controls; k += 1) {
          if (this.results[i].performanceIndex[iter] > 0) {
            this.results[i].predictedSplits[k] = parseInt(this.course.refLegTime[iter][k] / this.results[i].performanceIndex[iter], 10);
          } else {
            this.results[i].predictedSplits[k] = this.results[i].legSplits[k];
          }
          this.results[i].loss[k] = this.results[i].legSplits[k] - this.results[i].predictedSplits[k];
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
