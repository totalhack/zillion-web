import { shallowMount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import DayNameCriteriaValueSelect from "@/components/DayNameCriteriaValueSelect.vue";
import DayOfMonthCriteriaValueSelect from "@/components/DayOfMonthCriteriaValueSelect.vue";

describe("day shortcut criteria components", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves the today shortcut for day_name while preserving the raw UI value", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-05-15T12:34:56"));

    const wrapper = shallowMount(DayNameCriteriaValueSelect, {
      propsData: { value: "TODAY" },
      stubs: ["v-text-field"],
    });
    const vm = wrapper.vm as any;

    expect(vm.criteriaValue).toBe("Wednesday");
    expect(vm.uiCriteriaValue).toBe("TODAY");
  });

  it("accepts saved string values when rehydrating day_name criteria", () => {
    expect((DayNameCriteriaValueSelect as any).criteriaToOptionValue("today")).toBe("today");
    expect((DayNameCriteriaValueSelect as any).criteriaToOptionValue("Tuesday")).toBe("Tuesday");
    expect((DayNameCriteriaValueSelect as any).criteriaToOptionValue(12)).toBeNull();
  });

  it("resolves the today shortcut for day_of_month and validates it", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-05-15T12:34:56"));

    const wrapper = shallowMount(DayOfMonthCriteriaValueSelect, {
      propsData: { value: "today" },
      stubs: ["v-text-field"],
    });
    const vm = wrapper.vm as any;

    expect(vm.criteriaValue).toBe(15);
    expect(vm.uiCriteriaValue).toBe("today");
    expect(vm.getRules()[1]("today")).toBe(true);
  });
});
