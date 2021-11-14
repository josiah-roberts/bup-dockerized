FROM node:latest

RUN apt-get update && apt-get install bup iputils-ping -y

WORKDIR /usr/app
COPY ./package.json /usr/app/package.json
COPY ./package-lock.json /usr/app/package-lock.json

RUN npm install

COPY ./ /usr/app

RUN npm run build && npm run build-server

CMD npm run start
