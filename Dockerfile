# Tripmates sur le VPS (Dokploy) : le site est compilé par Vite, puis servi par nginx.
# Marche à suivre : docs/hebergement.md

# ---- 1. Compilation -----------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Les variables VITE_* sont lues à la compilation : Dokploy les passe en « build args »
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_IMPORT_DOMAIN
ARG VITE_VAPID_PUBLIC_KEY
ARG VITE_UMAMI_SRC
ARG VITE_UMAMI_WEBSITE_ID
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_IMPORT_DOMAIN=$VITE_IMPORT_DOMAIN \
    VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY \
    VITE_UMAMI_SRC=$VITE_UMAMI_SRC \
    VITE_UMAMI_WEBSITE_ID=$VITE_UMAMI_WEBSITE_ID

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---- 2. Service -----------------------------------------------------------------------
FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/securite.conf /etc/nginx/snippets/securite.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1/sante || exit 1
