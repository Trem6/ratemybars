package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/ratemybars/backend/internal/middleware"
	"github.com/ratemybars/backend/internal/model"
)

const maxRatingsPerDay = 20

// RatingService manages rating CRUD with spam prevention.
type RatingService struct {
	mu      sync.RWMutex
	ratings []model.Rating
	nextID  int

	// Track ratings per user per day for spam prevention
	userDailyCounts map[string]*dailyCount
}

type dailyCount struct {
	count int
	date  string // YYYY-MM-DD
}

func NewRatingService() *RatingService {
	return &RatingService{
		ratings:         []model.Rating{},
		nextID:          1,
		userDailyCounts: make(map[string]*dailyCount),
	}
}

// Create adds a new rating with spam prevention.
func (s *RatingService) Create(ctx context.Context, req model.CreateRatingRequest) (*model.Rating, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	// Validate score
	if req.Score < 1 || req.Score > 5 {
		return nil, fmt.Errorf("score must be between 1 and 5")
	}

	if req.VenueID == "" {
		return nil, fmt.Errorf("venue_id is required")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Check daily limit (spam prevention)
	today := time.Now().Format("2006-01-02")
	dc, exists := s.userDailyCounts[userID]
	if exists && dc.date == today && dc.count >= maxRatingsPerDay {
		return nil, fmt.Errorf("daily rating limit reached (%d per day)", maxRatingsPerDay)
	}

	// Check uniqueness constraint: one rating per user per venue
	for _, r := range s.ratings {
		if r.VenueID == req.VenueID && r.AuthorID == userID {
			return nil, fmt.Errorf("you have already rated this venue")
		}
	}

	rating := model.Rating{
		ID:         fmt.Sprintf("rating_%d", s.nextID),
		Score:      req.Score,
		Review:     middleware.SanitizeString(req.Review),
		VenueID:    req.VenueID,
		AuthorID:   userID,
		AuthorName: middleware.GetUsername(ctx),
		CreatedAt:  time.Now(),
	}
	s.nextID++
	s.ratings = append(s.ratings, rating)

	// Update daily count
	if !exists || dc.date != today {
		s.userDailyCounts[userID] = &dailyCount{count: 1, date: today}
	} else {
		dc.count++
	}

	return &rating, nil
}

// ListByVenue returns all ratings for a venue.
func (s *RatingService) ListByVenue(_ context.Context, venueID string) ([]model.Rating, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var results []model.Rating
	for _, r := range s.ratings {
		if r.VenueID == venueID {
			results = append(results, r)
		}
	}
	return results, nil
}
