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

Cypress.Commands.add("vuex", () => {
  // Need to ensure we visit and wait for app property before accessing?
  // https://stackoverflow.com/a/51194193/10682164
  cy.window().its("app.$store");
});
Cypress.Commands.add("getAccessToken", (email, password) => {
  return cy
    .request({
      method: "POST",
      url: "http://localhost:8000/api/v1/login/access-token",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: {
        username: email,
        password,
      },
    })
    .its("body.access_token");
});

Cypress.Commands.add("getAdminAccessToken", () => {
  return cy.getAccessToken(Cypress.env("adminUser"), Cypress.env("adminPassword"));
});

Cypress.Commands.add("loginAs", (email, password) => {
  cy.getAccessToken(email, password).then((token) => {
    window.localStorage.setItem("token", token);
  });
});

Cypress.Commands.add("loginAdmin", () => {
  cy.loginAs(Cypress.env("adminUser"), Cypress.env("adminPassword"));
});

Cypress.Commands.add("createUser", ({ email, password, warehouse_ids = [], ...rest }) => {
  return cy.getAdminAccessToken().then((token) => {
    return cy
      .request({
        method: "POST",
        url: "http://localhost:8000/api/v1/users/",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: {
          email,
          password,
          is_active: true,
          is_superuser: false,
          warehouse_ids,
          ...rest,
        },
      })
      .its("body");
  });
});

Cypress.Commands.add("createReport", ({ warehouseId = 1, spec }) => {
  return cy.getAdminAccessToken().then((token) => {
    return cy
      .request({
        method: "POST",
        url: `http://localhost:8000/api/v1/warehouse/${warehouseId}/save`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: spec,
      })
      .its("body");
  });
});
