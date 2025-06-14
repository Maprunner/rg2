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
