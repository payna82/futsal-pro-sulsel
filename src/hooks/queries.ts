import { queryOptions } from "@tanstack/react-query";
import { repository } from "@/data";
import type { UUID } from "@/domain/types";

export const tournamentQuery = () =>
  queryOptions({ queryKey: ["tournament"], queryFn: () => repository.getTournament() });

export const categoriesQuery = () =>
  queryOptions({ queryKey: ["categories"], queryFn: () => repository.listCategories() });

export const contingentsQuery = () =>
  queryOptions({ queryKey: ["contingents"], queryFn: () => repository.listContingents() });

export const groupsQuery = () =>
  queryOptions({ queryKey: ["groups"], queryFn: () => repository.listGroups() });

export const teamsQuery = () =>
  queryOptions({ queryKey: ["teams"], queryFn: () => repository.listTeams() });

export const playersQuery = () =>
  queryOptions({ queryKey: ["players"], queryFn: () => repository.listPlayers() });

export const teamOfficialsQuery = () =>
  queryOptions({ queryKey: ["team-officials"], queryFn: () => repository.listTeamOfficials() });

export const venuesQuery = () =>
  queryOptions({ queryKey: ["venues"], queryFn: () => repository.listVenues() });

export const matchesQuery = () =>
  queryOptions({ queryKey: ["matches"], queryFn: () => repository.listMatches() });

export const matchQuery = (id: UUID) =>
  queryOptions({ queryKey: ["matches", id], queryFn: () => repository.getMatch(id) });

export const matchOfficialsQuery = (id: UUID) =>
  queryOptions({
    queryKey: ["match-officials", id],
    queryFn: () => repository.listMatchOfficials(id),
  });

export const lineupQuery = (id: UUID) =>
  queryOptions({ queryKey: ["lineup", id], queryFn: () => repository.listLineup(id) });

export const matchEventsQuery = (id: UUID) =>
  queryOptions({ queryKey: ["match-events", id], queryFn: () => repository.listMatchEvents(id) });

export const standingsQuery = (categoryId: UUID) =>
  queryOptions({
    queryKey: ["standings", categoryId],
    queryFn: () => repository.listStandings(categoryId),
  });

export const topScorersQuery = (categoryId: UUID) =>
  queryOptions({
    queryKey: ["top-scorers", categoryId],
    queryFn: () => repository.listTopScorers(categoryId),
  });

export const usersQuery = () =>
  queryOptions({ queryKey: ["users"], queryFn: () => repository.listUsers() });

export const auditLogsQuery = () =>
  queryOptions({ queryKey: ["audit-logs"], queryFn: () => repository.listAuditLogs() });
