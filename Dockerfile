FROM node:lts as build
COPY package.json package-lock.json ./
RUN NODE_ENV=development npm install
COPY . .
RUN npm run build

FROM node:lts
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm install
COPY . .
COPY --from=build dist dist
CMD ["npm", "run", "start"]
