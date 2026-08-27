import { useMutation, useQueryClient } from "@tanstack/react-query";
import { repository } from "@/data";
import type { NewMatchEventInput } from "@/domain/match-operations";
import type { MatchOfficialRole, MatchStatus, UUID } from "@/domain/types";
import { useSession } from "@/hooks/use-session";
import type { DocumentType, RegistrationEntityType } from "@/domain/registration";

type MatchEventCommandInput = Omit<NewMatchEventInput, "command_id"> & { command_id?: UUID };

function newCommandId(prefix: string): UUID {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

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
    mutationFn: (input: MatchEventCommandInput) =>
      repository.recordMatchEvent({
        ...input,
        command_id: input.command_id ?? newCommandId("event"),
      }),
    onSuccess: invalidate,
  });
}

export function useTransitionMatchStatus(matchId: UUID) {
  const invalidate = useMatchInvalidation(matchId);
  return useMutation({
    mutationFn: (input: { to: MatchStatus; operator_id: UUID }) =>
      repository.transitionMatchStatus({
        match_id: matchId,
        ...input,
        command_id: newCommandId("status"),
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateMatchClock(matchId: UUID) {
  const invalidate = useMatchInvalidation(matchId);
  const { user } = useSession();
  return useMutation({
    mutationFn: (clock_seconds: number) =>
      repository.updateMatchClock({
        match_id: matchId,
        clock_seconds,
        ...(user ? { operator_id: user.id } : {}),
        command_id: newCommandId("clock"),
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateMatchSchedule() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  return useMutation({
    mutationFn: (input: { match_id: UUID; kickoff_at?: string; venue_id?: UUID; court?: number }) =>
      repository.updateMatchSchedule({
        ...input,
        ...(user ? { operator_id: user.id } : {}),
        command_id: newCommandId("schedule"),
      }),
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
      operator_id?: UUID;
    }) => repository.assignMatchOfficial({ ...input, command_id: newCommandId("official") }),
    onSuccess: async (_data, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["match-officials", vars.match_id] }),
        queryClient.invalidateQueries({ queryKey: ["audit-logs"] }),
      ]);
    },
  });
}

function useRegistrationInvalidation(teamId?: UUID) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["teams"] }),
      queryClient.invalidateQueries({ queryKey: ["players"] }),
      queryClient.invalidateQueries({ queryKey: ["team-officials"] }),
      queryClient.invalidateQueries({ queryKey: ["team-registration", teamId] }),
      queryClient.invalidateQueries({ queryKey: ["team-profile", teamId] }),
      queryClient.invalidateQueries({ queryKey: ["team-accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["registration-documents"] }),
      queryClient.invalidateQueries({ queryKey: ["verification-history"] }),
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] }),
    ]);
}

export function useCreateTeamAccount() {
  const invalidate = useRegistrationInvalidation();
  return useMutation({
    mutationFn: (input: { team_id: UUID; username: string; password: string }) =>
      repository.createTeamAccount(input),
    onSuccess: invalidate,
  });
}
export function useCreateTeam() {
  const invalidate = useRegistrationInvalidation();
  return useMutation({
    mutationFn: (input: Parameters<typeof repository.createTeam>[0]) =>
      repository.createTeam(input),
    onSuccess: invalidate,
  });
}
export function useUpdateTeamProfile(teamId: UUID) {
  const invalidate = useRegistrationInvalidation(teamId);
  return useMutation({
    mutationFn: (profile: Parameters<typeof repository.updateTeamProfile>[0]["profile"]) =>
      repository.updateTeamProfile({ team_id: teamId, profile }),
    onSuccess: invalidate,
  });
}
export function useCreatePlayer() {
  const invalidate = useRegistrationInvalidation();
  return useMutation({
    mutationFn: (input: Parameters<typeof repository.createPlayer>[0]) =>
      repository.createPlayer(input),
    onSuccess: invalidate,
  });
}
export function useUpdatePlayer() {
  const invalidate = useRegistrationInvalidation();
  return useMutation({
    mutationFn: (input: Parameters<typeof repository.updatePlayer>[0]) =>
      repository.updatePlayer(input),
    onSuccess: invalidate,
  });
}
export function useCreateTeamOfficial() {
  const invalidate = useRegistrationInvalidation();
  return useMutation({
    mutationFn: (input: Parameters<typeof repository.createTeamOfficial>[0]) =>
      repository.createTeamOfficial(input),
    onSuccess: invalidate,
  });
}
export function useUpdateTeamOfficial() {
  const invalidate = useRegistrationInvalidation();
  return useMutation({
    mutationFn: (input: Parameters<typeof repository.updateTeamOfficial>[0]) =>
      repository.updateTeamOfficial(input),
    onSuccess: invalidate,
  });
}
export function useUploadDocument() {
  const invalidate = useRegistrationInvalidation();
  return useMutation({
    mutationFn: (input: {
      entityType: RegistrationEntityType;
      entityId: UUID;
      type: DocumentType;
      file_name: string;
    }) => repository.uploadRegistrationDocument(input),
    onSuccess: invalidate,
  });
}
export function useSubmitRegistration() {
  const invalidate = useRegistrationInvalidation();
  return useMutation({
    mutationFn: (input: { entityType: RegistrationEntityType; entityId: UUID }) =>
      repository.submitRegistration(input),
    onSuccess: invalidate,
  });
}
export function useReviewRegistration() {
  const invalidate = useRegistrationInvalidation();
  return useMutation({
    mutationFn: (input: {
      entityType: RegistrationEntityType;
      entityId: UUID;
      action: "APPROVED" | "REVISION_REQUESTED" | "REJECTED";
      reason?: string;
    }) => repository.reviewRegistration(input),
    onSuccess: invalidate,
  });
}

export function useTeamLogin() {
  return useMutation({
    mutationFn: (input: { username: string; password: string }) =>
      repository.authenticateTeam(input.username, input.password),
  });
}
