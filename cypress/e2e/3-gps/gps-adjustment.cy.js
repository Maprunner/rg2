/* eslint-disable cypress/no-unnecessary-waiting */
describe("adjusting GPS routes", { testIsolation: false }, () => {
  let mapHeightPixels = 870
  // screen is 1000 x 660, header is 66 px of that so canvas is...
  const canvasHeightPixels = 594
  const leftPanelOffset = 480
  const ptX = (x) => (x * canvasHeightPixels) / mapHeightPixels + leftPanelOffset
  const ptY = (y) => (y * canvasHeightPixels) / mapHeightPixels
  const clickAt = (x, y, options = { button: 0 }) => {
    cy.get("#rg2-map-canvas").trigger("mousedown", ptX(x), ptY(y), options)
    cy.get("#rg2-map-canvas").trigger("mouseup", ptX(x), ptY(y), options)
  }
  const drag = (x1, y1, x2, y2, options = { button: 0 }) => {
    cy.get("#rg2-map-canvas").trigger("mousedown", ptX(x1), ptY(y1), options)
    cy.get("#rg2-map-canvas").trigger("mousemove", ptX(x2), ptY(y2))
    cy.get("#rg2-map-canvas").trigger("mouseup", ptX(x2), ptY(y2), options)
  }
  before(() => {
    cy.task("setUpKartat", { config: "config-01" })
  })
  it("should load an event with no results", () => {
    cy.intercept("rg2api.php?type=event&id=*").as("event")
    cy.visit("http://localhost/rg2/#129")
    cy.wait("@event")
  })
  it("allows you to load a GPX file", () => {
    cy.get("#draw-tab").click()
    cy.get("#rg2-select-course").select("45 minute score")
    cy.get("#rg2-name-entry").clear()
    cy.get("#rg2-name-entry").type("Peter Errington")
    cy.get("#rg2-time-entry").clear()
    cy.get("#rg2-time-entry").type("45:43")
    cy.get("#rg2-load-gps-file").selectFile("./cypress/fixtures/data/Jersey_Farm_Street_O.gpx")
  })
  it("drags the whole track and can undo", () => {
    // x, y locations are empirically correct to make what follows do what it should
    drag(350, 700, 300, 600)
    cy.get("#btn-undo-gps-adjust").click()
    // drag with right click drags map and track
    drag(350, 700, 300, 600, { button: 2 })
    drag(300, 600, 350, 700, { button: 2 })
    // locks map and track and drags them both
    cy.get("#chk-move-all").check()
    drag(350, 700, 300, 600)
    drag(300, 600, 350, 700)
    cy.get("#chk-move-all").uncheck()
  })
  it("adds, deletes and locks a handle", () => {
    // left click to add a handle
    clickAt(345, 739)
    // right click to delete a handle
    clickAt(345, 739, { button: 2, which: 3 })
    // right click to add a handle
    clickAt(345, 739, { button: 2, which: 3 })
    drag(345, 739, 340, 513)
    // second click to lock handle
    clickAt(340, 513)
    // left click to unlock a locked handle
    clickAt(340, 513)
    // click to lock handle
    clickAt(340, 513)
    // can also add with a right click
    clickAt(-20, 24, { button: 2, which: 3 })
    drag(-20, 24, 168, 278)
    clickAt(168, 278)
  })
  it("drags an existing handle around a locked point", () => {
    drag(350, 316, 400, 320)
    cy.get("#btn-undo-gps-adjust").click()
  })
  it("adds and drags a handle between two locked points", () => {
    clickAt(323, 382)
    drag(323, 382, 340, 400)
    drag(340, 400, 323, 382)
  })
  it("saves the adjusted route", () => {
    cy.get("#btn-save-gps-route").click()
    cy.closeWarningDialog("Your route has been saved")
  })
})
