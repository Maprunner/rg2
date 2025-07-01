/* eslint-disable cypress/no-unnecessary-waiting */
describe("Loads and replays a normal event", { testIsolation: false }, () => {
  before(() => {
    cy.task("setUpKartat", { config: "config-01" })
  })
  beforeEach(() => {
    cy.intercept("rg2api.php?type=event&id=*").as("event")
    cy.intercept("rg2api.php?type=events*").as("events")
  })
  it("should load a normal event from the results tab", () => {
    cy.visit("http://localhost/rg2/")
    cy.wait("@events")
    cy.get("#rg2-event-table  > tr[data-kartatid='388']").click()
    cy.wait("@event")
    cy.get("#course-tab").should("not.be.disabled")
    cy.get("#result-tab").should("not.be.disabled")
    cy.get("#draw-tab").should("not.be.disabled")
    cy.get("#rg2-event-title").should("contain", "2022-06-04 Highfield Park Saturday Series")
  })
  it("should display courses", () => {
    cy.get("#course-tab").click()
    cy.get("#course-filter-1").should("not.be.visible")
    cy.get("#rg2-course-table .showcourse[data-courseid='1']").click()
    cy.get("#rg2-course-table .showcourse[data-courseid='2']").click()
    cy.get("#course-filter-3").should("not.be.visible")
    cy.get("#rg2-course-table .showcourse[data-courseid='3']").click()
    cy.get("#course-filter-3").should("be.visible")
    cy.get("#rg2-course-table .showcourse[data-courseid='4']").click()
    cy.get("#rg2-course-table .showallcourses[data-id='all']").should("not.be.checked")
    cy.get("#rg2-course-table .showcourse[data-courseid='5']").click()
    // selecting last course should select all course checkbox as well
    cy.get("#rg2-course-table .showallcourses[data-id='all']").should("be.checked")
    // deselect all
    cy.get("#course-filter-3").should("be.visible")
    cy.get("#rg2-course-table .showallcourses[data-id='all']").click()
    cy.get("#rg2-course-table .showallcourses[data-id='all']").should("not.be.checked")
    cy.get("#rg2-course-table .showcourse[data-courseid='1']").should("not.be.checked")
    cy.get("#rg2-course-table .showcourse[data-courseid='5']").should("not.be.checked")
  })
  it("should allow you to filter course display", () => {
    cy.get("#course-filter-3").should("not.be.visible")
    cy.get("#rg2-course-table .showcourse[data-courseid='3']").click()
    cy.get("[data-course-filter='3>']").should("have.attr", "value1", "0")
    cy.get("[data-course-filter='3>']").should("have.attr", "value2", "20")
    cy.get("#course-filter-3").should("be.visible")
    cy.get("[data-course-filter='3>']").invoke("attr", "value1", "5").should("have.attr", "value1", "5")
    cy.get("[data-course-filter='3>']").invoke("attr", "value2", "18").should("have.attr", "value2", "18")
  })
  it("should display tracks for courses", () => {
    cy.get("#course-tab").click()
    cy.get("#rg2-course-table .allcoursetracks[data-courseid='1']").click()
    cy.get("#rg2-course-table .allcoursetracks[data-courseid='2']").click()
    cy.get("#rg2-course-table .allcoursetracks[data-courseid='3']").click()
    cy.get("#rg2-course-table .allcoursetracks[data-courseid='1']").click()
    cy.get("#rg2-course-table .allcoursetracks[data-courseid='2']").click()
    cy.get("#rg2-course-table .allcoursetracks[data-courseid='3']").click()
  })
  it("should select runners for animation", () => {
    // runners button not visiblw with no runners selected
    cy.get("#btn-runners").should("not.be.visible")
    // show course tab
    cy.get("#course-tab").click()
    // show Orange
    cy.get("#rg2-course-table .allcoursetracksreplay[data-courseid='3'").click()
    cy.get(".track-names input").should("have.length", 2)
    // show Light Green
    cy.get("#rg2-course-table .allcoursetracksreplay[data-courseid='2'").click()
    cy.get(".track-names input").should("have.length", 5)
    //remove Orange
    cy.get("#rg2-course-table .allcoursetracksreplay[data-courseid='3'").click()
    cy.get(".track-names input").should("have.length", 3)
    // close and open name list
    cy.get("#rg2-left-info-panel").find(".btn-close").click()
    cy.get("#rg2-track-names").find(".btn-close").click()
    cy.get("#btn-runners").click()
  })
  it("should run animation", () => {
    // start animation
    cy.get("#btn-start-stop").click()
    cy.wait(200)
    // stop animation
    cy.get("#btn-start-stop").click()
    cy.wait(200)
    // start animation
    cy.get("#btn-start-stop").click()
  })
  it("should change speed", () => {
    cy.get("#rg2-replay-speed-select").click()
    cy.get('#rg2-replay-speed-list li[data-speed="10000"]').click()
    cy.wait(500)
    cy.get("#rg2-tails-length-select").click()
    cy.get('#rg2-tails-length-list li[data-length="120"]').click()
    cy.wait(500)
  })
  it("should change tail length", () => {
    cy.get("#rg2-tails-length-select").click()
    cy.get('#rg2-tails-length-list li[data-length="Full"]').click()
    cy.wait(500)
  })
  it("should change labels", () => {
    cy.get("#rg2-toggle-names-select").click()
    cy.get('#rg2-toggle-names-select-list p[data-toggle-names="Show initials"]').click()
    cy.wait(500)
    cy.get("#rg2-toggle-names-select").click()
    cy.get('#rg2-toggle-names-select-list p[data-toggle-names="Hide names"]').click()
    cy.wait(500)
    cy.get("#rg2-toggle-names-select").click()
    cy.get('#rg2-toggle-names-select-list p[data-toggle-names="Show names"]').click()
    cy.wait(500)
  })
  it("should replay real time", () => {
    cy.get("#rg2-replay-type label").eq(1).click()
    cy.wait(500)
    cy.get("#rg2-replay-speed-select").click()
    cy.get('#rg2-replay-speed-list li[data-speed="100000"]').click()
  })
  it("should replay by control", () => {
    cy.get("#rg2-replay-by-control").should("not.be.visible")
    cy.get("#rg2-replay-type label").eq(2).click()
    cy.get("#rg2-replay-by-control").should("be.visible")
    // start animation: align map to control 1
    cy.get("#btn-start-stop").click()
    // wait until map aligned
    cy.wait(300)
    // run animation to control 1
    cy.get("#btn-start-stop").click()
    cy.wait(500)
    // align map
    cy.get("#btn-start-stop").click()
    // wait until map aligned
    cy.wait(300)
    // run animation to control 2
    cy.get("#btn-start-stop").click()
    cy.wait(500)
    // select start at control 10
    cy.get("#rg2-replay-start-control-select").click()
    cy.get('#rg2-replay-start-control-list li[data-control="10"]').click()
    // start animation: align map to control 11
    cy.get("#btn-start-stop").click()
    // wait until map aligned
    cy.wait(300)
    // run animation to control 11
    cy.get("#btn-start-stop").click()
    cy.wait(500)
    // select start at start
    cy.get("#rg2-replay-start-control-select").click()
    cy.get('#rg2-replay-start-control-list li[data-control="0"]').click()
    cy.wait(250)
  })
  it("should replay mass start", () => {
    cy.get("#rg2-replay-type label").eq(0).click()
    // replay by control hidden when replay type changes
    cy.get("#rg2-replay-by-control").should("not.be.visible")
    cy.wait(500)
    cy.get("#rg2-show-info-panel-control").click()
    cy.get("#rg2-course-table .allcoursetracksreplay[data-courseid='2'").click()
  })

  it("should allow the map to be rotated", () => {
    // map rotate/zoom controls
    cy.get("#btn-rotate-left").click()
    cy.get("#btn-rotate-right").click()
    cy.get("#btn-rotate-right").click()
    cy.get("#btn-rotate-right").click()
    cy.get("#btn-rotate-right").click()
    cy.get("#btn-rotate-left").click()
    cy.get("#btn-reset").click()
  })
  it("should allow the map to be zoomed", () => {
    cy.get("#btn-zoom-in").click()
    cy.get("#btn-zoom-in").click()
    cy.get("#btn-zoom-out").click()
    cy.get("#btn-zoom-out").click()
    cy.get("#rg2-map-canvas").click()
    cy.get("#rg2-map-canvas").trigger("wheel", { eventConstructor: "MouseEvent", deltaY: 50 })
    cy.get("#rg2-map-canvas").click()
    cy.get("#rg2-map-canvas").trigger("wheel", { eventConstructor: "MouseEvent", deltaY: -60 })
    cy.get("#rg2-map-canvas").click()
    cy.get("#rg2-map-canvas").trigger("wheel", { eventConstructor: "MouseEvent", deltaY: -40 })
    cy.get("#rg2-map-canvas").click()
    cy.get("#rg2-map-canvas").trigger("wheel", { eventConstructor: "MouseEvent", deltaY: 500 })
    cy.get("#btn-reset").click()
  })
  it("should allow the map to be dragged", () => {
    cy.get("#rg2-map-canvas").trigger("mousedown", { button: 0 })
    cy.get("#rg2-map-canvas").trigger("mousemove", { clientX: 300, clientY: 400 })
    cy.get("#rg2-map-canvas").trigger("mouseup", { button: 0 })
    cy.get("#btn-reset").click()
  })
  it("measures georeferenced things", () => {
    cy.get("#course-tab").click()
    cy.get("#rg2-course-table .showcourse[data-courseid='2']").click()
    // georeferenced map in metres
    cy.get("#btn-measure").click()
    cy.get("#rg2-measure-dialog").should("be.visible")
    // draw A
    cy.get("#rg2-map-canvas").click(600, 300)
    cy.get(".rg2-overlay-table").should("contain", "0m")
    cy.get("#rg2-map-canvas").click(700, 300)
    // measured length seems to vary by at least a metre so need to allow something "close" to 239m
    cy.get(".rg2-overlay-table").should("contain", "23")
    cy.get(".rg2-overlay-table").should("contain", "m")
    cy.get("#rg2-map-canvas").dblclick(800, 400)
    // draw B
    cy.get("#rg2-map-canvas").click(600, 400)
    cy.get("#rg2-map-canvas").click(700, 400)
    cy.get("#rg2-map-canvas").click(800, 400)
    cy.get(".rg2-overlay-table .end-overlay").click()
    // adjust B
    cy.get("#rg2-map-canvas").trigger("mousedown", 700, 400)
    cy.get("#rg2-map-canvas").trigger("mousemove", 750, 450)
    cy.get("#rg2-map-canvas").trigger("mouseup", 750, 450)
    // draw C
    cy.get("#rg2-map-canvas").click(600, 500)
    cy.get("#rg2-map-canvas").dblclick(700, 500)
    //delete B
    cy.get(".rg2-overlay-table .delete-overlay").eq(1).click()
    // delete all
    cy.get(".rg2-overlay-table .delete-all-overlays").click()
    // drag dialog
    cy.get("#rg2-measure-dialog").then(($el) => {
      const initialRect = $el[0].getBoundingClientRect()
      cy.get("#rg2-measure-dialog").move({ deltaX: -100, deltaY: 100 })
      cy.get("#rg2-measure-dialog").then(($el2) => {
        const newRect = $el2[0].getBoundingClientRect()
        expect(newRect.left).not.to.eq(initialRect.left)
        expect(newRect.top).not.to.eq(initialRect.top)
      })
    })
    cy.get("#btn-close-measure-dialog").click()
  })
  it("opens a splitsbrowser window", () => {
    cy.window().then((win) => {
      cy.stub(win, "open", (url) => {
        // just log that it would have happened
        console.log("Open new window for " + url)
      }).as("newSplitsbrowserWindow")
    })
    cy.get("#btn-splitsbrowser").click()
    cy.get("@newSplitsbrowserWindow").should("be.called")
  })
})
