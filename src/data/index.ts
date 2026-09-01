import { supabaseRepository } from "./supabase-repository";
import { inMemoryRepository } from "./in-memory-repository";
import type { CompetitionRepository } from "./repository";
import { isInMemoryDataSourceEnabled } from "./data-runtime";

/** Satu titik pertukaran adapter data untuk seluruh aplikasi. */
export const repository: CompetitionRepository = isInMemoryDataSourceEnabled()
  ? inMemoryRepository
  : supabaseRepository;
export type { CompetitionRepository };
