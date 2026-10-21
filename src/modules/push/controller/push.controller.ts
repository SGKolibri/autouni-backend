import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../../../guards/auth.guard';
import { PushService } from '../service/push.service';
import {
  RegisterPushTokenDto,
  UnregisterPushTokenDto,
} from '../dto/push-token.dto';

@ApiTags('Push')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard)
@Controller('push/tokens')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registrar o token de push (FCM) do aparelho',
    description:
      'Associa o token ao usuário autenticado. Idempotente: registrar de novo só atualiza a ' +
      'plataforma; um token de outra conta muda de dono. Toda notificação criada para o usuário ' +
      'passa a ser enviada como push para os aparelhos registrados.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token registrado',
    schema: {
      example: {
        id: 'uuid-push-token-1',
        token: 'dGVzdC10b2tlbi1mY20...',
        platform: 'ANDROID',
        createdAt: '2026-10-21T12:00:00.000Z',
        updatedAt: '2026-10-21T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Token ou plataforma inválidos' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async register(@Request() req: any, @Body() dto: RegisterPushTokenDto) {
    return this.pushService.register(req.user.sub, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remover o token de push do aparelho (logout)',
    description: 'Remove o token do usuário autenticado. Idempotente.',
  })
  @ApiResponse({
    status: 204,
    description: 'Token removido (ou já inexistente)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async unregister(@Request() req: any, @Body() dto: UnregisterPushTokenDto) {
    await this.pushService.unregister(req.user.sub, dto.token);
  }
}
