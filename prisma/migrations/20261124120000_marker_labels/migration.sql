-- Labels cochés sur les icônes
ALTER TABLE "Marker" ADD COLUMN "labels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
