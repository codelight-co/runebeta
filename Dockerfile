FROM node:18-alpine AS builder

WORKDIR /app

RUN wget -qO- https://get.pnpm.io/install.sh | ENV="$HOME/.shrc" SHELL="$(which sh)" sh -
RUN corepack enable pnpm

COPY rune_lib ./rune_lib
RUN cd rune_lib && pnpm install && npm run build

COPY service/package.json service/package-lock.json ./service/
RUN cd service && npm install

COPY service ./service
RUN cd service && npm run build

# remove unused dependencies
RUN rm -rf service/node_modules/rxjs/src/
RUN rm -rf service/node_modules/rxjs/bundles/
RUN rm -rf service/node_modules/rxjs/_esm5/
RUN rm -rf /service/node_modules/rxjs/_esm2015/

EXPOSE 3000
CMD [ "node", "service/dist/src/main.js" ]
