import {
  PatternInput,
  PendingPattern,
  Player,
  PlayerDetail,
  PlayerInput,
  PlayerSummary,
} from '@jobingo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { del, getJson, patch, post, postJson, validate } from '../api';
import { useCurrentUser } from '../auth/useAuth';

const PLAYERS = ['players'] as const;
const PENDING = ['patterns', 'pending'] as const;

export function usePlayers() {
  return useQuery({ queryKey: PLAYERS, queryFn: () => getJson('/players', z.array(PlayerSummary)) });
}

export function usePlayer(id: number) {
  return useQuery({ queryKey: [...PLAYERS, id], queryFn: () => getJson(`/players/${id}`, PlayerDetail) });
}

export function usePendingPatterns() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: PENDING,
    queryFn: () => getJson('/patterns/pending', z.array(PendingPattern)),
    enabled: Boolean(user?.isAdmin),
  });
}

// Joueurs et patterns s'affichent ensemble : après toute modification, tout est rechargé.
function useTeamMutation<TInput>(mutationFn: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLAYERS });
      queryClient.invalidateQueries({ queryKey: PENDING });
    },
  });
}

export const useCreatePlayer = () =>
  useTeamMutation((input: PlayerInput) => postJson('/players', validate(PlayerInput, input), Player));

export const useUpdatePlayer = (id: number) =>
  useTeamMutation((input: PlayerInput) =>
    patch(`/players/${id}`, validate(PlayerInput, input)),
  );

export const useDeletePlayer = () => useTeamMutation((id: number) => del(`/players/${id}`));

export const useProposePattern = (playerId: number) =>
  useTeamMutation((input: PatternInput) =>
    post(`/players/${playerId}/patterns`, validate(PatternInput, input)),
  );

export const useApprovePattern = () =>
  useTeamMutation((pattern: { id: number; text?: string }) =>
    post(`/patterns/${pattern.id}/approve`, pattern.text ? { text: pattern.text } : {}),
  );

export const useUpdatePattern = () =>
  useTeamMutation((pattern: { id: number; text: string }) =>
    patch(`/patterns/${pattern.id}`, validate(PatternInput, { text: pattern.text })),
  );

export const useDeletePattern = () => useTeamMutation((id: number) => del(`/patterns/${id}`));
