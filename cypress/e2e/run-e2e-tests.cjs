const cypress = require("cypress")
const specs = [
  "cypress/e2e/1-core/core.cy.js",
  "cypress/e2e/1-core/load-normal-event.cy.js",
  "cypress/e2e/1-core/load-score-event.cy.js",
  "cypress/e2e/1-core/load-event-no-results.cy.js",
  "cypress/e2e/1-core/results.cy.js",
  "cypress/e2e/1-core/touch.cy.js",
  "cypress/e2e/1-core/extras.cy.js",
  "cypress/e2e/2-draw/draw.cy.js",
  "cypress/e2e/3-gps/gps.cy.js",
  "cypress/e2e/3-gps/gps-adjustment.cy.js",
  "cypress/e2e/4-replay/replay.cy.js",
  "cypress/e2e/5-manager/login.cy.js",
  "cypress/e2e/5-manager/manage-maps.cy.js",
  "cypress/e2e/5-manager/create-event-1.cy.js",
  "cypress/e2e/5-manager/create-event-2.cy.js",
  "cypress/e2e/5-manager/create-event-3.cy.js",
  "cypress/e2e/5-manager/edit-event.cy.js"
]
cypress
  .run({
    browser: "chrome",
    config: {},
    spec: [specs].join(","),
    env: {}
  })
  .then((results) => {
    //console.log(results)
  })
  .catch((err) => {
    console.error(err)
  })
