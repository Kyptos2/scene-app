-- Ensure PostGIS is enabled (also created manually during local setup)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Festival: generated geography column derived from lat/lng, kept in sync automatically
ALTER TABLE "Festival" ADD COLUMN "geog" geography(Point, 4326) GENERATED ALWAYS AS (
  CASE WHEN "latitude" IS NOT NULL AND "longitude" IS NOT NULL
    THEN ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography
    ELSE NULL
  END
) STORED;
CREATE INDEX "Festival_geog_idx" ON "Festival" USING GIST ("geog");

-- ProductionRequest
ALTER TABLE "ProductionRequest" ADD COLUMN "geog" geography(Point, 4326) GENERATED ALWAYS AS (
  CASE WHEN "latitude" IS NOT NULL AND "longitude" IS NOT NULL
    THEN ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography
    ELSE NULL
  END
) STORED;
CREATE INDEX "ProductionRequest_geog_idx" ON "ProductionRequest" USING GIST ("geog");

-- Project
ALTER TABLE "Project" ADD COLUMN "geog" geography(Point, 4326) GENERATED ALWAYS AS (
  CASE WHEN "latitude" IS NOT NULL AND "longitude" IS NOT NULL
    THEN ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography
    ELSE NULL
  END
) STORED;
CREATE INDEX "Project_geog_idx" ON "Project" USING GIST ("geog");

-- User
ALTER TABLE "User" ADD COLUMN "geog" geography(Point, 4326) GENERATED ALWAYS AS (
  CASE WHEN "latitude" IS NOT NULL AND "longitude" IS NOT NULL
    THEN ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography
    ELSE NULL
  END
) STORED;
CREATE INDEX "User_geog_idx" ON "User" USING GIST ("geog");
