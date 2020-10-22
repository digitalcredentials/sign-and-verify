FROM node:14.14-stretch-slim

WORKDIR /usr/src/app

ADD package.json package-lock.json ./

RUN npm install

COPY . /usr/src/app

RUN npm run build

EXPOSE 5000

CMD ["node", "dist/index.js"]
