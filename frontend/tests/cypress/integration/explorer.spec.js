/// <reference types="cypress" />

describe('/explorer', () => {
  beforeEach(() => {
    cy.loginAdmin();
    cy.visit('http://localhost/main/explorer?warehouse=1')
  })

  it('load a report for the provided ID', () => {
    cy.get('.v-navigation-drawer')
      .should('have.class', 'v-navigation-drawer--open')
  })

  it('has no data message to start', () => {
    cy.get('.container')
      .should('contain', 'No Data. Awaiting instructions...')
  })

  it('selected zillion baseball warehouse', () => {
    cy.get('[data-cy=warehouseSelect]').within(() => {
      cy.get('.v-select__selection')
        .should('have.text', 'Zillion Baseball Warehouse')
    })
  })

  it('has the hits metric selected', () => {
    cy.get('[data-cy=metrics]').within(() => {
      cy.get('.multiselect__tags-wrap').should('contain', 'H')
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
