import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AssetStatus, UserRole, AuditAction } from '@prisma/client';
import {
  CreateTricycleDto,
  CreateColdBoxDto,
  CreateColdPlateDto,
  UpdateTricycleDto,
  UpdateColdBoxDto,
  UpdateColdPlateDto,
} from './dto/cold-assets.dto';
import { TricycleEntity } from './entities/tricycle.entity';
import { ColdBoxEntity } from './entities/cold-box.entity';
import { ColdPlateEntity } from './entities/cold-plate.entity';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class ColdAssetsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditLogsService,
    private cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Helper to apply role-based filtering and client location filtering.
   */
  private applyRoleFilters(user: CurrentUserPayload, requestedSiteId?: string): any {
    const where: any = { deletedAt: null };

    if (user.role === UserRole.SITE_MANAGER) {
      // 1. Site Manager: Strictly limited to their own site
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      where.siteId = user.siteId;
    } else if (user.role === UserRole.CLIENT) {
      // 2. Client: Only sees available assets. Can filter by location (siteId)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      where.status = AssetStatus.AVAILABLE;
      if (requestedSiteId) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        where.siteId = requestedSiteId;
      }
    } else if (user.role === UserRole.SUPER_ADMIN && requestedSiteId) {
      // 3. Admin: Sees everything, but can choose to filter by site
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      where.siteId = requestedSiteId;
    }

    return where;
  }

  private validateSiteAccess(user: CurrentUserPayload, targetSiteId?: string) {
    if (user.role === UserRole.SITE_MANAGER) {
      if (!user.siteId) {
        throw new BadRequestException('Site Manager is not assigned to any site.');
      }
      if (targetSiteId && targetSiteId !== user.siteId) {
        throw new ForbiddenException('Access denied: This asset belongs to another site.');
      }
    }
  }

  // --- TRICYCLES ---

  async createTricycle(
    dto: CreateTricycleDto,
    user: CurrentUserPayload,
    image?: Express.Multer.File,
  ) {
    this.validateSiteAccess(user, dto.siteId);

    const existing = await this.prisma.tricycle.findUnique({
      where: { plateNumber: dto.plateNumber },
    });
    if (existing) throw new ConflictException('Tricycle with this plate number already exists');

    let imageUrl: string | undefined;
    if (image) {
      const uploadResult = await this.cloudinaryService.uploadFile(image, 'mofresh-tricycles');
      imageUrl = uploadResult.secure_url as string;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { image: _image, ...assetData } = dto;

    const asset = await this.prisma.tricycle.create({
      data: {
        ...assetData,
        ...(imageUrl && { imageUrl }),
      },
    });
    await this.auditService.createAuditLog(user.userId, AuditAction.CREATE, 'TRICYCLE', asset.id);
    return new TricycleEntity(asset);
  }

  async findTricycles(user: CurrentUserPayload, siteId?: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const where = this.applyRoleFilters(user, siteId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const data = await this.prisma.tricycle.findMany({ where, include: { site: true } });
    return data.map((item) => new TricycleEntity(item));
  }

  // --- COLD BOXES ---

  async createColdBox(
    dto: CreateColdBoxDto,
    user: CurrentUserPayload,
    image?: Express.Multer.File,
  ) {
    this.validateSiteAccess(user, dto.siteId);

    const existing = await this.prisma.coldBox.findUnique({
      where: { identificationNumber: dto.identificationNumber },
    });
    if (existing) throw new ConflictException('Cold Box with this ID already exists');

    let imageUrl: string | undefined;
    if (image) {
      const uploadResult = await this.cloudinaryService.uploadFile(image, 'mofresh-cold-boxes');
      imageUrl = uploadResult.secure_url as string;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { image: _image, ...assetData } = dto;

    const asset = await this.prisma.coldBox.create({
      data: {
        ...assetData,
        ...(imageUrl && { imageUrl }),
      },
    });
    await this.auditService.createAuditLog(user.userId, AuditAction.CREATE, 'COLDBOX', asset.id);
    return new ColdBoxEntity(asset);
  }

  async findColdBoxes(user: CurrentUserPayload, siteId?: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const where = this.applyRoleFilters(user, siteId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const data = await this.prisma.coldBox.findMany({ where, include: { site: true } });
    return data.map((item) => new ColdBoxEntity(item));
  }

  // --- COLD PLATES ---

  async createColdPlate(
    dto: CreateColdPlateDto,
    user: CurrentUserPayload,
    image?: Express.Multer.File,
  ) {
    this.validateSiteAccess(user, dto.siteId);

    const existing = await this.prisma.coldPlate.findUnique({
      where: { identificationNumber: dto.identificationNumber },
    });
    if (existing) throw new ConflictException('Cold Plate with this ID already exists');

    let imageUrl: string | undefined;
    if (image) {
      const uploadResult = await this.cloudinaryService.uploadFile(image, 'mofresh-cold-plates');
      imageUrl = uploadResult.secure_url as string;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { image: _image, ...assetData } = dto;

    const asset = await this.prisma.coldPlate.create({
      data: {
        ...assetData,
        ...(imageUrl && { imageUrl }),
      },
    });
    await this.auditService.createAuditLog(user.userId, AuditAction.CREATE, 'COLDPLATE', asset.id);
    return new ColdPlateEntity(asset);
  }

  async findColdPlates(user: CurrentUserPayload, siteId?: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const where = this.applyRoleFilters(user, siteId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const data = await this.prisma.coldPlate.findMany({ where, include: { site: true } });
    return data.map((item) => new ColdPlateEntity(item));
  }

  // --- UPDATE OPERATIONS ---

  async updateTricycle(
    id: string,
    dto: UpdateTricycleDto,
    user: CurrentUserPayload,
    image?: Express.Multer.File,
  ) {
    const tricycle = await this.prisma.tricycle.findUnique({ where: { id } });
    if (!tricycle) throw new NotFoundException('Tricycle not found');

    this.validateSiteAccess(user, tricycle.siteId);

    let imageUrl: string | undefined;
    if (image) {
      const uploadResult = await this.cloudinaryService.uploadFile(image, 'mofresh-tricycles');
      imageUrl = uploadResult.secure_url as string;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { image: _image, ...updateData } = dto;

    const updated = await this.prisma.tricycle.update({
      where: { id },
      data: {
        ...updateData,
        ...(imageUrl && { imageUrl }),
      },
    });
    await this.auditService.createAuditLog(user.userId, AuditAction.UPDATE, 'TRICYCLE', id);
    return new TricycleEntity(updated);
  }

  async updateColdBox(
    id: string,
    dto: UpdateColdBoxDto,
    user: CurrentUserPayload,
    image?: Express.Multer.File,
  ) {
    const box = await this.prisma.coldBox.findUnique({ where: { id } });
    if (!box) throw new NotFoundException('Cold Box not found');

    this.validateSiteAccess(user, box.siteId);

    let imageUrl: string | undefined;
    if (image) {
      const uploadResult = await this.cloudinaryService.uploadFile(image, 'mofresh-cold-boxes');
      imageUrl = uploadResult.secure_url as string;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { image: _image, ...updateData } = dto;

    const updated = await this.prisma.coldBox.update({
      where: { id },
      data: {
        ...updateData,
        ...(imageUrl && { imageUrl }),
      },
    });
    await this.auditService.createAuditLog(user.userId, AuditAction.UPDATE, 'COLDBOX', id);
    return new ColdBoxEntity(updated);
  }

  async updateColdPlate(
    id: string,
    dto: UpdateColdPlateDto,
    user: CurrentUserPayload,
    image?: Express.Multer.File,
  ) {
    const plate = await this.prisma.coldPlate.findUnique({ where: { id } });
    if (!plate) throw new NotFoundException('Cold Plate not found');

    this.validateSiteAccess(user, plate.siteId);

    let imageUrl: string | undefined;
    if (image) {
      const uploadResult = await this.cloudinaryService.uploadFile(image, 'mofresh-cold-plates');
      imageUrl = uploadResult.secure_url as string;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { image: _image, ...updateData } = dto;

    const updated = await this.prisma.coldPlate.update({
      where: { id },
      data: {
        ...updateData,
        ...(imageUrl && { imageUrl }),
      },
    });
    await this.auditService.createAuditLog(user.userId, AuditAction.UPDATE, 'COLDPLATE', id);
    return new ColdPlateEntity(updated);
  }

  // --- SHARED OPERATIONS ---

  async updateStatus(
    type: 'tricycle' | 'coldBox' | 'coldPlate' | 'coldRoom',
    id: string,
    status: AssetStatus,
    user: CurrentUserPayload,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const model = this.prisma[type] as any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const asset = await model.findUnique({ where: { id } });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!asset || asset.deletedAt) throw new NotFoundException(`${type} not found`);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    this.validateSiteAccess(user, asset.siteId);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const updated = await model.update({
      where: { id },
      data: { status },
    });

    await this.auditService.createAuditLog(
      user.userId,
      AuditAction.UPDATE,
      type.toUpperCase(),
      id,
      {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        oldStatus: asset.status,
        newStatus: status,
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return updated;
  }

  async remove(
    type: 'tricycle' | 'coldBox' | 'coldPlate' | 'coldRoom',
    id: string,
    user: CurrentUserPayload,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const model = this.prisma[type] as any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const asset = await model.findUnique({ where: { id } });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!asset || asset.deletedAt) throw new NotFoundException(`${type} not found`);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    this.validateSiteAccess(user, asset.siteId);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const removed = await model.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.createAuditLog(user.userId, AuditAction.DELETE, type.toUpperCase(), id);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return removed;
  }
}
