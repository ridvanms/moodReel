import { DIMS, GENRES } from '@moodreel/core';
import { z } from 'zod';

const score = z.number().min(0).max(10);
const movieId = z.string().regex(/^[a-z0-9-]{2,80}$/, 'Invalid film id');

const dimConstraint = z.object({
  target: score,
  tolerance: score.optional(),
  min: score.optional(),
  max: score.optional(),
  weight: z.number().min(0).max(5).optional(),
});

const dealbreakers = z.object({
  noSadEnding: z.boolean().optional(),
  happyOnly: z.boolean().optional(),
  noGore: z.boolean().optional(),
  noJumpscares: z.boolean().optional(),
  noAnimalDeath: z.boolean().optional(),
  familyFriendly: z.boolean().optional(),
  maxRuntime: z.number().int().min(30).max(400).optional(),
  minRuntime: z.number().int().min(30).max(400).optional(),
  minYear: z.number().int().min(1900).max(2100).optional(),
  maxYear: z.number().int().min(1900).max(2100).optional(),
  animation: z.enum(['only', 'exclude']).optional(),
});

export const moodQuerySchema = z.object({
  dims: z.partialRecord(z.enum(DIMS), dimConstraint).default({}),
  like: z.array(movieId).max(5).default([]),
  genres: z
    .object({
      include: z.array(z.enum(GENRES)).max(GENRES.length).default([]),
      exclude: z.array(z.enum(GENRES)).max(GENRES.length).default([]),
    })
    .default({ include: [], exclude: [] }),
  dealbreakers: dealbreakers.default({}),
  exclude: z.array(movieId).max(300).default([]),
  tags: z.array(z.string().max(40)).max(10).optional(),
  boostIds: z.array(movieId).max(30).optional(),
});

export const parseRequest = z.object({
  text: z.string().trim().min(1, 'Tell me what you feel like watching').max(400, 'Keep it under 400 characters'),
});

export const recommendRequest = z.object({
  query: moodQuerySchema,
  limit: z.number().int().min(1).max(40).default(12),
  seed: z.number().int().nonnegative().optional(),
});

export const pickRequest = z.object({
  query: moodQuerySchema,
  seed: z.number().int().nonnegative().optional(),
  temperature: z.number().min(1).max(40).optional(),
});

export const oracleRequest = z.object({
  history: z
    .array(z.object({ questionId: z.string().max(40), answer: z.enum(['yes', 'probably', 'unknown', 'probablyNot', 'no']) }))
    .max(20)
    .default([]),
  query: moodQuerySchema.optional(),
});

export const feedbackRequest = z.object({
  clientId: z.uuid(),
  movieId,
  verdict: z.enum(['watch', 'skip']),
  mood: z.partialRecord(z.enum(DIMS), score).optional(),
});
