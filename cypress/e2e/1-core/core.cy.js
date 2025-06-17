/* eslint-disable cypress/no-unnecessary-waiting */
describe("Core functionality", { testIsolation: false }, () => {
  before(() => {
    cy.task("setUpKartat", { config: "config-01" })
  })
  beforeEach(() => {
    cy.intercept("rg2api.php?type=event&id=*").as("event")
    cy.intercept("rg2api.php?type=events*").as("events")
    cy.setLocalStorage()
  })
  it("loads RG2 and allow user interaction", () => {
    cy.visit("http://localhost/rg2/")
    cy.wait("@events").its("response.body.data.events").should("have.length", 12)
    cy.get("#rg2-event-title").should("be.visible").and("contain", "Routegadget 2")
    cy.get("#event-tab-label").should("contain", "Events")
    cy.get("#event-tab").should("be.enabled")
    cy.get("#course-tab").should("be.disabled")
    cy.get("#result-tab").should("be.disabled")
    cy.get("#draw-tab").should("be.disabled")
    // zoom does nothing if no event loaded
    cy.get("#btn-zoom-out").click()
    cy.get("#btn-zoom-in").click()
  })
  it("filters events", () => {
    cy.get("#rg2-event-table tr:not(.d-none)").should("have.length", 12)
    cy.get("#rg2-event-search input").type("e")
    cy.get("#rg2-event-table tr:not(.d-none)").should("have.length", 10)
    cy.get("#rg2-event-search input").type("s")
    cy.get("#rg2-event-table tr:not(.d-none)").should("have.length", 1)
    cy.get("#rg2-event-search input").type("x")
    cy.get("#rg2-event-table tr:not(.d-none)").should("have.length", 0)
    cy.get("#rg2-event-search input").clear()
    cy.get("#rg2-event-table tr:not(.d-none)").should("have.length", 12)
  })
  it("displays and hides the about dialog", () => {
    // toggle about dialog: no event stats
    cy.get("#rg2-about-dialog").should("not.be.visible")
    cy.get("#btn-about").click()
    cy.get("#rg2-about-dialog").should("be.visible")
    cy.get("#rg2-event-stats").should("be.empty")
    cy.get("#rg2-right-info-panel").find(".btn-close").click()
    cy.get("#rg2-about-dialog").should("not.be.visible")
  })
  it("displays and hides the info panel", () => {
    // hide and show info panel
    cy.get("#rg2-show-info-panel-control").should("not.be.visible")
    cy.get("#rg2-left-info-panel").find(".btn-close").click()
    cy.get("#rg2-left-info-panel").should("not.be.visible")
    // open via arrow
    cy.get("#rg2-show-info-panel-control").click()
    cy.get("#rg2-left-info-panel").should("be.visible")
    cy.get("#rg2-left-info-panel").find(".btn-close").click()
    cy.get("#rg2-left-info-panel").should("not.be.visible")
    // open via logo
    cy.get("#rg2-logo").click()
    cy.get("#rg2-left-info-panel").should("be.visible")
  })
  it("allows configuration changes", () => {
    // local storage set to default values by beforeEach call
    cy.get("#btn-settings").click()
    cy.get("#chk-show-GPS-speed").should("be.visible")
    cy.get("#chk-show-GPS-speed").check()
    cy.get("#rg2-gps-speed-slider").click()
    cy.get("#rg2-gps-speed-slider").click()
    cy.get("#spn-map-intensity").click()
    cy.get("input#spn-route-intensity").invoke("val", "50").trigger("change")
    cy.get("#spn-route-width").invoke("val", "4").trigger("change")
    cy.get("#spn-name-font-size").invoke("val", "12").trigger("change")
    cy.get("#spn-course-width").invoke("val", "3").trigger("change")
    cy.get("#spn-control-circle").invoke("val", "20").trigger("change")
    cy.get("#chk-show-three-seconds").check()
    cy.get("#chk-snap-toggle").check()
    cy.get("#chk-show-three-seconds").uncheck()
    cy.get("#chk-snap-toggle").uncheck()
    cy.get("#rg2-right-info-panel .btn-close").click()
  })
  it("speaks French", () => {
    cy.get("#btn-settings").click()
    cy.get("#rg2-select-language").select("fr")
    cy.get("#event-tab-label").should("contain", "Compétition")
  })
  it("speaks Czech", () => {
    cy.get("#rg2-select-language").select("cz")
    cy.get("#event-tab-label").should("contain", "Akce")
  })
  it("speaks German", () => {
    cy.get("#rg2-select-language").select("de")
    cy.get("#event-tab-label").should("contain", "Wettkämpfe")
  })
  it("speaks Japanese", () => {
    cy.get("#rg2-select-language").select("ja")
    cy.get("#event-tab-label").should("contain", "イベント")
  })
  it("speaks Finnish", () => {
    cy.get("#rg2-select-language").select("fi")
    cy.get("#event-tab-label").should("contain", "Tapahtumat")
  })
  it("speaks Norwegian", () => {
    cy.get("#rg2-select-language").select("no")
    cy.get("#event-tab-label").should("contain", "Løp")
  })
  it("speaks Italian", () => {
    cy.get("#rg2-select-language").select("it")
    cy.get("#event-tab-label").should("contain", "Gare")
  })
  it("speaks Russian", () => {
    cy.get("#rg2-select-language").select("ru")
    cy.get("#event-tab-label").should("contain", "События")
  })
  it("speaks Portuguese", () => {
    cy.get("#rg2-select-language").select("pt")
    cy.get("#event-tab-label").should("contain", "Eventos")
  })
  it("speaks English", () => {
    cy.get("#rg2-select-language").select("en")
    cy.get("#event-tab-label").should("contain", "Events")
  })
  it("can resize the screen", () => {
    cy.viewport("iphone-x")
  })
  it("warns about invisible maps at start-up", () => {
    const defaultLocalStorage = {
      perCentMapIntensity: 0,
      perCentRouteIntensity: 100,
      replayFontSize: 12,
      courseWidth: 4,
      routeWidth: 5,
      circleSize: 20,
      snap: true,
      showThreeSeconds: false,
      showGPSSpeed: true,
      alignMap: false,
      maxSpeed: 4,
      minSpeed: 10,
      drawnRoutes: []
    }
    localStorage.setItem("rg2-options", JSON.stringify(defaultLocalStorage))
    cy.visit("http://localhost/rg2/")
    cy.wait("@events")
    cy.closeWarningDialog("Your saved settings have 0% map intensity")
  })
  it("doesn't measure things if there is no event loaded", () => {
    cy.get("#btn-measure").should("be.disabled")
  })
})
