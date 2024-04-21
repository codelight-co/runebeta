import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ODR_PORT, ODR_URL } from 'src/environments';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class IndexersService {
  constructor(
    private readonly httpService: HttpService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async getBlockHeight(isCacheable = true) {
    if (isCacheable) {
      const currentBlockHeight = await this.redis.get('currentBlockHeight');
      if (currentBlockHeight) {
        return parseInt(currentBlockHeight);
      }
    }

    const res = await this.httpService
      .get(`${ODR_URL}:${ODR_PORT}/blockheight`)
      .toPromise();

    return res.data;
  }

  async getBlockSyncNumber() {
    const res = await this.httpService
      .get(`${ODR_URL}:${ODR_PORT}/blockcount`)
      .toPromise();

    return res.data;
  }

  async getRuneDetails(runeName: string) {
    const res = await this.httpService
      .get(`${ODR_URL}:${ODR_PORT}/rune/${runeName}`, {
        transformResponse: [(data) => data],
      })
      .toPromise()
      .then((res) => {
        const parsedData = JSON.parse(res.data, (key, value) => {
          if (typeof value === 'number' && !Number.isSafeInteger(value)) {
            const strBig = res.data.match(
              new RegExp(`(?:"${key}":)(.*?)(?:,)`),
            )[1]; // get the original value using regex expression

            return strBig; //should be BigInt(strBig) - BigInt function is not working in this snippet
          }
          return value;
        });

        return parsedData;
      });

    return res;
  }
}
