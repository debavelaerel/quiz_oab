# Imagem do Next (output: 'standalone'). Build:
#   docker build -t quiz-oab \
#     --build-arg NEXT_PUBLIC_PRIVACIDADE_URL=https://... \
#     --build-arg NEXT_PUBLIC_VIDEO_PARTE2=https://... .
# As NEXT_PUBLIC_* são embutidas no bundle do navegador NO BUILD — definir só
# no runtime não tem efeito. As demais variáveis (Supabase, S3, SMTP, admin,
# serviço de PDF) são lidas em runtime: passar com -e/--env-file/task definition.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_PRIVACIDADE_URL=""
ARG NEXT_PUBLIC_VIDEO_PARTE2=""
ENV NEXT_PUBLIC_PRIVACIDADE_URL=$NEXT_PUBLIC_PRIVACIDADE_URL \
    NEXT_PUBLIC_VIDEO_PARTE2=$NEXT_PUBLIC_VIDEO_PARTE2 \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
