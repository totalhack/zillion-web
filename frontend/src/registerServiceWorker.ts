/* tslint:disable:no-console */

import { register } from "register-service-worker";

type ServiceWorkerUpdateListener = (registration?: ServiceWorkerRegistration | null) => void;

let updateListeners: ServiceWorkerUpdateListener[] = [];
let waitingRegistration: ServiceWorkerRegistration | null = null;
let shouldReloadForActivatedUpdate = false;

function notifyUpdateListeners(registration?: ServiceWorkerRegistration | null) {
  waitingRegistration = registration || null;
  updateListeners.forEach((listener) => listener(registration));
}

function handleWaitingRegistration(registration?: ServiceWorkerRegistration) {
  if (!registration?.waiting) {
    return;
  }

  notifyUpdateListeners(registration);
}

export function onServiceWorkerUpdate(listener: ServiceWorkerUpdateListener) {
  updateListeners.push(listener);

  if (waitingRegistration) {
    listener(waitingRegistration);
  }

  return () => {
    updateListeners = updateListeners.filter((registeredListener) => registeredListener !== listener);
  };
}

export function refreshForServiceWorkerUpdate() {
  shouldReloadForActivatedUpdate = true;

  if (waitingRegistration?.waiting) {
    waitingRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
    return;
  }

  window.location.reload();
}

if (process.env.NODE_ENV === "production") {
  let isRefreshing = false;

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (isRefreshing) {
        return;
      }

      if (!shouldReloadForActivatedUpdate) {
        notifyUpdateListeners(null);
        return;
      }

      isRefreshing = true;
      waitingRegistration = null;
      window.location.reload();
    });
  }

  register(`${process.env.BASE_URL}service-worker.js`, {
    ready(registration) {
      handleWaitingRegistration(registration);
    },
    cached() {
      console.log("Content has been cached for offline use.");
    },
    updated(registration) {
      handleWaitingRegistration(registration);
    },
    offline() {
      console.log("No internet connection found. App is running in offline mode.");
    },
    error(error) {
      console.error("Error during service worker registration:", error);
    },
  });
}
