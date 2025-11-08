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
  @ApiOperation({ summary: 'Create a new device' })
  @ApiResponse({ status: 201, description: 'Device created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createDeviceDto: CreateDeviceDto) {
    return this.devicesService.create(createDeviceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all devices' })
  @ApiResponse({ status: 200, description: 'List of all devices' })
  async findAll() {
    return this.devicesService.findAll();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get device statistics' })
  @ApiResponse({ status: 200, description: 'Device statistics' })
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
  @ApiOperation({ summary: 'Get device by ID' })
  @ApiParam({ name: 'id', description: 'Device UUID' })
  @ApiResponse({ status: 200, description: 'Device found' })
  @ApiResponse({ status: 404, description: 'Device not found' })
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
  @ApiOperation({ summary: 'Update device status' })
  @ApiParam({ name: 'id', description: 'Device UUID' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
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
