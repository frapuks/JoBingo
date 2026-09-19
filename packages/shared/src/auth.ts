import { z } from 'zod';

// Normalisée avant validation : « Jean@Mail.fr » et « jean@mail.fr » sont le même compte.
const Email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Adresse e-mail invalide.' }));

const NewPassword = z
  .string()
  .min(10, { error: 'Le mot de passe doit contenir au moins 10 caractères.' })
  .max(200, { error: 'Le mot de passe est trop long.' });

export const User = z.object({
  id: z.number().int(),
  email: z.string(),
  displayName: z.string(),
});
export type User = z.infer<typeof User>;

export const LoginInput = z.object({
  email: Email,
  password: z.string().min(1, { error: 'Mot de passe requis.' }).max(200),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const RegisterInput = z.object({
  email: Email,
  displayName: z
    .string()
    .trim()
    .min(2, { error: 'Le nom doit contenir au moins 2 caractères.' })
    .max(40, { error: 'Le nom ne doit pas dépasser 40 caractères.' }),
  password: NewPassword,
});
export type RegisterInput = z.infer<typeof RegisterInput>;

export const ForgotPasswordInput = z.object({ email: Email });
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInput>;

export const ResetPasswordInput = z.object({
  token: z.string().min(20, { error: 'Lien invalide.' }).max(200, { error: 'Lien invalide.' }),
  password: NewPassword,
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordInput>;
