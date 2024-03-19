import app from './app';
import env from './configs/env';
import logger from './middleware/logger';

const server = app.listen(parseInt(env.port ?? '3000'), () => {
  console.log('info', `Server is running on Port: ${env.port ?? 3000}`);
  logger.log('info', `Server is running on Port: ${env.port ?? 3000}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received.');
  logger.info('Closing http server.');
  server.close(err => {
    logger.info('Http server closed.');
    process.exit(err ? 1 : 0);
  });
});
