import { shallowMount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import DateCriteriaValueSelect from "@/components/DateCriteriaValueSelect.vue";
import DateRangeCriteriaValueSelect from "@/components/DateRangeCriteriaValueSelect.vue";
import DateTimeCriteriaValueSelect from "@/components/DateTimeCriteriaValueSelect.vue";
import DateTimeRangeCriteriaValueSelect from "@/components/DateTimeRangeCriteriaValueSelect.vue";

const datePickerStub = {
  name: "date-picker",
  props: [
    "value",
    "valueType",
    "format",
    "type",
    "editable",
    "inputAttr",
    "popupClass",
    "placeholder",
    "showTimePanel",
    "shortcuts",
    "range",
  ],
  template: '<div class="date-picker-stub"></div>',
};

function mountWithDatePickerStub(component: any) {
  return shallowMount(component, {
    stubs: {
      "date-picker": datePickerStub,
    },
  });
}

describe("date criteria inputs", () => {
  it("keeps single-date criteria inputs editable", () => {
    const wrapper = mountWithDatePickerStub(DateCriteriaValueSelect);

    expect(wrapper.findComponent(datePickerStub).props("editable")).not.toBe(false);
    expect(wrapper.findComponent(datePickerStub).props("inputAttr")).toBeUndefined();
  });

  it("keeps date-range criteria inputs editable", () => {
    const wrapper = mountWithDatePickerStub(DateRangeCriteriaValueSelect);

    expect(wrapper.findComponent(datePickerStub).props("editable")).not.toBe(false);
    expect(wrapper.findComponent(datePickerStub).props("inputAttr")).toBeUndefined();
  });

  it("keeps single datetime criteria inputs editable", () => {
    const wrapper = mountWithDatePickerStub(DateTimeCriteriaValueSelect);

    expect(wrapper.findComponent(datePickerStub).props("editable")).not.toBe(false);
    expect(wrapper.findComponent(datePickerStub).props("inputAttr")).toBeUndefined();
  });

  it("keeps datetime-range criteria inputs editable", () => {
    const wrapper = mountWithDatePickerStub(DateTimeRangeCriteriaValueSelect);

    expect(wrapper.findComponent(datePickerStub).props("editable")).not.toBe(false);
    expect(wrapper.findComponent(datePickerStub).props("inputAttr")).toBeUndefined();
  });
});
