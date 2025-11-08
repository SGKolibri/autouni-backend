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
  @ApiOperation({ summary: 'Create a new automation' })
  @ApiResponse({ status: 201, description: 'Automation created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
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
  @ApiOperation({ summary: 'Get automation statistics' })
  @ApiResponse({ status: 200, description: 'Automation statistics' })
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
  @ApiOperation({ summary: 'Get automation execution history' })
  @ApiParam({ name: 'id', description: 'Automation ID', type: String })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of history entries', type: Number })
  @ApiResponse({ status: 200, description: 'Automation execution history' })
  @ApiResponse({ status: 404, description: 'Automation not found' })
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
  @ApiOperation({ summary: 'Manually execute automation' })
  @ApiParam({ name: 'id', description: 'Automation ID', type: String })
  @ApiResponse({ status: 200, description: 'Automation executed successfully' })
  @ApiResponse({ status: 404, description: 'Automation not found' })
  @ApiResponse({ status: 400, description: 'Automation is disabled' })
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
