import { useMutation, useQueryClient } from "@tanstack/react-query";
import { repository } from "@/data";
import type { NewMatchEventInput } from "@/domain/match-operations";
import type { MatchOfficialRole, MatchStatus, UUID } from "@/domain/types";

/** Semua mutasi melewati repository agar adapter backend dapat menggantikannya. */
function useMatchInvalidation(matchId: UUID) {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["matches"] }),
      queryClient.invalidateQueries({ queryKey: ["matches", matchId] }),
      queryClient.invalidateQueries({ queryKey: ["match-events", matchId] }),
      queryClient.invalidateQueries({ queryKey: ["match-officials", matchId] }),
      queryClient.invalidateQueries({ queryKey: ["standings"] }),
      queryClient.invalidateQueries({ queryKey: ["top-scorers"] }),
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] }),
    ]);
  };
}

export function useRecordMatchEvent(matchId: UUID) {
  const invalidate = useMatchInvalidation(matchId);
  return useMutation({
    mutationFn: (input: NewMatchEventInput) => repository.recordMatchEvent(input),
    onSuccess: invalidate,
  });
}

export function useTransitionMatchStatus(matchId: UUID) {
  const invalidate = useMatchInvalidation(matchId);
  return useMutation({
    mutationFn: (input: { to: MatchStatus; operator_id: UUID }) =>
      repository.transitionMatchStatus({ match_id: matchId, ...input }),
    onSuccess: invalidate,
  });
}

export function useUpdateMatchClock(matchId: UUID) {
  const invalidate = useMatchInvalidation(matchId);
  return useMutation({
    mutationFn: (clock_seconds: number) =>
      repository.updateMatchClock({ match_id: matchId, clock_seconds }),
    onSuccess: invalidate,
  });
}

export function useUpdateMatchSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      match_id: UUID;
      kickoff_at?: string;
      venue_id?: UUID;
      court?: number;
    }) => repository.updateMatchSchedule(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["matches"] }),
  });
}

export function useAssignMatchOfficial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      match_id: UUID;
      role: MatchOfficialRole;
      user_id: UUID;
      operator_id: UUID;
    }) => repository.assignMatchOfficial(input),
    onSuccess: async (_data, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["match-officials", vars.match_id] }),
        queryClient.invalidateQueries({ queryKey: ["audit-logs"] }),
      ]);
    },
  });
}
