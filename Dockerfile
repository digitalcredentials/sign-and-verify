FROM node:14.14-buster-slim

WORKDIR /usr/src/app

ADD package.json package-lock.json ./

# FIXME: temporary workaround because of git-based dependencies
RUN npm install -g rollup

# Install OS dependencies, install Node packages, and purge OS packages in one step
# to reduce the size of the resulting image.
RUN apt-get update && \
    apt-get install -y python3-minimal build-essential git && \
    npm install && \
    apt-get clean && \
    apt-get purge -y python3-minimal build-essential git && \
    apt-get -y autoremove

COPY . /usr/src/app

RUN npm run build

EXPOSE 5000

CMD ["node", "dist/index.js"]
