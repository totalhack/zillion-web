const env = process.env.VUE_APP_ENV;

let envApiUrl = '';

if (env === 'production' || env === 'staging') {
    envApiUrl = `https://${process.env.VUE_APP_DOMAIN}`;
} else {
    envApiUrl = `http://${process.env.VUE_APP_DOMAIN}`;
}

export const apiUrl = envApiUrl;
export const appName = process.env.VUE_APP_NAME;
