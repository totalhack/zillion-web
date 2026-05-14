/* tslint:disable:no-console */

import { register } from "register-service-worker";

if (process.env.NODE_ENV === "production") {
  let isRefreshing = false;

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (isRefreshing) {
        return;
      }

      isRefreshing = true;
      window.location.reload();
    });
  }

  register(`${process.env.BASE_URL}service-worker.js`, {
    ready() {},
    cached() {
      console.log("Content has been cached for offline use.");
    },
    updated(registration) {
      registration.waiting?.postMessage({ type: "SKIP_WAITING" });
    },
    offline() {
      console.log("No internet connection found. App is running in offline mode.");
    },
    error(error) {
      console.error("Error during service worker registration:", error);
    },
  });
}
