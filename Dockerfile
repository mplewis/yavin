FROM node:14.3.0

WORKDIR /app

COPY frontend/package.json /app/frontend/package.json
COPY frontend/yarn.lock /app/frontend/yarn.lock

RUN (cd frontend; yarn install)

COPY package.json /app/package.json
COPY yarn.lock /app/yarn.lock

RUN yarn install

COPY . /app

CMD ["yarn", "start:docker"]
