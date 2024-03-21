import { Controller, UseInterceptors } from '@nestjs/common';
import { CoreTransformInterceptor } from 'src/common/interceptors/coreTransform.interceptor';

@Controller('transfers')
@UseInterceptors(CoreTransformInterceptor)
export class TransfersController {}
