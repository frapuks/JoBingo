import { z } from 'zod';

export const PlayerInput = z.object({
  name: z
    .string({ error: 'Nom requis.' })
    .trim()
    .min(2, { error: 'Le nom doit contenir au moins 2 caractères.' })
    .max(40, { error: 'Le nom ne doit pas dépasser 40 caractères.' }),
  number: z
    .number({ error: 'Numéro requis.' })
    .int({ error: 'Le numéro doit être un nombre entier.' })
    .min(0, { error: 'Le numéro doit être compris entre 0 et 99.' })
    .max(99, { error: 'Le numéro doit être compris entre 0 et 99.' }),
});
export type PlayerInput = z.infer<typeof PlayerInput>;

export const Player = z.object({
  id: z.number().int(),
  name: z.string(),
  number: z.number().int(),
});
export type Player = z.infer<typeof Player>;

export const PlayerSummary = Player.extend({
  approvedPatterns: z.number().int(),
  pendingPatterns: z.number().int(),
});
export type PlayerSummary = z.infer<typeof PlayerSummary>;

// Un pattern en attente est visible de tous mais ne participe à aucun tirage.
export const Pattern = z.object({
  id: z.number().int(),
  text: z.string(),
  status: z.enum(['APPROVED', 'PENDING']),
});
export type Pattern = z.infer<typeof Pattern>;

export const PlayerDetail = Player.extend({ patterns: z.array(Pattern) });
export type PlayerDetail = z.infer<typeof PlayerDetail>;

export const PendingPattern = Pattern.extend({ player: Player });
export type PendingPattern = z.infer<typeof PendingPattern>;

export const PatternInput = z.object({
  text: z
    .string({ error: 'Texte requis.' })
    .trim()
    .min(3, { error: 'Le pattern doit contenir au moins 3 caractères.' })
    .max(120, { error: 'Le pattern ne doit pas dépasser 120 caractères.' }),
});
export type PatternInput = z.infer<typeof PatternInput>;

// L'admin peut corriger le texte au moment de valider.
export const PatternApproveInput = z.object({ text: PatternInput.shape.text.optional() });
export type PatternApproveInput = z.infer<typeof PatternApproveInput>;
