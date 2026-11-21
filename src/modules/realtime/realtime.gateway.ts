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
import { JwtPayload } from '../auth/interfaces/auth.interfaces';

export const organizationRoom = (organizationId: string) => `org:${organizationId}`;

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
      // socket.io v4 entrega `auth: { token }` em handshake.auth. Aceitamos as
      // duas formas: o frontend usa `auth`, clientes antigos usam `query`.
      const token = (client.handshake.auth?.token ??
        client.handshake.query?.token) as string;
      if (!token) {
        client.disconnect(true);
        return;
      }
      const payload = this.jwtService.verify<JwtPayload>(token, { secret: process.env.JWT_SECRET });
      if (payload.typ === 'refresh' || !payload.orgId) {
        client.disconnect(true);
        return;
      }
      client.data.userId = payload.sub;
      client.data.organizationId = payload.orgId;
      // Cada socket só recebe eventos da própria organização.
      client.join(organizationRoom(payload.orgId));
      this.logger.log(`Socket connected: ${client.id} (user ${payload.sub}, org ${payload.orgId})`);
    } catch (err) {
      this.logger.warn('Socket auth failed, disconnecting');
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  emitToOrganization(organizationId: string, event: string, payload: unknown): void {
    this.server?.to(organizationRoom(organizationId)).emit(event, payload);
  }
}
