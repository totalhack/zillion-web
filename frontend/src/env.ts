const env = process.env.VUE_APP_ENV || "development";
const apiBaseUrl = process.env.VUE_APP_API_URL;
const domain = process.env.VUE_APP_DOMAIN || "localhost";

let envApiUrl = "";

if (apiBaseUrl) {
  envApiUrl = apiBaseUrl;
} else if (env === "development") {
  envApiUrl = "";
} else if (env === "production" || env === "staging") {
  envApiUrl = `https://${domain}`;
} else {
  envApiUrl = `http://${domain}`;
}

export const apiUrl = envApiUrl;
export const appName = process.env.VUE_APP_NAME || "Zillion";
