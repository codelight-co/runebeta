import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import compressFilter from './utils/compressFilter';
import bodyParser from 'body-parser';
// import config from './config/config';
// import { IAtomListingState } from './atom.interfaces';
// import { SellerSigner } from './atom.signer';
// import logger from './middleware/logger';
import { Posts } from './api/posts';

const app: Express = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());

app.use(
  cors({
    // origin is given a array if we want to have multiple origins later
    origin: ['*'],
    credentials: true,
  }),
);

// Helmet is used to secure this app by configuring the http-header
app.use(helmet());

// Compression is used to reduce the size of the response body
app.use(compression({ filter: compressFilter }));

app.get('/', (_req: Request, res: Response) => {
  res.send('Hello World!');
});

Posts.create(app, '/api/v1').generateUnsignedListingPSBTBase64();
Posts.create(app, '/api/v1').verifySignedListingPSBTBase64();
Posts.create(app, '/api/v1').selectPaymentUTXOs();
Posts.create(app, '/api/v1').generateUnsignedBuyingPSBTBase64();
Posts.create(app, '/api/v1').mergeSignedBuyingPSBTBase64();

export default app;
