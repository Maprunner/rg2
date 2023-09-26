import manager from "../../fixtures/validmanager.json"
describe("Manage maps", { testIsolation: false }, () => {
  before(() => {
    cy.task("setUpKartat", { config: "config-01" })
  })
  beforeEach(() => {
    cy.intercept("rg2api.php?type=maps*").as("maps")
  })
  it("should allow login", () => {
    cy.intercept("rg2api.php?type=events*").as("events")
    cy.intercept("rg2api.php?type=login*").as("login")
    cy.visit("http://localhost/rg2/?manage")
    cy.wait("@events")
    cy.get("#rg2-user-name").clear().type(manager.name)
    cy.get("#rg2-password").clear().type(manager.password)
    cy.get("#btn-login").click()
    cy.wait("@login")
    cy.wait("@maps").its("response.body.data.maps").should("have.length", "11")
  })
  it("should allow map upload", () => {
    cy.get("#manage-map-tab").click()
    cy.get("#rg2-map-name").clear().type("Ellenbrook non-georef")
    cy.get("#rg2-load-map-file").selectFile("./cypress/fixtures/data/verybigmap-poorquality.jpg")
    cy.closeWarningDialog("Oversized map upload")
    cy.get("#rg2-load-map-file").selectFile("./cypress/fixtures/data/ellenbrook.jpg")
    // cancel
    cy.get("#btn-add-map").click()
    cy.closeModal("Confirm new map", ".modal-footer button[data-bs-dismiss='modal'")
    // add map
    cy.get("#btn-add-map").click()
    cy.closeModal("Confirm new map")
    cy.wait("@maps").its("response.body.data.maps").should("have.length", "12")
    cy.closeWarningDialog("Map added")
  })
  it("should allow you to delete one unused map", () => {
    cy.get("#manage-delete-map-tab").click()
    cy.get("#btn-delete-unused-maps").click()
    cy.closeWarningDialog("No maps selected")
    cy.get("#rg2-unused-maps [data-map-id='403']").check()
    // cancel
    cy.get("#btn-delete-unused-maps").click()
    cy.closeModal("Confirm map deletion", ".modal-footer button[data-bs-dismiss='modal'")
    // delete map
    cy.get("#btn-delete-unused-maps").click()
    cy.closeModal("Confirm map deletion")
    cy.wait("@maps").its("response.body.data.maps").should("have.length", "11")
    cy.closeWarningDialog("Maps deleted")
  })
  it("should allow you to delete all unused maps", () => {
    cy.get("#manage-delete-map-tab").click()
    cy.get("#rg2-unused-maps [data-map-id='404']").check()
    cy.get("#rg2-unused-maps [data-map-id='300']").check()
    cy.get("#btn-delete-unused-maps").click()
    cy.closeModal("Confirm map deletion")
    cy.intercept("rg2api.php?type=maps*").as("maps")
    cy.wait("@maps").its("response.body.data.maps").should("have.length", "9")
    cy.closeWarningDialog("Maps deleted")
  })
})
