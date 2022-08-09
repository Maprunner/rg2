/*global agGrid:false */
/*global Chart:false */
/*global Promise:false */
(function () {
  function Stats() {
    'use strict';
    this.result = null;
    this.rawid = null;
    this.results = [];
    this.isScoreOrRelay = false;
    this.course = null;
    this.byLegPos = [];
    this.byRacePos = [];
    this.resultIndex = null;
    this.splitsChart = undefined;
    this.legChart = undefined;
    this.activeLeg = 1;
    this.maxIterationIndex = 9;
    // starting iteration to use for display
    this.iterationIndex = 2;
    this.extraStats = false;
  }

  Stats.prototype = {
    Constructor: Stats,

    initialise: function (rawid) {
      this.rawid = rawid;
      this.isScoreOrRelay = rg2.events.isScoreEvent();
      this.result = rg2.results.getFullResultForRawID(this.rawid);
      if (this.isScoreOrRelay) {
        this.results = rg2.results.getAllResultsForVariant(this.result.variant);
      } else {
        this.results = rg2.results.getAllResultsForCourse(this.result.courseid);
      }
      this.initialiseCourse(this.result.courseid);
      this.adjustSplits();
      this.generateLegPositions();
      this.resultIndex = this.setResultIndex(this.rawid);
    },

    adjustSplits: function () {
      // adjust splits for events with excluded controls that have uploaded unadjusted splits
      // total times were adjusted when results were saved initially
      if (this.course.excludeType === rg2.config.EXCLUDED_REAL_SPLITS) {
        for (let i = 0; i < this.results.length; i += 1) {
          let excluded = 0;
          // start at 1 since you can't exclude the start control
          for (let j = 1; j < this.course.exclude.length; j += 1) {
            if (this.course.exclude[j]) {
              const newExclude = Math.min(this.results[i].splits[j] - this.results[i].splits[j - 1] - excluded, this.course.allowed[j]);
              excluded = excluded + newExclude;
            }
            this.results[i].splits[j] = this.results[i].splits[j] - excluded;
            this.results[i].legSplits[j] = this.results[i].splits[j] - this.results[i].splits[j-1];
          }
        }
      }
    },

    generateLegPositions: function () {
      let pos = [];
      // two very similar bits of code: scope to rationalise...
      // Generate positions for each leg
      // start at 1 since 0 is time 0
      for (let k = 1; k < this.course.codes.length; k += 1) {
        pos.length = 0;
        for (let j = 0; j < this.results.length; j += 1) {
          if (this.results[j].resultid === this.results[j].rawid) {
            if (this.results[j].isScoreEvent) {
              if ((this.results[j].variant === this.course.courseid)) {
                pos.push({ time: this.results[j].legSplits[k], id: j });
              }
            } else {
              if ((this.results[j].courseid === this.course.courseid)) {
                pos.push({ time: this.results[j].legSplits[k], id: j });
              }
            }
          }
        }
        // 0 splits sorted to end
        pos.sort(this.sortLegTimes);
        let prevPos = 0;
        let prevTime = 0;
        // set positions
        for (let j = 0; j < pos.length; j += 1) {
          if (this.course.exclude[k]) {
            this.results[pos[j].id].legpos[k] = 0;
            continue;
          }
          if (pos[j].time !== prevTime) {
            if (pos[j].time === 0) {
              // all missing splits sorted to end with time 0
              this.results[pos[j].id].legpos[k] = 0;
              prevTime = 0;
              prevPos = 0;
            } else {
              // new time so position increments
              this.results[pos[j].id].legpos[k] = j + 1;
              prevTime = pos[j].time;
              prevPos = j + 1;
            }
          } else {
            // same time so use same position
            this.results[pos[j].id].legpos[k] = prevPos;
          }
        }
      }

      // Generate positions for cumulative time at each control
      pos.length = 0;

      // start at 1 since 0 is time 0
      for (let k = 1; k < this.course.codes.length; k += 1) {
        pos.length = 0;
        let time = 0;
        for (let j = 0; j < this.results.length; j += 1) {
          if (this.results[j].resultid === this.results[j].rawid) {
            if (this.results[j].isScoreEvent) {
              if ((this.results[j].variant === this.course.courseid)) {
                if (k > this.results[j].lastValidSplit) {
                  time = 0;
                } else {
                  time = this.results[j].splits[k];
                }
                pos.push({ time: time, id: j });
              }
            } else {
              if ((this.results[j].courseid === this.course.courseid)) {
                if (k > this.results[j].lastValidSplit) {
                  time = 0;
                } else {
                  time = this.results[j].splits[k];
                }
                pos.push({ time: time, id: j });
              }
            }
          }
        }
        // 0 splits sorted to end
        pos.sort(this.sortLegTimes);
        let prevPos = 0;
        let prevTime = 0;
        for (let j = 0; j < pos.length; j += 1) {
          if (pos[j].time !== prevTime) {
            if (pos[j].time === 0) {
              this.results[pos[j].id].racepos[k] = 0;
              prevPos = 0;
              prevTime = 0;
            } else {
              // new time so position increments
              this.results[pos[j].id].racepos[k] = j + 1;
              prevTime = pos[j].time;
              prevPos = j + 1;
            }
          } else {
            // same time so use same position
            this.results[pos[j].id].racepos[k] = prevPos;
          }
        }
      }
    },

    sortLegTimes: function (a, b) {
      // sort array of times in ascending order
      // 0 splits get sorted to the bottom
      if (a.time === 0) {
        return 1;
      } else {
        if (b.time === 0) {
          return -1;
        } else {
          return a.time - b.time;
        }
      }
    },

    setResultIndex: function (rawid) {
      for (let i = 0; i < this.results.length; i += 1) {
        if (this.results[i].rawid === rawid) {
          // index for runner we are analysing
          // reset result since we may have adjusted splits for excluded controls
          this.result = this.results[i];
          return i;
        }
      }
      return null;
    },

    rg2Exception: function (msg) {
      this.message = msg;
    },

    showStats: function (rawid) {
      this.rawid = rawid;
      this.extraStats = false;
      this.loadStats(rawid);
    },

    showExtraStats: function (rawid) {
      this.rawid = rawid;
      this.extraStats = true;
      this.loadStats(rawid);
    },

    loadStats: function (rawid) {
      // only deal with "normal events"

      if (!rg2.events.hasResults()) {
        rg2.utils.showWarningDialog(rg2.t("Statistics"), rg2.t("No statistics available for this event format."));
        return;
      }
      $('body').css('cursor', 'wait');
      const loadScript = (src, integrity) => {
        return new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.type = 'text/javascript'
          script.crossOrigin = "anonymous",
          script.referrerPolicy = "no-referrer",
          script.integrity = integrity,
          script.onload = resolve
          script.onerror = reject
          script.src = src
          document.head.append(script)
        })
      }
      const loadCSS = (src) => {
        return new Promise((resolve, reject) => {
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.crossOrigin = "anonymous",
          link.referrerPolicy = "no-referrer",
          link.onload = resolve
          link.onerror = reject
          link.href = src
          document.head.append(link)
        })
      }
      const loadChart = () => {
        if (typeof (Chart) === 'undefined') {
          return Promise.all([loadScript("https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.7.1/chart.min.js",
            "sha512-QSkVNOCYLtj73J4hbmVoOV6KVZuMluZlioC+trLpewV8qMjsWqlIQvkn1KGX2StWvPMdWGBqim1xlC8krl1EKQ=="),
            loadCSS("https://unpkg.com/ag-grid-community/dist/styles/ag-grid.css"),
            loadCSS("https://unpkg.com/ag-grid-community/dist/styles/ag-theme-balham.css")]);
        } else {
          return Promise.resolve();
        }
      }
      const loadGrid = () => {
        if (typeof (agGrid) === 'undefined') {
          return loadScript("https://unpkg.com/ag-grid-community/dist/ag-grid-community.min.noStyle.js",
            "")
        } else {
          return Promise.resolve();
        }
      }
      loadGrid()
      .then(() => loadChart())
        .then(() => {
          $('body').css('cursor', 'auto');
          this.prepareStats(rawid);
      })
        .catch(() => {
          rg2.utils.showWarningDialog(rg2.t("Statistics"), rg2.t("Failed to load Grid and Chart utilities."));
          $('body').css('cursor', 'auto');
        });
    },

    prepareStats: function (rawid) {
      // all sorts of possible data consistency errors that might turn up
      try {
        this.initialise(rawid);
        this.iterateLostTime();
        this.generateSummary();
        this.generateSplitsChart();
        this.generateLegChart();
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

    handleTabActivation: function (event) {
      // tabs not on display yet
      if (!event.currentTarget) {
        return;
      }
      // trap + and - and use them to change iteration count
      switch (event.currentTarget.id) {
        case "rg2-iter-plus-text":
          this.incrementIterations();
          event.preventDefault();
          break;
        case "rg2-iter-minus-text":
          this.decrementIterations();
          event.preventDefault();
          break;
        case "rg2-iter-text":
          event.preventDefault();
          break;
        default:
      }
    },

    displayStats: function () {
      $("#rg2-stats-summary-text").empty().text(rg2.t("Summary"));
      $("#rg2-stats-leg-text").empty().text(rg2.t("Leg times"));
      $("#rg2-stats-cumulative-text").empty().text(rg2.t("Cumulative times"));
      $("#rg2-stats-splits-text").empty().text(rg2.t("Splits"));
      if (this.extraStats) {
        $("#rg2-iter-text").text(this.iterationIndex + 1);
        $("#rg2-iter-plus-text").show();
        $("#rg2-iter-text").show();
        $("#rg2-iter-minus-text").show();
      } else {
        $("#rg2-iter-plus-text").hide();
        $("#rg2-iter-text").hide();
        $("#rg2-iter-minus-text").hide();
      }
      const self = this;
      $("#rg2-stats-tabs").tabs({
        active: 0,
        beforeActivate: function (event) {
          self.handleTabActivation(event);
        }

      });
      // width and height adjustments based on what looks OK when testing...
      $("#rg2-stats-table").dialog({
        title: this.result.name,
        resizable: false,
        maxHeight: $("#rg2-map-canvas").height() * 0.98,
        width: Math.min($("#rg2-map-canvas").width() * 0.8, 1000),
        position: { my: "right top", at: "right top", of: "#rg2-map-canvas" },
      });
    },

    generateSummary: function () {
      const info = this.getLegPosInfo();
      const lossText = rg2.t('Estimated loss');
      let html = rg2.t('Name') + ': <strong>' + this.result.name + '</strong><br>' + rg2.t('Course') + ':<strong>' + this.result.coursename + '</strong><br>';
      html += rg2.t('Time') + ': <strong>' + this.result.time + '</strong><br>';
      html += rg2.t('Position') + ': <strong>' + this.results[this.resultIndex].racepos[this.controls - 1] + ' / ' + this.results.length + '</strong><br>';
      html += rg2.t('Average leg position') + ': <strong>' + info.average + '</strong> (';
      html += rg2.t('Best')  + ': <strong>' + info.best + '</strong>, ' + rg2.t('Worst') + ': <strong>' + info.worst + ')</strong><br>';
      html += lossText + ': <strong>' + rg2.utils.formatSecsAsMMSS(this.results[this.resultIndex].totalLoss[this.iterationIndex]);
      if (this.isNumberOverZero(this.result.timeInSecs)) {
        html += ' (' + (100 * this.results[this.resultIndex].totalLoss[this.iterationIndex] / this.result.timeInSecs).toFixed(1) + ' %)';
      }
      html += '</strong><br>';
      // performanceIndex[0] is based on actual splits
      html += rg2.t('Performance') + ': <strong>' + (this.result.performanceIndex[0] * 100).toFixed(1) + '%</strong><br>';
      // discard all 0 entries which relate to missed controls
      const ratios = this.results[this.resultIndex].refRatio[0].filter((ratio) => ratio > 0);
      html += rg2.t('Consistency') + ': <strong>' + (100 * this.getStandardDeviation(ratios)).toFixed(1) + '%</strong>';
      $("#rg2-stats").empty().append(html);
    },

    generateSplitsChart: function () {
      if (this.splitsChart !== undefined) {
        this.splitsChart.destroy();
        this.splitsChart = undefined;
      }
      const skipped = (ctx, value) => ctx.p0.skip || ctx.p1.skip ? value : undefined;
      const ctx = document.getElementById('rg2-splits-chart');
      const labels = this.results[this.resultIndex].legpos.map((val, idx, array) => idx === array.length - 1 ? "F" : idx);
      const info = this.getLegPosInfo();
      const legPos = this.results[this.resultIndex].legpos.map((val) => val === 0 ? NaN : val);
      const losses = this.results[this.resultIndex].loss[this.iterationIndex].map((val, idx) => this.results[this.resultIndex].legpos[idx] === 0 ? NaN : val)
      const averageLegPos = this.results[this.resultIndex].legpos.map(() => info.average);
      const worst = this.results[this.resultIndex].loss[this.iterationIndex].reduce(((worst, loss) => Math.max(worst, loss)), 0);
      // fit y-axis (loss) to nearest higher multiple of 5 minutes (300 seconds)
      const lossMax = parseInt((worst + 299) / 300, 10) * 300;
      this.splitsChart = new Chart(ctx, {
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Leg position',
              type: 'line',
              data: legPos,
              borderColor: rg2.config.RED,
              backgroundColor: rg2.config.RED_30,
              yAxisID: 'yPosition',
              segment: {
                borderColor: ctx => skipped(ctx, 'rgb(0,0,0,0.2)'),
                borderDash: ctx => skipped(ctx, [6, 6]),
              },
              spanGaps: true
            }, 
            {
              label: 'Average leg position',
              type: 'line',
              data: averageLegPos,
              borderColor: rg2.config.RED,
              backgroundColor: rg2.config.WHITE,
              borderDash: [5, 5],
              yAxisID: 'yPosition',
              pointStyle: 'circle',
              pointRadius: 0,
              pointHoverRadius: 0
            }, 
            {
              label: 'Time loss',
              type: 'bar',
              data: losses,
              borderColor: rg2.config.DARK_GREEN,
              backgroundColor: rg2.config.DARK_GREEN_30,
              yAxisID: 'yLoss',
              segment: {
                borderColor: ctx => skipped(ctx, 'rgb(0,0,0,0.2)'),
                borderDash: ctx => skipped(ctx, [6, 6]),
              },
              spanGaps: true
            }]
        },
        options: {
          scales: {
            x: {
              min: 1,
              title: {
                display: true,
                text: rg2.t("Control")
              }
            },
            yPosition: {
              type: 'linear',
              display: true,
              position: 'left',
              min: 0,
              max: parseInt((this.results.length + 9) /10, 10) * 10,
              title: {
                display: true,
                text: 'Leg position'
              }
            },
            yLoss: {
              type: 'linear',
              display: true,
              position: 'right',
              min: 0,
              max: lossMax,
              grid: {
                drawOnChartArea: false,
              },
              title: {
                display: true,
                text: 'Time loss'
              }
            },
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  if (context.dataset.label === "Time loss") {
                    return "Loss: " + rg2.utils.formatSecsAsMMSS(losses[context.dataIndex]);
                  }
                  if (context.dataset.label === "Leg position") {
                    return "Position: " + legPos[context.dataIndex];
                  }
                  return "";
                },
                title: function (context) {
                  if (context[0].label === "F") {
                    return rg2.t("Finish");
                  }
                  return rg2.t("Control" + " " + context[0].label)
                }
              }
            }
          }
        },
      });
      const splitsChart = document.querySelector('#rg2-splits-chart');
      splitsChart.onwheel = (event) => {
        event.preventDefault();
        if (event.deltaY < 0) {
          this.resultIndex = this.resultIndex === (this.results.length - 1) ? 0 : this.resultIndex + 1;
        } else {
          this.resultIndex = this.resultIndex > 0 ? this.resultIndex - 1 : this.results.length - 1;
        }
        this.prepareStats(this.results[this.resultIndex].rawid);
      };
    },

    incrementIterations: function () {
      this.iterationIndex = Math.min(this.iterationIndex + 1, this.maxIterationIndex);
      this.setIterations();
    },

    decrementIterations: function () {
      this.iterationIndex = Math.max(this.iterationIndex - 1, 0);
      this.setIterations();
    },

    setIterations: function () {
      $("#rg2-iter-text").text(this.iterationIndex + 1);
      this.drawLegChart();
      this.generateSummary();
      this.generateSplitsChart();
      this.generateTableByLegPos();
      this.generateTableByRacePos();
      this.generateSplitsTable();
    },

    generateLegChart: function () {
      const self = this;
      this.activeLeg = 1;
      $("#rg2-control-slider").slider({
        value: this.activeLeg,
        min: 1,
        max: this.results[this.resultIndex].splits.length - 1,
        step: 1,
        slide: function (event, ui) {
          self.activeLeg = ui.value;
          self.drawLegChart();          
        }
      });
      this.drawLegChart();
    },

    drawControlText: function (stacks) {
      let text;
      if ((this.result.splits.length - 1) === this.activeLeg) {
        text = rg2.t("Finish");
      } else {
        text = rg2.t("Control" + ": " + this.activeLeg)
      }
      $("#rg2-control-number").text(text);
      if (this.course.exclude[this.activeLeg]) {
        text = rg2.t("Control excluded");
      } else {
        const losses = stacks.filter((stack) => stack.loss > 0).map((stack) => stack.loss);
        const averages = this.getAverages(losses, 100);
        text = "Runners: " + averages.count + ", average: " + parseInt(averages.mean, 10) + "s (";
        text = text + parseInt((averages.mean * 1000 / this.course.refLegTime[this.iterationIndex][this.activeLeg]), 10) / 10 + "%), median: ";
        text = text + averages.median + "s (" + parseInt((averages.median * 1000 / this.course.refLegTime[this.iterationIndex][this.activeLeg]), 10) / 10 + "%)";
      }
      $("#rg2-loss-details").text(text);
    },

    drawLegChart: function () {
      if (this.legChart !== undefined) {
        this.legChart.destroy();
        this.legChart = undefined;
      }
      const ctx = document.getElementById('rg2-leg-chart');
      const getBackgroundColor = (context) => {
        if (stacks.length === 0) {
          return rg2.DARK_GREEN_30;
        }
        return stacks[context.dataIndex].activeRunner ? rg2.config.DARK_GREEN : rg2.config.DARK_GREEN_30;
      }
      const getBackgroundLossColor = (context) => {
        if (stacks.length === 0) {
          return rg2.RED_30;
        }

        return stacks[context.dataIndex].activeRunner ? rg2.config.RED : rg2.config.RED_30;
      }
      const stacks = [];
      if (!this.course.exclude[this.activeLeg]) {
        this.results.map((res) => {
          // only add runners with valid split for this control
          if (parseInt(res.legSplits[this.activeLeg], 10) > 0) {
            let stack = {};
            stack.loss = parseInt(res.loss[this.iterationIndex][this.activeLeg], 10);
            stack.total = parseInt(res.legSplits[this.activeLeg], 10);
            stack.predicted = stack.total - stack.loss;
            stack.pos = res.legpos[this.activeLeg];
            stack.name = res.name;
            if (res.rawid === this.rawid) {
              stack.activeRunner = true;
            }
            stacks.push(stack);
          }
        });
      }
      stacks.sort((a, b) => a.total - b.total);
      const predicted = stacks.map((res) => res.predicted);
      const losses = stacks.map((res) => res.loss);
      const labels = stacks.map((res) => res.pos);
      const refTime = stacks.map(() => this.course.refLegTime[this.iterationIndex][this.activeLeg]);
      const worst = this.results.reduce(((worst, res) => Math.max(worst, res.legSplits[this.activeLeg])), 0);
      // fit y-axis (time) to nearest higher multiple of 5 minutes (300 seconds)
      const timeMax = parseInt((worst + 299) / 300, 10) * 300;
      this.drawControlText(stacks);
      this.legChart = new Chart(ctx, {
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Predicted',
              type: 'bar',
              data: predicted,
              backgroundColor: getBackgroundColor,
            },
            {
              label: 'Loss',
              type: 'bar',
              data: losses,
              yAxisID: 'yLoss',
              backgroundColor: getBackgroundLossColor,
            },
            {
              label: 'Reference time',
              type: 'line',
              data: refTime,
              borderColor: rg2.config.RED,
              backgroundColor: rg2.config.WHITE,
              borderDash: [5, 5],
              yAxisID: 'yLoss',
              pointStyle: 'circle',
              pointRadius: 0,
              pointHoverRadius: 0
            }, 
          ]
        },
        options: {
          scales: {
            x: {
              stacked: true,
              title: {
                display: true,
                text: "Position"
              },
            },
            yLoss: {
              stacked: true,
              min: 0,
              max: timeMax,
              title: {
                display: true,
                text: 'Time (s)'
              }
            },
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  var label = context.dataset.label + ": ";
                  if (context.dataset.label === "Loss") {
                    label += rg2.utils.formatSecsAsMMSS(stacks[context.dataIndex].loss);
                  } else {
                    label += rg2.utils.formatSecsAsMMSS(stacks[context.dataIndex].predicted);
                  }
                  return label;
                },
                title: function(context) {
                  const title = stacks[context[0].dataIndex].name + ": " + rg2.utils.formatSecsAsMMSS(stacks[context[0].dataIndex].total);
                  return title;
                }
              }
            }
        }

        }
      });
      const legChart = document.querySelector('#rg2-leg-chart');
      legChart.onwheel = (event) => {
        event.preventDefault();
        if (event.deltaY < 0) {
          this.activeLeg = this.activeLeg === (this.result.splits.length - 1) ? 1 : this.activeLeg + 1;
        } else {
          this.activeLeg = this.activeLeg > 1 ? this.activeLeg - 1 : this.result.splits.length - 1;
        }
        $("#rg2-control-slider").slider("value", this.activeLeg);
        this.drawLegChart();
      };
    },

    getMean: function (data) {
      return data.reduce((a, b) => a + b, 0) / data.length;
    },

    getStandardDeviation: function (values) {
      if (values.length === 0) {
        return 0;
      }
      const mean = this.getMean(values);
      return Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / (values.length));
    },

    isNumberOverZero: function (n) {
      if (!isNaN(parseFloat(n)) && isFinite(n)) {
        if (n > 0) {
          return true;
        } else {
          return false;
        }
      }
      return false;
    },

    generateTableByLegPos: function () {
      const rowData = [];
      for (let i = 0; i < this.results[this.resultIndex].splits.length; i += 1) {
        let row = {};
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
        if ((i === 0) || (this.results[this.resultIndex].legpos[i] === 0) || this.course.exclude[i]) {
          row.position = '-';
        } else {
          row.position = this.results[this.resultIndex].legpos[i];
        }
        if ((i === 0) || this.course.exclude[i]) {
          row.performance = '-';
        } else {
          row.performance = (100 * this.results[this.resultIndex].refRatio[0][i]).toFixed(1);
        }
        if (this.course.exclude[i]) {
          row.best = "-";
        } else {
          row.best = rg2.utils.formatSecsAsMMSS(this.byLegPos[i][0].t);
        }
        if ((i === 0) || this.course.exclude[i]) {
          row.who = "-";
        } else {
            let names = this.byLegPos[i][0].name;
            for (let j = 1; j < this.byLegPos[i].length; j += 1) {
              if (this.byLegPos[i][0].t === this.byLegPos[i][j].t) {
                names += ', ' + this.byLegPos[i][j].name;
              } else {
                break;
              }
            }
          row.who = names;
        }
        const behind = this.results[this.resultIndex].legSplits[i] - this.byLegPos[i][0].t;
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
        if (this.course.exclude[i]) {
          row.predicted = "-";
        } else {
          row.predicted = rg2.utils.formatSecsAsMMSS(this.results[this.resultIndex].predictedSplits[this.iterationIndex][i]);
        }
        if (this.results[this.resultIndex].legSplits[i] === 0) {
          row.loss = '-';
        } else {
          row.loss = rg2.utils.formatSecsAsMMSS(this.results[this.resultIndex].loss[this.iterationIndex][i]);
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

    getAverages: function (rawData, perCent) {
      // avoid mutating source array
      let data = rawData.slice();

      if (data.length === 0) {
        return ({ mean: 0, median: 0, count: 0 });
      }
      // sort incoming values
      data.sort(function compare(a, b) {
        return a - b;
      });
      let total = 0;
      let count = data.length;
      // select top perCent items
      if (perCent < 100) {
        // arbitrary choice to keep at least three entries
        const adjustedCount = Math.max(parseInt(count * perCent / 100, 10), 3);
        data.splice(adjustedCount);
        count = data.length;
      }

      for (let i = 0; i < count; i += 1) {
        total = total + data[i];
      }
      let median;
      if (count === 1) {
        median = data[0];
      } else {
        if (count % 2 === 0) {
          median = (data[(count / 2) - 1] + data[count / 2]) / 2;
        } else {
          median = data[Math.floor(count / 2)];
        }
      }
      return ({ mean: total / count, median: median, count: count });
    },

    generateTableByRacePos: function () {
      const rowData = [];
      let loss = 0;
      for (let i = 0; i < this.results[this.resultIndex].splits.length; i += 1) {
        let row = {};
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
          let names = this.byRacePos[i][0].name;
          for (let j = 1; j < this.byRacePos[i].length; j += 1) {
            if (this.byRacePos[i][0].t === this.byRacePos[i][j].t) {
              names += ', ' + this.byRacePos[i][j].name;
            } else {
              break;
            }
          }
          row.who = names;
        }
        const behind = this.results[this.resultIndex].splits[i] - this.byRacePos[i][0].t;
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
        loss = loss + this.results[this.resultIndex].loss[this.iterationIndex][i];
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
     const columnDefs = [
        { headerName: rg2.t("Pos"), field: "position", width: 60, pinned: "left", sortable: true },
        { headerName: rg2.t("Name"), field: "name", headerClass: "align-left", cellClass: "align-left", width: 150, pinned: "left" },
        { headerName: rg2.t("Time"), field: "time", width: 85 },
      ];
      for (let j = 1; j < this.controls - 1; j += 1) {
        columnDefs.push({ headerName: j + ' (' + this.course.codes[j] + ')', field: 'C' + j, cellRenderer: this.renderSplits, width: 110 });
      }
      columnDefs.push({ headerName: rg2.t('F'), field: 'finish', cellRenderer: this.renderSplits, width: 110 });
      columnDefs.push({ headerName: rg2.t('Loss'), field: 'loss', width: 100 });
      columnDefs.push({ headerName: rg2.t('Performance'), field: 'performance', width: 100 });
      columnDefs.push({ headerName: rg2.t('Consistency'), field: 'consistency', width: 100 });

      let rowData = [];
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
      // need to reset index for active result since array has been sorted
      this.resultIndex = this.setResultIndex(this.rawid);
      for (let i = 0; i < this.results.length; i += 1) {
        let row = {};
        const r = this.results[i];
        if (r.racepos[this.controls - 1] == 0) {
          row.position = "";
        } else {
          row.position = r.racepos[this.controls - 1];
        }
        row.name = r.name;
        row.time = r.time;
        for (let j = 1; j < this.controls - 1; j += 1) {
          if (r.splits[j] === r.splits[j - 1]) {
            // no valid split for this control
            row['C' + j] = { split: "0:00", pos: r.racepos[j], loss: false };
          } else {
            row['C' + j] = { split: rg2.utils.formatSecsAsMMSS(r.splits[j]), pos: r.racepos[j], loss:false };
          }
        }
        row.finish = { split: rg2.utils.formatSecsAsMMSS(r.splits[this.controls - 1]), pos: r.racepos[this.controls - 1] };
        row.loss = rg2.utils.formatSecsAsMMSS(r.timeInSecs - r.totalLoss[this.iterationIndex]);
        row.performance = (r.performanceIndex[0] * 100).toFixed(1);
        // discard all 0 entries which relate to missed controls
        const ratios = r.refRatio[0].filter((ratio) => ratio > 0);
        row.consistency = (100 * this.getStandardDeviation(ratios)).toFixed(1);
        rowData.push(row);
        row = {};
        for (let j = 1; j < this.controls - 1; j += 1) {
          // highlight predicted losses greater than 20 seconds
          row['C' + j] = { split: rg2.utils.formatSecsAsMMSS(r.legSplits[j]), pos: r.legpos[j], loss: r.loss[this.iterationIndex][j] > 19 };
        }
        row.finish = { split: rg2.utils.formatSecsAsMMSS(r.legSplits[this.controls - 1]), pos: r.legpos[this.controls - 1], loss: r.loss[this.iterationIndex][this.controls - 1] > 19 };
        row.loss = rg2.utils.formatSecsAsMMSS(r.totalLoss[this.iterationIndex]);
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
      const height = ($("#rg2-map-canvas").height() * 0.98) - 175;
      $('#rg2-results-grid-wrapper').removeAttr("style").attr("style", "height: " + height + "px;");
      $('#rg2-results-grid').empty();
      new agGrid.Grid(document.querySelector('#rg2-results-grid'), gridOptions);
    },

    renderSplits: function (params) {
      if (params.value.split === "0:00") {
        return "";
      }
      let splitinfo = params.value.split;
      let classes = ""
      if (params.value.pos !== 0) {
        splitinfo += ' (' + params.value.pos + ')';
        if (params.value.pos === 1) {
          classes = "rg2-first";
        }
        if (params.value.pos === 2) {
          classes = "rg2-second";
        }
        if (params.value.pos === 3) {
          classes = "rg2-third";
        }
      }
      if (params.value.loss) {
        classes += " rg2-lost-time";
      }
      return '<span class="' + classes + '">' + splitinfo + "</span>";
    },

    getLegPosInfo: function () {
      let total = 0;
      let count = 0;
      let worst = 0;
      let best = 9999;
      for (let i = 1; i < this.result.legpos.length; i += 1) {
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
      let average;
      if (count > 0) {
        average = (total / count).toFixed(1);
      } else {
        average = 0;
        best = 0;
        worst = 0;
      }
      return ({ best: best, worst: worst, average: average });
    },

    initialiseCourse: function (id) {
      if (this.isScoreOrRelay) {
        this.course = { courseid: this.result.variant, codes: this.result.scorecodes, exclude: false };
      } else {
        this.course = rg2.courses.getCourseDetails(id);
      }
      // includes start and finish
      this.controls = this.course.codes.length;
      if (this.controls <= 2) {
        throw new this.rg2Exception(rg2.t('No splits available.'));
      }
      this.byLegPos.length = 0;
      this.byRacePos.length = 0;
      let legTimes = [];
      let raceTimes = [];
      // for each leg
      for (let i = 0; i < this.controls; i += 1) {
        legTimes.length = 0;
        raceTimes.length = 0;
        // for each runner
        for (let k = 0; k < this.results.length; k += 1) {
          // create array of valid splits to this control
          if (i === 0) {
            // start control
            legTimes.push({ t: 0, name: "", pos: 0 });
            raceTimes.push({ t: 0, name: "", pos: 0 });
          } else {
            legTimes.push({ t: this.results[k].legSplits[i], name: this.results[k].name, pos: this.results[k].legpos[i] });
            // race position only valid if all controls to that point are valid
            if (i <= this.results[k].lastValidSplit) {
              raceTimes.push({ t: this.results[k].splits[i], name: this.results[k].name, pos: this.results[k].racepos[i] });
            }
          }
        }
        legTimes.sort(function (a, b) {
          // sort array of times in ascending order: 0 splits get sorted to the bottom
          if (a.t === 0) {
            return 1;
          } else {
            if (b.t === 0) {
              return -1;
            } else {
              return a.t - b.t;
            }
          }
        });
        raceTimes.sort(function (a, b) {
          return a.t - b.t;
        });
        this.byLegPos.push(legTimes.slice());
        this.byRacePos.push(raceTimes.slice());
      }
    },

    iterateLostTime: function () {
      for (let iter = 0; iter <= this.maxIterationIndex; iter += 1) {
        this.calculateSplitsforIteration(iter);
        this.calculatePerformanceForIteration(iter);
        this.calculateLostTimeForIteration(iter);
      }
    },

    calculateSplitsforIteration: function (iter) {
      for (let i = 0; i < this.results.length; i += 1) {
        if (iter === 0) {
          this.results[i].iterSplits = [];
        }
        let splits = [];
        for (let k = 0; k < this.controls; k += 1) {
          if (iter === 0) {
            splits.push(this.results[i].legSplits[k]);
          } else {
             splits.push(this.results[i].predictedSplits[iter - 1][k]);
          }
        }
        this.results[i].iterSplits[iter] = splits.slice(0);
      }
    },

    calculatePerformanceForIteration: function (iter) {
      // find reference times for each leg
      if (iter === 0) {
        this.course.refLegTime = [];
        this.course.refTime = [];
      }
      let times = [];
      let refTimes = [];
      for (let i = 0; i < this.controls; i += 1) {
        times.length = 0;
        if (!this.course.exclude[i]) {
          for (let k = 0; k < this.results.length; k += 1) {
            if (this.results[k].iterSplits[iter][i] !== 0) {
              times.push(this.results[k].iterSplits[iter][i]);
            }
          }
        }
        // using median of best 25% of times (minimum of 3) for the leg
        const averages = this.getAverages(times, 25);
        refTimes.push(averages.median);
      }
      this.course.refLegTime[iter] = refTimes.slice(0);
      this.course.refTime[iter] = refTimes.reduce((a, b) => a + b);
      // find ratio to reference times
      for (let i = 0; i < this.results.length; i += 1) {
        if (iter === 0) {
          this.results[i].refRatio = [];
          this.results[i].performanceIndex = [];
          this.results[i].normalPerformanceIndex = [];
          this.results[i].totalSecs = [];
        }
        this.results[i].refRatio[iter] = [];
        const ratios = [];
        for (let k = 0; k < this.controls; k += 1) {
          if (this.results[i].iterSplits[iter][k] === 0) {
            this.results[i].refRatio[iter][k] = 0;
          } else {
            this.results[i].refRatio[iter][k] = this.course.refLegTime[iter][k] / this.results[i].iterSplits[iter][k];
          }
          ratios.push(this.results[i].refRatio[iter][k]);
        }
        const nonZeroRatios = ratios.filter((ratio) => ratio > 0);
        const averages = this.getAverages(nonZeroRatios, 100);
        this.results[i].performanceIndex[iter] = averages.median;
        this.results[i].totalSecs[iter] = this.results[i].iterSplits[iter].reduce((a, b) => a + b);

        // normal PI weighted by ref times
        let sum = 0;
        let weight = 0;
        for (let k = 0; k < this.controls; k += 1) {
          if (this.results[i].iterSplits[iter][k] !== 0) {
            sum = sum + (this.results[i].refRatio[iter][k] * this.course.refLegTime[iter][k]);
            weight = weight + this.course.refLegTime[iter][k];
          }
        }
        if (sum === 0) {
          this.results[i].normalPerformanceIndex[iter] = 0;
        } else {
          this.results[i].normalPerformanceIndex[iter] = sum / weight;
        }
      }
    },

    calculateLostTimeForIteration: function (iter) {
      // find predicted times and losses
      for (let i = 0; i < this.results.length; i += 1) {
        if (iter === 0) {
          this.results[i].predictedSplits = [];
          this.results[i].loss = [];
          this.results[i].totalLoss = [];
        }
        this.results[i].predictedSplits[iter] = [];
        this.results[i].predictedSplits[iter][0] = 0;
        this.results[i].loss[iter] = [];
        this.results[i].loss[iter][0] = 0;
        let loss = 0;
        for (let k = 0; k < this.controls; k += 1) {
          if (this.results[i].performanceIndex[iter] > 0) {
            this.results[i].predictedSplits[iter][k] = parseInt(this.course.refLegTime[iter][k] / this.results[i].normalPerformanceIndex[iter], 10);
          } else {
            this.results[i].predictedSplits[iter][k] = this.results[i].legSplits[k];
          }
          this.results[i].loss[iter][k] = this.results[i].legSplits[k] - this.results[i].predictedSplits[iter][k];
          if (this.results[i].loss[iter][k] < 0) {
            this.results[i].loss[iter][k] = 0;
          }
          loss = loss + this.results[i].loss[iter][k];
        }
        this.results[i].totalLoss[iter] = loss;
      }
    }
  };
  rg2.Stats = Stats;
}());
