/* eslint-disable cypress/no-unnecessary-waiting */
describe("Load normal event", { testIsolation: false }, () => {
  before(() => {
    cy.task("setUpKartat", { config: "config-01" })
  })
  beforeEach(() => {
    cy.intercept("rg2api.php?type=event&id=*").as("event")
  })
  it("should load a non-georeferenced event with no results", () => {
    cy.visit("http://localhost/rg2/#129")
    cy.wait("@event")
    cy.get("#course-tab").should("not.be.disabled")
    cy.get("#result-tab").should("not.be.disabled")
    cy.get("#draw-tab").should("not.be.disabled")
    cy.get("#rg2-event-title").should("contain", "2013-06-04 Herts ARC 2013 Race 5: Jersey Farm")
  })
  it("should show a course", () => {
    cy.get("#course-tab").click()
    cy.get("#rg2-course-table .showcourse[data-courseid='1'").click()
  })
  it("should show routes and replay", () => {
    cy.get("#rg2-course-table .alltracks").click()
    cy.get("#rg2-course-table .allcoursetracksreplay").click()
  })

  it("measures non-georeferenced things", () => {
    // non-georeferenced map in pixels
    cy.get("#btn-measure").click()
    // draw A
    cy.get("#rg2-map-canvas").click(600, 200)
    cy.get(".rg2-overlay-table").should("contain", "0px")
    cy.get("#rg2-map-canvas").click(700, 200)
    cy.get(".rg2-overlay-table").should("contain", "144px")
    cy.get("#rg2-map-canvas").dblclick(800, 300)
  })
})
