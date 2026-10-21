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
import { DevicesService } from '../service/devices.service';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { UpdateDeviceDto } from '../dto/update-device.dto';
import { ControlDeviceDto } from '../dto/control-device.dto';
import { BulkControlDeviceDto } from '../dto/bulk-control-device.dto';
import { FindDevicesQueryDto } from '../dto/find-devices-query.dto';
import { DeviceStatus, DeviceType } from '../interfaces/devices.interface';
import { AuthGuard } from '../../../guards/auth.guard';

@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Devices')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new device',
    description: 'Cria um novo dispositivo IoT vinculado a uma sala'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Device created successfully',
    schema: {
      example: {
        id: 'uuid-device-1',
        roomId: 'uuid-room-1',
        name: 'Luz Principal',
        type: 'LIGHT',
        status: 'OFF',
        online: false,
        mqttTopic: 'devices/light-101',
        metadata: {
          brand: 'Philips',
          model: 'LED Smart'
        },
        createdAt: '2025-01-11T10:00:00.000Z',
        updatedAt: '2025-01-11T10:00:00.000Z'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request',
    schema: {
      example: {
        statusCode: 400,
        message: ['name should not be empty', 'type must be a valid enum value'],
        error: 'Bad Request'
      }
    }
  })
  async create(@Body() createDeviceDto: CreateDeviceDto) {
    return this.devicesService.create(createDeviceDto);
  }

  // Precisa vir antes de qualquer rota `@Post(':id/...')`, senão o Nest
  // interpreta 'bulk-control' como um `:id`.
  @Post('bulk-control')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Control multiple devices at once',
    description:
      'Aplica o mesmo comando a uma lista de dispositivos. Falhas individuais não abortam o lote: ' +
      'a resposta traz a contagem de sucessos e os IDs que falharam.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk command processed',
    schema: {
      example: {
        message: "Command 'off' applied to 3 of 4 device(s)",
        successCount: 3,
        failedCount: 1,
        failedDevices: ['uuid-device-4'],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
    schema: {
      example: {
        statusCode: 400,
        message: ['command must be one of: on, off, toggle'],
        error: 'Bad Request',
      },
    },
  })
  async bulkControl(@Body() bulkControlDto: BulkControlDeviceDto) {
    return this.devicesService.bulkControl(bulkControlDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all devices',
    description:
      'Retorna a lista de dispositivos cadastrados. Aceita filtros opcionais por status e tipo; ' +
      'sem parâmetros, retorna todos.'
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: DeviceStatus,
    description: 'Filtra por status operacional',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: DeviceType,
    description: 'Filtra por tipo de dispositivo',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of all devices',
    schema: {
      example: [
        {
          id: 'uuid-device-1',
          roomId: 'uuid-room-1',
          name: 'Luz Principal',
          type: 'LIGHT',
          status: 'ON',
          online: true,
          lastSeen: '2025-01-11T10:30:00.000Z'
        },
        {
          id: 'uuid-device-2',
          roomId: 'uuid-room-1',
          name: 'Ar Condicionado',
          type: 'AC',
          status: 'OFF',
          online: true,
          lastSeen: '2025-01-11T10:25:00.000Z'
        }
      ]
    }
  })
  async findAll(@Query() query: FindDevicesQueryDto) {
    return this.devicesService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get device statistics',
    description: 'Retorna estatísticas agregadas de todos os dispositivos'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Device statistics',
    schema: {
      example: {
        total: 150,
        online: 120,
        offline: 30,
        byStatus: {
          ON: 80,
          OFF: 40,
          STANDBY: 20,
          ERROR: 10
        },
        byType: {
          LIGHT: 50,
          AC: 30,
          PROJECTOR: 20,
          SENSOR: 40,
          OTHER: 10
        }
      }
    }
  })
  async getStats() {
    return this.devicesService.getDeviceStats();
  }

  @Get('room/:roomId')
  @ApiOperation({ summary: 'Get devices by room ID' })
  @ApiParam({ name: 'roomId', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'List of devices in the room' })
  async findByRoom(@Param('roomId') roomId: string) {
    return this.devicesService.findByRoomId(roomId);
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Get devices by status' })
  @ApiParam({ name: 'status', enum: DeviceStatus })
  @ApiResponse({
    status: 200,
    description: 'List of devices with the specified status',
  })
  async findByStatus(@Param('status') status: DeviceStatus) {
    return this.devicesService.findByStatus(status);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get device by ID',
    description: 'Retorna detalhes completos de um dispositivo específico'
  })
  @ApiParam({ name: 'id', description: 'Device UUID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Device found',
    schema: {
      example: {
        id: 'uuid-device-1',
        roomId: 'uuid-room-1',
        name: 'Luz Principal',
        type: 'LIGHT',
        status: 'ON',
        online: true,
        mqttTopic: 'devices/light-101',
        metadata: {
          brand: 'Philips',
          model: 'LED Smart'
        },
        lastSeen: '2025-01-11T10:30:00.000Z',
        createdAt: '2025-01-11T10:00:00.000Z'
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Device not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Device not found',
        error: 'Not Found'
      }
    }
  })
  async findById(@Param('id') id: string) {
    return this.devicesService.findById(id);
  }

  @Post(':id/control')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Control a device',
    description:
      'Executa um comando (`on` / `off` / `toggle`), publica em `{mqttTopic}/command` e grava o ' +
      'status alvo. `toggle` é resolvido a partir do estado atual no banco. ' +
      '`pending: true` significa que o comando saiu no broker e aguarda confirmação do hardware.',
  })
  @ApiParam({ name: 'id', description: 'Device UUID' })
  @ApiResponse({
    status: 200,
    description: 'Command accepted',
    schema: {
      example: {
        id: 'uuid-device-1',
        name: 'Ar Condicionado A101',
        type: 'AC',
        status: 'ON',
        online: false,
        mqttTopic: 'devices/ac-a101',
        lastSeen: null,
        pending: true,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
    schema: {
      example: {
        statusCode: 400,
        message: ['command must be one of: on, off, toggle'],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Device with ID uuid-device-1 not found',
        error: 'Not Found',
      },
    },
  })
  async control(
    @Param('id') id: string,
    @Body() controlDeviceDto: ControlDeviceDto,
  ) {
    return this.devicesService.control(id, controlDeviceDto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update device',
    description:
      'Atualiza campos do dispositivo. `powerRating`, `intensity` e `temperature` são mesclados ' +
      'em `metadata`. `lastSeen` é aceito por compatibilidade mas ignorado — o heartbeat só é ' +
      'escrito pelo caminho MQTT.',
  })
  @ApiParam({ name: 'id', description: 'Device UUID' })
  @ApiResponse({ status: 200, description: 'Device updated successfully' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDeviceDto: UpdateDeviceDto,
  ) {
    return this.devicesService.update(id, updateDeviceDto);
  }

  @Put(':id/status')
  @ApiOperation({ 
    summary: 'Update device status',
    description:
      'Atualiza o status operacional do dispositivo (ON, OFF, STANDBY, ERROR), publica o comando ' +
      'em `{mqttTopic}/command` e emite `device:status` no WebSocket. Não altera `lastSeen`.'
  })
  @ApiParam({ name: 'id', description: 'Device UUID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Status updated successfully',
    schema: {
      example: {
        id: 'uuid-device-1',
        name: 'Luz Principal',
        status: 'ON',
        updatedAt: '2025-01-11T11:00:00.000Z'
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Device not found',
        error: 'Not Found'
      }
    }
  })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: DeviceStatus,
  ) {
    return this.devicesService.updateStatus(id, status);
  }

  @Put(':id/online')
  @ApiOperation({
    summary: 'Update device online status',
    description:
      'Define a alcançabilidade do dispositivo (rota administrativa/override). ' +
      '`online` é independente de `status`: um device pode estar ON e offline. ' +
      'No uso normal este campo é escrito pelo caminho MQTT.',
  })
  @ApiParam({ name: 'id', description: 'Device UUID' })
  @ApiResponse({
    status: 200,
    description: 'Online status updated successfully',
    schema: {
      example: {
        id: 'uuid-device-1',
        name: 'Ar Condicionado A101',
        status: 'OFF',
        online: false,
        lastSeen: null,
      },
    },
  })
  async updateOnlineStatus(
    @Param('id') id: string,
    @Body('online') online: boolean,
  ) {
    return this.devicesService.updateOnlineStatus(id, online);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete device' })
  @ApiParam({ name: 'id', description: 'Device UUID' })
  @ApiResponse({ status: 204, description: 'Device deleted successfully' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async delete(@Param('id') id: string) {
    await this.devicesService.delete(id);
  }
}
