import { inMemoryRepository } from "./in-memory-repository";
import type { CompetitionRepository } from "./repository";

/** Satu titik pertukaran adapter data untuk seluruh aplikasi. */
export const repository: CompetitionRepository = inMemoryRepository;
export type { CompetitionRepository };
