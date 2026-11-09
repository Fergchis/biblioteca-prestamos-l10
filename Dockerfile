# biblioteca-prestamos: dos etapas. La primera compila con todas las dependencias; la segunda
# lleva solo las de produccion y lo compilado, y corre sin ser root.
FROM node:24-alpine AS compilar
WORKDIR /app
# Primero solo las dependencias: mientras package-lock.json no cambie, Docker reusa esta capa.
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=compilar /app/dist ./dist
# El esquema se aplica al arrancar; main.js lo busca dos carpetas arriba de dist/prestamos.
COPY esquema.sql ./
USER node
EXPOSE 3002
CMD ["node", "dist/main.js"]
