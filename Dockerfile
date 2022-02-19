FROM node:16
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "start"]
