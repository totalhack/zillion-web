import { shallowMount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "@/App.vue";
import NotificationsManager from "@/components/NotificationsManager.vue";
import ReportFromTextDialog from "@/components/ReportFromTextDialog.vue";
import ReportSaveDialog from "@/components/ReportSaveDialog.vue";
import UploadButton from "@/components/UploadButton.vue";
import Login from "@/views/Login.vue";
import PasswordRecovery from "@/views/PasswordRecovery.vue";
import ResetPassword from "@/views/ResetPassword.vue";
import {
  dispatchCheckLoggedIn,
  dispatchLogIn,
  dispatchPasswordRecovery,
  dispatchRemoveNotification,
  dispatchResetPassword,
} from "@/store/main/actions";
import { readFirstNotification, readIsLoggedIn, readLoginError } from "@/store/main/getters";
import { commitAddNotification, commitRemoveNotification } from "@/store/main/mutations";

vi.mock("@/store/main/actions", () => ({
  dispatchCheckLoggedIn: vi.fn(),
  dispatchLogIn: vi.fn(),
  dispatchPasswordRecovery: vi.fn(),
  dispatchRemoveNotification: vi.fn(),
  dispatchResetPassword: vi.fn(),
}));

vi.mock("@/store/main/getters", () => ({
  readFirstNotification: vi.fn(),
  readIsLoggedIn: vi.fn(),
  readLoginError: vi.fn(),
}));

vi.mock("@/store/main/mutations", () => ({
  commitAddNotification: vi.fn(),
  commitRemoveNotification: vi.fn(),
}));

const stubs = [
  "NotificationsManager",
  "router-link",
  "router-view",
  "v-alert",
  "v-app",
  "v-app-bar",
  "v-btn",
  "v-card",
  "v-card-actions",
  "v-card-text",
  "v-card-title",
  "v-checkbox",
  "v-col",
  "v-container",
  "v-dialog",
  "v-flex",
  "v-form",
  "v-icon",
  "v-layout",
  "v-main",
  "v-progress-circular",
  "v-row",
  "v-snackbar",
  "v-spacer",
  "v-text-field",
  "v-textarea",
  "v-toolbar-title",
];

const validationErrors = {
  collect: vi.fn(() => []),
  first: vi.fn(() => ""),
};

describe("core components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readLoginError).mockReturnValue(false);
    vi.mocked(readIsLoggedIn).mockReturnValue(true);
    vi.mocked(readFirstNotification).mockReturnValue(false);
    vi.mocked(dispatchCheckLoggedIn).mockResolvedValue(undefined as any);
    vi.mocked(dispatchResetPassword).mockResolvedValue(undefined as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("checks the login state when the app is created", () => {
    shallowMount(App, {
      mocks: { $store: { id: "store" } },
      stubs,
    });

    expect(dispatchCheckLoggedIn).toHaveBeenCalledWith({ id: "store" });
  });

  it("submits login credentials through the store action", () => {
    const store = { id: "store" };
    const wrapper = shallowMount(Login, {
      mocks: { $store: store },
      stubs,
    });

    (wrapper.vm as any).email = "user@example.com";
    (wrapper.vm as any).password = "secret";
    (wrapper.vm as any).submit();

    expect(dispatchLogIn).toHaveBeenCalledWith(store, {
      password: "secret",
      username: "user@example.com",
    });
  });

  it("submits and cancels password recovery", () => {
    const back = vi.fn();
    const store = { id: "store" };
    const wrapper = shallowMount(PasswordRecovery, {
      mocks: { $router: { back }, $store: store, errors: validationErrors },
      stubs,
    });

    (wrapper.vm as any).username = "user@example.com";
    (wrapper.vm as any).submit();
    (wrapper.vm as any).cancel();

    expect(dispatchPasswordRecovery).toHaveBeenCalledWith(store, { username: "user@example.com" });
    expect(back).toHaveBeenCalled();
  });

  it("validates reset-password token handling and submit behavior", async () => {
    const push = vi.fn();
    const store = { id: "store" };
    const wrapper = shallowMount(ResetPassword, {
      mocks: {
        $router: {
          currentRoute: { query: { token: "reset-token" } },
          push,
        },
        $store: store,
        $validator: {
          reset: vi.fn(),
          validateAll: vi.fn().mockResolvedValue(true),
        },
        errors: validationErrors,
      },
      stubs,
    });

    (wrapper.vm as any).password1 = "new-password";
    await (wrapper.vm as any).submit();

    expect(dispatchResetPassword).toHaveBeenCalledWith(store, {
      password: "new-password",
      token: "reset-token",
    });
    expect(push).toHaveBeenCalledWith("/");
  });

  it("notifies and redirects when reset-password has no token", () => {
    const push = vi.fn();
    const store = { id: "store" };
    const wrapper = shallowMount(ResetPassword, {
      mocks: {
        $router: {
          currentRoute: { query: {} },
          push,
        },
        $store: store,
        $validator: { reset: vi.fn(), validateAll: vi.fn() },
        errors: validationErrors,
      },
      stubs,
    });

    (wrapper.vm as any).checkToken();

    expect(commitAddNotification).toHaveBeenCalledWith(store, {
      color: "error",
      content: "No token provided in the URL, start a new password recovery",
    });
    expect(push).toHaveBeenCalledWith("/recover-password");
  });

  it("queues notification removal unless timeout is disabled", async () => {
    const store = { id: "store" };
    const wrapper = shallowMount(NotificationsManager, {
      mocks: { $store: store, $vuetify: { breakpoint: { sm: false, xs: false } } },
      stubs,
    });
    const notification = { color: "warning", content: "Careful", timeout: 1000 };

    await (wrapper.vm as any).onNotificationChange(notification, false);
    expect((wrapper.vm as any).show).toBe(true);
    expect((wrapper.vm as any).currentNotificationContent).toBe("Careful");
    expect(dispatchRemoveNotification).toHaveBeenCalledWith(store, {
      notification,
      timeout: 1000,
    });

    vi.clearAllMocks();
    await (wrapper.vm as any).onNotificationChange({ content: "Pinned", timeout: -1 }, notification);
    expect(dispatchRemoveNotification).not.toHaveBeenCalled();
  });

  it("closes notifications by hiding and removing the current item", async () => {
    vi.useFakeTimers();
    const store = { id: "store" };
    const wrapper = shallowMount(NotificationsManager, {
      mocks: { $store: store, $vuetify: { breakpoint: { sm: false, xs: false } } },
      stubs,
    });
    const notification = { content: "Done" };
    (wrapper.vm as any).show = true;
    (wrapper.vm as any).currentNotification = notification;

    const closePromise = (wrapper.vm as any).close();
    vi.advanceTimersByTime(500);
    await closePromise;

    expect((wrapper.vm as any).show).toBe(false);
    expect(commitRemoveNotification).toHaveBeenCalledWith(store, notification);
  });

  it("reads and emits report save dialog state", async () => {
    const wrapper = shallowMount(ReportSaveDialog, { stubs });

    (wrapper.vm as any).open("Default report");
    await (wrapper.vm as any).$nextTick();
    (wrapper.vm as any).autoRun = true;
    (wrapper.vm as any).save();
    await (wrapper.vm as any).$nextTick();

    expect(wrapper.emitted("visibility-change")).toEqual([[true], [false]]);
    expect(wrapper.emitted("input")?.[0]).toEqual([
      {
        autorun: true,
        title: "Default report",
        update: false,
      },
    ]);
    expect((wrapper.vm as any).dialog).toBe(false);
  });

  it("emits report text only when non-empty and supports ctrl-enter", () => {
    const wrapper = shallowMount(ReportFromTextDialog, { stubs });

    (wrapper.vm as any).text = "   ";
    (wrapper.vm as any).save();
    expect(wrapper.emitted("input")).toBeUndefined();

    (wrapper.vm as any).text = "hits by franchise_name";
    (wrapper.vm as any).autoRun = true;
    const preventDefault = vi.fn();
    (wrapper.vm as any).keyListenerHandler({ ctrlKey: true, key: "Enter", preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(wrapper.emitted("input")?.[0]).toEqual([{ text: "hits by franchise_name", autorun: true }]);
  });

  it("triggers the hidden file input and emits selected files", () => {
    const wrapper = shallowMount(UploadButton, {
      propsData: { multiple: true },
      stubs,
    });
    const click = vi.fn();
    (wrapper.vm.$refs as any).fileInput = { click };

    (wrapper.vm as any).trigger();
    expect(click).toHaveBeenCalled();

    const files = [{ name: "report.csv" }];
    expect((wrapper.vm as any).files({ target: { files } })).toBe(files);
  });
});
