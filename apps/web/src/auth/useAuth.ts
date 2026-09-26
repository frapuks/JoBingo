import {
  ChangePasswordInput,
  DisplayNameInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  User,
} from '@jobingo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';
import { ApiError, getJson, patchJson, post, postJson, validate } from '../api';

const ME = ['me'] as const;

async function fetchMe(): Promise<User | null> {
  try {
    return await getJson('/auth/me', User);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export function useCurrentUser() {
  return useQuery({ queryKey: ME, queryFn: fetchMe, staleTime: 5 * 60_000 });
}

// Toute mutation qui ouvre une session renvoie l'utilisateur : on le place directement en cache.
function useSessionMutation<S extends z.ZodType>(path: string, schema: S) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: z.input<S>) => postJson(path, validate(schema, input), User),
    onSuccess: (user) => queryClient.setQueryData(ME, user),
  });
}

export const useLogin = () => useSessionMutation('/auth/login', LoginInput);
export const useRegister = () => useSessionMutation('/auth/register', RegisterInput);
export const useResetPassword = () => useSessionMutation('/auth/reset-password', ResetPasswordInput);
export const useChangePassword = () => useSessionMutation('/auth/change-password', ChangePasswordInput);

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) =>
      post('/auth/forgot-password', validate(ForgotPasswordInput, input)),
  });
}

export function useUpdateDisplayName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DisplayNameInput) => patchJson('/auth/me', validate(DisplayNameInput, input), User),
    onSuccess: (user) => queryClient.setQueryData(ME, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => post('/auth/logout'),
    onSuccess: () => {
      // Plus aucune donnée de l'ancien compte ne doit rester en mémoire.
      queryClient.clear();
      queryClient.setQueryData(ME, null);
    },
  });
}
