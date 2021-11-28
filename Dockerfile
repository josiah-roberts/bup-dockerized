FROM node:latest

RUN apt-get update && apt-get install --no-install-recommends gettext -y

WORKDIR /usr/git
RUN git clone git://git.kernel.org/pub/scm/git/git.git . && \
  git checkout v2.34.1 && \
  make configure && \
  ./configure --prefix=/usr && \
  make && \ 
  make install && \
  rm -rf /usr/git && \
  apt-get install --no-install-recommends bup -y

WORKDIR /usr/app
COPY ./package.json /usr/app/package.json
COPY ./package-lock.json /usr/app/package-lock.json

RUN npm install

COPY ./ /usr/app

RUN npm run build && \
  npm run build-server

CMD npm run start
