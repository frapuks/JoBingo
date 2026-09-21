import { z } from 'zod';

// Normalisée avant validation : « Jean@Mail.fr » et « jean@mail.fr » sont le même compte.
const Email = z
  .string({ error: 'Adresse e-mail requise.' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Adresse e-mail invalide.' }));

const NewPassword = z
  .string({ error: 'Mot de passe requis.' })
  .min(10, { error: 'Le mot de passe doit contenir au moins 10 caractères.' })
  .max(200, { error: 'Le mot de passe est trop long.' });

export const User = z.object({
  id: z.number().int(),
  email: z.string(),
});
export type User = z.infer<typeof User>;

export const LoginInput = z.object({
  email: Email,
  password: z
    .string({ error: 'Mot de passe requis.' })
    .min(1, { error: 'Mot de passe requis.' })
    .max(200),
});
export type LoginInput = z.infer<typeof LoginInput>;

// La confirmation est vérifiée ici, donc aussi par l'API : un client qui l'oublie est refusé.
const PasswordConfirmation = z.string({ error: 'Confirmez le mot de passe.' });
const passwordsMatch = (input: { password: string; passwordConfirmation: string }) =>
  input.password === input.passwordConfirmation;
const MISMATCH = { error: 'Les mots de passe ne correspondent pas.', path: ['passwordConfirmation'] };

export const RegisterInput = z
  .object({ email: Email, password: NewPassword, passwordConfirmation: PasswordConfirmation })
  .refine(passwordsMatch, MISMATCH);
export type RegisterInput = z.infer<typeof RegisterInput>;

export const ChangePasswordInput = z
  .object({
    currentPassword: z
      .string({ error: 'Mot de passe actuel requis.' })
      .min(1, { error: 'Mot de passe actuel requis.' }),
    password: NewPassword,
    passwordConfirmation: PasswordConfirmation,
  })
  .refine(passwordsMatch, MISMATCH);
export type ChangePasswordInput = z.infer<typeof ChangePasswordInput>;

export const ForgotPasswordInput = z.object({ email: Email });
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInput>;

export const ResetPasswordInput = z.object({
  token: z.string().min(20, { error: 'Lien invalide.' }).max(200, { error: 'Lien invalide.' }),
  password: NewPassword,
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordInput>;
