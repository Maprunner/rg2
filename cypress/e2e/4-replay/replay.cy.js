describe("Replay", { testIsolation: false }, () => {
  before(() => {
    cy.task("setUpKartat", { config: "config-01" })
  })
  beforeEach(() => {
    cy.intercept("rg2api.php?type=event&id=*").as("event")
  })
  it("should load a normal Highfield Park event", () => {
    cy.visit("http://localhost/rg2/#388")
    cy.wait("@event")
  })
  it("selects a runner to replay", () => {
    cy.get("#result-tab").click()
    cy.get(".accordion-button").eq(0).click()
    cy.get(".showreplay[data-id='1']").click()
  })
  it("changes the track colour", () => {
    cy.get("#rg2-track-names").within(() => {
      cy.get("input[data-rawid='1']").invoke("val", "#ff0000").trigger("change")
    })
  })
  it("select all Orange runners to replay one at a time", () => {
    // display Orange results
    cy.get(".accordion-button").eq(2).click()
    cy.get("#table-3 .showreplay").click({ multiple: true })
  })
  it("selects all runners on White", () => {
    // display Orange results
    cy.get(".accordion-button").eq(4).click()
    cy.get("#table-5 .allcoursereplay").click()
  })
  it("should load a Trent Park score event", () => {
    cy.visit("http://localhost/rg2/#380")
    cy.wait("@event")
  })
  it("selects runners to replay", () => {
    cy.get("#result-tab").click()
    cy.get(".accordion-button").eq(0).click()
    // runner with a GPS route
    cy.get(".showreplay[data-id='50007']").click()
    // runner with a drawn route
    cy.get(".showreplay[data-id='38']").click()
    // runner with no route
    cy.get(".showreplay[data-id='3']").click()
    cy.get("#btn-start-stop").click()
    cy.wait(1000)
    cy.get("#btn-start-stop").click()
  })
  it("should load a Jersey Farm event with no split times", () => {
    cy.visit("http://localhost/rg2/#129")
    cy.wait("@event")
  })
  it("selects runners to replay", () => {
    cy.get("#result-tab").click()
    cy.get(".accordion-button").eq(0).click()
    // runner with a GPS route
    cy.get(".showreplay[data-id='50001']").click()
    // runner with a drawn route
    cy.get(".showreplay[data-id='2']").click()
    cy.get("#btn-start-stop").click()
    cy.wait(1000)
    cy.get("#btn-start-stop").click()
  })
})
