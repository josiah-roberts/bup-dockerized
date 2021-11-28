FROM node:latest

WORKDIR /usr/git
RUN git clone git://git.kernel.org/pub/scm/git/git.git .
RUN git checkout v2.34.1

RUN apt-get update && apt-get install gettext bup -y

RUN make configure
RUN ./configure --prefix=/usr
RUN make
RUN make install

WORKDIR /usr/app
COPY ./package.json /usr/app/package.json
COPY ./package-lock.json /usr/app/package-lock.json

RUN npm install

COPY ./ /usr/app

RUN npm run build && npm run build-server

CMD npm run start
