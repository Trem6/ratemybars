package service

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ratemybars/backend/internal/middleware"
	"github.com/ratemybars/backend/internal/model"
)

// fratKey uniquely identifies a chapter at a school.
type fratKey struct {
	SchoolID string
	FratName string
}

// FratRatingService manages fraternity chapter ratings with spam prevention.
type FratRatingService struct {
	mu      sync.RWMutex
	pool    *pgxpool.Pool
	ratings []model.FratRating
	nextID  int

	userDailyCounts map[string]*dailyCount
}

func NewFratRatingService(pool *pgxpool.Pool) *FratRatingService {
	svc := &FratRatingService{
		pool:            pool,
		ratings:         []model.FratRating{},
		nextID:          1,
		userDailyCounts: make(map[string]*dailyCount),
	}
	if pool != nil {
		svc.loadFromDB()
	}
	return svc
}

func (s *FratRatingService) loadFromDB() {
	rows, err := s.pool.Query(context.Background(),
		`SELECT id, frat_name, school_id, score, author_id, COALESCE(author_name,''), created_at FROM frat_ratings ORDER BY created_at`)
	if err != nil {
		log.Printf("WARNING: Failed to load frat ratings from DB: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var r model.FratRating
		if err := rows.Scan(&r.ID, &r.FratName, &r.SchoolID, &r.Score, &r.AuthorID, &r.AuthorName, &r.CreatedAt); err != nil {
			log.Printf("WARNING: Failed to scan frat rating row: %v", err)
			continue
		}
		s.ratings = append(s.ratings, r)
		s.nextID++
	}
	log.Printf("Loaded %d frat ratings from DB", len(s.ratings))
}

// Create adds a new frat rating. One rating per user per (frat, school) pair.
func (s *FratRatingService) Create(ctx context.Context, req model.CreateFratRatingRequest) (*model.FratRating, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	if req.Score < 1 || req.Score > 5 {
		return nil, fmt.Errorf("score must be between 1 and 5")
	}
	if req.FratName == "" {
		return nil, fmt.Errorf("frat_name is required")
	}
	if req.SchoolID == "" {
		return nil, fmt.Errorf("school_id is required")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	today := time.Now().Format("2006-01-02")
	dc, exists := s.userDailyCounts[userID]
	if exists && dc.date == today && dc.count >= maxRatingsPerDay {
		return nil, fmt.Errorf("daily rating limit reached (%d per day)", maxRatingsPerDay)
	}

	for _, r := range s.ratings {
		if r.FratName == req.FratName && r.SchoolID == req.SchoolID && r.AuthorID == userID {
			return nil, fmt.Errorf("you have already rated this fraternity at this school")
		}
	}

	rating := model.FratRating{
		ID:         fmt.Sprintf("fratrating_%d", s.nextID),
		FratName:   req.FratName,
		SchoolID:   req.SchoolID,
		Score:      req.Score,
		AuthorID:   userID,
		AuthorName: middleware.GetUsername(ctx),
		CreatedAt:  time.Now(),
	}
	s.nextID++
	s.ratings = append(s.ratings, rating)

	if !exists || dc.date != today {
		s.userDailyCounts[userID] = &dailyCount{count: 1, date: today}
	} else {
		dc.count++
	}

	if s.pool != nil {
		_, err := s.pool.Exec(context.Background(),
			`INSERT INTO frat_ratings (id, frat_name, school_id, score, author_id, author_name, created_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)
			 ON CONFLICT (frat_name, school_id, author_id) DO NOTHING`,
			rating.ID, rating.FratName, rating.SchoolID, rating.Score, rating.AuthorID, rating.AuthorName, rating.CreatedAt)
		if err != nil {
			log.Printf("WARNING: Failed to persist frat rating: %v", err)
		}
	}

	return &rating, nil
}

// GetStats returns average rating and count for a single frat at a school.
func (s *FratRatingService) GetStats(schoolID, fratName string) (avgRating float64, count int) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var total float64
	for _, r := range s.ratings {
		if r.SchoolID == schoolID && r.FratName == fratName {
			total += float64(r.Score)
			count++
		}
	}
	if count > 0 {
		avgRating = total / float64(count)
	}
	return
}

// GetSchoolStats returns rating stats for all frats at a school.
func (s *FratRatingService) GetSchoolStats(schoolID string) map[string]model.FratWithRating {
	s.mu.RLock()
	defer s.mu.RUnlock()

	type acc struct {
		total float64
		count int
	}
	m := make(map[string]*acc)
	for _, r := range s.ratings {
		if r.SchoolID != schoolID {
			continue
		}
		a, ok := m[r.FratName]
		if !ok {
			a = &acc{}
			m[r.FratName] = a
		}
		a.total += float64(r.Score)
		a.count++
	}

	result := make(map[string]model.FratWithRating, len(m))
	for name, a := range m {
		result[name] = model.FratWithRating{
			Name:        name,
			AvgRating:   a.total / float64(a.count),
			RatingCount: a.count,
		}
	}
	return result
}

// GetRecent returns the N most recent frat ratings.
func (s *FratRatingService) GetRecent(limit int) []model.FratRating {
	s.mu.RLock()
	defer s.mu.RUnlock()

	n := len(s.ratings)
	if limit <= 0 || limit > n {
		limit = n
	}
	result := make([]model.FratRating, limit)
	for i := 0; i < limit; i++ {
		result[i] = s.ratings[n-1-i]
	}
	return result
}

// Count returns the total number of frat ratings.
func (s *FratRatingService) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.ratings)
}
