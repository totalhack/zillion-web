# Stage 0, "build-stage", based on Node.js, to build and compile the frontend
FROM node:22-bookworm-slim as build-stage

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /app/

RUN corepack enable && corepack prepare pnpm@11.1.0 --activate && pnpm install --frozen-lockfile

COPY ./ /app/

ARG FRONTEND_ENV=production
ARG VUE_APP_NAME=Zillion
ARG VUE_APP_DOMAIN=localhost
ARG VUE_APP_API_URL=

ENV VUE_APP_ENV=${FRONTEND_ENV}
ENV VUE_APP_NAME=${VUE_APP_NAME}
ENV VUE_APP_DOMAIN=${VUE_APP_DOMAIN}
ENV VUE_APP_API_URL=${VUE_APP_API_URL}

# Comment out the next line to disable tests
# RUN pnpm run test:unit

RUN pnpm run build

# Stage 1, based on Nginx, to have only the compiled app, ready for production with Nginx
FROM nginx:1.31

COPY --from=build-stage /app/dist/ /usr/share/nginx/html

COPY ./nginx.conf /etc/nginx/conf.d/default.conf
COPY ./nginx-backend-not-found.conf /etc/nginx/extra-conf.d/backend-not-found.conf

