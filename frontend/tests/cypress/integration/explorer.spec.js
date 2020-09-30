/// <reference types="cypress" />

describe('/explorer', () => {
  beforeEach(() => {
    cy.loginAdmin();
    // TODO: how to guarantee this report exists in test env?
    cy.visit('http://localhost:8080/main/explorer?warehouse=1&report=29')
  })

  it('load a report for the provided ID', () => {
    cy.get('.v-navigation-drawer')
      .should('have.class', 'v-navigation-drawer--open')
  })

  it('has no data message to start', () => {
    cy.get('.container')
      .should('contain', 'No Data. Awaiting instructions...')
  })

  it('selected zillion covid warehouse', () => {
    cy.get('[data-cy=warehouseSelect]').within(() => {
      cy.get('.v-select__selection')
        .should('have.text', 'Zillion Covid-19 Warehouse')
    })
  })

  it('has the Cases metric selected', () => {
    cy.get('[data-cy=metrics]').within(() => {
      cy.get('.multiselect__tags-wrap').should('contain', 'Cases')
    })
  })

  it('can run the report', () => {
    // Alternative approach - stub response
    // cy.server()
    // cy.route('api/v1/warehouse/1/execute', {
    //   ...stubbed response
    // }).as('executeReport')
    cy.get('[data-cy=runButton]').click();
    cy.contains('[data-cy=reportResultGraphCard]', 'Report Graph', { timeout: 10000 });
    cy.contains('[data-cy=reportResultTableCard]', 'Report Data', { timeout: 10000 });
  })

})
