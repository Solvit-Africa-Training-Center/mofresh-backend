import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
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
export class RentalsService {
  private readonly logger = new Logger(RentalsService.name);

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
    const { assetType, coldBoxId, coldPlateId, tricycleId } = dto;

    const provided: AssetRef[] = [];
    if (coldBoxId) provided.push({ assetType: AssetType.COLD_BOX, assetId: coldBoxId });
    if (coldPlateId) provided.push({ assetType: AssetType.COLD_PLATE, assetId: coldPlateId });
    if (tricycleId) provided.push({ assetType: AssetType.TRICYCLE, assetId: tricycleId });

    if (provided.length !== 1) {
      throw new BadRequestException(
        'Provide exactly one asset id: coldBoxId OR coldPlateId OR tricycleId',
      );
    }

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
  }): AssetRef {
    const assetId = rental.coldBoxId ?? rental.coldPlateId ?? rental.tricycleId;
    if (!assetId) throw new BadRequestException('Rental has no associated asset');
    return { assetType: rental.assetType, assetId };
  }

  // ----------------------------
  // Asset operations inside RentalsService (as requested)
  // ----------------------------
  private mapAssetTypeToModel(assetType: AssetType): 'coldBox' | 'coldPlate' | 'tricycle' {
    if (assetType === AssetType.COLD_BOX) return 'coldBox';
    if (assetType === AssetType.COLD_PLATE) return 'coldPlate';
    return 'tricycle';
  }

  private async checkAvailability(assetType: AssetType, assetId: string, siteId: string) {
    const modelKey = this.mapAssetTypeToModel(assetType);
    const model = (this.db as any)[modelKey];

    const asset = await model.findFirst({
      where: { id: assetId, siteId, deletedAt: null },
      select: { status: true },
    });

    return asset?.status === AssetStatus.AVAILABLE;
  }

  private async markAsRented(assetType: AssetType, assetId: string, tx?: Prisma.TransactionClient) {
    const client = (tx ?? this.db) as any;
    const modelKey = this.mapAssetTypeToModel(assetType);

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
    const client = (tx ?? this.db) as any;
    const modelKey = this.mapAssetTypeToModel(assetType);

    await client[modelKey].update({
      where: { id: assetId },
      data: { status: AssetStatus.AVAILABLE },
    });
  }

  /**
   * create rental request (client)
   * validates asset availability and date range
   */
  async createRental(userId: string, siteId: string, dto: CreateRentalDto) {
    this.logger.log(`Creating rental request for client: ${userId}`);

    const { start, end } = this.parseAndValidateDates(dto);
    const { assetType, assetId } = this.resolveAsset(dto);

    const available = await this.checkAvailability(assetType, assetId, siteId);
    if (!available) throw new BadRequestException(`${assetType} is not available`);

    return this.db.rental.create({
      data: {
        clientId: userId,
        siteId,
        assetType,
        coldBoxId: dto.coldBoxId,
        coldPlateId: dto.coldPlateId,
        tricycleId: dto.tricycleId,
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
      },
    });
  }

  /**
   * get all rentals with role-based filtering
   * supports pagination and status filtering
   */
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
      },
    });
  }

  /**
   * get rental by ID with role-based access control
   * enforces site scoping and client ownership
   */
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
        invoice: true,
      },
    });

    if (!rental) throw new NotFoundException('Rental request not found');
    return rental;
  }

  /**
   * approve rental request (prepaid flow)
   * generates invoice and updates status to APPROVED
   * uses database transaction to ensure data consistency
   */
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

  /**
   * activate rental (prepaid flow)
   * requires invoice to be PAID, then marks asset as RENTED
   * uses database transaction to ensure atomicity
   */
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

      // At activation time, asset must still be available
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

  /**
   * complete rental
   * marks rental as COMPLETED and releases asset to AVAILABLE
   * uses database transaction to ensure atomicity
   */
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
}
