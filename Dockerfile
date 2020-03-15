FROM keymetrics/pm2:latest

EXPOSE 23333

WORKDIR /app

COPY . /app

RUN npm config set registry https://registry.npm.taobao.org --global && npm config set disturl https://npm.taobao.org/dist --global
RUN npm i && npm run build
RUN mkdir options

CMD ["pm2-docker", "start","ecosystem.config.js"]
