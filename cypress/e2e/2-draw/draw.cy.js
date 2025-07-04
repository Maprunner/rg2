describe("drawing routes", { testIsolation: false }, () => {
  const whiteX = [581, 499, 542, 630, 917, 1102, 1250, 1271, 1238, 983, 975, 924, 687, 669, 603]
  const whiteY = [890, 957, 1027, 1152, 1053, 1073, 1023, 949, 922, 930, 788, 676, 745, 867, 835]
  const shorterX = [
    1332, 911, 953, 921, 1264, 1683, 1826, 2144, 2120, 2256, 2530, 2370, 1975, 1830, 1597, 1786, 935, 643, 771, 1463,
    1591
  ]
  const shorterY = [
    1487, 1616, 1246, 1030, 1242, 757, 871, 738, 531, 495, 352, 589, 296, 706, 301, 154, 270, 395, 805, 1124, 1103
  ]
  let mapHeightPixels = 2272
  // screen is 1000 x 660, header is 40 px of that so canvas is...
  const canvasHeightPixels = 620
  // panel width plus offset added in resetMapState in canvas.js
  let leftPanelOffset = 420 + 80
  const ptX = (x) => (x * canvasHeightPixels) / mapHeightPixels + leftPanelOffset
  const ptY = (y) => (y * canvasHeightPixels) / mapHeightPixels
  const clickAt = (x, y) => {
    cy.get("#rg2-map-canvas").trigger("mousedown", ptX(x), ptY(y))
    cy.get("#rg2-map-canvas").trigger("mouseup", ptX(x), ptY(y))
  }
  const drag = (x1, y1, x2, y2, options = { button: 0 }) => {
    cy.get("#rg2-map-canvas").trigger("mousedown", ptX(x1), ptY(y1), options)
    cy.get("#rg2-map-canvas").trigger("mousemove", ptX(x2), ptY(y2), options)
    cy.get("#rg2-map-canvas").trigger("mouseup", ptX(x2), ptY(y2), options)
  }
  before(() => {
    cy.task("setUpKartat", { config: "config-01" })
    cy.setLocalStorage()
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
    cy.intercept("rg2api.php?type=event&id=*").as("event")
    cy.get("#btn-save-route").click()
    // wait for updated event info with new drawn route
    cy.wait("@event")
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
    cy.intercept("rg2api.php?type=event&id=*").as("event")
    cy.get("#btn-save-route").click()
    // wait for updated event info with new drawn route
    cy.wait("@event")
    cy.closeWarningDialog("Your route has been saved")
  })
  it("should load an event with no courses and results but no splits", () => {
    // include test of drawn route array wrapping
    cy.setLocalStorage(
      ["drawnRoutes"],
      [
        [
          {
            eventid: 1,
            id: 1,
            token: "6debaeabbfab75a27febda85586a369f"
          },
          {
            eventid: 2,
            id: 2,
            token: "fbdae1ce79a1d03235eebe3b6e0f9c0c"
          },
          {
            eventid: 3,
            id: 3,
            token: "95042936fb702c5de38e8015880947fc"
          },
          {
            eventid: 4,
            id: 4,
            token: "7e83b4bb9c1cb9f20e62cbb63d3c810a"
          },
          {
            eventid: 5,
            id: 5,
            token: "aa66a8bba0f48ab46069261f600df797"
          },
          {
            eventid: 6,
            id: 6,
            token: "1751682c38e1eebbaf373d07ac6d3cce"
          },
          {
            eventid: 7,
            id: 7,
            token: "08cfdb473b4b70e1e5a37f6ce81025d1"
          },
          {
            eventid: 8,
            id: 8,
            token: "44976c8883da926c79143c2a34124fa5"
          },
          {
            eventid: 9,
            id: 9,
            token: "da22609835de59d54c50544f3affce8a"
          },
          {
            eventid: 10,
            id: 10,
            token: "f4731312424c29a60a3887d81d1321ae"
          }
        ]
      ]
    )
    cy.intercept("rg2api.php?type=event&id=*").as("event")
    // force reload to trigger reread of local storage
    cy.visit("http://localhost/rg2/")
    cy.visit("http://localhost/rg2/#74")
    cy.wait("@event")
  })
  it("allows you to draw a route", () => {
    mapHeightPixels = 1920
    cy.get("#draw-tab").click()
    cy.get("#btn-reset").click()
    cy.get("#rg2-select-course").select("Shorter")
    cy.get("#rg2-select-name").select("30:55 Roger Scrutton")
    // need to close info panel and drag map left so that it fits on screen
    cy.get("#rg2-logo").click()
    const offsetX = 1000
    drag(700, 300, 700 - offsetX, 300, { button: 2 })
    for (let i = 0; i < shorterX.length; i += 1) {
      clickAt(shorterX[i] - offsetX, shorterY[i])
    }
    // drag back and open info panel again
    drag(700 - offsetX, 300, 700, 300, { button: 2 })
    cy.get("#rg2-logo").click()
  })
  it("allows you to save a drawn route", () => {
    cy.intercept("rg2api.php?type=event&id=*").as("event")
    cy.get("#btn-save-route").click()
    // wait for updated event info with new drawn route
    cy.wait("@event")
    cy.closeWarningDialog("Your route has been saved")
  })
  it("allows you to display and delete the drawn route", () => {
    cy.get("#result-tab").click()
    cy.get(".accordion button div[data-courseid='2']").click()
    cy.get(".showtrack[data-id='19']").check()
    cy.get("#rg2-track-names > .track-names").find("[data-resultid]").should("have.length", "1")
    cy.get(".deleteroute[data-resultidx='19']").click()
    cy.closeModal("Confirm route delete")
    cy.intercept("rg2api.php?type=event&id=*").as("event")
    cy.wait("@event")
    cy.closeWarningDialog("Route deleted")
  })
})
