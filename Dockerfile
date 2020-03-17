FROM node:12.6.0-alpine

EXPOSE 23333

WORKDIR /bilive_client

COPY . /bilive_client

RUN npm config set registry https://registry.npm.taobao.org --global && npm config set disturl https://npm.taobao.org/dist --global
RUN npm install && npm run build
RUN mkdir options

CMD ["npm", "start"]
