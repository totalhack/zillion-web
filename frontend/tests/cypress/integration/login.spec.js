/// <reference types="cypress" />

describe('/login', () => {
  let adminUser;
  let adminPassword;

  before(() => {
    adminUser = Cypress.env('adminUser');
    adminPassword = Cypress.env('adminPassword');
  })

  beforeEach(() => {
    cy.visit('http://localhost/login')
  })

  it('greets with login', () => {
    cy.contains('Zillion');
    cy.contains('Login');
  })

  // TODO: currently UI just leaves the same message up for all these errors.
  it('requires email', () => {
    cy.get('.v-btn').contains('Login').click();
    cy.get('.v-alert__content').should('contain', 'Incorrect email or password');
  })

  it('requires password', () => {
    cy.get('input[name="login"]').type(adminUser + '{enter}');
    cy.get('.v-alert__content').should('contain', 'Incorrect email or password');
  })

  it('requires proper credentials', () => {
    cy.get('input[name="login"]').type(adminUser);
    cy.get('input[name="password"]').type('invalid{enter}');
    cy.get('.v-alert__content').should('contain', 'Incorrect email or password');
  })

  it('navigates to /explorer on success', () => {
    cy.get('input[name="login"]').type(adminUser);
    cy.get('input[name="password"]').type(adminPassword + '{enter}', { log: false });
    cy.url().should('include', 'main/explorer');
  })
})
