// backend/schemas.js — Schémas de validation Zod pour toutes les entrées API.
// Règle : aucun handler de route ne valide manuellement les champs —
// tout passe par ces schémas et le helper parseBody() du même fichier.

'use strict';

const { z } = require('zod');

// ---- Auth ----
const LoginSchema = z.object({
  email: z.string({ required_error: 'email requis' })
    .email('email invalide')
    .max(254, 'email trop long'),
  password: z.string({ required_error: 'password requis' })
    .min(1, 'mot de passe requis')
    .max(128, 'mot de passe trop long'),
});

// ---- Trackers ----
const TypeSignalEnum = z.enum(['GPS', 'Bluetooth']);
const StatutTrackerEnum = z.enum(['actif', 'inactif']);

const CreateTrackerSchema = z.object({
  nom: z.string({ required_error: 'nom requis' })
    .min(1).max(100),
  typeSignal: TypeSignalEnum,
  lat: z.number({ required_error: 'lat requise' })
    .min(-90).max(90),
  lon: z.number({ required_error: 'lon requise' })
    .min(-180).max(180),
});

const UpdateTrackerSchema = z.object({
  nom: z.string().min(1).max(100).optional(),
  typeSignal: TypeSignalEnum.optional(),
  statut: StatutTrackerEnum.optional(),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
});

// ---- Contacts ----
const StatutContactEnum = z.enum(['actif', 'en attente', 'révoqué']);

const CreateContactSchema = z.object({
  nom: z.string({ required_error: 'nom requis' })
    .min(1).max(100),
  telephone: z.string({ required_error: 'telephone requis' })
    .min(8).max(30)
    .regex(/^\+?[\d\s\-().]+$/, 'numéro de téléphone invalide'),
});

const UpdateContactSchema = z.object({
  nom: z.string().min(1).max(100).optional(),
  telephone: z.string().min(8).max(30)
    .regex(/^\+?[\d\s\-().]+$/, 'numéro de téléphone invalide').optional(),
  statut: StatutContactEnum.optional(),
});

// ---- Alertes ----
const TypeAlerteEnum = z.enum(['SOS', 'Chute', 'Sortie de zone']);
const ModeAlerteEnum = z.enum(['Manuel', 'Automatique']);

const CreateAlerteSchema = z.object({
  type: TypeAlerteEnum,
  mode: ModeAlerteEnum.optional().default('Manuel'),
  trackerId: z.number().int().positive().nullable().optional().default(null),
});

// ---- Positions ----
const CreatePositionSchema = z.object({
  trackerId: z.number({ required_error: 'trackerId requis' }).int().positive(),
  lat: z.number({ required_error: 'lat requise' }).min(-90).max(90),
  lon: z.number({ required_error: 'lon requise' }).min(-180).max(180),
  precisionM: z.number().min(0).max(10000).optional().default(5),
});

// ---- Helper ----
// Retourne { data } ou répond 400 { error, details }
function parseBody(schema, body, res) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const details = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    res.status(400).json({ error: 'Données invalides', details });
    return null;
  }
  return result.data;
}

module.exports = {
  LoginSchema,
  CreateTrackerSchema,
  UpdateTrackerSchema,
  CreateContactSchema,
  UpdateContactSchema,
  CreateAlerteSchema,
  CreatePositionSchema,
  parseBody,
};
