// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

Cypress.Commands.add('vuex', () => {
  // Need to ensure we visit and wait for app property before accessing?
  // https://stackoverflow.com/a/51194193/10682164
  cy.window().its('app.$store');
});

Cypress.Commands.add('loginAdmin', () => {
  cy.request({
    method: 'POST',
    url: 'http://localhost/api/v1/login/access-token',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: {
      username: Cypress.env('adminUser'),
      password: Cypress.env('adminPassword')
    }
  }).then((resp) => {
    window.localStorage.setItem('token', resp.body.access_token)
  })
});