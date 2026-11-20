ALTER TABLE complaints ADD COLUMN predicted_category_id INTEGER REFERENCES categories(id);
ALTER TABLE complaints ADD COLUMN ml_confidence REAL;
ALTER TABLE complaints ADD COLUMN sentiment TEXT;
ALTER TABLE complaints ADD COLUMN sentiment_score REAL;
ALTER TABLE complaints ADD COLUMN recommended_priority TEXT;
ALTER TABLE complaints ADD COLUMN priority_score INTEGER;
ALTER TABLE complaints ADD COLUMN priority_reasons TEXT;

-- possible duplicates found by the ML service; only an administrator can confirm a link (nothing is merged automatically)
CREATE TABLE complaint_similarities(
  id INTEGER PRIMARY KEY, complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  similar_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE, score REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','linked','dismissed')),
  reviewed_by INTEGER REFERENCES users(id), reviewed_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  CHECK (complaint_id <> similar_id), UNIQUE(complaint_id, similar_id));
-- every manual category fix is stored: it is labelled data for retraining the classifier
CREATE TABLE ml_corrections(
  id INTEGER PRIMARY KEY, complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  predicted_category_id INTEGER REFERENCES categories(id), corrected_category_id INTEGER NOT NULL REFERENCES categories(id),
  corrected_by INTEGER REFERENCES users(id), created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX idx_similarities_complaint ON complaint_similarities(complaint_id);
CREATE INDEX idx_similarities_similar ON complaint_similarities(similar_id);
CREATE INDEX idx_corrections_complaint ON ml_corrections(complaint_id);
