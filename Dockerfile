FROM node:latest

RUN apt-get update && apt-get install bup iputils-ping -y

WORKDIR /usr/app
COPY ./ /usr/app

RUN npm install
RUN npm run build && npm run build-server

CMD npm run start
