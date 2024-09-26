/* eslint-disable cypress/no-unnecessary-waiting */
describe("Load score event", { testIsolation: false }, () => {
  const scoreX = [710, 445, 218, 144, 295, 517, 791, 693, 507, 638, 839, 905, 1067, 1470, 1422, 1705, 1364, 1010, 904]
  const scoreY = [872, 1030, 1225, 777, 844, 815, 630, 436, 473, 257, 353, 232, 120, 165, 324, 588, 760, 978, 1010]
  let mapHeightPixels = 1652
  // screen is 1000 x 660, header is 43 px of that so canvas is...
  const canvasHeightPixels = 617
  // panel width plus offset added in resetMapState in canvas.js
  // 421px looks it should be 419px but it seems to work here...
  let leftPanelOffset = 421 + 80
  const ptX = (x) => (x * canvasHeightPixels) / mapHeightPixels + leftPanelOffset
  const ptY = (y) => (y * canvasHeightPixels) / mapHeightPixels
  const clickAt = (x, y) => {
    cy.get("#rg2-map-canvas").trigger("mousedown", ptX(x), ptY(y))
    cy.get("#rg2-map-canvas").trigger("mouseup", ptX(x), ptY(y))
  }
  before(() => {
    cy.task("setUpKartat", { config: "config-01" })
  })
  it("should load a score event from the results tab", () => {
    cy.intercept("rg2api.php?type=events*").as("events")
    cy.visit("http://localhost/rg2/")
    cy.wait("@events")
    cy.intercept("rg2api.php?type=event&id=*").as("event")
    cy.get("#rg2-event-table  > tr[data-kartatid='380']").click()
    cy.wait("@event")
    cy.get("#course-tab").should("not.be.disabled")
    cy.get("#result-tab").should("not.be.disabled")
    cy.get("#draw-tab").should("not.be.disabled")
    cy.get("#rg2-event-title").should("contain", "2021-12-26 Trent Park Boxing Day Score")
  })
  it("show and hide all controls", () => {
    cy.get("#course-tab").click()
    cy.get("#rg2-course-table .showcourse[data-courseid='1']").click()
    cy.get("#rg2-course-table .showcourse[data-courseid='1']").click()
  })
  it("shows individual courses", () => {
    cy.get("#result-tab").click()
    cy.get(".accordion-button").eq(0).click()
    cy.get(".showscorecourse[data-courseid='1']").click()
    cy.get("#btn-toggle-controls").click()
  })
  it("should display stats for a score event", () => {
    cy.get("#table-1 tr[data-id='2']").rightclick()
    cy.get(".rg2-stats-title-row").should("be.visible").and("contain", "1 hr Score")
    cy.get("#rg2-splits-chart").should("be.visible")
    cy.get("#rg2-stats-panel-tab-headers button[data-bs-target='#rg2-legs-tab']").click()
    cy.get("#rg2-leg-table").should("be.visible")
    cy.get("#rg2-stats-panel-tab-headers button[data-bs-target='#rg2-cumulative-tab']").click()
    cy.get("#rg2-race-table").should("be.visible")
    cy.get("#rg2-stats-panel-tab-headers button[data-bs-target='#rg2-split-times-tab']").click()
    cy.get("#rg2-results-table").should("be.visible")
    cy.get("#rg2-stats-panel-tab-headers button[data-bs-target='#rg2-time-loss-tab']").click()
    cy.get("#rg2-loss-chart").should("be.visible")
    cy.get("#rg2-stats-panel-tab-headers button[data-bs-target='#rg2-stats-summary-tab']").click()
    cy.get("#rg2-right-info-panel").find(".btn-close").click()
  })
  it("warns if you try to draw a second route", () => {
    cy.get("#draw-tab").click()
    cy.get("#rg2-select-course").select("1 hr Score")
    cy.get("#rg2-select-name").select("59:48 Nigel Quinton")
    cy.closeWarningDialog("it will overwrite the old route")
  })
  it("draws and undos", () => {
    clickAt(700, 850)
    // undo one point
    cy.get("#btn-undo").click()
    clickAt(700, 850)
    clickAt(710, 872)
    // undo from a control
    cy.get("#btn-undo").click()
    // need to close info panel and move map left so that all controls are visible to click
    cy.get("#rg2-left-info-panel").find(".btn-close").click()
    cy.get("#rg2-map-canvas").trigger("mousedown", 900, 200)
    cy.get("#rg2-map-canvas").trigger("mousemove", 900 - leftPanelOffset, 200)
    cy.get("#rg2-map-canvas").trigger("mouseup", 900 - leftPanelOffset, 500)
    leftPanelOffset = 0
    for (let i = 0; i < scoreX.length; i += 1) {
      clickAt(scoreX[i], scoreY[i])
    }
    cy.get("#rg2-show-info-panel-control").click()
    //undo from Finish
    cy.get("#btn-undo").click()
    cy.get("#rg2-left-info-panel").find(".btn-close").click()
    // map stays where it was after closing info panel so need to readjust offset
    leftPanelOffset = 501
    clickAt(scoreX[scoreX.length - 1], scoreY[scoreY.length - 1])
    cy.get("#rg2-show-info-panel-control").click()
    cy.get("#btn-save-route").click()
    cy.closeWarningDialog("Your route has been saved")
  })
})
