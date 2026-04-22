import {
  AddLibraryCardService,
  AdjustLibraryHoldingService,
  ListLibraryCardsService,
} from "@/modules/library/application/library-services";
import { PrismaLibraryRepository } from "@/modules/library/infrastructure/prisma-library-repository";
import { prisma } from "@/server/db/prisma";

export function createListLibraryCardsService(userId: string) {
  const repository = prisma ? new PrismaLibraryRepository(prisma, userId) : null;
  return new ListLibraryCardsService(repository);
}

export function createAddLibraryCardService(userId: string) {
  const repository = prisma ? new PrismaLibraryRepository(prisma, userId) : null;
  return new AddLibraryCardService(repository);
}

export function createAdjustLibraryHoldingService(userId: string) {
  const repository = prisma ? new PrismaLibraryRepository(prisma, userId) : null;
  return new AdjustLibraryHoldingService(repository);
}
