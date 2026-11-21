import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../../guards/auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { MANAGERS, OPERATORS, Roles } from '../../../common/auth/roles';
import { SensorsQueryService } from '../service/sensors-query.service';
import {
  AlarmsQueryDto,
  SensorReadingsQueryDto,
  UpsertThresholdDto,
} from '../dto/telemetry.dto';

@ApiTags('Sensors')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, RolesGuard)
@Controller('sensors')
export class SensorsController {
  constructor(private readonly sensors: SensorsQueryService) {}

  @Get('devices/:deviceId/readings')
  @ApiOperation({
    summary:
      'Leituras de sensor (gás, presença) de um device, mais recentes primeiro',
  })
  readings(
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Query() query: SensorReadingsQueryDto,
  ) {
    return this.sensors.readings(deviceId, query);
  }

  @Get('rooms/:roomId')
  @ApiOperation({
    summary: 'Ocupação da sala e última leitura de cada sensor dela',
  })
  room(@Param('roomId', ParseUUIDPipe) roomId: string) {
    return this.sensors.roomSnapshot(roomId);
  }

  @Get('thresholds')
  @ApiOperation({ summary: 'Limites de alarme da organização' })
  thresholds() {
    return this.sensors.thresholds();
  }

  @Put('thresholds')
  @Roles(...MANAGERS)
  @ApiOperation({
    summary:
      'Cria ou altera o limite de um kind (padrão da organização ou de um device)',
  })
  upsertThreshold(@Body() dto: UpsertThresholdDto) {
    return this.sensors.upsertThreshold(dto);
  }

  @Delete('thresholds/:id')
  @Roles(...MANAGERS)
  deleteThreshold(@Param('id', ParseUUIDPipe) id: string) {
    return this.sensors.deleteThreshold(id);
  }

  @Get('alarms')
  @ApiOperation({ summary: 'Alarmes de sensor (abertos e encerrados)' })
  alarms(@Query() query: AlarmsQueryDto) {
    return this.sensors.alarms(query);
  }

  @Post('alarms/:id/acknowledge')
  @Roles(...OPERATORS)
  @ApiOperation({
    summary: 'Reconhece um alarme (registra quem viu); não o encerra',
  })
  acknowledge(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.sensors.acknowledge(id, req.user.sub);
  }
}
