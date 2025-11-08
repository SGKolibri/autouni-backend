import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from '../service/notifications.service';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { AuthGuard } from '../../../guards/auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova notificação' })
  @ApiResponse({
    status: 201,
    description: 'Notificação criada com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as notificações' })
  @ApiResponse({
    status: 200,
    description: 'Lista de notificações retornada',
  })
  async findAll() {
    return this.notificationsService.findAll();
  }

  @Get('me')
  @ApiOperation({ summary: 'Listar notificações do usuário autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Lista de notificações retornada',
  })
  async findMyNotifications(@Request() req: any) {
    return this.notificationsService.findByUser(req.user);
  }

  @Get('me/unread')
  @ApiOperation({
    summary: 'Listar notificações não lidas do usuário autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de notificações não lidas retornada',
  })
  async findMyUnreadNotifications(@Request() req: any) {
    return this.notificationsService.findUnreadByUser(req.user);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Listar notificações de um usuário' })
  @ApiParam({ name: 'userId', description: 'ID do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Lista de notificações retornada',
  })
  async findByUser(@Param('userId') userId: string) {
    return this.notificationsService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar notificação por ID' })
  @ApiParam({ name: 'id', description: 'ID da notificação' })
  @ApiResponse({ status: 200, description: 'Notificação encontrada' })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
  async findById(@Param('id') id: string) {
    return this.notificationsService.findById(id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  @ApiParam({ name: 'id', description: 'ID da notificação' })
  @ApiResponse({
    status: 200,
    description: 'Notificação marcada como lida',
  })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch('me/read-all')
  @ApiOperation({
    summary: 'Marcar todas as notificações do usuário como lidas',
  })
  @ApiResponse({
    status: 200,
    description: 'Notificações marcadas como lidas',
  })
  async markAllAsRead(@Request() req: any) {
    return this.notificationsService.markAllAsRead(req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar notificação' })
  @ApiParam({ name: 'id', description: 'ID da notificação' })
  @ApiResponse({
    status: 200,
    description: 'Notificação deletada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
  async delete(@Param('id') id: string) {
    return this.notificationsService.delete(id);
  }
}
