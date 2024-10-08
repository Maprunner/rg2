import manager from "../../fixtures/validmanager.json"
describe("Event editing", { testIsolation: false }, () => {
  before(() => {
    cy.task("setUpKartat", { config: "config-01" })
  })
  beforeEach(() => {
    cy.intercept("rg2api.php?type=event&id=*").as("event")
    cy.intercept("rg2api.php?type=events*").as("events")
  })
  it("should allow login", () => {
    cy.intercept("rg2api.php?type=login*").as("login")
    cy.visit("http://localhost/rg2/?manage")
    cy.wait("@events")
    cy.get("#rg2-user-name").clear().type(manager.name)
    cy.get("#rg2-password").clear().type(manager.password)
    cy.get("#btn-login").click()
    cy.wait("@login")
  })
  it("should load an event", () => {
    cy.get("#manage-edit-tab").click()
    cy.get("#rg2-edit-event-selected").select("129: 2013-06-04: Herts ARC 2013 Race 5: Jersey Farm")
    cy.wait("@event")
  })
  it("should update an event", () => {
    cy.get("#chk-edit-read-only").click()
    cy.get("#btn-update-event").click()
    cy.closeModal("Confirm event update", ".modal-footer button[data-bs-dismiss='modal'")
    cy.get("#btn-update-event").click()
    cy.closeModal("Confirm event update")
    cy.wait("@events")
    cy.closeWarningDialog("Event updated")
  })
  it("should delete a route", () => {
    cy.get("#manage-edit-tab").click()
    cy.get("#rg2-edit-event-selected").select("129: 2013-06-04: Herts ARC 2013 Race 5: Jersey Farm")
    cy.wait("@event")
    cy.get("#rg2-route-selected").select("50001: GPS Simon Errington on 45 minute score")
    cy.get("#btn-delete-route").click()
    cy.closeModal("Confirm route delete", ".modal-footer button[data-bs-dismiss='modal'")
    cy.get("#btn-delete-route").click()
    cy.closeModal("Confirm route delete")
    cy.wait("@events")
    cy.closeWarningDialog("Route deleted")
  })
  it("should delete an event", () => {
    cy.get("#manage-edit-tab").click()
    cy.get("#rg2-edit-event-selected").select("129: 2013-06-04: Herts ARC 2013 Race 5: Jersey Farm")
    cy.wait("@event")
    cy.get("#btn-delete-event").click()
    cy.closeModal("Confirm event delete", ".modal-footer button[data-bs-dismiss='modal'")
    cy.get("#btn-delete-event").click()
    cy.closeModal("Confirm event delete")
    cy.wait("@events")
    cy.closeWarningDialog("Event deleted")
  })
  it("should select a score event to edit", () => {
    cy.get("#manage-edit-tab").click()
    cy.get("#rg2-edit-event-selected").select("380: 2021-12-26: Trent Park Boxing Day Score")
    cy.wait("@event")
    cy.get("#rg2-edit-event-comments").clear().type("New comments")
    cy.get("#btn-update-event").click()
    cy.closeModal("Confirm event update")
    cy.wait("@events")
    cy.closeWarningDialog("Event updated")
  })
})
