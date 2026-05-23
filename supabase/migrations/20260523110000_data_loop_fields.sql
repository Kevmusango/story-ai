-- ============================================================
-- DATA LOOP: Add fields required for feedback intelligence
-- ============================================================

-- projects: auto-assigned industry macro-bucket from Google Vision
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS industry_bucket TEXT;

-- uploads: raw Google Vision API response saved per file
ALTER TABLE uploads
  ADD COLUMN IF NOT EXISTS vision_labels JSONB;

-- generations: track whether the user actually downloaded (not just selected) an angle
ALTER TABLE generations
  ADD COLUMN IF NOT EXISTS angle_downloaded BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- INDEXES: Power the data loop query
-- "For industry X + persona Y + content_goal Z, which angle wins?"
-- ============================================================

-- Primary loop query index
CREATE INDEX IF NOT EXISTS idx_projects_industry_persona
  ON projects (industry_bucket, persona, content_goal)
  WHERE industry_bucket IS NOT NULL;

-- Secondary index for angle performance analysis
CREATE INDEX IF NOT EXISTS idx_generations_angle_perf
  ON generations (selected_angle_id, angle_downloaded)
  WHERE selected_angle_id IS NOT NULL;

-- Index for per-project generation lookup
CREATE INDEX IF NOT EXISTS idx_generations_project
  ON generations (project_id);

-- Index for per-project upload lookup
CREATE INDEX IF NOT EXISTS idx_uploads_project
  ON uploads (project_id, sort_order);
