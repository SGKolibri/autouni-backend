import { Test } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaService } from 'prisma/prisma.service';
import { PushModule } from './push.module';
import { PUSH_SENDER, PushSender } from './interfaces/push.interface';
import { PushService } from './service/push.service';

describe('PushModule', () => {
  const firebaseVars = [
    'FIREBASE_SERVICE_ACCOUNT_JSON',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
  ];
  const saved: Record<string, string | undefined> = {};

  beforeAll(() => {
    for (const name of firebaseVars) {
      saved[name] = process.env[name];
      delete process.env[name];
    }
  });

  afterAll(() => {
    for (const name of firebaseVars) {
      if (saved[name] !== undefined) process.env[name] = saved[name];
    }
  });

  it('sobe sem credenciais do Firebase, com o push desligado', async () => {
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({ global: true, secret: 'test' }),
        EventEmitterModule.forRoot(),
        PushModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    expect(module.get(PushService)).toBeDefined();
    expect(module.get<PushSender>(PUSH_SENDER).enabled).toBe(false);
  });
});
