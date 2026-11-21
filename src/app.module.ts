import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { PrismaService } from 'prisma/prisma.service';
import { DevicesModule } from './modules/devices/devices.module';
import { MqttModule } from './modules/mqtt/mqtt.module';
import { EnergyModule } from './modules/energy/energy.module';
import { AutomationsModule } from './modules/automations/automations.module';
import { BuildingsModule } from './modules/buildings/buildings.module';
import { FloorsModule } from './modules/floors/floors.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { PushModule } from './modules/push/push.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { NodesModule } from './modules/nodes/nodes.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { TenantMiddleware } from './common/tenant/tenant.middleware';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './common/auth/roles.guard';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 60 }]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    RealtimeModule,
    UserModule,
    AuthModule,
    OrganizationsModule,
    BuildingsModule,
    FloorsModule,
    RoomsModule,
    DevicesModule,
    NodesModule,
    MqttModule,
    EnergyModule,
    TelemetryModule,
    AutomationsModule,
    NotificationsModule,
    ReportsModule,
    PushModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Autenticação e papel valem para toda rota; a exceção é explícita (@Public).
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}
