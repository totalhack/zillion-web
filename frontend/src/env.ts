// const env = process.env.VUE_APP_ENV;

const envApiUrl = `http://${process.env.VUE_APP_DOMAIN}`;

console.log(process.env);

export const apiUrl = envApiUrl;
export const appName = process.env.VUE_APP_NAME;
