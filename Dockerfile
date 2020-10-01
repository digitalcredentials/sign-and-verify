FROM node:14.11

WORKDIR /usr/src/app

ADD package.json ./

RUN npm install

COPY . /usr/src/app

RUN npm run build

EXPOSE 5000

USER node
CMD node dist/index.js
