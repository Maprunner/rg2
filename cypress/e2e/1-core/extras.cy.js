/* eslint-disable cypress/no-unnecessary-waiting */
describe("Miscellaneous extras", { testIsolation: false }, () => {
  beforeEach(() => {
    cy.intercept("rg2api.php?type=event&id=*").as("event")
    cy.intercept("rg2api.php?type=events*").as("events")
  })
  it("should load a normal event from a URL with routes and courses", () => {
    cy.task("setUpKartat", { config: "config-01" })
    cy.visit("http://localhost/rg2/#388&course=2,5&route=50002,50009")
    cy.wait("@event")
    cy.get("#course-tab").should("not.be.disabled")
    cy.get("#result-tab").should("not.be.disabled")
    cy.get("#draw-tab").should("not.be.disabled")
    cy.get("#rg2-event-title").should("contain", "2022-06-04 Highfield Park Saturday Series")
    cy.get("#btn-about").click()
    cy.get("#rg2-event-stats").should("not.be.empty").and("contain", "Event statistics")
    cy.get("#rg2-right-info-panel").find(".btn-close").click()
  })
  it.skip("should handle an invalid URL ID and just display the event list", () => {
    cy.task("setUpKartat", { config: "config-01" })
    cy.visit("http://localhost/rg2/#100xyz")
    cy.wait("@events")
    cy.get("#course-tab").should("be.disabled")
    cy.get("#result-tab").should("be.disabled")
    cy.get("#draw-tab").should("be.disabled")
  })

  it("reports an invalid kartat directory", () => {
    cy.task("setUpKartat", { config: "config-02", php: "config-02" })
    cy.visit("http://localhost/rg2/")
    cy.get("body").should("be.visible").and("contain", "Routegadget 2: Kartat directory").and("contain", "not found")
  })
  // cypress back/forward broken for # links? https://github.com/cypress-io/cypress/issues/896
  it.skip("should load another event and go backwards and forwards", () => {
    cy.visit("http://localhost/rg2/#380")
    cy.wait("@event")
    cy.get("#rg2-event-title").should("contain", "2021-12-26 Trent Park Boxing Day Score")
    cy.go("back")
    cy.wait("@event")
    cy.get("#rg2-event-title").should("contain", "2022-06-04 Highfield Park Saturday Series")
    cy.go("forward")
    cy.wait("@event")
    cy.get("#rg2-event-title").should("contain", "2021-12-26 Trent Park Boxing Day Score")
  })
})
