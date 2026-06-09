// http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception?.getStatus();
    const res: any = exception?.getResponse();

    const message =
      typeof res === 'string' ? res : res.message || 'Unexpected error';

    response.status(status).json({
      statusCode: status,
      message,
    });
  }
}
