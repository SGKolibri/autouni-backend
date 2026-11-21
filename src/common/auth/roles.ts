import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

// Rota restrita a estes papéis. Rotas sem @Roles exigem só autenticação.
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// Mesma matriz do app (lib/shared/rbac/app_permission.dart): VIEWER só lê;
// ADMIN, COORDINATOR e TECHNICIAN operam dispositivos, automações e relatórios.
export const OPERATORS: UserRole[] = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.TECHNICIAN,
];
// Estrutura física (prédios, andares, salas) e limites de alarme.
export const MANAGERS: UserRole[] = [UserRole.ADMIN, UserRole.COORDINATOR];
// Instalação de hardware: cadastro de nós e emissão de credencial MQTT.
export const INSTALLERS: UserRole[] = [UserRole.ADMIN, UserRole.TECHNICIAN];
export const ADMINS: UserRole[] = [UserRole.ADMIN];
