describe("drawing routes", { testIsolation: false }, () => {
  const whiteX = [581, 499, 542, 630, 917, 1102, 1250, 1271, 1238, 983, 975, 924, 687, 669, 603]
  const whiteY = [890, 957, 1027, 1152, 1053, 1073, 1023, 949, 922, 930, 788, 676, 745, 867, 835]
  let mapHeightPixels = 2272
  // screen is 1000 x 660, header is 59 px of that so canvas is...
  const canvasHeightPixels = 601
  // panel width plus offset added in resetMapState in canvas.js
  let leftPanelOffset = 420 + 80
  const ptX = (x) => (x * canvasHeightPixels) / mapHeightPixels + leftPanelOffset
  const ptY = (y) => (y * canvasHeightPixels) / mapHeightPixels
  const clickAt = (x, y) => {
    cy.get("#rg2-map-canvas").trigger("mousedown", ptX(x), ptY(y))
    cy.get("#rg2-map-canvas").trigger("mouseup", ptX(x), ptY(y))
  }
  before(() => {
    cy.task("setUpKartat", { config: "config-01" })
  })
  it("should load a georeferenced Highfield Park event", () => {
    cy.intercept("rg2api.php?type=event&id=*").as("event")
    cy.visit("http://localhost/rg2/#388")
    cy.wait("@event")
  })
  it("warns you to select name and course", () => {
    cy.get("#draw-tab").click()
    clickAt(600, 500)
    cy.closeWarningDialog("No course/name")
    cy.get("#rg2-select-course").select("White")
    clickAt(600, 500)
    cy.closeWarningDialog("No course/name")
  })
  it("allows you to start drawing a route", () => {
    cy.get("#draw-tab").click()
    cy.get("#btn-reset").click()
    cy.get("#rg2-select-course").select("White")
    cy.get("#rg2-select-name").select("16:08 Daniel Elder")
    cy.get("#rg2-new-comments").clear()
    cy.get("#rg2-new-comments").type("Drawn route")
    clickAt(whiteX[0], whiteY[0])
    clickAt(whiteX[2], whiteY[2])
  })
  it("allows you to undo drawing", () => {
    cy.get("#btn-undo").click()
    clickAt(whiteX[1], whiteY[1])
    clickAt(whiteX[2], whiteY[2])
  })
  it("allows you to undo from a control", () => {
    cy.get("#btn-undo").click()
    clickAt(whiteX[2], whiteY[2])
    clickAt(whiteX[3], whiteY[3])
  })
  it("allows you to align the map when drawing", () => {
    cy.get("#chk-align-map").check()
    // click at next control forces map to align
    clickAt(whiteX[4], whiteY[4])
    // then need adjusted location since map is now rotated
    cy.get("#chk-align-map").uncheck()
    const testx = [70]
    const testy = [1855]
    for (let i = 0; i < testx.length; i += 1) {
      clickAt(testx[i], testy[i])
    }
    // now back to normal
    clickAt(whiteX[6], whiteY[6])
  })
  it("allows you to reset the drawing", () => {
    cy.get("#btn-reset-drawing").click()
    cy.closeModal("Confirm reset", ".modal-footer button[data-bs-dismiss='modal'")
    cy.get("#btn-reset-drawing").click()
    cy.closeModal("Confirm reset")
  })
  it("allows you to draw a route", () => {
    cy.get("#draw-tab").click()
    cy.get("#btn-reset").click()
    cy.get("#rg2-select-course").select("White")
    cy.get("#rg2-select-name").select("16:08 Daniel Elder")
    cy.get("#rg2-new-comments").clear()
    cy.get("#rg2-new-comments").type("Drawn route")
    for (let i = 0; i < whiteX.length; i += 1) {
      clickAt(whiteX[i], whiteY[i])
    }
  })
  it("allows you to save a drawn route", () => {
    cy.get("#btn-save-route").click()
    cy.closeWarningDialog("Your route has been saved")
  })
  it("should load an event with no results", () => {
    cy.intercept("rg2api.php?type=event&id=*").as("event")
    cy.visit("http://localhost/rg2/#129")
    cy.wait("@event")
  })
  it("allows you to save a drawn route", () => {
    mapHeightPixels = 870
    cy.get("#draw-tab").click()
    cy.get("#btn-reset").click()
    clickAt(600, 500)
    cy.closeWarningDialog("No course/name")
    cy.get("#rg2-select-course").select("45 minute score")
    clickAt(600, 500)
    cy.closeWarningDialog("No course/name")
    cy.get("#rg2-name-entry").clear()
    cy.get("#rg2-name-entry").type("Simon Errington")
    clickAt(600, 500)
    cy.closeWarningDialog("No course/name")
    cy.get("#rg2-time-entry").clear()
    cy.get("#rg2-time-entry").type("42.35")
    // Start/Finish at 370, 332
    clickAt(380, 350)
    cy.get("#btn-undo").click()
    clickAt(400, 300)
    clickAt(380, 350)
    cy.get("#btn-undo")
    clickAt(400, 430)
    cy.get("#btn-three-seconds").click()
    clickAt(369, 331)
    cy.get("#btn-save-route").click()
    cy.closeWarningDialog("Your route has been saved")
  })
})
