FROM node:21-slim as git-builder
RUN apt-get update && apt-get install --no-install-recommends -y \
  gettext build-essential git autoconf libz-dev libssl-dev libcurl4-gnutls-dev libexpat1-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/git
RUN git clone git://git.kernel.org/pub/scm/git/git.git . && \
  git checkout v2.34.1 && \
  make configure && \
  ./configure --prefix=/usr && \
  make && \
  make install && \
  rm -rf /usr/git

FROM node:alpine as install

WORKDIR /usr/app
COPY ./package.json /usr/app/package.json
COPY ./package-lock.json /usr/app/package-lock.json

RUN npm install

FROM node:21-slim

RUN apt-get update && apt-get install --no-install-recommends bup -y && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /usr/app

COPY --from=git-builder /usr/bin/git /usr/bin/
COPY --from=git-builder /usr/libexec/git-core /usr/libexec/git-core
COPY --from=install /usr/app/node_modules /usr/app/node_modules

COPY ./ /usr/app

RUN npm run build && \
  npm run build-server

CMD npm run start
