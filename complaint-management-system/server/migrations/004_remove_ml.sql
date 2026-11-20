DROP TABLE IF EXISTS complaint_similarities;
DROP TABLE IF EXISTS ml_corrections;

ALTER TABLE complaints DROP COLUMN predicted_category_id;
ALTER TABLE complaints DROP COLUMN ml_confidence;
ALTER TABLE complaints DROP COLUMN sentiment;
ALTER TABLE complaints DROP COLUMN sentiment_score;
ALTER TABLE complaints DROP COLUMN recommended_priority;
ALTER TABLE complaints DROP COLUMN priority_score;
ALTER TABLE complaints DROP COLUMN priority_reasons;
