import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  AssetStatus,
  AssetType,
  AuditAction,
  InvoiceStatus,
  Prisma,
  RentalStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { paginate } from '../../common/utils/paginator';
import { CreateRentalDto } from './dto';
import { InvoicesService } from '../invoices/invoices.service';

type AssetRef = { assetType: AssetType; assetId: string };

@Injectable()
export class RentalsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RentalsService.name);
  private activationInterval: NodeJS.Timeout;

  constructor(
    private readonly db: PrismaService,
    private readonly invoicesService: InvoicesService,
  ) {}

  private getRoleBasedFilter(
    siteId: string | undefined,
    userRole: UserRole,
    userId: string,
  ): Prisma.RentalWhereInput {
    if (userRole === UserRole.SUPER_ADMIN) return {};
    if (!siteId) throw new BadRequestException('User must belong to a site');
    if (userRole === UserRole.SITE_MANAGER) return { siteId };
    return { siteId, clientId: userId };
  }

  private parseAndValidateDates(dto: CreateRentalDto) {
    const start = new Date(dto.rentalStartDate);
    const end = new Date(dto.rentalEndDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid rentalStartDate or rentalEndDate');
    }
    if (end <= start) {
      throw new BadRequestException('rentalEndDate must be after rentalStartDate');
    }
    return { start, end };
  }

  private resolveAsset(dto: CreateRentalDto): AssetRef {
    const { assetType, coldBoxId, coldPlateId, tricycleId, coldRoomId } = dto;

    const provided: AssetRef[] = [];
    if (coldBoxId) provided.push({ assetType: AssetType.COLD_BOX, assetId: coldBoxId });
    if (coldPlateId) provided.push({ assetType: AssetType.COLD_PLATE, assetId: coldPlateId });
    if (tricycleId) provided.push({ assetType: AssetType.TRICYCLE, assetId: tricycleId });
    if (coldRoomId) provided.push({ assetType: AssetType.COLD_ROOM, assetId: coldRoomId });

    // user must provide exactly one asset ID
    if (provided.length === 0) {
      throw new BadRequestException(`Please select a specific ${assetType} .`);
    }

    // If multiple IDs provided, throw error
    if (provided.length > 1) {
      throw new BadRequestException(
        'Provide exactly one asset id: coldBoxId OR coldPlateId OR tricycleId OR coldRoomId',
      );
    }

    // Validate that provided asset type matches the ID type
    const selected = provided[0];
    if (selected.assetType !== assetType) {
      throw new BadRequestException(
        `assetType is ${assetType} but provided id is for ${selected.assetType}`,
      );
    }

    return selected;
  }

  private getRentalAssetRef(rental: {
    assetType: AssetType;
    coldBoxId: string | null;
    coldPlateId: string | null;
    tricycleId: string | null;
    coldRoomId: string | null;
  }): AssetRef {
    const assetId =
      rental.coldBoxId ?? rental.coldPlateId ?? rental.tricycleId ?? rental.coldRoomId;
    if (!assetId) throw new BadRequestException('Rental has no associated asset');
    return { assetType: rental.assetType, assetId };
  }
  private mapAssetTypeToModel(
    assetType: AssetType,
  ): 'coldBox' | 'coldPlate' | 'tricycle' | 'coldRoom' {
    if (assetType === AssetType.COLD_BOX) return 'coldBox';
    if (assetType === AssetType.COLD_PLATE) return 'coldPlate';
    if (assetType === AssetType.TRICYCLE) return 'tricycle';
    return 'coldRoom';
  }

  private async checkAvailability(assetType: AssetType, assetId: string, siteId: string) {
    const modelKey = this.mapAssetTypeToModel(assetType);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const model = (this.db as any)[modelKey];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const asset = await model.findFirst({
      where: { id: assetId, siteId, deletedAt: null },
      select: { status: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return asset?.status === AssetStatus.AVAILABLE;
  }

  private async markAsRented(assetType: AssetType, assetId: string, tx?: Prisma.TransactionClient) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const client = (tx ?? this.db) as any;
    const modelKey = this.mapAssetTypeToModel(assetType);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await client[modelKey].update({
      where: { id: assetId },
      data: { status: AssetStatus.RENTED },
    });
  }

  private async markAsAvailable(
    assetType: AssetType,
    assetId: string,
    tx?: Prisma.TransactionClient,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const client = (tx ?? this.db) as any;
    const modelKey = this.mapAssetTypeToModel(assetType);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await client[modelKey].update({
      where: { id: assetId },
      data: { status: AssetStatus.AVAILABLE },
    });
  }

  async getAvailableAssetsByType(assetType: AssetType, siteId: string) {
    this.logger.log(`Fetching available ${assetType} assets for site: ${siteId}`);

    const modelKey = this.mapAssetTypeToModel(assetType);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const model = (this.db as any)[modelKey];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const assets = await model.findMany({
      where: {
        siteId,
        status: AssetStatus.AVAILABLE,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      assetType,
      siteId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      count: assets.length,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      assets,
    };
  }

  async createRental(userId: string, siteId: string, dto: CreateRentalDto) {
    this.logger.log(`Creating rental request for client: ${userId}`);

    const { start, end } = this.parseAndValidateDates(dto);
    const { assetType, assetId } = this.resolveAsset(dto);

    const available = await this.checkAvailability(assetType, assetId, siteId);
    if (!available) throw new BadRequestException(`${assetType} is not available`);

    // map the resolved assetId to the correct field based on asset type
    const assetIdMapping = {
      coldBoxId: assetType === AssetType.COLD_BOX ? assetId : null,
      coldPlateId: assetType === AssetType.COLD_PLATE ? assetId : null,
      tricycleId: assetType === AssetType.TRICYCLE ? assetId : null,
      coldRoomId: assetType === AssetType.COLD_ROOM ? assetId : null,
    };

    return this.db.rental.create({
      data: {
        clientId: userId,
        siteId,
        assetType,
        ...assetIdMapping,
        rentalStartDate: start,
        rentalEndDate: end,
        estimatedFee: dto.estimatedFee,
        status: RentalStatus.REQUESTED,
      },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        coldBox: true,
        coldPlate: true,
        tricycle: true,
        coldRoom: true,
      },
    });
  }

  async findAllRental(
    siteId: string | undefined,
    userRole: UserRole,
    userId: string,
    status?: RentalStatus,
    page?: number,
    limit?: number,
  ) {
    const whereClause: Prisma.RentalWhereInput = {
      deletedAt: null,
      ...this.getRoleBasedFilter(siteId, userRole, userId),
    };
    if (status) whereClause.status = status;

    return paginate(this.db.rental, {
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      page,
      limit,
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        coldBox: true,
        coldPlate: true,
        tricycle: true,
        coldRoom: true,
      },
    });
  }

  async findOneRental(
    rentalId: string,
    siteId: string | undefined,
    userRole: UserRole,
    userId: string,
  ) {
    const whereClause: Prisma.RentalWhereInput = {
      id: rentalId,
      deletedAt: null,
      ...this.getRoleBasedFilter(siteId, userRole, userId),
    };

    const rental = await this.db.rental.findFirst({
      where: whereClause,
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        coldBox: true,
        coldPlate: true,
        tricycle: true,
        coldRoom: true,
        invoice: true,
      },
    });

    if (!rental) throw new NotFoundException('Rental request not found');
    return rental;
  }

  //generates invoice and updates status to APPROVED
  // uses database transaction to ensure data consistency

  async approveRental(rentalId: string, siteId: string, userId: string) {
    this.logger.log(`Approving rental: ${rentalId}`);

    const approvedRental = await this.db.$transaction(async (tx) => {
      const rental = await tx.rental.findFirst({
        where: { id: rentalId, siteId, deletedAt: null },
        select: {
          id: true,
          status: true,
          assetType: true,
          coldBoxId: true,
          coldPlateId: true,
          tricycleId: true,
          coldRoomId: true,
        },
      });

      if (!rental) throw new NotFoundException('Rental request not found');
      if (rental.status !== RentalStatus.REQUESTED) {
        throw new BadRequestException(`Rental must be REQUESTED. Current: ${rental.status}`);
      }

      const { assetType, assetId } = this.getRentalAssetRef(rental);
      const available = await this.checkAvailability(assetType, assetId, siteId);
      if (!available) throw new BadRequestException(`${assetType} is not available`);

      const updated = await tx.rental.updateMany({
        where: { id: rentalId, siteId, deletedAt: null, status: RentalStatus.REQUESTED },
        data: { status: RentalStatus.APPROVED, approvedAt: new Date() },
      });

      if (updated.count !== 1) {
        throw new BadRequestException('Rental was already processed by another user');
      }

      // audit log
      await tx.auditLog.create({
        data: {
          entityType: 'RENTAL',
          entityId: rentalId,
          action: AuditAction.APPROVE,
          userId,
          details: { rentalId, assetType, assetId },
        },
      });

      return tx.rental.findUnique({
        where: { id: rentalId },
        include: { client: true, coldBox: true, coldPlate: true, tricycle: true },
      });
    });

    // generate invoice
    const invoice = await this.invoicesService.generateRentalInvoice(
      rentalId,
      undefined,
      userId,
      siteId,
    );

    this.logger.log(`Rental ${rentalId} approved and invoice ${invoice.invoiceNumber} generated`);

    return { rental: approvedRental, invoice };
  }

  //activating rentals after being paid
  async activateRental(rentalId: string, siteId: string, userId: string) {
    this.logger.log(`Activating rental: ${rentalId}`);
    return this.db.$transaction(async (tx) => {
      const rental = await tx.rental.findFirst({
        where: { id: rentalId, siteId, deletedAt: null },
        select: {
          id: true,
          status: true,
          assetType: true,
          coldBoxId: true,
          coldPlateId: true,
          tricycleId: true,
          coldRoomId: true,
        },
      });

      if (!rental) throw new NotFoundException('Rental request not found');
      if (rental.status !== RentalStatus.APPROVED) {
        throw new BadRequestException(
          `Rental must be APPROVED to activate. Current: ${rental.status}`,
        );
      }

      const invoice = await tx.invoice.findUnique({
        where: { rentalId },
        select: { id: true, status: true },
      });

      if (!invoice) throw new BadRequestException('Cannot activate rental: invoice not found');
      if (invoice.status !== InvoiceStatus.PAID) {
        throw new BadRequestException('Cannot activate rental: invoice is not PAID');
      }

      const { assetType, assetId } = this.getRentalAssetRef(rental);

      // at activation time, asset must still be available
      const available = await this.checkAvailability(assetType, assetId, siteId);
      if (!available) throw new BadRequestException(`${assetType} is not available`);

      const updated = await tx.rental.updateMany({
        where: { id: rentalId, siteId, deletedAt: null, status: RentalStatus.APPROVED },
        data: { status: RentalStatus.ACTIVE },
      });

      if (updated.count !== 1) {
        throw new BadRequestException('Rental was already processed by another user');
      }

      await this.markAsRented(assetType, assetId, tx);

      // audit log
      await tx.auditLog.create({
        data: {
          entityType: 'RENTAL',
          entityId: rentalId,
          action: AuditAction.UPDATE,
          userId,
          details: { rentalId, status: RentalStatus.ACTIVE, invoiceId: invoice.id },
        },
      });

      return tx.rental.findUnique({
        where: { id: rentalId },
        include: { client: true, coldBox: true, coldPlate: true, tricycle: true, invoice: true },
      });
    });
  }
  //  complete rental
  async complete(rentalId: string, siteId: string, userId: string) {
    this.logger.log(`Completing rental: ${rentalId}`);
    return this.db.$transaction(async (tx) => {
      const rental = await tx.rental.findFirst({
        where: { id: rentalId, siteId, deletedAt: null },
        select: {
          id: true,
          status: true,
          assetType: true,
          coldBoxId: true,
          coldPlateId: true,
          tricycleId: true,
          coldRoomId: true,
        },
      });

      if (!rental) throw new NotFoundException('Rental request not found');
      if (rental.status !== RentalStatus.ACTIVE) {
        throw new BadRequestException(
          `Cannot complete rental with status: ${rental.status}. Only ACTIVE rentals can be completed`,
        );
      }

      const { assetType, assetId } = this.getRentalAssetRef(rental);

      const completedRental = await tx.rental.update({
        where: { id: rentalId },
        data: { status: RentalStatus.COMPLETED, completedAt: new Date() },
      });

      await this.markAsAvailable(assetType, assetId, tx);

      // audit log
      await tx.auditLog.create({
        data: {
          entityType: 'RENTAL',
          entityId: rentalId,
          action: AuditAction.UPDATE,
          userId,
          details: { rentalId, status: RentalStatus.COMPLETED },
        },
      });

      return completedRental;
    });
  }

  onModuleInit() {
    this.logger.log('Starting auto-activation polling for rentals...');
    // poll every 60 seconds
    this.activationInterval = setInterval(() => {
      void this.autoActivateRentals();
    }, 60000);
  }

  onModuleDestroy() {
    if (this.activationInterval) {
      clearInterval(this.activationInterval);
    }
  }

  // activate rentals that have been paid

  async autoActivateRentals() {
    try {
      this.logger.debug('Checking for paid rentals to activate...');

      // find all APPROVED rentals that have a PAID invoice
      const paidRentals = await this.db.rental.findMany({
        where: {
          status: RentalStatus.APPROVED,
          invoice: {
            status: InvoiceStatus.PAID,
          },
          deletedAt: null,
        },
        select: {
          id: true,
          siteId: true,
          clientId: true,
        },
      });

      if (paidRentals.length > 0) {
        this.logger.log(`Found ${paidRentals.length} paid rentals to activate`);
      }

      for (const rental of paidRentals) {
        try {
          await this.activateRental(rental.id, rental.siteId, 'SYSTEM');
          this.logger.log(`Auto-activated rental ${rental.id}`);
        } catch (error) {
          this.logger.error(`Failed to auto-activate rental ${rental.id}`, error);
          // continue to next rental even if one fails
        }
      }
    } catch (error) {
      this.logger.error('Error in autoActivateRentals polling', error);
    }
  }
}
