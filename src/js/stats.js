import { config } from "./config"
import { getCourseDetails } from "./courses"
import { eventHasResults, isScoreEvent } from "./events"
import { getAllResultsForCourse, getAllResultsForVariant, getFullResultForRawID } from "./results"
import { t } from "./translate"
import { formatSecsAsMMSS, showWarningDialog } from "./utils"

const tabs = [
  { id: "rg2-stats-summary", title: "Summary", active: "true" },
  { id: "rg2-legs", title: "Leg times" },
  { id: "rg2-cumulative", title: "Cumulative times" },
  { id: "rg2-split-times", title: "Split times" },
  { id: "rg2-time-loss", title: "Time loss" }
]
const content = [
  `<div id="rg2-stats-summary" class="container"></div><div style="height: 400px;"><canvas id="rg2-splits-chart"></canvas></div>`,
  `<div id="rg2-leg-table" style="width: 950px; height: 100%" class="ag-theme-balham"></div>`,
  `<div id="rg2-race-table" style="width: 950px; height: 100%;" class="ag-theme-balham"></div>`,
  `<div id="rg2-results-table" class="rg2-results-table-container">
     <div id="rg2-results-grid-wrapper">
       <div id="rg2-results-grid" style="height: 100%" class="ag-theme-balham"></div>
     </div>
   </div>`,
  `<div id="rg2-time-loss" class="container">
      <div class="rg2-control-slider-grid d-flex flex-column">
        <div class="d-flex">
          <div id="rg2-control-number"></div>
          <div id="rg2-control-slider"></div>
        </div>
        <div id="rg2-loss-details" class="d-flex justify-content-center"></div>
      </div>
      <canvas id="rg2-loss-chart"></canvas>
    </div>`
]

let result = null
let rawid = null
let results = []
let isScoreOrRelay = false
let course = null
let controls = 0
let byLegPos = []
let byRacePos = []
let resultIndex = null
let splitsChart = undefined
let legChart = undefined
let activeLeg = 1
let maxIterationIndex = 9
// starting iteration to use for display
let iterationIndex = 2

function adjustSplits() {
  // adjust splits for events with excluded controls that have uploaded unadjusted splits
  // total times were adjusted when results were saved initially
  if (course.excludeType === config.EXCLUDED_REAL_SPLITS) {
    for (let i = 0; i < results.length; i += 1) {
      let excluded = 0
      // start at 1 since you can't exclude the start control
      for (let j = 1; j < course.exclude.length; j += 1) {
        if (course.exclude[j]) {
          const newExclude = Math.min(results[i].splits[j] - results[i].splits[j - 1] - excluded, course.allowed[j])
          excluded = excluded + newExclude
        }
        results[i].splits[j] = results[i].splits[j] - excluded
        results[i].legSplits[j] = results[i].splits[j] - results[i].splits[j - 1]
      }
    }
  }
}

function calculateLostTimeForIteration(iter) {
  // find predicted times and losses
  for (let i = 0; i < results.length; i += 1) {
    if (iter === 0) {
      results[i].predictedSplits = []
      results[i].loss = []
      results[i].totalLoss = []
    }
    results[i].predictedSplits[iter] = []
    results[i].predictedSplits[iter][0] = 0
    results[i].loss[iter] = []
    results[i].loss[iter][0] = 0
    let loss = 0
    for (let k = 0; k < controls; k += 1) {
      if (results[i].performanceIndex[iter] > 0) {
        results[i].predictedSplits[iter][k] = parseInt(
          course.refLegTime[iter][k] / results[i].normalPerformanceIndex[iter],
          10
        )
      } else {
        results[i].predictedSplits[iter][k] = results[i].legSplits[k]
      }
      results[i].loss[iter][k] = results[i].legSplits[k] - results[i].predictedSplits[iter][k]
      if (results[i].loss[iter][k] < 0) {
        results[i].loss[iter][k] = 0
      }
      loss = loss + results[i].loss[iter][k]
    }
    results[i].totalLoss[iter] = loss
  }
}

function calculatePerformanceForIteration(iter) {
  // find reference times for each leg
  if (iter === 0) {
    course.refLegTime = []
    course.refTime = []
  }
  let times = []
  let refTimes = []
  for (let i = 0; i < controls; i += 1) {
    times.length = 0
    if (!course.exclude[i]) {
      for (let k = 0; k < results.length; k += 1) {
        if (results[k].iterSplits[iter][i] !== 0) {
          times.push(results[k].iterSplits[iter][i])
        }
      }
    }
    // using median of best 25% of times (minimum of 3) for the leg
    const averages = getAverages(times, 25)
    refTimes.push(averages.median)
  }
  course.refLegTime[iter] = refTimes.slice(0)
  course.refTime[iter] = refTimes.reduce((a, b) => a + b)
  // find ratio to reference times
  for (let i = 0; i < results.length; i += 1) {
    if (iter === 0) {
      results[i].refRatio = []
      results[i].performanceIndex = []
      results[i].normalPerformanceIndex = []
      results[i].totalSecs = []
    }
    results[i].refRatio[iter] = []
    const ratios = []
    for (let k = 0; k < controls; k += 1) {
      if (results[i].iterSplits[iter][k] === 0) {
        results[i].refRatio[iter][k] = 0
      } else {
        results[i].refRatio[iter][k] = course.refLegTime[iter][k] / results[i].iterSplits[iter][k]
      }
      ratios.push(results[i].refRatio[iter][k])
    }
    const nonZeroRatios = ratios.filter((ratio) => ratio > 0)
    const averages = getAverages(nonZeroRatios, 100)
    results[i].performanceIndex[iter] = averages.median
    results[i].totalSecs[iter] = results[i].iterSplits[iter].reduce((a, b) => a + b)

    // normal PI weighted by ref times
    let sum = 0
    let weight = 0
    for (let k = 0; k < controls; k += 1) {
      if (results[i].iterSplits[iter][k] !== 0) {
        sum = sum + results[i].refRatio[iter][k] * course.refLegTime[iter][k]
        weight = weight + course.refLegTime[iter][k]
      }
    }
    if (sum === 0) {
      results[i].normalPerformanceIndex[iter] = 0
    } else {
      results[i].normalPerformanceIndex[iter] = sum / weight
    }
  }
}
function calculateSplitsforIteration(iter) {
  for (let i = 0; i < results.length; i += 1) {
    if (iter === 0) {
      results[i].iterSplits = []
    }
    let splits = []
    for (let k = 0; k < controls; k += 1) {
      if (iter === 0) {
        splits.push(results[i].legSplits[k])
      } else {
        splits.push(results[i].predictedSplits[iter - 1][k])
      }
    }
    results[i].iterSplits[iter] = splits.slice(0)
  }
}

function decrementIterations() {
  iterationIndex = Math.max(iterationIndex - 1, 0)
  setIterations()
}

function displayControlDetails(stacks) {
  let control = ""
  let leg = ""
  if (result.splits.length - 1 === activeLeg) {
    control = t("Finish")
  } else {
    control = t("Control")
    leg = ": " + activeLeg
  }
  let html = `<div>${control}${leg}</div>`
  document.getElementById("rg2-control-number").innerHTML = html

  html = ""
  if (course.exclude[activeLeg]) {
    html = t("Control excluded", "")
  } else {
    const losses = stacks.filter((stack) => stack.loss > 0).map((stack) => stack.loss)
    const averages = getAverages(losses, 100)
    html = `<div class="px-2 fw-bold">${t("Runners")}: ${averages.count}</div >`
    html += `<div class="px-2 fw-bold">${t("Average")}: ${parseInt(averages.mean, 10)}s (${
      parseInt((averages.mean * 1000) / course.refLegTime[iterationIndex][activeLeg], 10) / 10
    }%)</div>`
    html += `<div class="px-2 fw-bold">${t("Median")}: ${averages.median}s (${
      parseInt((averages.median * 1000) / course.refLegTime[iterationIndex][activeLeg], 10) / 10
    }%)</div>`
  }
  document.getElementById("rg2-loss-details").innerHTML = html
}

function displayStats() {
  document.getElementById("rg2-stats-panel-tab-headers").addEventListener("show.bs.tab", (e) => {
    handleTabActivation(e)
  })
  // start on Summary tab
  document.getElementById("rg2-stats-summary-tab-label").click()
}

function drawLegChart() {
  if (legChart !== undefined) {
    legChart.destroy()
    legChart = undefined
  }
  const ctx = document.getElementById("rg2-loss-chart")
  const getBackgroundColor = (context) => {
    if (stacks.length === 0) {
      return config.DARK_GREEN_30
    }
    return stacks[context.dataIndex].activeRunner ? config.DARK_GREEN : config.DARK_GREEN_30
  }
  const getBackgroundLossColor = (context) => {
    if (stacks.length === 0) {
      return config.RED_30
    }

    return stacks[context.dataIndex].activeRunner ? config.RED : config.RED_30
  }
  const stacks = []
  if (!course.exclude[activeLeg]) {
    results.map((res) => {
      // only add runners with valid split for this control
      if (parseInt(res.legSplits[activeLeg], 10) > 0) {
        let stack = {}
        stack.loss = parseInt(res.loss[iterationIndex][activeLeg], 10)
        stack.total = parseInt(res.legSplits[activeLeg], 10)
        stack.predicted = stack.total - stack.loss
        stack.pos = res.legpos[activeLeg]
        stack.name = res.name
        if (res.rawid === rawid) {
          stack.activeRunner = true
        }
        stacks.push(stack)
      }
    })
  }
  stacks.sort((a, b) => a.total - b.total)
  const predicted = stacks.map((res) => res.predicted)
  const losses = stacks.map((res) => res.loss)
  const labels = stacks.map((res) => res.pos)
  const refTime = stacks.map(() => course.refLegTime[iterationIndex][activeLeg])
  const worst = results.reduce((worst, res) => Math.max(worst, res.legSplits[activeLeg]), 0)
  // fit y-axis (time) to nearest higher multiple of 5 minutes (300 seconds)
  const timeMax = parseInt((worst + 299) / 300, 10) * 300
  displayControlDetails(stacks)
  legChart = new Chart(ctx, {
    data: {
      labels: labels,
      datasets: [
        {
          label: "Predicted",
          type: "bar",
          data: predicted,
          backgroundColor: getBackgroundColor
        },
        {
          label: "Loss",
          type: "bar",
          data: losses,
          yAxisID: "yLoss",
          backgroundColor: getBackgroundLossColor
        },
        {
          label: "Reference time",
          type: "line",
          data: refTime,
          borderColor: config.RED,
          backgroundColor: config.WHITE,
          borderDash: [5, 5],
          yAxisID: "yLoss",
          pointStyle: "circle",
          pointRadius: 0,
          pointHoverRadius: 0
        }
      ]
    },
    options: {
      scales: {
        x: {
          stacked: true,
          title: {
            display: true,
            text: "Position"
          }
        },
        yLoss: {
          stacked: true,
          min: 0,
          max: timeMax,
          title: {
            display: true,
            text: "Time (s)"
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label(context) {
              let label = context.dataset.label + ": "
              if (context.dataset.label === "Loss") {
                label += formatSecsAsMMSS(stacks[context.dataIndex].loss)
              } else {
                label += formatSecsAsMMSS(stacks[context.dataIndex].predicted)
              }
              return label
            },
            title(context) {
              const title =
                stacks[context[0].dataIndex].name + ": " + formatSecsAsMMSS(stacks[context[0].dataIndex].total)
              return title
            }
          }
        }
      }
    }
  })
  const legChartElement = document.querySelector("#rg2-loss-chart")
  legChartElement.onwheel = (e) => {
    e.preventDefault()
    if (e.deltaY < 0) {
      activeLeg = activeLeg === result.splits.length - 1 ? 1 : activeLeg + 1
    } else {
      activeLeg = activeLeg > 1 ? activeLeg - 1 : result.splits.length - 1
    }
    //document.getElementById("rg2-control-slider").slider("value", activeLeg")
    drawLegChart()
  }
}

function generateLegChart() {
  activeLeg = 1
  // document.getElementById("rg2-control-slider"").slider({
  //   value: activeLeg,
  //   min: 1,
  //   max: results[resultIndex].splits.length - 1,
  //   step: 1,
  //   slide(event, ui) {
  //     activeLeg = ui.value
  //     drawLegChart()
  //   }activeLeg
  // })
  drawLegChart()
}

function generateLegPositions() {
  let pos = []
  // two very similar bits of code: scope to rationalise...
  // Generate positions for each leg
  // start at 1 since 0 is time 0
  for (let k = 1; k < course.codes.length; k += 1) {
    pos.length = 0
    for (let j = 0; j < results.length; j += 1) {
      if (results[j].resultid === results[j].rawid) {
        if (results[j].isScoreEvent) {
          if (results[j].variant === course.courseid) {
            pos.push({ time: results[j].legSplits[k], id: j })
          }
        } else {
          if (results[j].courseid === course.courseid) {
            pos.push({ time: results[j].legSplits[k], id: j })
          }
        }
      }
    }
    // 0 splits sorted to end
    pos.sort(sortLegTimes)
    let prevPos = 0
    let prevTime = 0
    // set positions
    for (let j = 0; j < pos.length; j += 1) {
      if (course.exclude[k]) {
        results[pos[j].id].legpos[k] = 0
        continue
      }
      if (pos[j].time !== prevTime) {
        if (pos[j].time === 0) {
          // all missing splits sorted to end with time 0
          results[pos[j].id].legpos[k] = 0
          prevTime = 0
          prevPos = 0
        } else {
          // new time so position increments
          results[pos[j].id].legpos[k] = j + 1
          prevTime = pos[j].time
          prevPos = j + 1
        }
      } else {
        // same time so use same position
        results[pos[j].id].legpos[k] = prevPos
      }
    }
  }

  // Generate positions for cumulative time at each control
  pos.length = 0

  // start at 1 since 0 is time 0
  for (let k = 1; k < course.codes.length; k += 1) {
    pos.length = 0
    let time = 0
    for (let j = 0; j < results.length; j += 1) {
      if (results[j].resultid === results[j].rawid) {
        if (results[j].isScoreEvent) {
          if (results[j].variant === course.courseid) {
            if (k > results[j].lastValidSplit) {
              time = 0
            } else {
              time = results[j].splits[k]
            }
            pos.push({ time: time, id: j })
          }
        } else {
          if (results[j].courseid === course.courseid) {
            if (k > results[j].lastValidSplit) {
              time = 0
            } else {
              time = results[j].splits[k]
            }
            pos.push({ time: time, id: j })
          }
        }
      }
    }
    // 0 splits sorted to end
    pos.sort(sortLegTimes)
    let prevPos = 0
    let prevTime = 0
    for (let j = 0; j < pos.length; j += 1) {
      if (pos[j].time !== prevTime) {
        if (pos[j].time === 0) {
          results[pos[j].id].racepos[k] = 0
          prevPos = 0
          prevTime = 0
        } else {
          // new time so position increments
          results[pos[j].id].racepos[k] = j + 1
          prevTime = pos[j].time
          prevPos = j + 1
        }
      } else {
        // same time so use same position
        results[pos[j].id].racepos[k] = prevPos
      }
    }
  }
}

function generateSplitsChart() {
  if (splitsChart !== undefined) {
    splitsChart.destroy()
    splitsChart = undefined
  }
  const skipped = (ctx, value) => (ctx.p0.skip || ctx.p1.skip ? value : undefined)
  const ctx = document.getElementById("rg2-splits-chart")
  const labels = results[resultIndex].legpos.map((val, idx, array) => (idx === array.length - 1 ? "F" : idx))
  const info = getLegPosInfo()
  const legPos = results[resultIndex].legpos.map((val) => (val === 0 ? NaN : val))
  const losses = results[resultIndex].loss[iterationIndex].map((val, idx) =>
    results[resultIndex].legpos[idx] === 0 ? NaN : val
  )
  const averageLegPos = results[resultIndex].legpos.map(() => info.average)
  const worst = results[resultIndex].loss[iterationIndex].reduce((worst, loss) => Math.max(worst, loss), 0)
  // fit y-axis (loss) to nearest higher multiple of 5 minutes (300 seconds)
  const lossMax = parseInt((worst + 299) / 300, 10) * 300
  splitsChart = new Chart(ctx, {
    data: {
      labels: labels,
      datasets: [
        {
          label: "Leg position",
          type: "line",
          data: legPos,
          borderColor: config.RED,
          backgroundColor: config.RED_30,
          yAxisID: "yPosition",
          segment: {
            borderColor: (ctx) => skipped(ctx, "rgb(0,0,0,0.2)"),
            borderDash: (ctx) => skipped(ctx, [6, 6])
          },
          spanGaps: true
        },
        {
          label: "Average leg position",
          type: "line",
          data: averageLegPos,
          borderColor: config.RED,
          backgroundColor: config.WHITE,
          borderDash: [5, 5],
          yAxisID: "yPosition",
          pointStyle: "circle",
          pointRadius: 0,
          pointHoverRadius: 0
        },
        {
          label: "Time loss",
          type: "bar",
          data: losses,
          borderColor: config.DARK_GREEN,
          backgroundColor: config.DARK_GREEN_30,
          yAxisID: "yLoss",
          segment: {
            borderColor: (ctx) => skipped(ctx, "rgb(0,0,0,0.2)"),
            borderDash: (ctx) => skipped(ctx, [6, 6])
          },
          spanGaps: true
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      scales: {
        x: {
          min: 1,
          title: {
            display: true,
            text: t("Control", "")
          }
        },
        yPosition: {
          type: "linear",
          display: true,
          position: "left",
          min: 0,
          max: parseInt((results.length + 9) / 10, 10) * 10,
          title: {
            display: true,
            text: "Leg position"
          }
        },
        yLoss: {
          type: "linear",
          display: true,
          position: "right",
          min: 0,
          max: lossMax,
          grid: {
            drawOnChartArea: false
          },
          title: {
            display: true,
            text: "Time loss"
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              if (context.dataset.label === "Time loss") {
                return "Loss: " + formatSecsAsMMSS(losses[context.dataIndex])
              }
              if (context.dataset.label === "Leg position") {
                return "Position: " + legPos[context.dataIndex]
              }
              return ""
            },
            title: function (context) {
              if (context[0].label === "F") {
                return t("Finish", "")
              }
              return t("Control", "") + " " + context[0].label
            }
          }
        }
      }
    }
  })
  const splitsChartElem = document.querySelector("#rg2-splits-chart")
  splitsChartElem.onwheel = (event) => {
    event.preventDefault()
    if (event.deltaY < 0) {
      resultIndex = resultIndex === results.length - 1 ? 0 : resultIndex + 1
    } else {
      resultIndex = resultIndex > 0 ? resultIndex - 1 : results.length - 1
    }
    prepareStats(results[resultIndex].rawid)
  }
}

function generateSplitsTable() {
  const columnDefs = [
    {
      headerName: t("Pos", ""),
      field: "position",
      width: 60,
      pinned: "left",
      sortable: true
    },
    {
      headerName: t("Name", ""),
      field: "name",
      headerClass: "align-left",
      cellClass: "align-left",
      width: 150,
      pinned: "left"
    },
    { headerName: t("Time", ""), field: "time", width: 85 }
  ]
  for (let j = 1; j < controls - 1; j += 1) {
    columnDefs.push({
      headerName: j + " (" + course.codes[j] + ")",
      field: "C" + j,
      cellRenderer: renderSplits,
      width: 110
    })
  }
  columnDefs.push({
    headerName: t("F", ""),
    field: "finish",
    cellRenderer: renderSplits,
    width: 110
  })
  columnDefs.push({ headerName: t("Loss", ""), field: "loss", width: 100 })
  columnDefs.push({
    headerName: t("Performance", ""),
    field: "performance",
    width: 100
  })
  columnDefs.push({
    headerName: t("Consistency", ""),
    field: "consistency",
    width: 100
  })

  let rowData = []
  // sort results table: this gets round problems of having multiple classes on one course where results were by class
  results.sort(function (a, b) {
    // sort valid times in ascending order
    // sometimes end up with negative or 0 splits so handle those first
    if (a.racepos[a.splits.length - 1] <= 0) {
      return 1
    } else {
      if (b.racepos[b.splits.length - 1] <= 0) {
        return -1
      } else {
        return a.racepos[a.splits.length - 1] - b.racepos[b.splits.length - 1]
      }
    }
  })
  // need to reset index for active result since array has been sorted
  resultIndex = setResultIndex(rawid)
  for (let i = 0; i < results.length; i += 1) {
    let row = {}
    const r = results[i]
    if (r.racepos[controls - 1] == 0) {
      row.position = ""
    } else {
      row.position = r.racepos[controls - 1]
    }
    row.name = r.name
    row.time = r.time
    for (let j = 1; j < controls - 1; j += 1) {
      if (r.splits[j] === r.splits[j - 1]) {
        // no valid split for this control
        row["C" + j] = { split: "0:00", pos: r.racepos[j], loss: false }
      } else {
        row["C" + j] = {
          split: formatSecsAsMMSS(r.splits[j]),
          pos: r.racepos[j],
          loss: false
        }
      }
    }
    row.finish = {
      split: formatSecsAsMMSS(r.splits[controls - 1]),
      pos: r.racepos[controls - 1]
    }
    row.loss = formatSecsAsMMSS(r.timeInSecs - r.totalLoss[iterationIndex])
    row.performance = (r.performanceIndex[0] * 100).toFixed(1)
    // discard all 0 entries which relate to missed controls
    const ratios = r.refRatio[0].filter((ratio) => ratio > 0)
    row.consistency = (100 * getStandardDeviation(ratios)).toFixed(1)
    rowData.push(row)
    row = {}
    for (let j = 1; j < controls - 1; j += 1) {
      // highlight predicted losses greater than 20 seconds
      row["C" + j] = {
        split: formatSecsAsMMSS(r.legSplits[j]),
        pos: r.legpos[j],
        loss: r.loss[iterationIndex][j] > 19
      }
    }
    row.finish = {
      split: formatSecsAsMMSS(r.legSplits[controls - 1]),
      pos: r.legpos[controls - 1],
      loss: r.loss[iterationIndex][controls - 1] > 19
    }
    row.loss = formatSecsAsMMSS(r.totalLoss[iterationIndex])
    rowData.push(row)
  }

  const gridOptions = {
    columnDefs: columnDefs,
    rowData: rowData,
    defaultColDef: {
      headerClass: "align-center",
      cellClass: "align-center"
    }
  }

  // can't get ag-grid examples to work in terms of height adjustment so this is
  // the quick and dirty fix: 120 is content/padding/margin etc. for everything else in the dialog
  const height = document.getElementById("rg2-map-canvas").height * 0.98 - 120
  const wrapper = document.getElementById("rg2-results-grid-wrapper")
  wrapper.removeAttribute("style")
  wrapper.setAttribute("style", "height: " + height + "px;")
  const table = document.getElementById("rg2-results-grid")
  table.innerHTML = ""
  new agGrid.Grid(table, gridOptions)
}

function generateSummary() {
  const info = getLegPosInfo()
  const packRow = (elem) => {
    return `${elem}`
  }
  let html = packRow(`<div>${t("Name")}</div><div>${result.name}</div>`)
  html += packRow(`<div>${t("Course")}</div><div>${result.coursename}</div>`)
  html += packRow(`<div>${t("Time")}</div><div>${result.time}</div>`)
  html += packRow(
    `<div>${t("Position")}</div><div>${results[resultIndex].racepos[controls - 1]} / ${results.length}</div>`
  )
  html += packRow(
    `<div>${t("Average leg position")}</div><div>${info.average} (${t("Best", "")}: ${info.best}, ${t("Worst")}: ${
      info.worst
    })</div >`
  )
  let loss = ""
  if (isNumberOverZero(result.timeInSecs)) {
    loss = ` (${((100 * results[resultIndex].totalLoss[iterationIndex]) / result.timeInSecs).toFixed(1)}%)`
  }
  html += packRow(
    `<div>${t("Estimated loss")}</div><div>${formatSecsAsMMSS(
      results[resultIndex].totalLoss[iterationIndex]
    )}${loss}</div>`
  )
  // performanceIndex[0] is based on actual splits
  html += packRow(`<div>${t("Performance")}</div><div>${(result.performanceIndex[0] * 100).toFixed(1)}%</div>`)
  // discard all 0 entries which relate to missed controls
  const ratios = results[resultIndex].refRatio[0].filter((ratio) => ratio > 0)
  html += packRow(`<div>${t("Consistency")}</div><div>${(100 * getStandardDeviation(ratios)).toFixed(1)}%</div>`)
  document.getElementById("rg2-stats-summary").innerHTML = html
}

function generateTableByLegPos() {
  const rowData = []
  for (let i = 0; i < results[resultIndex].splits.length; i += 1) {
    let row = {}
    if (i === 0) {
      row.control = "S"
    } else {
      if (i == results[resultIndex].splits.length - 1) {
        row.control = "F"
      } else {
        row.control = i + " (" + course.codes[i] + ")"
      }
    }
    if (i === 0) {
      row.time = "0:00"
    } else {
      row.time = formatSecsAsMMSS(results[resultIndex].legSplits[i])
    }
    if (i === 0 || results[resultIndex].legpos[i] === 0 || course.exclude[i]) {
      row.position = "-"
    } else {
      row.position = results[resultIndex].legpos[i]
    }
    if (i === 0 || course.exclude[i]) {
      row.performance = "-"
    } else {
      row.performance = (100 * results[resultIndex].refRatio[0][i]).toFixed(1)
    }
    if (course.exclude[i]) {
      row.best = "-"
    } else {
      row.best = formatSecsAsMMSS(byLegPos[i][0].t)
    }
    if (i === 0 || course.exclude[i]) {
      row.who = "-"
    } else {
      let names = byLegPos[i][0].name
      for (let j = 1; j < byLegPos[i].length; j += 1) {
        if (byLegPos[i][0].t === byLegPos[i][j].t) {
          names += ", " + byLegPos[i][j].name
        } else {
          break
        }
      }
      row.who = names
    }
    const behind = results[resultIndex].legSplits[i] - byLegPos[i][0].t
    if (i === 0) {
      row.behind = "-"
    } else {
      if (results[resultIndex].legSplits[i] === 0) {
        row.behind = "-"
      } else {
        row.behind = formatSecsAsMMSS(behind)
      }
    }
    if (i === 0) {
      row.percent = 0
    } else {
      if (results[resultIndex].legSplits[i] === 0) {
        row.percent = "-"
      } else {
        row.percent = parseInt((behind * 100) / byLegPos[i][0].t, 10)
      }
    }
    if (course.exclude[i]) {
      row.predicted = "-"
    } else {
      row.predicted = formatSecsAsMMSS(results[resultIndex].predictedSplits[iterationIndex][i])
    }
    if (results[resultIndex].legSplits[i] === 0) {
      row.loss = "-"
    } else {
      row.loss = formatSecsAsMMSS(results[resultIndex].loss[iterationIndex][i])
    }
    rowData.push(row)
  }

  const gridOptions = {
    columnDefs: [
      { headerName: t("Control", ""), field: "control", width: 80 },
      {
        headerName: t("Time", ""),
        field: "time",
        width: 80,
        comparator: timeComparator.bind(this)
      },
      { headerName: t("Position", ""), field: "position", width: 75 },
      {
        headerName: t("Performance", ""),
        field: "performance",
        width: 95,
        comparator: perfComparator.bind(this)
      },
      { headerName: t("Best", ""), field: "best", width: 80 },
      {
        headerName: t("Who", ""),
        field: "who",
        headerClass: "align-left",
        cellClass: "align-left",
        flex: 1,
        tooltipField: "who"
      },
      {
        headerName: t("Behind", ""),
        field: "behind",
        width: 80,
        comparator: timeComparator.bind(this)
      },
      { headerName: "%", field: "percent", width: 60 },
      {
        headerName: t("Predicted", ""),
        field: "predicted",
        width: 100,
        comparator: timeComparator.bind(this)
      },
      {
        headerName: t("Loss", ""),
        field: "loss",
        width: 75,
        comparator: timeComparator.bind(this)
      }
    ],
    rowData: rowData,
    domLayout: "autoHeight",
    defaultColDef: {
      headerClass: "align-center",
      cellClass: "align-center",
      sortable: true
    }
  }
  const table = document.getElementById("rg2-leg-table")
  table.innerHTML = ""
  new agGrid.Grid(table, gridOptions)
}

function generateTableByRacePos() {
  const rowData = []
  let loss = 0
  for (let i = 0; i < results[resultIndex].splits.length; i += 1) {
    let row = {}
    if (i == 0) {
      row.control = "S"
    } else {
      if (i == results[resultIndex].splits.length - 1) {
        row.control = "F"
      } else {
        row.control = i + " (" + course.codes[i] + ")"
      }
    }
    if (i == 0) {
      row.time = "0:00"
    } else {
      if (results[resultIndex].splits[i] === results[resultIndex].splits[i - 1]) {
        row.time = ""
      } else {
        row.time = formatSecsAsMMSS(results[resultIndex].splits[i])
      }
    }
    if (i === 0 || results[resultIndex].racepos[i] === 0) {
      row.position = "-"
    } else {
      row.position = results[resultIndex].racepos[i]
    }
    row.best = formatSecsAsMMSS(byRacePos[i][0].t)
    if (i === 0) {
      row.who = "-"
    } else {
      let names = byRacePos[i][0].name
      for (let j = 1; j < byRacePos[i].length; j += 1) {
        if (byRacePos[i][0].t === byRacePos[i][j].t) {
          names += ", " + byRacePos[i][j].name
        } else {
          break
        }
      }
      row.who = names
    }
    const behind = results[resultIndex].splits[i] - byRacePos[i][0].t
    if (i === 0 || results[resultIndex].racepos[i] === 0) {
      row.behind = "-"
    } else {
      row.behind = formatSecsAsMMSS(behind)
    }
    if (i === 0 || results[resultIndex].racepos[i] === 0) {
      row.percent = "-"
    } else {
      row.percent = parseInt((behind * 100) / byRacePos[i][0].t, 10)
    }
    loss = loss + results[resultIndex].loss[iterationIndex][i]
    row.loss = formatSecsAsMMSS(loss)
    rowData.push(row)
  }

  const gridOptions = {
    columnDefs: [
      { headerName: t("Control", ""), field: "control", width: 88 },
      { headerName: t("Time", ""), field: "time", width: 85 },
      { headerName: t("Position", ""), field: "position", width: 100 },
      { headerName: t("Best", ""), field: "best", width: 85 },
      {
        headerName: t("Who", ""),
        field: "who",
        headerClass: "align-left",
        cellClass: "align-left",
        flex: 1,
        tooltipField: "who"
      },
      { headerName: t("Behind", ""), field: "behind", width: 85 },
      { headerName: "%", field: "percent", width: 85 },
      { headerName: "Loss", field: "loss", width: 100 }
    ],
    rowData: rowData,
    domLayout: "autoHeight",
    defaultColDef: {
      headerClass: "align-center",
      cellClass: "align-center"
    }
  }

  const table = document.getElementById("rg2-race-table")
  table.innerHTML = ""
  new agGrid.Grid(table, gridOptions)
}

function getAverages(rawData, perCent) {
  // avoid mutating source array
  let data = rawData.slice()

  if (data.length === 0) {
    return { mean: 0, median: 0, count: 0 }
  }
  // sort incoming values
  data.sort(function compare(a, b) {
    return a - b
  })
  let total = 0
  let count = data.length
  // select top perCent items
  if (perCent < 100) {
    // arbitrary choice to keep at least three entries
    const adjustedCount = Math.max(parseInt((count * perCent) / 100, 10), 3)
    data.splice(adjustedCount)
    count = data.length
  }

  for (let i = 0; i < count; i += 1) {
    total = total + data[i]
  }
  let median
  if (count === 1) {
    median = data[0]
  } else {
    if (count % 2 === 0) {
      median = (data[count / 2 - 1] + data[count / 2]) / 2
    } else {
      median = data[Math.floor(count / 2)]
    }
  }
  return { mean: total / count, median: median, count: count }
}

function getLegPosInfo() {
  let total = 0
  let count = 0
  let worst = 0
  let best = 9999
  for (let i = 1; i < result.legpos.length; i += 1) {
    if (result.legpos[i] === 0) {
      continue
    }
    total += result.legpos[i]
    count += 1
    if (best > result.legpos[i]) {
      best = result.legpos[i]
    }
    if (worst < result.legpos[i]) {
      worst = result.legpos[i]
    }
  }

  // allow for people with no valid leg times
  let average
  if (count > 0) {
    average = (total / count).toFixed(1)
  } else {
    average = 0
    best = 0
    worst = 0
  }
  return { best: best, worst: worst, average: average }
}

function getMean(data) {
  return data.reduce((a, b) => a + b, 0) / data.length
}

function getPerfValue(p) {
  if (p === "-") {
    return 0
  } else {
    return parseFloat(p)
  }
}

function getStandardDeviation(values) {
  if (values.length === 0) {
    return 0
  }
  const mean = getMean(values)
  return Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length)
}

export function getStatsHeader() {
  // generates HTML for a Bootstrap Tab layout
  let html = `<ul class="nav nav-pills" id="rg2-stats-panel-tab-headers" role="tablist">`
  // add tab headers
  for (let tab of tabs) {
    const title = t(tab.title)
    const active = tab.active ? " active" : ""
    const index = tab.active ? "" : "tabindex='-1'"
    html += `<li class="nav-item${active}" role="presentation">
    <button class="nav-link" data-bs-toggle="tab" data-bs-target="#${tab.id}-tab"
      type="button" role="tab" ${index}>
      <div id="${tab.id}-tab-label">${title}</div>
    </button>
    </li>`
  }
  html += `</ul>`

  return html
}

export function getStatsLayout() {
  // generates HTML for a Bootstrap Tab layout
  let html = `<div id="rg2-stats-table"><div class="tab-content" id="rg2-stats-panel-tab-body">`
  for (let i = 0; i < tabs.length; i += 1) {
    const active = tabs[i].active ? " active" : ""
    html += `<div class="tab-pane fade ${active} pt-2" id="${tabs[i].id}-tab" role="tabpanel" tabindex="${i}">
      ${content[i]}</div>`
  }
  html += `</div></div></div>`

  return html
}

function getTimeValue(t) {
  // gets "-" or "mm:ss"
  if (t === "-") {
    return 0
  } else {
    return parseFloat(t.replace(":", "."))
  }
}

function handleTabActivation(e) {
  // tabs not on display yet
  if (!e.currentTarget) {
    return
  }
  // trap + and - and use them to change iteration count
  switch (e.currentTarget.id) {
    case "rg2-iter-plus-text":
      incrementIterations()
      e.preventDefault()
      break
    case "rg2-iter-minus-text":
      decrementIterations()
      e.preventDefault()
      break
    case "rg2-iter-text":
      e.preventDefault()
      break
    default:
  }
}

function incrementIterations() {
  iterationIndex = Math.min(iterationIndex + 1, maxIterationIndex)
  setIterations()
}

function initialise(id) {
  rawid = id
  isScoreOrRelay = isScoreEvent()
  result = getFullResultForRawID(rawid)
  if (isScoreOrRelay) {
    results = getAllResultsForVariant(result.variant)
  } else {
    results = getAllResultsForCourse(result.courseid)
  }
  initialiseCourse(result.courseid)
  adjustSplits()
  generateLegPositions()
  resultIndex = setResultIndex(rawid)
}

function initialiseCourse(id) {
  if (isScoreOrRelay) {
    course = {
      courseid: result.variant,
      codes: result.scorecodes,
      exclude: false
    }
  } else {
    course = getCourseDetails(id)
  }
  // includes start and finish
  controls = course.codes.length
  if (controls <= 2) {
    throw new rg2Exception(t("No splits available."))
  }
  byLegPos.length = 0
  byRacePos.length = 0
  let legTimes = []
  let raceTimes = []
  // for each leg
  for (let i = 0; i < controls; i += 1) {
    legTimes.length = 0
    raceTimes.length = 0
    // for each runner
    for (let k = 0; k < results.length; k += 1) {
      // create array of valid splits to this control
      if (i === 0) {
        // start control
        legTimes.push({ t: 0, name: "", pos: 0 })
        raceTimes.push({ t: 0, name: "", pos: 0 })
      } else {
        legTimes.push({
          t: results[k].legSplits[i],
          name: results[k].name,
          pos: results[k].legpos[i]
        })
        // race position only valid if all controls to that point are valid
        if (i <= results[k].lastValidSplit) {
          raceTimes.push({
            t: results[k].splits[i],
            name: results[k].name,
            pos: results[k].racepos[i]
          })
        }
      }
    }
    legTimes.sort(function (a, b) {
      // sort array of times in ascending order: 0 splits get sorted to the bottom
      if (a.t === 0) {
        return 1
      } else {
        if (b.t === 0) {
          return -1
        } else {
          return a.t - b.t
        }
      }
    })
    raceTimes.sort(function (a, b) {
      return a.t - b.t
    })
    byLegPos.push(legTimes.slice())
    byRacePos.push(raceTimes.slice())
  }
}

function isNumberOverZero(n) {
  if (!isNaN(parseFloat(n)) && isFinite(n)) {
    if (n > 0) {
      return true
    } else {
      return false
    }
  }
  return false
}

function iterateLostTime() {
  for (let iter = 0; iter <= maxIterationIndex; iter += 1) {
    calculateSplitsforIteration(iter)
    calculatePerformanceForIteration(iter)
    calculateLostTimeForIteration(iter)
  }
}

export function loadStats(id) {
  // returns true if stats available, false otherwise
  rawid = id
  if (!eventHasResults()) {
    showWarningDialog(t("Statistics", ""), t("No statistics available for this event format.", ""))
    return false
  }
  document.body.style.cursor = "wait"
  const loadScript = (src, integrity) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script")
      script.type = "text/javascript"
      ;(script.crossOrigin = "anonymous"),
        (script.referrerPolicy = "no-referrer"),
        (script.integrity = integrity),
        (script.onload = resolve)
      script.onerror = reject
      script.src = src
      document.head.append(script)
    })
  }
  const loadCSS = (src) => {
    return new Promise((resolve, reject) => {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      ;(link.crossOrigin = "anonymous"), (link.referrerPolicy = "no-referrer"), (link.onload = resolve)
      link.onerror = reject
      link.href = src
      document.head.append(link)
    })
  }
  const loadChart = () => {
    if (typeof Chart === "undefined") {
      return Promise.all([
        loadScript(
          "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.2.0/chart.umd.min.js",
          "sha512-0gS26t/01v98xlf2QF4QS1k32/YHWfFs8HfBM/j7gS97Tr8WxpJqoiDND8r1HgFwGGYRs0aRt33EY8xE91ZgJw=="
        ),
        loadCSS("https://cdn.jsdelivr.net/npm/ag-grid-community/styles/ag-grid.css"),
        loadCSS("https://cdn.jsdelivr.net/npm/ag-grid-community/styles/ag-theme-balham.css")
      ])
    } else {
      return Promise.resolve()
    }
  }
  const loadGrid = () => {
    if (typeof agGrid === "undefined") {
      return loadScript("https://unpkg.com/ag-grid-community@28.2.1/dist/ag-grid-community.min.noStyle.js", "")
    } else {
      return Promise.resolve()
    }
  }
  loadGrid()
    .then(() => loadChart())
    .then(() => {
      document.body.style.cursor = "auto"
      prepareStats(rawid)
    })
    .catch(() => {
      showWarningDialog(t("Statistics", ""), t("Failed to load Grid and Chart utilities.", ""))
      document.body.style.cursor = "auto"
    })
  return true
}

function perfComparator(p1, p2) {
  return getPerfValue(p1) - getPerfValue(p2)
}

function prepareStats(rawid) {
  // all sorts of possible data consistency errors that might turn up
  try {
    initialise(rawid)
    iterateLostTime()
    generateSummary()
    generateSplitsChart()
    generateLegChart()
    generateTableByLegPos()
    generateTableByRacePos()
    generateSplitsTable()
    displayStats()
  } catch (err) {
    if (err instanceof rg2Exception) {
      // one we trapped ourselves
      showWarningDialog(t("Statistics"), err.message)
    } else {
      // general problem: probably an index out of bounds on an array somewhere: dodgy results files
      showWarningDialog(t("Statistics", ""), t("Data inconsistency.", ""))
    }
    return
  }
}

function renderSplits(params) {
  if (params.value.split === "0:00") {
    return ""
  }
  let splitinfo = params.value.split
  let classes = ""
  if (params.value.pos !== 0) {
    splitinfo += " (" + params.value.pos + ")"
    if (params.value.pos === 1) {
      classes = "rg2-first"
    }
    if (params.value.pos === 2) {
      classes = "rg2-second"
    }
    if (params.value.pos === 3) {
      classes = "rg2-third"
    }
  }
  if (params.value.loss) {
    classes += " rg2-lost-time"
  }
  return '<span class="' + classes + '">' + splitinfo + "</span>"
}

function rg2Exception(msg) {
  this.message = msg
}

function setIterations() {
  document.getElementById("rg2-iter-count-tab-label").innerText = iterationIndex + 1
  drawLegChart()
  generateSummary()
  generateSplitsChart()
  generateTableByLegPos()
  generateTableByRacePos()
  generateSplitsTable()
}

function setResultIndex(rawid) {
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].rawid === rawid) {
      // index for runner we are analysing
      // reset result since we may have adjusted splits for excluded controls
      result = results[i]
      return i
    }
  }
  return null
}

function sortLegTimes(a, b) {
  // sort array of times in ascending order
  // 0 splits get sorted to the bottom
  if (a.time === 0) {
    return 1
  } else {
    if (b.time === 0) {
      return -1
    } else {
      return a.time - b.time
    }
  }
}

function timeComparator(t1, t2) {
  return getTimeValue(t1) - getTimeValue(t2)
}
