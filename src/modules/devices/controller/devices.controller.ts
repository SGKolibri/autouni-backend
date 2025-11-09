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
import { DeviceStatus } from '../interfaces/devices.interface';
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

  @Get()
  @ApiOperation({ 
    summary: 'Get all devices',
    description: 'Retorna lista completa de todos os dispositivos cadastrados'
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
  async findAll() {
    return this.devicesService.findAll();
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

  @Put(':id')
  @ApiOperation({ summary: 'Update device' })
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
    description: 'Atualiza o status operacional do dispositivo (ON, OFF, STANDBY, ERROR)'
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
  @ApiOperation({ summary: 'Update device online status' })
  @ApiParam({ name: 'id', description: 'Device UUID' })
  @ApiResponse({
    status: 200,
    description: 'Online status updated successfully',
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
