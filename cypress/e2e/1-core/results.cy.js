/* eslint-disable cypress/no-unnecessary-waiting */
describe("looking at results", { testIsolation: false }, () => {
  before(() => {
    cy.task("setUpKartat", { config: "config-01" })
  })
  it("should load a georeferenced Highfield Park event", () => {
    cy.intercept("rg2api.php?type=event&id=*").as("event")
    cy.visit("http://localhost/rg2/#388")
    cy.wait("@event")
  })
  it("displays results", () => {
    cy.get("#result-tab").click()
    cy.get(".accordion button div[data-courseid='1']").click()
  })
  it("filters results by name", () => {
    cy.get("[data-courseid='1'][data-runners='41'").should("be.visible")
    cy.get("#rg2-result-search input").type("e")
    cy.get("[data-courseid='1'][data-runners='33'").should("be.visible")
    cy.get("#rg2-result-search input").type("r")
    cy.get("[data-courseid='1'][data-runners='10'").should("be.visible")
    cy.get("#rg2-result-search input").type("r")
    cy.get("[data-courseid='1'][data-runners='1'").should("be.visible")
    cy.get("#rg2-result-search input").type("x")
    cy.get("[data-courseid='1'][data-runners='0'").should("be.visible")
    cy.get("#rg2-result-search input").clear()
    cy.get("[data-courseid='1'][data-runners='41'").should("be.visible")
  })
  it("displays a GPS route", () => {
    cy.get("#rg2-result-table .showcourse[data-courseid='1'").click()
    cy.get(".showtrack[data-id='50002']").check()
    cy.get("#btn-settings").click()
    cy.get("#chk-show-GPS-speed").check()
    cy.get("#chk-show-GPS-speed").check()
    cy.get("#btn-settings").click()
  })
})
