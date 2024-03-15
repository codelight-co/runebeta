FROM node:18-alpine AS builder

WORKDIR /app

COPY service/package.json service/package-lock.json ./

RUN npm install

COPY service .

RUN npm run build

# remove unused dependencies
RUN rm -rf node_modules/rxjs/src/
RUN rm -rf node_modules/rxjs/bundles/
RUN rm -rf node_modules/rxjs/_esm5/
RUN rm -rf node_modules/rxjs/_esm2015/

EXPOSE 3000
CMD [ "node", "dist/src/main.js" ]
