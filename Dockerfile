FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json .

RUN npm init

COPY . .

EXPOSE 5500

CMD ["node","server.js"]