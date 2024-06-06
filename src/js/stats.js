import { createGrid, ModuleRegistry } from "@ag-grid-community/core"
import * as bootstrap from "bootstrap"
import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model"
import Chart from "chart.js/auto"
import { config } from "./config"
import { getCourseDetails, getCourses } from "./courses"
import { eventHasResults, isScoreEvent } from "./events"
import { getAllResultsForCourse, getAllResultsForVariant, getFullResultForRawID } from "./results"
import { t } from "./translate"
import { formatSecsAsMMSS, showWarningDialog } from "./utils"

ModuleRegistry.registerModules([ClientSideRowModelModule])

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
     <div class="d-flex align-items-center justify-content-between">
       <div class="d-flex align-items-center">
         <div id="rg2-control-change" class="pe-4">
           <button id="rg2-stats-control-back" class="btn btn-outline-primary btn-sm p-2">&lt;</button>
           <button id="rg2-stats-control-forward" class="btn btn-outline-primary btn-sm p-2">&gt;</button>
         </div>
         <div id="rg2-control-number" class="fw-bold pe-2"></div>
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
// value returned as event.target.dataset.bsTarget for click on tab header
const startTab = "#rg2-stats-summary-tab-label"
let activeTab = startTab

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

function changeControlNumberDown() {
  activeLeg = activeLeg === result.splits.length - 1 ? 1 : activeLeg + 1
  drawLegChart()
}

function changeControlNumberUp() {
  activeLeg = activeLeg > 1 ? activeLeg - 1 : result.splits.length - 1
  drawLegChart()
}

function changeCourse(direction) {
  // aim is to switch course and start with first runner on that course
  // stay where we are if anything goes wrong
  let rawid = results[resultIndex].rawid
  // slight concern this might be a mess for some events
  // courses is a sparse array with no entry [0] to start with
  try {
    const courses = getCourses()
    let index = courses.findIndex((row) => {
      if (!row) return false
      return row.courseid === course.courseid
    })
    if (direction < 0) {
      index = index === courses.length - 1 ? 1 : index + 1
    } else {
      index = index > 1 ? index - 1 : courses.length - 1
    }
    const courseid = courses[index].courseid
    const results = getAllResultsForCourse(courseid)
    if (results.length > 0) {
      rawid = results[0].rawid
    }
  } catch (err) {
    console.log("Error switching to new course: " + err)
  }
  prepareStats(rawid)
}

function changeName(direction) {
  if (direction < 0) {
    resultIndex = resultIndex === results.length - 1 ? 0 : resultIndex + 1
  } else {
    resultIndex = resultIndex > 0 ? resultIndex - 1 : results.length - 1
  }
  prepareStats(results[resultIndex].rawid)
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
    html = `<div class="px-2 fw-bold">${t("Runners with loss")}: ${averages.count}</div >`
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
    handleTabActivation(e.target)
  })

  const nameBack = document.getElementsByClassName("rg2-stats-name-back")
  for (let row of nameBack) {
    row.addEventListener("click", () => {
      changeName(1)
    })
  }
  const nameForward = document.getElementsByClassName("rg2-stats-name-forward")
  for (let row of nameForward) {
    row.addEventListener("click", () => {
      changeName(-1)
    })
  }

  const courseBack = document.getElementsByClassName("rg2-stats-course-back")
  for (let row of courseBack) {
    row.addEventListener("click", () => {
      changeCourse(1)
    })
  }
  const courseForward = document.getElementsByClassName("rg2-stats-course-forward")
  for (let row of courseForward) {
    row.addEventListener("click", () => {
      changeCourse(-1)
    })
  }

  document.getElementById("rg2-stats-control-back").addEventListener("click", changeControlNumberUp)
  document.getElementById("rg2-stats-control-forward").addEventListener("click", changeControlNumberDown)

  // start on active tab: need to remove # which Bootstrap adds for some reason
  document.getElementById(activeTab.replace("#", "")).click()
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
  const getBackgroundGainColor = (context) => {
    if (stacks.length === 0) {
      return config.BLUE_30
    }
    return stacks[context.dataIndex].activeRunner ? config.BLUE : config.BLUE_30
  }
  const getBackgroundPredictedColor = (context) => {
    if (stacks.length === 0) {
      return config.PURPLE_30
    }
    return stacks[context.dataIndex].activeRunner ? config.PURPLE : config.PURPLE_30
  }

  const stacks = []
  if (!course.exclude[activeLeg]) {
    results.map((res) => {
      // only add runners with valid split for this control
      if (parseInt(res.legSplits[activeLeg], 10) > 0) {
        let stack = {}
        // either plot predicted + loss (= actual) or actual + gain (= predicted)
        const loss = parseInt(res.loss[iterationIndex][activeLeg], 10)
        const predicted = parseInt(res.predictedSplits[iterationIndex][activeLeg], 10)
        const actual = parseInt(res.legSplits[activeLeg], 10)
        stack.loss = loss
        stack.predicted = loss === 0 ? 0 : predicted
        stack.rawPredicted = predicted
        stack.actual = actual <= predicted ? actual : 0
        stack.gain = actual <= predicted ? predicted - actual : 0
        stack.realSplit = actual
        stack.pos = res.legpos[activeLeg]
        stack.name = res.name
        if (res.rawid === rawid) {
          stack.activeRunner = true
        }
        stacks.push(stack)
      }
    })
  }
  stacks.sort((a, b) => a.realSplit - b.realSplit)
  const predicted = stacks.map((res) => res.predicted)
  const actuals = stacks.map((res) => res.actual)
  const losses = stacks.map((res) => res.loss)
  const gains = stacks.map((res) => res.gain)
  const labels = stacks.map((res) => res.pos)
  const refTime = stacks.map(() => course.refLegTime[iterationIndex][activeLeg])
  const worst = results.reduce((worst, res) => Math.max(worst, res.legSplits[activeLeg]), 0)
  // fit y-axis to nearest higher multiple of x seconds
  const scaleBase = 120
  const timeMax = parseInt((worst + scaleBase - 1) / scaleBase, 10) * scaleBase
  displayControlDetails(stacks)
  legChart = new Chart(ctx, {
    data: {
      labels: labels,
      datasets: [
        {
          label: "Actual",
          type: "bar",
          data: actuals,
          backgroundColor: getBackgroundColor
        },
        {
          label: "Gain",
          type: "bar",
          data: gains,
          yAxisID: "yLoss",
          backgroundColor: getBackgroundGainColor
        },
        {
          label: "Predicted",
          type: "bar",
          data: predicted,
          yAxisID: "yLoss",
          backgroundColor: getBackgroundPredictedColor
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
                if (context.dataset.label === "Gain") {
                  label += formatSecsAsMMSS(stacks[context.dataIndex].gain)
                } else {
                  if (context.dataset.label === "Actual") {
                    label += formatSecsAsMMSS(stacks[context.dataIndex].actual)
                  } else {
                    label += formatSecsAsMMSS(stacks[context.dataIndex].predicted)
                  }
                }
              }
              return label
            },
            title(context) {
              const title =
                stacks[context[0].dataIndex].name + ": " + formatSecsAsMMSS(stacks[context[0].dataIndex].realSplit)
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
    e.deltaY < 0 ? changeControlNumberDown() : changeControlNumberUp()
  }
}

function generateLegChart() {
  activeLeg = 1
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
  const res = results[resultIndex]
  const labels = res.legpos.map((val, idx, array) => (idx === array.length - 1 ? "F" : idx))
  const info = getLegPosInfo()
  const legPos = res.legpos.map((val) => (val === 0 ? NaN : val))
  const losses = res.loss[iterationIndex].map((val, idx) => (res.legpos[idx] === 0 ? NaN : val))
  const gains = res.predictedSplits[iterationIndex].map((pred, idx) =>
    res.legpos[idx] === 0 ? NaN : pred > res.legSplits[idx] ? pred - res.legSplits[idx] : 0
  )
  const averageLegPos = res.legpos.map(() => info.average)
  const worst = losses.reduce((worst, loss) => Math.max(worst, isNaN(loss) ? 0 : loss), 0)
  const best = gains.reduce((best, gain) => Math.max(best, isNaN(gain) ? 0 : gain), 0)
  // fit y-axis (loss) to nearest higher multiple of x seconds
  const scaleBase = 120
  const lossGainMax = parseInt((Math.max(worst, best) + scaleBase - 1) / scaleBase, 10) * scaleBase
  splitsChart = new Chart(ctx, {
    data: {
      labels: labels,
      datasets: [
        {
          label: "Leg position",
          type: "line",
          data: legPos,
          borderColor: config.PURPLE,
          backgroundColor: config.PURPLE_30,
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
          borderColor: config.RED,
          backgroundColor: config.RED_30,
          yAxisID: "yLoss",
          segment: {
            borderColor: (ctx) => skipped(ctx, "rgb(0,0,0,0.2)"),
            borderDash: (ctx) => skipped(ctx, [6, 6])
          }
        },
        {
          label: "Time gain",
          type: "bar",
          data: gains,
          borderColor: config.BLUE,
          backgroundColor: config.BLUE_30,
          yAxisID: "yLoss",
          segment: {
            borderColor: (ctx) => skipped(ctx, "rgb(0,0,0,0.2)"),
            borderDash: (ctx) => skipped(ctx, [6, 6])
          }
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
          },
          stacked: true
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
          max: lossGainMax,
          grid: {
            drawOnChartArea: false
          },
          title: {
            display: true,
            text: "Time gain/loss (s)"
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
              if (context.dataset.label === "Time gain") {
                return "Gain: " + formatSecsAsMMSS(gains[context.dataIndex])
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
    event.deltaY < 0 ? changeName(-1) : changeName(1)
  }
}

function generateSplitsTable() {
  const columnDefs = [
    {
      headerName: t("Pos", ""),
      field: "position",
      cellDataType: "text",
      width: 60,
      pinned: "left",
      sortable: true
    },
    {
      headerName: t("Name", ""),
      field: "name",
      cellDataType: "text",
      headerClass: "align-left",
      cellClass: "align-left",
      width: 150,
      pinned: "left"
    },
    { headerName: t("Time", ""), field: "time", cellDataType: "text", width: 85 }
  ]
  for (let j = 1; j < controls - 1; j += 1) {
    columnDefs.push({
      headerName: j + " (" + course.codes[j] + ")",
      field: "C" + j,
      cellDataType: "text",
      cellRenderer: renderSplits,
      width: 110
    })
  }
  columnDefs.push({
    headerName: t("F", ""),
    field: "finish",
    cellDataType: "text",
    cellRenderer: renderSplits,
    width: 110
  })
  columnDefs.push({ headerName: t("Loss", ""), field: "loss", cellDataType: "text", width: 100 })
  columnDefs.push({
    headerName: t("Performance", ""),
    field: "performance",
    cellDataType: "text",
    width: 100
  })
  columnDefs.push({
    headerName: t("Consistency", ""),
    field: "consistency",
    cellDataType: "text",
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
  createGrid(table, gridOptions)
}

function generateSummary() {
  const info = getLegPosInfo()
  const packRow = (elem) => {
    return `${elem}`
  }
  const nameButtons = `<div class="rg2-stats-runner-change pe-4">
      <button class="rg2-stats-name-back btn btn-outline-primary btn-sm p-2">
        &lt;
      </button>
      <button class="rg2-stats-name-forward btn btn-outline-primary btn-sm p-2">
        &gt;
      </button>
    </div >`

  const courseButtons = `<div class="rg2-stats-course-change pe-4">
      <button class="rg2-stats-course-back btn btn-outline-primary btn-sm p-2">
        &lt;
      </button>
      <button class="rg2-stats-course-forward btn btn-outline-primary btn-sm p-2">
        &gt;
      </button>
    </div >`

  let html = packRow(`<div class="d-flex align-items-center justify-content-between pb-4">`)
  html += packRow(`<div class="d-flex align-items-center">`)
  html += packRow(`${nameButtons}`)
  html += packRow(`<div class="fw-bold pe-4">${result.name}</div>`)
  html += packRow(`<div class="fw-bold pe-4">${result.time}</div>`)
  html += packRow(`<div class="fw-bold pe-4">(${results[resultIndex].racepos[controls - 1]}/${results.length})</div>`)
  let loss = ""
  if (isNumberOverZero(result.timeInSecs)) {
    loss = ` (${((100 * results[resultIndex].totalLoss[iterationIndex]) / result.timeInSecs).toFixed(1)}%)`
  }
  html += packRow(
    `<div class="fw-bold pe-4">${t("Estimated loss")}: ${formatSecsAsMMSS(results[resultIndex].totalLoss[iterationIndex])}${loss}</div>`
  )
  html += packRow(`</div>`)
  html += packRow(`<div class="d-flex align-items-center">`)
  html += packRow(`<div class="fw-bold pe-4">${result.coursename}</div><div>${courseButtons}</div>`)
  html += packRow(`</div></div>`)
  // put title row at top of each tab
  const titles = document.getElementsByClassName("rg2-stats-title-row")
  for (let title of titles) {
    title.innerHTML = html
  }

  html = `<div class="d-flex align-items-center">`
  html += packRow(
    `<div class="fw-bold pe-4">${t("Average leg position")}: ${info.average} (${t("Best", "")}: ${info.best}, ${t("Worst")}: ${
      info.worst
    })</div >`
  )

  // performanceIndex[0] is based on actual splits
  html += packRow(
    `<div  class="fw-bold pe-4">${t("Performance")} ${(result.performanceIndex[0] * 100).toFixed(1)}%</div>`
  )
  // discard all 0 entries which relate to missed controls
  const ratios = results[resultIndex].refRatio[0].filter((ratio) => ratio > 0)
  html += packRow(`<div  class="fw-bold">${t("Consistency")} ${(100 * getStandardDeviation(ratios)).toFixed(1)}%</div>`)
  html += packRow(`</div>`)
  document.getElementById("rg2-stats-summary").innerHTML = html
}

function generateTableByLegPos() {
  const rowData = []
  for (let i = 0; i < results[resultIndex].splits.length; i += 1) {
    let row = {}
    row.name = result.name
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
      if (results[resultIndex].legSplits[i] <= 0) {
        row.behind = "-"
      } else {
        row.behind = formatSecsAsMMSS(behind)
      }
    }
    if (i === 0) {
      row.percent = 0
    } else {
      if (results[resultIndex].legSplits[i] <= 0) {
        row.percent = 0
      } else {
        row.percent = parseInt((behind * 100) / byLegPos[i][0].t, 10)
      }
    }
    if (course.exclude[i]) {
      row.predicted = "-"
    } else {
      row.predicted = formatSecsAsMMSS(results[resultIndex].predictedSplits[iterationIndex][i])
    }
    if (results[resultIndex].legSplits[i] <= 0) {
      row.loss = ""
    } else {
      const loss = results[resultIndex].predictedSplits[iterationIndex][i] - results[resultIndex].legSplits[i]
      row.loss = loss >= 0 ? formatSecsAsMMSS(loss) : "-" + formatSecsAsMMSS(loss * -1)
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
        cellClass: (params) => {
          return params.data.who.indexOf(params.data.name) > -1 ? "rg2-green-text align-left" : "align-left"
        },
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
        headerName: t("+/-", ""),
        field: "loss",
        width: 75,
        cellClass: (params) => {
          return params.data.loss.substring(0, 1) === "-" ? "rg2-red-text align-center" : "align-center"
        },
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
  createGrid(table, gridOptions)
}

function generateTableByRacePos() {
  const rowData = []
  let loss = 0
  for (let i = 0; i < results[resultIndex].splits.length; i += 1) {
    let row = {}
    row.name = result.name
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
        cellClass: (params) => {
          return params.data.who.indexOf(params.data.name) > -1 ? "rg2-green-text align-left" : "align-left"
        },
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
  createGrid(table, gridOptions)
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
  // class rather than id since we use this on multiple tabs and all need to be kept in sync
  const statsTitleRow = `<div class="rg2-stats-title-row container"></div>`
  // generates HTML for a Bootstrap Tab layout
  let html = `<div id="rg2-stats-table"><div class="tab-content" id="rg2-stats-panel-tab-body">`
  for (let i = 0; i < tabs.length; i += 1) {
    const active = tabs[i].active ? " active" : ""
    html += `<div class="tab-pane fade ${active} pt-2" id="${tabs[i].id}-tab" role="tabpanel" tabindex="${i}">
      ${statsTitleRow}${content[i]}</div>`
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

function handleTabActivation(target) {
  activeTab = target?.dataset?.bsTarget
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

export function loadStats(rawid) {
  if (!eventHasResults()) {
    showWarningDialog(t("Statistics", ""), t("No statistics available for this event format.", ""))
    return false
  }
  activeTab = startTab
  return prepareStats(rawid)
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
    return true
  } catch (err) {
    if (err instanceof rg2Exception) {
      // one we trapped ourselves
      showWarningDialog(t("Statistics"), err.message)
    } else {
      // general problem: probably an index out of bounds on an array somewhere: dodgy results files
      showWarningDialog(t("Statistics", ""), t("Data inconsistency.", ""))
    }
    bootstrap.Offcanvas.getInstance(document.getElementById("rg2-right-info-panel")).hide()
  }
  return false
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
