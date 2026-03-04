import { JwtService } from '@nestjs/jwt';

export const TEST_JWT_SECRET = 'test-jwt-secret-for-e2e';

export interface TestJwtPayload {
  email: string;
  sub: string;
  role: string;
  name: string;
}

export const DEFAULT_TEST_PAYLOAD: TestJwtPayload = {
  email: 'test@example.com',
  sub: 'test-user-id-uuid',
  role: 'ADMIN',
  name: 'Test User',
};

export function generateTestToken(
  jwtService: JwtService,
  payload?: Partial<TestJwtPayload>,
): string {
  return jwtService.sign({ ...DEFAULT_TEST_PAYLOAD, ...payload });
}
