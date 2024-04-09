import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ODR_PORT, ODR_URL } from 'src/environments';

@Injectable()
export class IndexersService {
  constructor(private readonly httpService: HttpService) {}

  async getBlockHeight() {
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
      .get(`${ODR_URL}:${ODR_PORT}/rune/${runeName}`)
      .toPromise();

    return res.data;
  }
}