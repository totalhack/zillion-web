/// <reference types="cypress" />

describe("/explorer warehouse access", () => {
  it("shows an error when a user opens a warehouse they cannot access", () => {
    const email = `restricted-${Date.now()}@example.com`;
    const password = "Password123!";

    cy.createUser({ email, password, warehouse_ids: [] });
    cy.loginAs(email, password);
    cy.visit("/main/explorer?warehouse=1");

    cy.get(".notification-toast.notification-toast--error", { timeout: 10000 }).should(
      "contain",
      "Warehouse 1 is unavailable or you do not have access to it"
    );
    cy.get(".container").should("contain", "No Data. Awaiting instructions...");
  });

  it("allows a user with warehouse access to load a saved report", () => {
    const email = `allowed-${Date.now()}@example.com`;
    const password = "Password123!";

    cy.createUser({ email, password, warehouse_ids: [1] });
    cy.createReport({
      warehouseId: 1,
      spec: { metrics: ["hits"], dimensions: ["year"], meta: { title: "Warehouse Access Test" } },
    }).then((report) => {
      cy.loginAs(email, password);
      cy.visit(`/main/explorer?warehouse=1&report=${report.spec_id}`);

      cy.get("[data-cy=metrics]").within(() => {
        cy.get(".multiselect__tags-wrap").should("contain", "H");
      });
      cy.get("[data-cy=dimensions]").within(() => {
        cy.get(".multiselect__tags-wrap").should("contain", "Year");
      });
      cy.get("[data-cy=reportResultGraphCard]").should("not.exist");
      cy.get("[data-cy=warehouseSelect]").within(() => {
        cy.get(".v-select__selection").should("have.text", "Zillion Baseball Warehouse");
      });
      cy.get("[data-cy=runButton]").click();
      cy.contains("[data-cy=reportResultTableCard]", "Report Data", { timeout: 10000 });
    });
  });
});

describe("/admin user forms", () => {
  beforeEach(() => {
    cy.loginAdmin();
  });

  it("shows the warehouse access field on create user", () => {
    cy.visit("/main/admin/users/create");

    cy.contains("Warehouse Access");
    cy.contains("Superusers can access all warehouses automatically.");
  });

  it("hydrates existing user data on the edit form", () => {
    const email = `editable-${Date.now()}@example.com`;
    const password = "Password123!";
    const full_name = "Editable User";

    cy.createUser({ email, password, full_name, warehouse_ids: [1] }).then((user) => {
      cy.visit(`/main/admin/users/edit/${user.id}`);

      cy.contains(".text-body-1", email, { timeout: 10000 });
      cy.get('input[type="email"]').should("have.value", email);
      cy.get("input")
        .filter((index, element) => element.value === full_name)
        .should("have.length.at.least", 1);
    });
  });
});
