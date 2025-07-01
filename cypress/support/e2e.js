// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

import "./commands"
import "@cypress/code-coverage/support"

// needed to test modals: see https://www.cypress.io/blog/2019/01/22/when-can-the-test-click/
import "cypress-pipe"

// needed to test drag and drop for modals
import "@4tw/cypress-drag-drop"

// needed to test mouseover for hover
import "cypress-real-events"

Cypress.on("uncaught:exception", (err, runnable) => {
  if (err.message.includes("ResizeObserver loop completed with undelivered notifications.")) {
    // ignore the error
    return false
  }
})
