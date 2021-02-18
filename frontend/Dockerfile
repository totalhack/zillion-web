# Stage 0, "build-stage", based on Node.js, to build and compile the frontend
FROM tiangolo/node-frontend:10 as build-stage

WORKDIR /app

COPY package*.json /app/

RUN npm install

COPY ./ /app/

ARG FRONTEND_ENV=production
ARG VUE_APP_NAME=Zillion
ARG VUE_APP_DOMAIN=localhost

ENV VUE_APP_ENV=${FRONTEND_ENV}
ENV VUE_APP_NAME=${VUE_APP_NAME}
ENV VUE_APP_DOMAIN=${VUE_APP_DOMAIN}

# Comment out the next line to disable tests
RUN npm run test:unit

RUN npm run build

# Stage 1, based on Nginx, to have only the compiled app, ready for production with Nginx
FROM nginx:1.15

COPY --from=build-stage /app/dist/ /usr/share/nginx/html

COPY --from=build-stage /nginx.conf /etc/nginx/conf.d/default.conf
COPY ./nginx-backend-not-found.conf /etc/nginx/extra-conf.d/backend-not-found.conf

