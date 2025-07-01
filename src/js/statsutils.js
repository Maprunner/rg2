import { t } from "./translate"

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

export const gridOptionsByLegPos = {
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
  domLayout: "autoHeight",
  defaultColDef: {
    headerClass: "align-center",
    cellClass: "align-center",
    sortable: true
  }
}

export const gridOptionsByRacePos = {
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
  domLayout: "autoHeight",
  defaultColDef: {
    headerClass: "align-center",
    cellClass: "align-center"
  }
}

export const gridOptionsSpeed = {
  domLayout: "autoHeight",
  rowClassRules: {
    // apply green to 2008
    "fw-bold": (params) => {
      return params.data.name === "Total"
    }
  },
  defaultColDef: {
    headerClass: "align-center",
    cellClass: "align-center",
    sortable: true
  }
}

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

export function getLegPosInfo(result) {
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

function perfComparator(p1, p2) {
  return getPerfValue(p1) - getPerfValue(p2)
}

export function renderSplits(params) {
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
