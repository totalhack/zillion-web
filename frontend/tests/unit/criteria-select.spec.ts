import { shallowMount } from "@vue/test-utils";
import Vue from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CriteriaSelect from "@/components/CriteriaSelect.vue";
import DayNameCriteriaValueSelect from "@/components/DayNameCriteriaValueSelect.vue";
import DayOfMonthCriteriaValueSelect from "@/components/DayOfMonthCriteriaValueSelect.vue";
import TextAreaListCriteriaValueSelect from "@/components/TextAreaListCriteriaValueSelect.vue";

vi.mock("@/store/main/getters", () => ({
  readActiveWarehouseId: vi.fn(),
  readDimensions: vi.fn(),
  readMetrics: vi.fn(),
  readWarehouses: vi.fn(),
}));

vi.mock("@/store/main/mutations", () => ({
  commitSetUnsupportedGrainMetrics: vi.fn(),
}));

const stubs = [
  "date-time-criteria-value-select",
  "date-time-range-criteria-value-select",
  "date-criteria-value-select",
  "date-range-criteria-value-select",
  "day-name-criteria-value-select",
  "day-of-month-criteria-value-select",
  "float-criteria-value-select",
  "float-between-criteria-value-select",
  "integer-criteria-value-select",
  "integer-between-criteria-value-select",
  "keep-alive",
  "multiselect",
  "text-criteria-value-select",
  "text-between-criteria-value-select",
  "text-area-criteria-value-select",
  "text-area-list-criteria-value-select",
  "v-chip",
  "v-icon",
  "v-list",
  "v-list-item",
  "v-list-item-title",
  "v-menu",
  "v-simple-table",
];

function mountCriteriaSelect(
  rawOptionsMap: Record<string, any> = {
    date: {
      display_name: "Date",
      name: "date",
      type: "date",
    },
  }
) {
  return shallowMount(CriteriaSelect, {
    mocks: {
      $store: { id: "store" },
      $vuetify: { breakpoint: { name: "lg" } },
    },
    propsData: {
      rawOptionsMap,
    },
    stubs,
  });
}

describe("CriteriaSelect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("assigns unique selection keys so the same field can be selected twice", async () => {
    const wrapper = mountCriteriaSelect();
    const vm = wrapper.vm as any;
    const firstOption = vm.options[0].groupValues[0];

    vm.rawSelected = [firstOption];
    vm.handleSelect(firstOption);
    await Vue.nextTick();
    await Vue.nextTick();

    const secondOption = vm.options[0].groupValues[0];
    vm.rawSelected = [...vm.rawSelected, secondOption];
    vm.handleSelect(secondOption);
    await Vue.nextTick();
    await Vue.nextTick();

    expect(firstOption.selection_key).toBe(vm.getBaseSelectionKey("date"));
    expect(secondOption.selection_key).toBe(vm.getBaseSelectionKey("date"));
    expect(vm.rawSelected).toHaveLength(2);
    expect(vm.rawSelected[0]).not.toBe(firstOption);
    expect(vm.rawSelected[1]).not.toBe(secondOption);
    expect(vm.rawSelected[0].selection_key).not.toBe(vm.getBaseSelectionKey("date"));
    expect(vm.rawSelected[1].selection_key).not.toBe(vm.getBaseSelectionKey("date"));
    expect(vm.rawSelected[0].selection_key).not.toBe(vm.rawSelected[1].selection_key);
    expect(vm.rawSelected[0].operation).toBe("between");
    expect(vm.rawSelected[1].operation).toBe("between");
    expect(vm.rawSelected[0].component).toBeTruthy();
    expect(vm.rawSelected[1].component).toBeTruthy();
  });

  it("restores cached null-check operations when a later selection drops them", async () => {
    const wrapper = mountCriteriaSelect({
      domain: {
        display_name: "Domain",
        name: "domain",
        type: "varchar",
      },
      date: {
        display_name: "Date",
        name: "date",
        type: "date",
      },
    });
    const vm = wrapper.vm as any;
    const domainOption = vm.options[0].groupValues.find((option) => option.name === "domain");
    const dateOption = vm.options[0].groupValues.find((option) => option.name === "date");

    vm.rawSelected = [domainOption];
    vm.normalizeSelectedRows();
    vm.updateOperation(vm.rawSelected[0], "is not null");
    await Vue.nextTick();

    const domainCriteria = Object.assign({}, vm.rawSelected[0], {
      operation: null,
      component: null,
    });
    const normalizedRows = vm.normalizeSelectedRows([domainCriteria, dateOption]);

    expect(normalizedRows).toHaveLength(2);
    const normalizedDomainCriteria = normalizedRows.find((row) => row.name === "domain");
    const normalizedDateCriteria = normalizedRows.find((row) => row.name === "date");

    expect(normalizedDomainCriteria).toEqual(
      expect.objectContaining({
        name: "domain",
        operation: "is not null",
        component: null,
      })
    );
    expect(normalizedDateCriteria).toEqual(
      expect.objectContaining({
        name: "date",
        operation: "between",
      })
    );
  });

  it("preserves paused criteria rows when later normalization restores cached state", () => {
    const wrapper = mountCriteriaSelect({
      domain: {
        display_name: "Domain",
        name: "domain",
        type: "varchar",
      },
      date: {
        display_name: "Date",
        name: "date",
        type: "date",
      },
    });
    const vm = wrapper.vm as any;
    const domainOption = vm.options[0].groupValues.find((option) => option.name === "domain");
    const dateOption = vm.options[0].groupValues.find((option) => option.name === "date");

    vm.rawSelected = [domainOption];
    vm.normalizeSelectedRows();
    vm.doPause(vm.rawSelected[0]);

    const domainCriteria = Object.assign({}, vm.rawSelected[0], {
      active: true,
      operation: null,
      component: null,
    });
    const normalizedRows = vm.normalizeSelectedRows([domainCriteria, dateOption]);
    const normalizedDomainCriteria = normalizedRows.find((row) => row.name === "domain");

    expect(normalizedDomainCriteria).toEqual(
      expect.objectContaining({
        name: "domain",
        active: false,
      })
    );
  });

  it("uses shortcut-aware components for day_name and day_of_month fields", () => {
    const wrapper = mountCriteriaSelect({
      day_name: {
        display_name: "Day Name",
        name: "day_name",
        type: "varchar",
      },
      day_of_month: {
        display_name: "Day Of Month",
        name: "day_of_month",
        type: "integer",
      },
    });
    const vm = wrapper.vm as any;

    expect(vm.getComponent("day_name", "varchar", null)).toEqual({
      component: DayNameCriteriaValueSelect,
      operation: "=",
    });
    expect(vm.getComponent("day_of_month", "integer", null)).toEqual({
      component: DayOfMonthCriteriaValueSelect,
      operation: "=",
    });
    expect(vm.getComponent("day_of_month", "integer", "between")).toEqual({
      component: vm.integerComponentOverrides.between,
      operation: "between",
    });
  });

  it("keeps raw shortcut criteria for UI persistence while using resolved execution values", () => {
    const wrapper = mountCriteriaSelect({
      day_name: {
        display_name: "Day Name",
        name: "day_name",
        type: "varchar",
      },
      day_of_month: {
        display_name: "Day Of Month",
        name: "day_of_month",
        type: "integer",
      },
    });
    const vm = wrapper.vm as any;

    vm.rawSelected = [
      {
        active: true,
        component: DayNameCriteriaValueSelect,
        display_name: "Day Name",
        name: "day_name",
        operation: "=",
        selection_key: vm.getNextSelectionKey("day_name"),
        type: "varchar",
        value: "today",
      },
      {
        active: true,
        component: DayOfMonthCriteriaValueSelect,
        display_name: "Day Of Month",
        name: "day_of_month",
        operation: "=",
        selection_key: vm.getNextSelectionKey("day_of_month"),
        type: "integer",
        value: "today",
      },
    ];
    vm.$refs.day_name = [
      {
        criteriaValue: "Wednesday",
        uiCriteriaValue: "today",
        validate: vi.fn(() => ({ error: "", valid: true })),
      },
    ];
    vm.$refs.day_of_month = [
      {
        criteriaValue: 15,
        uiCriteriaValue: "today",
        validate: vi.fn(() => ({ error: "", valid: true })),
      },
    ];

    expect(vm.selected).toEqual([
      ["day_name", "=", "Wednesday"],
      ["day_of_month", "=", 15],
    ]);
    expect(vm.uiSelected).toEqual([
      ["day_name", "=", "today"],
      ["day_of_month", "=", "today"],
    ]);
  });

  it("rehydrates legacy scalar like criteria values for text list inputs", () => {
    const wrapper = mountCriteriaSelect({
      domain: {
        display_name: "Domain",
        name: "domain",
        type: "varchar",
      },
    });
    const vm = wrapper.vm as any;

    vm.selected = [["domain", "like", "%custody%"]];

    expect(vm.rawSelected).toEqual([
      expect.objectContaining({
        component: TextAreaListCriteriaValueSelect,
        name: "domain",
        operation: "like",
        value: "%custody%",
      }),
    ]);
  });
});
