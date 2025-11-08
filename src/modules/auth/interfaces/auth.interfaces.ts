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
}

export interface IAuthRepository {
  findUserByEmail(email: string): Promise<User | null>;
  findUserByCpf(cpf: string): Promise<User | null>;
  createUser(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    cpf?: string;
    role?: UserRole;
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