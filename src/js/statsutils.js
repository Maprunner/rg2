export const tabs = [
  { id: "rg2-stats-summary", title: "Summary", active: "true" },
  { id: "rg2-legs", title: "Leg times" },
  { id: "rg2-cumulative", title: "Cumulative times" },
  { id: "rg2-split-times", title: "Split times" },
  { id: "rg2-time-loss", title: "Time loss" },
  { id: "rg2-speed-stats", title: "Speed" }
]

export const content = [
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
   </div>`,
  `<div id="rg2-speed-stats" style="width: 950px; height: 100%" class="ag-theme-balham"></div>`
]

export const nameButtons = `<div class="rg2-stats-runner-change pe-4">
      <button class="rg2-stats-name-back btn btn-outline-primary btn-sm p-2">
        &lt;
      </button>
      <button class="rg2-stats-name-forward btn btn-outline-primary btn-sm p-2">
        &gt;
      </button>
    </div >`

export const courseButtons = `<div class="rg2-stats-course-change pe-4">
      <button class="rg2-stats-course-back btn btn-outline-primary btn-sm p-2">
        &lt;
      </button>
      <button class="rg2-stats-course-forward btn btn-outline-primary btn-sm p-2">
        &gt;
      </button>
    </div >`

export function getAverages(rawData, perCent) {
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

export function getStandardDeviation(values) {
  if (values.length === 0) {
    return 0
  }
  const mean = getMean(values)
  return Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length)
}

function getTimeValue(t) {
  // gets "-" or "mm:ss"
  if (t === "-") {
    return 0
  } else {
    return parseFloat(t.replace(":", "."))
  }
}

export function isNumberOverZero(n) {
  if (!isNaN(parseFloat(n)) && isFinite(n)) {
    if (n > 0) {
      return true
    } else {
      return false
    }
  }
  return false
}

export function perfComparator(p1, p2) {
  return getPerfValue(p1) - getPerfValue(p2)
}

export function sortLegTimes(a, b) {
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

export function timeComparator(t1, t2) {
  return getTimeValue(t1) - getTimeValue(t2)
}
