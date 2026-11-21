import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthGuard } from '../../guards/auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { ADMINS, Roles } from '../../common/auth/roles';

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ example: 'Universidade Federal' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;
}

// Organization não é um modelo com tenant (é o próprio tenant): o acesso é
// sempre pelo id que veio no token, nunca por parâmetro de rota.
@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  findCurrent(organizationId: string) {
    return this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
    });
  }

  updateCurrent(organizationId: string, dto: UpdateOrganizationDto) {
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: dto,
    });
  }
}

@ApiTags('Organizations')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, RolesGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Organização do usuário autenticado' })
  me(@Request() req: any) {
    return this.organizations.findCurrent(req.user.orgId);
  }

  @Patch('me')
  @Roles(...ADMINS)
  update(@Request() req: any, @Body() dto: UpdateOrganizationDto) {
    return this.organizations.updateCurrent(req.user.orgId, dto);
  }
}

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService, PrismaService],
})
export class OrganizationsModule {}
