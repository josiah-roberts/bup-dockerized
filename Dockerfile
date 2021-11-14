FROM node:alpine

WORKDIR /usr/app
COPY ./ /usr/app

RUN npm install
RUN npm run build && npm run build-server

CMD npm run start
