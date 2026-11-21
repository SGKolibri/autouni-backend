import { User , UserRole} from '@prisma/client';

export interface LoginResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface JwtPayload {
  email: string;
  sub: string;
  role: UserRole;
  name: string;
  // Organização (tenant) do usuário. Todo acesso a dados é restrito a ela.
  orgId: string;
  // Refresh tokens não servem como access token.
  typ: 'access' | 'refresh';
}

export type UserWithOrganization = User & { organization: { id: string; slug: string; name: string } };

export interface IAuthRepository {
  findUsersByEmailForLogin(email: string, organizationSlug?: string): Promise<UserWithOrganization[]>;
  findUserForRefresh(userId: string, organizationId: string): Promise<User | null>;
  findUserByEmail(email: string): Promise<User | null>;
  findUserByCpf(cpf: string): Promise<User | null>;
  createUser(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    cpf?: string;
    avatar?: string;
  }): Promise<User>;
  createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  findRefreshTokensByUserId(userId: string): Promise<Array<{
    id: string;
    tokenHash: string;
    expiresAt: Date;
  }>>;
  deleteRefreshTokensByUserId(userId: string): Promise<void>;
  deleteExpiredRefreshTokens(): Promise<void>;
}