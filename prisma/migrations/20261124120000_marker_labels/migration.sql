-- Labels cochés sur les icônes (catalogue intra-dynasty8)
ALTER TABLE "Marker" ADD COLUMN "labels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
