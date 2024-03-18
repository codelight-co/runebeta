FROM node:18-alpine

WORKDIR /app

COPY service/package.json service/package-lock.json ./

RUN npm install

COPY service .
COPY --from=builder /app/node_modules .
RUN npm run build

# remove unused dependencies
RUN rm -rf node_modules/rxjs/src/
RUN rm -rf node_modules/rxjs/bundles/
RUN rm -rf node_modules/rxjs/_esm5/
RUN rm -rf node_modules/rxjs/_esm2015/

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

CMD [ "node", "dist/src/main.js" ]
