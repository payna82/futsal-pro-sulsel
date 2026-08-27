import { useQuery } from "@tanstack/react-query";
import { categoriesQuery, groupsQuery, matchesQuery, teamsQuery, venuesQuery } from "./queries";
import type { CategoryKey, Match, Team, UUID } from "@/domain/types";

/** Kumpulan lookup yang dipakai berulang di UI. Tanpa aturan bisnis. */
export function useCompetitionData() {
  const teams = useQuery(teamsQuery());
  const matches = useQuery(matchesQuery());
  const venues = useQuery(venuesQuery());
  const groups = useQuery(groupsQuery());
  const categories = useQuery(categoriesQuery());

  const teamById = new Map((teams.data ?? []).map((t) => [t.id, t]));
  const venueById = new Map((venues.data ?? []).map((v) => [v.id, v]));
  const groupById = new Map((groups.data ?? []).map((g) => [g.id, g]));
  const categoryByKey = new Map((categories.data ?? []).map((c) => [c.key, c]));

  return {
    isLoading:
      teams.isLoading ||
      matches.isLoading ||
      venues.isLoading ||
      groups.isLoading ||
      categories.isLoading,
    teams: teams.data ?? [],
    matches: matches.data ?? [],
    venues: venues.data ?? [],
    groups: groups.data ?? [],
    categories: categories.data ?? [],
    teamById,
    venueById,
    groupById,
    categoryByKey,
    teamName: (id: UUID) => teamById.get(id)?.name ?? "—",
    teamShort: (id: UUID) => teamById.get(id)?.short_name ?? "—",
    venueName: (id: UUID) => venueById.get(id)?.name ?? "—",
    groupName: (id?: UUID) => (id ? (groupById.get(id)?.name ?? "—") : "—"),
    categoryId: (key: CategoryKey) => categoryByKey.get(key)?.id ?? "",
  };
}

export function filterMatchesByCategory(matches: Match[], categoryId: string): Match[] {
  return matches.filter((m) => m.category_id === categoryId);
}

export function teamsOfCategory(teams: Team[], categoryId: string): Team[] {
  return teams.filter((t) => t.category_id === categoryId);
}
