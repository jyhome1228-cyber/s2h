CREATE TABLE IF NOT EXISTS inquiries (
 id TEXT PRIMARY KEY,
 kind TEXT NOT NULL CHECK (kind IN ('contact','seller','brand','product_request')),
 fields TEXT NOT NULL,
 created_at TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT '접수'
);
CREATE INDEX IF NOT EXISTS inquiries_kind_created ON inquiries(kind, created_at DESC);
