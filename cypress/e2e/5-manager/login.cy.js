describe("Manager login", { testIsolation: false }, () => {
  before(() => {
    cy.task("setUpKartat", { config: "config-01" })
  })
  it("should reject invalid login", () => {
    cy.intercept("rg2api.php?type=events*").as("events")
    cy.intercept("rg2api.php?type=event&id=*").as("event")
    cy.intercept("rg2api.php?type=login*").as("login")
    cy.visit("http://localhost/rg2/?manage")
    cy.wait("@events")
    cy.get("#rg2-event-title").should("be.visible").and("contain", "Routegadget 2")
    // incorrect username
    cy.get("#rg2-user-name").clear().type("hhhhh")
    cy.get("#rg2-password").clear().type("00000")
    cy.get("#btn-login").click()
    cy.wait("@login")
    cy.closeWarningDialog("Login failed")
    // user name too short
    cy.get("#rg2-user-name").clear().type("hhh")
    cy.get("#rg2-password").clear().type("00000")
    cy.get("#btn-login").click()
    cy.closeWarningDialog("at least five characters")
    // password too short
    cy.get("#rg2-user-name").clear().type("hhhhh")
    cy.get("#rg2-password").clear().type("000")
    cy.get("#btn-login").click()
    cy.closeWarningDialog("at least five characters")
  })
})
