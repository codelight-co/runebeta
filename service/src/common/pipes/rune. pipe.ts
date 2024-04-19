import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class ParseRuneIdPipe implements PipeTransform {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transform(value: any, _metadata: ArgumentMetadata) {
    // Check if rune is rune number
    if (value.split(':').length === 2) {
      return value;
    }

    // Try decoding hex to utf-8
    const runeId = Buffer.from(value, 'hex').toString('utf-8');
    if (runeId.split(':').length === 2) {
      return runeId;
    }

    throw new Error('Invalid rune id');
  }
}
