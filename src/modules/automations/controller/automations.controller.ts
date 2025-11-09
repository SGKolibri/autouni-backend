import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AutomationsService } from '../service/automations.service';
import {
  CreateAutomationDto,
  UpdateAutomationDto,
  ToggleAutomationDto,
} from '../dto/automations.dto';
import { AuthGuard } from '../../../guards/auth.guard';

@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Automations')
@Controller('automations')
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new automation',
    description: 'Cria uma nova automação com gatilhos e ações configuráveis'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Automation created successfully',
    schema: {
      example: {
        id: 'uuid-automation-1',
        name: 'Desligar luzes à noite',
        description: 'Desliga todas as luzes às 22h',
        triggerType: 'SCHEDULE',
        triggerValue: '0 22 * * *',
        action: {
          type: 'device_control',
          deviceIds: ['uuid-device-1', 'uuid-device-2'],
          command: 'OFF'
        },
        enabled: true,
        creatorId: 'uuid-user-123',
        createdAt: '2025-01-11T10:00:00.000Z'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Invalid data',
    schema: {
      example: {
        statusCode: 400,
        message: ['triggerType must be a valid enum value'],
        error: 'Bad Request'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createAutomationDto: CreateAutomationDto) {
    return this.automationsService.create(createAutomationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all automations' })
  @ApiResponse({ status: 200, description: 'List of all automations' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll() {
    return this.automationsService.findAll();
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get automation statistics',
    description: 'Retorna estatísticas agregadas sobre todas as automações do sistema'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Automation statistics',
    schema: {
      example: {
        total: 50,
        enabled: 40,
        disabled: 10,
        byTriggerType: {
          SCHEDULE: 30,
          CONDITION: 15,
          MANUAL: 5
        },
        executionsToday: 120,
        successRate: 95.5
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStats() {
    return this.automationsService.getAutomationStats();
  }

  @Get('enabled')
  @ApiOperation({ summary: 'Get all enabled automations' })
  @ApiResponse({ status: 200, description: 'List of enabled automations' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findEnabled() {
    return this.automationsService.findEnabled();
  }

  @Get('creator/:creatorId')
  @ApiOperation({ summary: 'Get automations by creator' })
  @ApiParam({ name: 'creatorId', description: 'Creator user ID', type: String })
  @ApiResponse({ status: 200, description: 'List of automations by creator' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findByCreator(@Param('creatorId', ParseUUIDPipe) creatorId: string) {
    return this.automationsService.findByCreatorId(creatorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get automation by ID' })
  @ApiParam({ name: 'id', description: 'Automation ID', type: String })
  @ApiResponse({ status: 200, description: 'Automation details' })
  @ApiResponse({ status: 404, description: 'Automation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.automationsService.findById(id);
  }

  @Get(':id/history')
  @ApiOperation({ 
    summary: 'Get automation execution history',
    description: 'Retorna histórico de execuções da automação com status de sucesso/erro'
  })
  @ApiParam({ name: 'id', description: 'Automation ID', type: String })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of history entries', type: Number })
  @ApiResponse({ 
    status: 200, 
    description: 'Automation execution history',
    schema: {
      example: [
        {
          id: 'uuid-history-1',
          automationId: 'uuid-automation-1',
          executedAt: '2025-01-11T22:00:00.000Z',
          success: true,
          result: {
            devicesAffected: 5,
            message: 'Luzes desligadas com sucesso'
          }
        },
        {
          id: 'uuid-history-2',
          automationId: 'uuid-automation-1',
          executedAt: '2025-01-10T22:00:00.000Z',
          success: false,
          error: 'MQTT connection failed'
        }
      ]
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Automation not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Automation not found',
        error: 'Not Found'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: number,
  ) {
    return this.automationsService.getHistory(id, limit);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update automation' })
  @ApiParam({ name: 'id', description: 'Automation ID', type: String })
  @ApiResponse({ status: 200, description: 'Automation updated successfully' })
  @ApiResponse({ status: 404, description: 'Automation not found' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAutomationDto: UpdateAutomationDto,
  ) {
    return this.automationsService.update(id, updateAutomationDto);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Enable or disable automation' })
  @ApiParam({ name: 'id', description: 'Automation ID', type: String })
  @ApiResponse({ status: 200, description: 'Automation toggled successfully' })
  @ApiResponse({ status: 404, description: 'Automation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async toggle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() toggleDto: ToggleAutomationDto,
  ) {
    return this.automationsService.toggleEnabled(id, toggleDto.enabled);
  }

  @Post(':id/execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Manually execute automation',
    description: 'Executa manualmente uma automação, mesmo que não seja seu horário/condição'
  })
  @ApiParam({ name: 'id', description: 'Automation ID', type: String })
  @ApiResponse({ 
    status: 200, 
    description: 'Automation executed successfully',
    schema: {
      example: {
        message: 'Automation executed successfully',
        result: {
          devicesAffected: 5,
          timestamp: '2025-01-11T11:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Automation not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Automation not found',
        error: 'Not Found'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Automation is disabled',
    schema: {
      example: {
        statusCode: 400,
        message: 'Cannot execute disabled automation',
        error: 'Bad Request'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async executeManually(@Param('id', ParseUUIDPipe) id: string) {
    await this.automationsService.executeManually(id);
    return { message: 'Automation executed successfully' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete automation' })
  @ApiParam({ name: 'id', description: 'Automation ID', type: String })
  @ApiResponse({ status: 204, description: 'Automation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Automation not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.automationsService.delete(id);
  }
}
