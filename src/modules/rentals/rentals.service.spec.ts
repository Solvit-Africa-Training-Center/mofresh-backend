import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RentalsService } from './rentals.service';
import { PrismaService } from '../../database/prisma.service';
import { InvoicesService } from '../invoices/invoices.service';
import { AssetStatus, AssetType, RentalStatus, UserRole, InvoiceStatus } from '@prisma/client';

describe('RentalsService', () => {
    let service: RentalsService;

    const mockTransaction = jest.fn();
    const mockPrismaService = {
        $transaction: mockTransaction,
        rental: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
        },
        coldBox: {
            findFirst: jest.fn(),
            updateMany: jest.fn(),
            update: jest.fn(),
        },
        coldPlate: {
            findFirst: jest.fn(),
            updateMany: jest.fn(),
            update: jest.fn(),
        },
        tricycle: {
            findFirst: jest.fn(),
            updateMany: jest.fn(),
            update: jest.fn(),
        },
        invoice: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
        },
        auditLog: {
            create: jest.fn(),
        },
    };

    const mockInvoicesService = {
        generateRentalInvoice: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RentalsService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                {
                    provide: InvoicesService,
                    useValue: mockInvoicesService,
                },
            ],
        }).compile();

        service = module.get<RentalsService>(RentalsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createRental', () => {
        const mockDto = {
            assetType: AssetType.COLD_BOX,
            coldBoxId: 'box-1',
            rentalStartDate: '2026-02-15',
            rentalEndDate: '2026-02-20',
            estimatedFee: 50000,
        };

        const mockColdBox = {
            id: 'box-1',
            status: AssetStatus.AVAILABLE,
            siteId: 'site-1',
        };

        const mockRental = {
            id: 'rental-1',
            clientId: 'client-1',
            siteId: 'site-1',
            assetType: AssetType.COLD_BOX,
            coldBoxId: 'box-1',
            status: RentalStatus.REQUESTED,
            startDate: new Date('2026-02-15'),
            endDate: new Date('2026-02-20'),
            estimatedFee: 50000,
            createdAt: new Date(),
        };

        it('should create rental successfully', async () => {
            mockPrismaService.coldBox.findFirst.mockResolvedValue(mockColdBox);
            mockPrismaService.rental.create.mockResolvedValue(mockRental);

            const result = await service.createRental('client-1', 'site-1', mockDto as any);

            expect(result).toBeDefined();
            expect(result.id).toBe('rental-1');
            expect(result.status).toBe(RentalStatus.REQUESTED);
            expect(mockPrismaService.coldBox.findFirst).toHaveBeenCalledWith({
                where: { id: 'box-1', siteId: 'site-1', deletedAt: null },
        select: { status: true },
            });
        });

        it('should throw BadRequestException if asset not available', async () => {
            mockPrismaService.coldBox.findFirst.mockResolvedValue(null);

            await expect(service.createRental('client-1', 'site-1', mockDto as any)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should throw BadRequestException for invalid date range', async () => {
            const invalidDto = {
                ...mockDto,
                rentalStartDate: '2026-02-20',
                rentalEndDate: '2026-02-15',
            };

            await expect(service.createRental('client-1', 'site-1', invalidDto as any)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should throw BadRequestException if multiple asset IDs provided', async () => {
            const multipleAssetsDto = {
                ...mockDto,
                coldPlateId: 'plate-1',
            };

            await expect(
                service.createRental('client-1', 'site-1', multipleAssetsDto as any),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException if no asset ID provided', async () => {
            const noAssetDto = {
                assetType: AssetType.COLD_BOX,
                rentalStartDate: '2026-02-15',
                rentalEndDate: '2026-02-20',
                estimatedFee: 50000,
            };

            await expect(service.createRental('client-1', 'site-1', noAssetDto as any)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe('findAllRental', () => {
        const mockRentals = [
            {
                id: 'rental-1',
                clientId: 'client-1',
                siteId: 'site-1',
                status: RentalStatus.REQUESTED,
            },
        ];

        it('should return all rentals for SUPER_ADMIN', async () => {
            mockPrismaService.rental.findMany.mockResolvedValue(mockRentals);
            mockPrismaService.rental.count.mockResolvedValue(1);

            const result = await service.findAllRental(
                undefined,
                UserRole.SUPER_ADMIN,
                'admin-1',
                undefined,
                1,
                10,
            );

            expect(result.data).toHaveLength(1);
            expect(mockPrismaService.rental.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { deletedAt: null },
                }),
            );
        });

        it('should return site rentals for SITE_MANAGER', async () => {
            mockPrismaService.rental.findMany.mockResolvedValue(mockRentals);
            mockPrismaService.rental.count.mockResolvedValue(1);

            const result = await service.findAllRental(
                'site-1',
                UserRole.SITE_MANAGER,
                'manager-1',
                undefined,
                1,
                10,
            );

            expect(result.data).toHaveLength(1);
            expect(mockPrismaService.rental.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { deletedAt: null, siteId: 'site-1' },
                }),
            );
        });

        it('should return only client rentals for CLIENT', async () => {
            mockPrismaService.rental.findMany.mockResolvedValue(mockRentals);
            mockPrismaService.rental.count.mockResolvedValue(1);

            const result = await service.findAllRental(
                'site-1',
                UserRole.CLIENT,
                'client-1',
                undefined,
                1,
                10,
            );

            expect(result.data).toHaveLength(1);
            expect(mockPrismaService.rental.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { deletedAt: null, siteId: 'site-1', clientId: 'client-1' },
                }),
            );
        });

        it('should filter by status', async () => {
            mockPrismaService.rental.findMany.mockResolvedValue(mockRentals);
            mockPrismaService.rental.count.mockResolvedValue(1);

            await service.findAllRental(
                'site-1',
                UserRole.SITE_MANAGER,
                'manager-1',
                RentalStatus.APPROVED,
                1,
                10,
            );

            expect(mockPrismaService.rental.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { deletedAt: null, siteId: 'site-1', status: RentalStatus.APPROVED },
                }),
            );
        });

        it('should throw BadRequestException if CLIENT has no siteId', async () => {
            await expect(
                service.findAllRental(undefined, UserRole.CLIENT, 'client-1'),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('findOneRental', () => {
        const mockRental = {
            id: 'rental-1',
            clientId: 'client-1',
            siteId: 'site-1',
            status: RentalStatus.REQUESTED,
        };

        it('should return rental for SUPER_ADMIN', async () => {
            mockPrismaService.rental.findFirst.mockResolvedValue(mockRental);

            const result = await service.findOneRental('rental-1', undefined, UserRole.SUPER_ADMIN, 'admin-1');

            expect(result).toBeDefined();
            expect(result.id).toBe('rental-1');
        });

        it('should return rental for SITE_MANAGER in same site', async () => {
            mockPrismaService.rental.findFirst.mockResolvedValue(mockRental);

            const result = await service.findOneRental('rental-1', 'site-1', UserRole.SITE_MANAGER, 'manager-1');

            expect(result).toBeDefined();
            expect(mockPrismaService.rental.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'rental-1', deletedAt: null, siteId: 'site-1' },
                }),
            );
        });

        it('should return rental for CLIENT who owns it', async () => {
            mockPrismaService.rental.findFirst.mockResolvedValue(mockRental);

            const result = await service.findOneRental('rental-1', 'site-1', UserRole.CLIENT, 'client-1');

            expect(result).toBeDefined();
            expect(mockPrismaService.rental.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'rental-1', deletedAt: null, siteId: 'site-1', clientId: 'client-1' },
                }),
            );
        });

        it('should throw NotFoundException if rental not found', async () => {
            mockPrismaService.rental.findFirst.mockResolvedValue(null);

            await expect(
                service.findOneRental('invalid-id', 'site-1', UserRole.CLIENT, 'client-1'),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('approveRental', () => {
        const mockRental = {
            id: 'rental-1',
            status: RentalStatus.REQUESTED,
            assetType: AssetType.COLD_BOX,
            coldBoxId: 'box-1',
            coldPlateId: null,
            tricycleId: null,
            clientId: 'client-1',
            siteId: 'site-1',
        };

        const mockApprovedRental = {
            ...mockRental,
            status: RentalStatus.APPROVED,
            approvedAt: new Date(),
            client: { id: 'client-1', firstName: 'John' },
            coldBox: { id: 'box-1', name: 'Box 1' },
            coldPlate: null,
            tricycle: null,
        };

        const mockInvoice = {
            id: 'invoice-1',
            invoiceNumber: 'INV-KIGALI-2026-00001',
            rentalId: 'rental-1',
            status: InvoiceStatus.UNPAID,
        };

        it('should approve rental and generate invoice', async () => {
            mockTransaction.mockImplementation(
                // eslint-disable-next-line @typescript-eslint/require-await
                async (callback) => {
                    const mockTx = {
                        rental: {
                            findFirst: jest.fn().mockResolvedValue(mockRental),
                            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
                            findUnique: jest.fn().mockResolvedValue(mockApprovedRental),
                        },
                        coldBox: {
                            findFirst: jest.fn().mockResolvedValue({ id: 'box-1', status: AssetStatus.AVAILABLE }),
                        },
                        auditLog: {
                            create: jest.fn().mockResolvedValue({}),
                        },
                    };
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
                    return callback(mockTx);
                },
            );

            mockInvoicesService.generateRentalInvoice.mockResolvedValue(mockInvoice);

            const result = await service.approveRental('rental-1', 'site-1', 'manager-1');

            expect(result).toBeDefined();
            expect(result.rental.status).toBe(RentalStatus.APPROVED);
            expect(result.invoice).toBeDefined();
            expect(result.invoice.invoiceNumber).toBe('INV-KIGALI-2026-00001');
            expect(mockInvoicesService.generateRentalInvoice).toHaveBeenCalledWith(
                'rental-1',
                undefined,
                'manager-1',
                'site-1',
            );
        });

        it('should throw NotFoundException if rental not found', async () => {
            mockTransaction.mockImplementation(
                // eslint-disable-next-line @typescript-eslint/require-await
                async (callback) => {
                    const mockTx = {
                        rental: {
                            findFirst: jest.fn().mockResolvedValue(null),
                        },
                    };
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
                    return callback(mockTx);
                },
            );

            await expect(service.approveRental('invalid-id', 'site-1', 'manager-1')).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should throw BadRequestException if rental not REQUESTED', async () => {
            mockTransaction.mockImplementation(
                // eslint-disable-next-line @typescript-eslint/require-await
                async (callback) => {
                    const mockTx = {
                        rental: {
                            findFirst: jest.fn().mockResolvedValue({ ...mockRental, status: RentalStatus.APPROVED }),
                        },
                    };
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
                    return callback(mockTx);
                },
            );

            await expect(service.approveRental('rental-1', 'site-1', 'manager-1')).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should throw BadRequestException if asset not available', async () => {
            mockTransaction.mockImplementation(
                // eslint-disable-next-line @typescript-eslint/require-await
                async (callback) => {
                    const mockTx = {
                        rental: {
                            findFirst: jest.fn().mockResolvedValue(mockRental),
                        },
                        coldBox: {
                            findFirst: jest.fn().mockResolvedValue(null),
                        },
                    };
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
                    return callback(mockTx);
                },
            );

            await expect(service.approveRental('rental-1', 'site-1', 'manager-1')).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should throw BadRequestException if rental already processed', async () => {
            mockTransaction.mockImplementation(
                // eslint-disable-next-line @typescript-eslint/require-await
                async (callback) => {
                    const mockTx = {
                        rental: {
                            findFirst: jest.fn().mockResolvedValue(mockRental),
                            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
                        },
                        coldBox: {
                            findFirst: jest.fn().mockResolvedValue({ id: 'box-1', status: AssetStatus.AVAILABLE }),
                        },
                    };
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
                    return callback(mockTx);
                },
            );

            await expect(service.approveRental('rental-1', 'site-1', 'manager-1')).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe('activateRental', () => {
        const mockRental = {
            id: 'rental-1',
            status: RentalStatus.APPROVED,
            assetType: AssetType.COLD_BOX,
            coldBoxId: 'box-1',
            coldPlateId: null,
            tricycleId: null,
        };

        const mockInvoice = {
            id: 'invoice-1',
            status: InvoiceStatus.PAID,
        };

        it('should activate rental when invoice is PAID', async () => {
            mockTransaction.mockImplementation(
                // eslint-disable-next-line @typescript-eslint/require-await
                async (callback) => {
                    const mockTx = {
                        rental: {
                            findFirst: jest.fn().mockResolvedValue(mockRental),
                            update: jest.fn().mockResolvedValue({ ...mockRental, status: RentalStatus.ACTIVE }),
                        },
                        invoice: {
                            findUnique: jest.fn().mockResolvedValue(mockInvoice),
                        },
                        coldBox: {
                            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
                        },
                        auditLog: {
                            create: jest.fn().mockResolvedValue({}),
                        },
                    };
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
                    return callback(mockTx);
                },
            );

            const result = await service.activateRental('rental-1', 'site-1', 'manager-1');

            expect(result).toBeDefined();
            expect(result.status).toBe(RentalStatus.ACTIVE);
        });

        it('should throw NotFoundException if rental not found', async () => {
            mockTransaction.mockImplementation(
                // eslint-disable-next-line @typescript-eslint/require-await
                async (callback) => {
                    const mockTx = {
                        rental: {
                            findFirst: jest.fn().mockResolvedValue(null),
                        },
                    };
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
                    return callback(mockTx);
                },
            );

            await expect(service.activateRental('invalid-id', 'site-1', 'manager-1')).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should throw BadRequestException if rental not APPROVED', async () => {
            mockTransaction.mockImplementation(
                // eslint-disable-next-line @typescript-eslint/require-await
                async (callback) => {
                    const mockTx = {
                        rental: {
                            findFirst: jest.fn().mockResolvedValue({ ...mockRental, status: RentalStatus.REQUESTED }),
                        },
                    };
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
                    return callback(mockTx);
                },
            );

            await expect(service.activateRental('rental-1', 'site-1', 'manager-1')).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should throw BadRequestException if invoice not PAID', async () => {
            mockTransaction.mockImplementation(
                // eslint-disable-next-line @typescript-eslint/require-await
                async (callback) => {
                    const mockTx = {
                        rental: {
                            findFirst: jest.fn().mockResolvedValue(mockRental),
                        },
                        invoice: {
                            findUnique: jest.fn().mockResolvedValue({ ...mockInvoice, status: InvoiceStatus.UNPAID }),
                        },
                    };
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
                    return callback(mockTx);
                },
            );

            await expect(service.activateRental('rental-1', 'site-1', 'manager-1')).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe('complete', () => {
        const mockRental = {
            id: 'rental-1',
            status: RentalStatus.ACTIVE,
            assetType: AssetType.COLD_BOX,
            coldBoxId: 'box-1',
            coldPlateId: null,
            tricycleId: null,
        };

        it('should complete rental and mark asset AVAILABLE', async () => {
            mockTransaction.mockImplementation(
                // eslint-disable-next-line @typescript-eslint/require-await
                async (callback) => {
                    const mockTx = {
                        rental: {
                            findFirst: jest.fn().mockResolvedValue(mockRental),
                            update: jest.fn().mockResolvedValue({ ...mockRental, status: RentalStatus.COMPLETED }),
                        },
                        coldBox: {
                            update: jest.fn().mockResolvedValue({ id: 'box-1', status: AssetStatus.AVAILABLE }),
                        },
                        auditLog: {
                            create: jest.fn().mockResolvedValue({}),
                        },
                    };
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
                    return callback(mockTx);
                },
            );

            const result = await service.complete('rental-1', 'site-1', 'manager-1');

            expect(result).toBeDefined();
            expect(result.status).toBe(RentalStatus.COMPLETED);
        });

        it('should throw NotFoundException if rental not found', async () => {
            mockTransaction.mockImplementation(
                // eslint-disable-next-line @typescript-eslint/require-await
                async (callback) => {
                    const mockTx = {
                        rental: {
                            findFirst: jest.fn().mockResolvedValue(null),
                        },
                    };
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
                    return callback(mockTx);
                },
            );

            await expect(service.complete('invalid-id', 'site-1', 'manager-1')).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should throw BadRequestException if rental not ACTIVE', async () => {
            mockTransaction.mockImplementation(
                // eslint-disable-next-line @typescript-eslint/require-await
                async (callback) => {
                    const mockTx = {
                        rental: {
                            findFirst: jest.fn().mockResolvedValue({ ...mockRental, status: RentalStatus.APPROVED }),
                        },
                    };
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
                    return callback(mockTx);
                },
            );

            await expect(service.complete('rental-1', 'site-1', 'manager-1')).rejects.toThrow(
                BadRequestException,
            );
        });
    });
});
