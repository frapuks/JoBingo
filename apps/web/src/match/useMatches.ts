import { MatchCard, MatchDetail, MatchInput, MatchSummary } from '@jobingo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { del, getJson, patchJson, post, postJson, validate } from '../api';

const MATCHES = ['matches'] as const;

// Le match avance sans qu'on touche à l'écran : changement d'état, arrivée d'un participant.
const REFRESH_MS = 4000;

export function useMatches() {
  return useQuery({
    queryKey: MATCHES,
    queryFn: () => getJson('/matches', z.array(MatchSummary)),
    refetchInterval: REFRESH_MS,
  });
}

export function useMatch(id: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...MATCHES, id],
    queryFn: () => getJson(`/matches/${id}`, MatchDetail),
    refetchInterval: REFRESH_MS,
    enabled: options?.enabled ?? true,
  });
}

// Grille d'un autre participant, consultée depuis le classement. Figée : à la mi-temps
// comme après la fin, personne ne coche plus rien.
export function useParticipantGrid(matchId: number, userId: number | null) {
  return useQuery({
    queryKey: [...MATCHES, matchId, 'grids', userId],
    queryFn: () => getJson(`/matches/${matchId}/grids/${userId}`, z.array(MatchCard)),
    enabled: userId !== null,
  });
}

function useMatchMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    // Une lecture déjà en vol renverrait l'état d'avant l'action : sa réponse, plus
    // ancienne, écraserait la nouvelle et l'écran reviendrait en arrière.
    onMutate: () => queryClient.cancelQueries({ queryKey: MATCHES }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MATCHES }),
  });
}

export const useCreateMatch = () =>
  useMatchMutation((input: MatchInput) => postJson('/matches', validate(MatchInput, input), MatchSummary));

export const useUpdateMatch = (id: number) =>
  useMatchMutation((input: MatchInput) => patchJson(`/matches/${id}`, validate(MatchInput, input), MatchSummary));

export const useDeleteMatch = () => useMatchMutation((id: number) => del(`/matches/${id}`));

export const useJoinMatch = (id: number) => useMatchMutation(() => post(`/matches/${id}/join`));

export const useLeaveMatch = (id: number) => useMatchMutation(() => del(`/matches/${id}/participation`));

export const useAdvanceMatch = (id: number) =>
  useMatchMutation((step: 'start' | 'half-time' | 'second-half' | 'finish') =>
    post(`/matches/${id}/${step}`),
  );

export const useToggleCard = (id: number) =>
  useMatchMutation((card: { id: number; checked: boolean }) =>
    card.checked ? del(`/matches/${id}/cards/${card.id}`) : post(`/matches/${id}/cards/${card.id}`),
  );
