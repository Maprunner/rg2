/* eslint-disable cypress/no-unnecessary-waiting */
describe("Load normal event", { testIsolation: false }, () => {
  before(() => {
    cy.task("setUpKartat", { config: "config-01" })
  })
  it("should load a normal event from the results tab", () => {
    cy.intercept("rg2api.php?type=events*").as("events")
    cy.visit("http://localhost/rg2/")
    cy.wait("@events")
    cy.intercept("rg2api.php?type=event&id=*").as("event")
    cy.get("#rg2-event-table  > tr[data-kartatid='388']").click()
    cy.wait("@event")
  })
  it("should allow touch drag", () => {
    cy.get("#rg2-map-canvas").trigger("touchstart", {
      touches: [{ pageX: 200, pageY: 50 }]
    })
    cy.get("#rg2-map-canvas").trigger("touchmove", {
      touches: [{ pageX: 300, pageY: 150 }]
    })
    cy.get("#rg2-map-canvas").trigger("touchend", {
      touches: [{ pageX: 300, pageY: 150 }]
    })
  })
  it("should allow touch zoom in", () => {
    cy.get("#rg2-map-canvas").trigger("touchstart", {
      touches: [
        { pageX: 200, pageY: 50 },
        { pageX: 600, pageY: 50 }
      ]
    })
    cy.get("#rg2-map-canvas").trigger("touchmove", {
      touches: [
        { pageX: 200, pageY: 50 },
        { pageX: 500, pageY: 50 }
      ]
    })
    cy.get("#rg2-map-canvas").trigger("touchmove", {
      touches: [
        { pageX: 200, pageY: 50 },
        { pageX: 400, pageY: 50 }
      ]
    })
    cy.get("#rg2-map-canvas").trigger("touchmove", {
      touches: [
        { pageX: 200, pageY: 50 },
        { pageX: 300, pageY: 50 }
      ]
    })
    cy.get("#rg2-map-canvas").trigger("touchend", {
      touches: [
        { pageX: 200, pageY: 50 },
        { pageX: 300, pageY: 50 }
      ]
    })
  })
  it("should allow touch zoom out", () => {
    cy.get("#rg2-map-canvas").trigger("touchstart", {
      touches: [
        { pageX: 200, pageY: 450 },
        { pageX: 300, pageY: 50 }
      ]
    })
    cy.get("#rg2-map-canvas").trigger("touchmove", {
      touches: [
        { pageX: 200, pageY: 450 },
        { pageX: 400, pageY: 50 }
      ]
    })
    cy.get("#rg2-map-canvas").trigger("touchmove", {
      touches: [
        { pageX: 200, pageY: 450 },
        { pageX: 500, pageY: 50 }
      ]
    })
    cy.get("#rg2-map-canvas").trigger("touchmove", {
      touches: [
        { pageX: 200, pageY: 450 },
        { pageX: 600, pageY: 50 }
      ]
    })
    cy.get("#rg2-map-canvas").trigger("touchend", {
      touches: [
        { pageX: 200, pageY: 450 },
        { pageX: 600, pageY: 50 }
      ]
    })
  })
})
