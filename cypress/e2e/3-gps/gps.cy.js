/* eslint-disable cypress/no-unnecessary-waiting */
describe("Loading GPS routes", { testIsolation: false }, () => {
  before(() => {
    cy.task("setUpKartat", { config: "config-01" })
  })
  beforeEach(() => {
    cy.intercept("rg2api.php?type=event&id=*").as("event")
  })
  it("loads a georeferenced Highfield Park event", () => {
    cy.visit("http://localhost/rg2/#388")
    cy.wait("@event")
  })
  it("allows you to load a GPX file", () => {
    cy.get("#draw-tab").click()
    cy.get("#rg2-select-course").select("Short Blue")
    cy.get("#rg2-select-name").select("36:22 Simon Errington")
    cy.get("#rg2-load-gps-file").selectFile("./cypress/fixtures/data/Highfield_Park_Short_blue.gpx")
    cy.get("#btn-save-gps-route").click()
    cy.wait("@event")
    cy.closeWarningDialog("Your route has been saved")
  })
  it("allows you to autofit a GPX file", () => {
    cy.get("#draw-tab").click()
    cy.get("#rg2-select-course").select("Orange")
    cy.get("#rg2-select-name").select("32:38 Peter Errington")
    cy.get("#rg2-load-gps-file").selectFile("./cypress/fixtures/data/Highfield_Park_Orange.gpx")
    cy.get("#btn-autofit-gps").click()
    cy.get("#btn-offset-plus").click()
    cy.get("#btn-offset-plus").click()
    cy.get("#btn-offset-minus").click()
    cy.get("#rg2-offset-value").clear()
    cy.get("#rg2-offset-value").type("x")
    cy.get("#rg2-offset-value").clear()
    cy.get("#rg2-offset-value").type("15")
    cy.get("#rg2-offset-value").clear()
    cy.get("#rg2-offset-value").type("0")
    cy.get("#btn-save-gps-route").click()
    cy.wait("@event")
    cy.closeWarningDialog("Your route has been saved")
  })
  it("displays the new route", () => {
    cy.get("#result-tab").click()
    cy.get(".accordion button div[data-courseid='1']").click()
  })
  it("deletes the new route", () => {
    cy.get(".deleteroute[data-resultidx='49']").click()
    cy.closeModal("Confirm route delete", ".modal-footer button[data-bs-dismiss='modal'")
    cy.get(".deleteroute[data-resultidx='49']").click()
    cy.closeModal("Confirm route delete")
    cy.wait("@event")
    cy.closeWarningDialog("Route deleted")
  })
})