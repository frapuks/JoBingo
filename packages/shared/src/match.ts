import { z } from 'zod';

export const MatchStatus = z.enum(['PENDING', 'FIRST_HALF', 'HALF_TIME', 'SECOND_HALF', 'FINISHED']);
export type MatchStatus = z.infer<typeof MatchStatus>;

export const MatchInput = z.object({
  name: z
    .string({ error: 'Nom requis.' })
    .trim()
    .min(3, { error: 'Le nom doit contenir au moins 3 caractères.' })
    .max(60, { error: 'Le nom ne doit pas dépasser 60 caractères.' }),
  playerIds: z
    .array(z.number().int())
    .min(1, { error: 'Sélectionnez au moins un joueur.' })
    .max(30, { error: 'Trop de joueurs sélectionnés.' }),
});
export type MatchInput = z.infer<typeof MatchInput>;

export const MatchSummary = z.object({
  id: z.number().int(),
  name: z.string(),
  status: MatchStatus,
  // Nom du créateur, ou son adresse e-mail s'il n'en a pas choisi.
  creatorName: z.string().nullable(),
  participants: z.number().int(),
  joined: z.boolean(),
  isCreator: z.boolean(),
});
export type MatchSummary = z.infer<typeof MatchSummary>;

// Une carte de la grille. Le pattern reste vide tant que le tirage n'a pas eu lieu.
export const MatchCard = z.object({
  id: z.number().int(),
  number: z.number().int(),
  name: z.string(),
  pattern: z.string().nullable(),
  checked: z.boolean(),
});
export type MatchCard = z.infer<typeof MatchCard>;

export const RankingRow = z.object({
  rank: z.number().int(),
  userId: z.number().int(),
  name: z.string(),
  score: z.number().int(),
  isMe: z.boolean(),
});
export type RankingRow = z.infer<typeof RankingRow>;

export const MatchDetail = MatchSummary.extend({
  // Dans l'ordre d'arrivée : on voit qui a déjà rejoint avant le coup d'envoi.
  participantNames: z.array(z.string()),
  // Joueurs convoqués, pour réafficher la sélection lors d'une modification.
  playerIds: z.array(z.number().int()),
  cards: z.array(MatchCard),
  // Renseigné seulement à la mi-temps et à la fin : pendant le jeu, personne ne voit les scores.
  ranking: z.array(RankingRow).nullable(),
});
export type MatchDetail = z.infer<typeof MatchDetail>;
