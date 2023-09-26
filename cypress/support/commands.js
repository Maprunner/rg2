// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// need this to wait for event handlers to be active on modal dialogs
// see https://www.cypress.io/blog/2019/01/22/when-can-the-test-click/
const retryClick = ($el) => $el.click()
Cypress.Commands.add("closeModal", (title, selector = ".modal-footer #rg2-do-modal-action") => {
  cy.get(".modal-title").should("be.visible").and("contain", title)
  cy.get(selector)
    .should("be.visible")
    .pipe(retryClick)
    .should(($el) => {
      expect($el).to.not.be.visible
    })
})
Cypress.Commands.add("closeWarningDialog", (expectedText) => {
  cy.get(".toast").should("be.visible").and("contain", expectedText).find(".btn-close").click()
})

Cypress.Commands.add("addMap", (name, mapFile, georefFile = "", georefType = "") => {
  cy.intercept("rg2api.php?type=maps*").as("maps")
  cy.get("#manage-map-tab").click()
  cy.get("#rg2-map-name").clear()
  cy.get("#rg2-map-name").type(name)
  cy.get("#rg2-load-map-file").selectFile("./cypress/fixtures/data/" + mapFile)
  if (georefFile !== "") {
    cy.get("#rg2-load-georef-file").selectFile("./cypress/fixtures/data/" + georefFile)
  }
  if (georefType !== "") {
    cy.get("#rg2-georef-type").select(georefType)
  }
  cy.get("#btn-add-map").click()
  cy.closeModal("Confirm new map")
  cy.closeWarningDialog("Map added")
  cy.wait("@maps")
})

Cypress.Commands.add("createEvent", () => {
  // assumes everything set up and ready to go
  // need to trap new event being opened in new window
  cy.window().then((win) => {
    cy.stub(win, "open", (url) => {
      // just log that it would have happened
      console.log("Open new window for " + url)
    }).as("newEventWindow")
  })
  cy.intercept("rg2api.php?type=events*").as("events")
  cy.get("#btn-create-event").click()
  cy.closeModal("Confirm event creation")
  cy.get("@newEventWindow").should("be.called")
  cy.wait("@events")
  cy.closeWarningDialog("Event created")
})

Cypress.Commands.add("selectCourseFile", (courseFile, warningMessage = "") => {
  cy.get("#rg2-load-course-file").selectFile("./cypress/fixtures/data/" + courseFile)
  if (warningMessage === "") {
    // valid file with no warnings
    cy.closeModal("Course details")
  } else {
    // invalid file
    cy.closeWarningDialog(warningMessage)
  }
})

Cypress.Commands.add("selectResultsFile", (resultsFile, warningMessage = "") => {
  cy.get("#rg2-load-results-file").selectFile("./cypress/fixtures/data/" + resultsFile)
  if (warningMessage === "") {
    // valid file with no warnings
    cy.closeModal("Result details")
  } else {
    // invalid file
    cy.closeWarningDialog(warningMessage)
  }
})

Cypress.Commands.add("setLocalStorage", () => {
  const defaultLocalStorage = {
    perCentMapIntensity: 100,
    perCentRouteIntensity: 100,
    replayFontSize: 12,
    courseWidth: 4,
    routeWidth: 5,
    circleSize: 20,
    snap: true,
    showThreeSeconds: false,
    showGPSSpeed: true,
    alignMap: false,
    maxSpeed: 4,
    minSpeed: 10,
    drawnRoutes: []
  }
  localStorage.setItem("rg2-options", JSON.stringify(defaultLocalStorage))
})
