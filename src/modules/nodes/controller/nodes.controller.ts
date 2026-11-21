import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../../guards/auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { INSTALLERS, Roles } from '../../../common/auth/roles';
import { NodesService } from '../service/nodes.service';
import { CreateNodeDto, UpdateNodeDto } from '../dto/nodes.dto';

@ApiTags('Nodes')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, RolesGuard)
@Controller('nodes')
export class NodesController {
  constructor(private readonly nodes: NodesService) {}

  @Post()
  @Roles(...INSTALLERS)
  @ApiOperation({
    summary: 'Cadastra um nó físico (ESP32) e emite sua credencial MQTT',
    description:
      'A senha aparece só nesta resposta; grave-a no firmware. Depois, atribua devices ao nó ' +
      '(PUT /devices/:id com nodeId e channel) para liberar os tópicos deles no broker.',
  })
  create(@Body() dto: CreateNodeDto) {
    return this.nodes.create(dto);
  }

  @Get()
  findAll() {
    return this.nodes.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.nodes.findOne(id);
  }

  @Patch(':id')
  @Roles(...INSTALLERS)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateNodeDto) {
    return this.nodes.update(id, dto);
  }

  @Post(':id/rotate-credentials')
  @Roles(...INSTALLERS)
  @ApiOperation({
    summary: 'Gera nova senha MQTT e derruba a sessão com a senha antiga',
  })
  rotate(@Param('id', ParseUUIDPipe) id: string) {
    return this.nodes.rotateCredentials(id);
  }

  @Post(':id/sync-acl')
  @Roles(...INSTALLERS)
  @ApiOperation({
    summary: 'Reaplica no broker a ACL calculada a partir dos devices do nó',
  })
  syncAcl(@Param('id', ParseUUIDPipe) id: string) {
    return this.nodes.syncAcl(id);
  }

  @Delete(':id')
  @Roles(...INSTALLERS)
  @ApiOperation({
    summary:
      'Remove o nó e revoga a credencial no broker; os devices ficam sem nó',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.nodes.remove(id);
  }
}
