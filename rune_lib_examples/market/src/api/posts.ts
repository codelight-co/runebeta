import { Express, Request, Response } from 'express';
import { IRuneListingState, IRunePostPSBTListing, IRuneItem } from '../runes/types';
import { BuyerHandler } from '../runes/buyer';
import { SellerHandler } from '../runes/seller';
import logger from '../middleware/logger';
import { AddressTxsUtxo } from '@mempool/mempool.js/lib/interfaces/bitcoin/addresses';
import { MergeSingers } from '../runes/merge';
import { BASE_URL, BTC_NETWORK } from '../configs/constant';
import { RPCService, network } from 'src/utils/rpc';

/// methods
export class PostsMethods {
  static generateUnsignedListingPSBTBase64 = 'generateUnsignedListingPSBTBase64';
  static verifySignedListingPSBTBase64 = 'verifySignedListingPSBTBase64';
  static selectPaymentUTXOs = 'selectPaymentUTXOs';
  static generateUnsignedBuyingPSBTBase64 = 'generateUnsignedBuyingPSBTBase64';
  static mergeSignedBuyingPSBTBase64 = 'mergeSignedBuyingPSBTBase64';
  static addressToScriptpubKey = 'addressToScriptpubKey';
}

/// enpoints/ apis
export class Posts {
  private service: RPCService = new RPCService(BASE_URL, network);
  private constructor(public app: Express, public endpont: string) {}
  static create(app: Express, endpont: string): Posts {
    return new Posts(app, endpont);
  }
  public generateUnsignedListingPSBTBase64(): void {
    this.app.post(`${this.endpont}/${PostsMethods.generateUnsignedListingPSBTBase64}`, async (req: Request, res: Response) => {
      const { seller } = req.body as IRuneListingState;
      if (!seller) {
        res.status(200).send({
          code: 30006,
          message: 'No Seller data found',
          success: false,
        });
      } else {
        try {
          const result = await SellerHandler.generateUnsignedPsbt(req.body);

          if (result && result.seller.unsignedListingPSBTBase64) {
            logger.log('info', `${PostsMethods.generateUnsignedListingPSBTBase64} - ${result.seller.unsignedListingPSBTBase64}`);
            res.status(200).send({
              code: 200,
              message: result,
              success: true,
            });
          } else {
            logger.log('error', `${PostsMethods.generateUnsignedListingPSBTBase64} - ${JSON.stringify(result)}`);
            res.status(200).send({
              code: 30007,
              message: 'Failed to generate unsigned listing PSBT',
              success: true,
            });
          }
        } catch (error) {
          logger.log('error', `${PostsMethods.generateUnsignedListingPSBTBase64} - ${JSON.stringify(error)}`);
          res.status(200).send({
            code: 30007,
            message: 'Failed to generate unsigned listing PSBT : ' + JSON.stringify(error),
            success: true,
          });
        }
      }
    });
  }

  public verifySignedListingPSBTBase64(): void {
    this.app.post(`${this.endpont}/${PostsMethods.verifySignedListingPSBTBase64}`, async (req: Request, res: Response) => {
      const { listingItem, makerFeeBp, atomItem } = req.body as {
        listingItem: IRunePostPSBTListing;
        // feeProvider: AtomFeeProvider,
        makerFeeBp: number;
        // itemProvider: AtomItemProvider,
        atomItem: IRuneItem;
      };
      if (!listingItem || makerFeeBp === undefined || !atomItem) {
        res.status(200).send({
          code: 30006,
          message: 'listingItem or makerFeeBp or atomItem not found',
          success: false,
        });
      } else {
        try {
          const result = await SellerHandler.verifySignedListingPSBTBase64(listingItem, makerFeeBp, atomItem);
          if (result) {
            logger.log('info', `${PostsMethods.verifySignedListingPSBTBase64} - ${true}`);
            res.status(200).send({
              code: 200,
              message: result,
              success: true,
            });
          }
        } catch (error) {
          logger.log('error', `${PostsMethods.verifySignedListingPSBTBase64} - ${JSON.stringify(error)}`);
          res.status(200).send({
            code: 30007,
            message: 'Failed to verify unsigned listing PSBT : ' + JSON.stringify(error),
            success: false,
          });
        }
      }
    });
  }

  public selectPaymentUTXOs(): void {
    this.app.post(`${this.endpont}/${PostsMethods.selectPaymentUTXOs}`, async (req: Request, res: Response) => {
      const { utxos, amount, vinsLength, voutsLength, feeRateTier } = req.body as {
        utxos: AddressTxsUtxo[];
        amount: number; // amount is expected total output (except tx fee)
        vinsLength: number;
        voutsLength: number;
        feeRateTier: string;
      };
      try {
        const result = await BuyerHandler.selectPaymentUTXOs(utxos, amount, vinsLength, voutsLength, feeRateTier, this.service);
        if (result) {
          logger.log('info', `${PostsMethods.selectPaymentUTXOs} - ${true}`);
          res.status(200).send({
            code: 200,
            message: result,
            success: true,
          });
        }
      } catch (error) {
        logger.log('error', `${PostsMethods.selectPaymentUTXOs} - ${JSON.stringify(error)}`);
        res.status(200).send({
          code: 30007,
          message: 'Failed to select payment UTXOs : ' + JSON.stringify(error),
          success: false,
        });
      }
    });
  }

  public generateUnsignedBuyingPSBTBase64(): void {
    this.app.post(`${this.endpont}/${PostsMethods.generateUnsignedBuyingPSBTBase64}`, async (req: Request, res: Response) => {
      const { buyer_state, seller_items } = req.body as {
        buyer_state: IRuneListingState;
        seller_items: IRuneListingState[];
      };
      try {
        const result = await BuyerHandler.generateUnsignedBuyingPSBTBase64(buyer_state, seller_items);
        if (result) {
          logger.log('info', `${PostsMethods.generateUnsignedBuyingPSBTBase64} - ${true}`);
          res.status(200).send({
            code: 200,
            message: result,
            success: true,
          });
        }
      } catch (error) {
        logger.log('error', `${PostsMethods.generateUnsignedBuyingPSBTBase64} - ${JSON.stringify(error)}`);
        res.status(200).send({
          code: 30007,
          message: 'Failed to generate PSBTBase64 for buyer: ' + JSON.stringify(error),
          success: false,
        });
      }
    });
  }
  public mergeSignedBuyingPSBTBase64(): void {
    this.app.post(`${this.endpont}/${PostsMethods.mergeSignedBuyingPSBTBase64}`, async (req: Request, res: Response) => {
      const { buyer_state, seller_items } = req.body as {
        buyer_state: IRuneListingState;
        seller_items: IRuneListingState[];
      };
      try {
        const result = await MergeSingers.mergeSignedBuyingPSBTBase64(buyer_state, seller_items);
        if (result) {
          logger.log('info', `${PostsMethods.mergeSignedBuyingPSBTBase64} - ${true}`);
          res.status(200).send({
            code: 200,
            message: result,
            success: true,
          });
        }
      } catch (error) {
        logger.log('error', `${PostsMethods.mergeSignedBuyingPSBTBase64} - ${JSON.stringify(error)}`);
        res.status(200).send({
          code: 30007,
          message: 'Failed to merge psbts: ' + JSON.stringify(error),
          success: false,
        });
      }
    });
  }
}
