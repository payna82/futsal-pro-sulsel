import { supabaseRepository } from "./supabase-repository";
import type { CompetitionRepository } from "./repository";

/** Satu titik pertukaran adapter data untuk seluruh aplikasi. */
export const repository: CompetitionRepository = supabaseRepository;
export type { CompetitionRepository };
