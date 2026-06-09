import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: getCorsOrigins(),
    credentials: true,
  },
})
export class InvoTrackGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join_org')
  handleJoinOrg(
    @MessageBody('organizationName') organizationName: string,
    @ConnectedSocket() client: Socket,
  ) {
    if (organizationName) {
      client.join(`org:${organizationName}`);
    }
  }

  @SubscribeMessage('leave_org')
  handleLeaveOrg(
    @MessageBody('organizationName') organizationName: string,
    @ConnectedSocket() client: Socket,
  ) {
    if (organizationName) {
      client.leave(`org:${organizationName}`);
    }
  }

  emitScanLogUpdate(organizationName: string) {
    this.server.to(`org:${organizationName}`).emit('scan-log-update');
  }

  emitDeviceStatusUpdate(organizationName: string) {
    this.server.to(`org:${organizationName}`).emit('device-status-update');
  }
}

function getCorsOrigins(): string | string[] {
  const dev = process.env.FRONTEND_URL_DEV || 'http://localhost:4321';
  const prod = process.env.FRONTEND_URL_PROD;
  if (process.env.NODE_ENV === 'production' && prod) return prod;
  return dev.split(',').map((s) => s.trim());
}
