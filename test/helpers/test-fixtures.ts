import * as bcrypt from 'bcrypt';

const HASHED_PASSWORD = bcrypt.hashSync('password123', 10);

export const MOCK_USER = {
  id: 'user-uuid-123',
  email: 'joao@email.com',
  name: 'Joao da Silva',
  password: HASHED_PASSWORD,
  phone: '+55 11 91234-5678',
  cpf: '12345678901',
  role: 'VIEWER',
  avatar: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

export const MOCK_USER_WITHOUT_PASSWORD = {
  ...MOCK_USER,
  id: 'no-pass-uuid',
  password: null,
};

export const MOCK_ADMIN_USER = {
  ...MOCK_USER,
  id: 'admin-uuid-456',
  email: 'admin@email.com',
  role: 'ADMIN',
};

export const MOCK_USER_LIST = [
  MOCK_USER,
  { ...MOCK_USER, id: 'user-uuid-456', email: 'maria@email.com', name: 'Maria Santos' },
];

export const VALID_LOGIN_DTO = {
  email: 'joao@email.com',
  password: 'password123',
};

export const VALID_REGISTER_DTO = {
  name: 'Joao da Silva',
  email: 'joao@email.com',
  password: 'password123',
};

export const VALID_REGISTER_DTO_FULL = {
  ...VALID_REGISTER_DTO,
  phone: '+55 11 91234-5678',
  cpf: '12345678901',
  role: 'VIEWER',
  avatar: 'http://example.com/avatar.jpg',
};

export const VALID_CREATE_USER_DTO = {
  name: 'Novo Usuario',
  email: 'novo@email.com',
};

export const VALID_CREATE_ADMIN_DTO = {
  name: 'Admin User',
  email: 'admin@email.com',
  role: 'ADMIN',
  password: 'admin123456',
};

export const VALID_UPDATE_USER_DTO = {
  name: 'Nome Atualizado',
};
