import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  addSortedIfMissing,
  binaryFind,
  focusAndOpenKeyboard,
  getDateEndOf,
  getDateStartOf,
  getLastMonthEnd,
  getLastMonthStart,
  getLocalToken,
  getNHoursAgo,
  getSessionReportRequest,
  getSessionWarehouseId,
  getTodayDayName,
  getTodayDayOfMonth,
  getToday,
  getTomorrow,
  isTodayShortcutValue,
  removeLocalToken,
  saveLocalToken,
  saveSessionReportRequest,
  saveSessionWarehouseId,
  sortBy,
  ValidationError,
} from "@/utils";

describe("utils", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads, writes, and removes auth tokens from localStorage", () => {
    expect(getLocalToken()).toBeNull();

    saveLocalToken("abc123");
    expect(getLocalToken()).toBe("abc123");

    removeLocalToken();
    expect(getLocalToken()).toBeNull();
  });

  it("serializes report request and warehouse id in sessionStorage", () => {
    const request = { dimensions: ["year"], metrics: ["hits"] };

    expect(getSessionReportRequest()).toBeNull();
    expect(getSessionWarehouseId()).toBeNull();

    saveSessionReportRequest(request);
    saveSessionWarehouseId(42);

    expect(getSessionReportRequest()).toEqual(request);
    expect(getSessionWarehouseId()).toBe(42);
  });

  it("finds existing sorted elements and insertion points", () => {
    expect(binaryFind([1, 3, 5], 3)).toEqual({ found: true, index: 1 });
    expect(binaryFind([1, 3, 5], 4)).toEqual({ found: false, index: 2 });
    expect(binaryFind([null, 3, 5], 1)).toEqual({ found: false, index: 1 });
  });

  it("inserts sorted values only when missing", () => {
    const values = [1, 3, 5];

    expect(addSortedIfMissing(values, 4)).toBe(2);
    expect(values).toEqual([1, 3, 4, 5]);

    expect(addSortedIfMissing(values, 4)).toBe(2);
    expect(values).toEqual([1, 3, 4, 5]);
  });

  it("sorts objects by a field", () => {
    const rows = [{ name: "b" }, { name: "a" }, { name: "c" }];

    expect(rows.sort(sortBy("name"))).toEqual([{ name: "a" }, { name: "b" }, { name: "c" }]);
  });

  it("formats relative date helpers consistently", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-05-15T12:34:56"));

    expect(getToday("date")).toBe("2024-05-15");
    expect(getTodayDayName()).toBe("Wednesday");
    expect(getTodayDayOfMonth()).toBe(15);
    expect(getTomorrow("date")).toBe("2024-05-16");
    expect(getNHoursAgo(3, "datetime")).toBe("2024-05-15 09:00:00");
    expect(getDateStartOf("month", "date")).toBe("2024-05-01");
    expect(getDateEndOf("month", "date")).toBe("2024-05-31");
    expect(getLastMonthStart("date")).toBe("2024-04-01");
    expect(getLastMonthEnd("date")).toBe("2024-04-30");
  });

  it("recognizes the today shortcut case-insensitively", () => {
    expect(isTodayShortcutValue("today")).toBe(true);
    expect(isTodayShortcutValue(" Today ")).toBe(true);
    expect(isTodayShortcutValue("TODAY")).toBe(true);
    expect(isTodayShortcutValue("tomorrow")).toBe(false);
    expect(isTodayShortcutValue(15)).toBe(false);
  });

  it("throws a named validation error", () => {
    const error = new ValidationError("missing field");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ValidationError");
    expect(error.message).toBe("missing field");
  });

  it("temporarily focuses a helper input before opening the keyboard on the target element", () => {
    vi.useFakeTimers();
    const target = document.createElement("input");
    const focus = vi.spyOn(target, "focus");
    const click = vi.spyOn(target, "click");
    target.getBoundingClientRect = vi.fn(() => ({
      bottom: 20,
      height: 20,
      left: 5,
      right: 25,
      top: 0,
      width: 20,
      x: 5,
      y: 0,
      toJSON: () => ({}),
    }));

    focusAndOpenKeyboard(target, 25);
    expect(document.body.querySelectorAll("input")).toHaveLength(1);

    vi.advanceTimersByTime(25);

    expect(focus).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(document.body.querySelectorAll("input")).toHaveLength(0);
  });
});
