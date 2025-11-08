import {
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: true })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('Realtime gateway initialized');
  }

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.query?.token as string;
      if (!token) {
        client.disconnect(true);
        return;
      }
      const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
      client.data.userId = payload.sub;
      this.logger.log(`Socket connected: ${client.id} (user ${payload.sub})`);
    } catch (err) {
      this.logger.warn('Socket auth failed, disconnecting');
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }
}