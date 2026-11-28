import { z } from "zod";
import { LABEL_GROUPS, type LabelGroup } from "./labels";
import { MARKER_TYPES } from "./types";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur hex invalide");
const point = z.tuple([z.number().finite(), z.number().finite()]);

// Schémas de base SANS valeurs par défaut : les PATCH ne doivent jamais écraser les champs absents.
const zoneBase = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(5000),
  category: z.string().trim().max(60),
  color: hex,
  fillOpacity: z.number().min(0).max(1),
  strokeWidth: z.number().min(0).max(20),
  dashed: z.boolean(),
  points: z.array(point).min(3, "Une zone a besoin d'au moins 3 points"),
});

export const zoneCreateSchema = zoneBase.extend({
  description: zoneBase.shape.description.default(""),
  category: zoneBase.shape.category.default(""),
  color: hex.default("#22c55e"),
  fillOpacity: zoneBase.shape.fillOpacity.default(0.35),
  strokeWidth: zoneBase.shape.strokeWidth.default(3),
  dashed: zoneBase.shape.dashed.default(false),
});
export const zoneUpdateSchema = zoneBase.partial();

const markerBase = z.object({
  name: z.string().trim().max(120),
  description: z.string().max(5000),
  type: z.enum(MARKER_TYPES),
  linkedGarage: z.boolean(),
  labels: z.array(z.string().trim().min(1).max(120)).max(300),
  x: z.number().finite(),
  y: z.number().finite(),
});

export const markerCreateSchema = markerBase.extend({
  name: markerBase.shape.name.default(""),
  description: markerBase.shape.description.default(""),
  type: markerBase.shape.type.default("house"),
  linkedGarage: markerBase.shape.linkedGarage.default(false),
  labels: markerBase.shape.labels.default([]),
});
export const markerUpdateSchema = markerBase.partial();

const labelName = z.string().trim().min(1, "Nom requis").max(120);
export const labelCreateSchema = z.object({
  group: z.enum(LABEL_GROUPS.map((g) => g.key) as [LabelGroup, ...LabelGroup[]]),
  name: labelName,
});
export const labelUpdateSchema = z.object({ name: labelName });
