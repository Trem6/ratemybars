package service

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

// RunMigrations creates all persistent tables if they don't exist.
func RunMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	tables := []string{
		`CREATE TABLE IF NOT EXISTS fraternity_links (
			school_id TEXT NOT NULL,
			frat_name TEXT NOT NULL,
			PRIMARY KEY (school_id, frat_name)
		)`,
		`CREATE TABLE IF NOT EXISTS frat_ratings (
			id          TEXT PRIMARY KEY,
			frat_name   TEXT NOT NULL,
			school_id   TEXT NOT NULL,
			score       REAL NOT NULL,
			author_id   TEXT NOT NULL,
			author_name TEXT,
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE (frat_name, school_id, author_id)
		)`,
		`CREATE TABLE IF NOT EXISTS venues (
			id          TEXT PRIMARY KEY,
			name        TEXT NOT NULL,
			category    TEXT NOT NULL,
			description TEXT,
			address     TEXT,
			latitude    REAL,
			longitude   REAL,
			school_id   TEXT NOT NULL,
			created_by  TEXT,
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			verified    BOOLEAN NOT NULL DEFAULT FALSE
		)`,
		`CREATE TABLE IF NOT EXISTS ratings (
			id          TEXT PRIMARY KEY,
			score       REAL NOT NULL,
			review      TEXT,
			venue_id    TEXT NOT NULL,
			author_id   TEXT NOT NULL,
			author_name TEXT,
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			upvotes     INT NOT NULL DEFAULT 0,
			downvotes   INT NOT NULL DEFAULT 0,
			UNIQUE (venue_id, author_id)
		)`,
		`CREATE TABLE IF NOT EXISTS review_votes (
			rating_id TEXT NOT NULL,
			user_id   TEXT NOT NULL,
			direction TEXT NOT NULL,
			PRIMARY KEY (rating_id, user_id)
		)`,
	}

	for _, ddl := range tables {
		if _, err := pool.Exec(ctx, ddl); err != nil {
			return err
		}
	}

	// Add columns that may not exist on older schemas
	alters := []string{
		`ALTER TABLE ratings ADD COLUMN IF NOT EXISTS upvotes INT NOT NULL DEFAULT 0`,
		`ALTER TABLE ratings ADD COLUMN IF NOT EXISTS downvotes INT NOT NULL DEFAULT 0`,
	}
	for _, alt := range alters {
		if _, err := pool.Exec(ctx, alt); err != nil {
			log.Printf("ALTER warning (non-fatal): %v", err)
		}
	}

	return nil
}
