/// <reference types="cypress" />

const uiBaseUrl = "http://localhost:8080";

function createSavedReport() {
  return cy.createReport({
    warehouseId: 1,
    spec: {
      metrics: ["hits"],
      dimensions: ["year"],
      meta: { title: "Explorer Cypress Test" },
    },
  });
}

describe("/explorer", () => {
  beforeEach(() => {
    cy.loginAdmin();
  });

  it("load a report for the provided ID", () => {
    createSavedReport().then((report) => {
      cy.visit(`${uiBaseUrl}/main/explorer?warehouse=1&report=${report.spec_id}`);

      cy.get(".v-navigation-drawer").should("have.class", "v-navigation-drawer--open");
    });
  });

  it("has no data message to start", () => {
    cy.visit(`${uiBaseUrl}/main/explorer?warehouse=1`);

    cy.get(".container").should("contain", "No Data. Awaiting instructions...");
  });

  it("selected zillion baseball warehouse", () => {
    createSavedReport().then((report) => {
      cy.visit(`${uiBaseUrl}/main/explorer?warehouse=1&report=${report.spec_id}`);

      cy.get("[data-cy=warehouseSelect]").within(() => {
        cy.get(".v-select__selection").should("have.text", "Zillion Baseball Warehouse");
      });
    });
  });

  it("has the hits metric selected", () => {
    createSavedReport().then((report) => {
      cy.visit(`${uiBaseUrl}/main/explorer?warehouse=1&report=${report.spec_id}`);

      cy.get("[data-cy=metrics]").within(() => {
        cy.get(".multiselect__tags-wrap").should("contain", "H");
      });
    });
  });

  it("can run the report", () => {
    createSavedReport().then((report) => {
      cy.visit(`${uiBaseUrl}/main/explorer?warehouse=1&report=${report.spec_id}`);

      cy.get("[data-cy=runButton]").click();
      cy.contains("[data-cy=reportResultTableCard]", "Report Data", { timeout: 10000 });
    });
  });
});
