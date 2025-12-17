import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const client = host.switchToWs().getClient();
    const message = exception.getMessage
      ? exception.getMessage()
      : exception.message || 'Internal server error';

    client.emit('exception', {
      error: message,
      timestamp: new Date(),
    });

    super.catch(exception, host);
  }
}
