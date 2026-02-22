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

// Count returns the total number of ratings.
func (s *RatingService) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.ratings)
}

// LoadSeedData populates ratings for all existing venues.
func (s *RatingService) LoadSeedData(venues []struct{ ID string }) {
	s.mu.Lock()
	defer s.mu.Unlock()

	reviews := []struct {
		Score  float32
		Review string
		Author string
	}{
		{5, "Best bar near campus, always a great time!", "PartyGator22"},
		{4, "Good drinks, gets really packed on weekends", "NightOwl99"},
		{5, "Legendary spot, every student needs to go here", "CollegeLyfe"},
		{4, "Fun atmosphere, music could be better", "BarHopper23"},
		{3, "Decent but overpriced drinks", "BudgetDrinker"},
		{5, "This place is an absolute institution", "SeniorYear26"},
		{4, "Great vibes on Thursday nights", "ThirstyThursday"},
		{5, "10/10 would recommend to any freshman", "CampusGuide"},
		{3, "Long lines on weekends but worth the wait", "PatientParty"},
		{4, "Love the outdoor area, perfect for warm nights", "PatioLover"},
		{5, "The bartenders are amazing and drinks are strong", "MixologyFan"},
		{4, "My go-to spot every weekend", "Weekender101"},
		{3, "Good for pregaming, not great for staying late", "PreGameKing"},
		{5, "Unforgettable memories made here", "Nostalgic26"},
		{4, "Solid sports bar, great for game day", "TailgateKing"},
		{4, "Always a good crowd and good energy", "VibeChecker"},
		{5, "Nothing beats this place on a Friday night", "FridayFanatic"},
		{3, "It's okay, the hype is a bit much", "RealTalk420"},
		{4, "Cheap drinks and a fun dance floor", "DanceFloorDiva"},
		{5, "A must-visit if you're in town", "TouristTips"},
	}

	reviewIdx := 0
	for _, venue := range venues {
		// Each venue gets 2-4 ratings
		numRatings := 2 + (s.nextID % 3) // varies between 2, 3, 4
		for i := 0; i < numRatings; i++ {
			r := reviews[reviewIdx%len(reviews)]
			rating := model.Rating{
				ID:         fmt.Sprintf("rating_%d", s.nextID),
				Score:      r.Score,
				Review:     r.Review,
				VenueID:    venue.ID,
				AuthorID:   fmt.Sprintf("user_%s", r.Author),
				AuthorName: r.Author,
				CreatedAt:  time.Now().Add(-time.Duration(s.nextID) * 12 * time.Hour),
			}
			s.nextID++
			s.ratings = append(s.ratings, rating)
			reviewIdx++
		}
	}
}

// ListByVenues returns all ratings for a set of venue IDs.
func (s *RatingService) ListByVenues(venueIDs []string) []model.Rating {
	s.mu.RLock()
	defer s.mu.RUnlock()

	idSet := make(map[string]bool, len(venueIDs))
	for _, id := range venueIDs {
		idSet[id] = true
	}

	var results []model.Rating
	for _, r := range s.ratings {
		if idSet[r.VenueID] {
			results = append(results, r)
		}
	}
	return results
}

// GetTopContributors returns users with the most ratings.
func (s *RatingService) GetTopContributors(limit int) []map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()

	type userInfo struct {
		id    string
		name  string
		count int
	}

	byUser := make(map[string]*userInfo)
	for _, r := range s.ratings {
		u, ok := byUser[r.AuthorID]
		if !ok {
			u = &userInfo{id: r.AuthorID, name: r.AuthorName}
			byUser[r.AuthorID] = u
		}
		u.count++
	}

	list := make([]*userInfo, 0, len(byUser))
	for _, u := range byUser {
		list = append(list, u)
	}

	for i := 0; i < len(list); i++ {
		for j := i + 1; j < len(list); j++ {
			if list[j].count > list[i].count {
				list[i], list[j] = list[j], list[i]
			}
		}
	}

	if limit > 0 && len(list) > limit {
		list = list[:limit]
	}

	results := make([]map[string]interface{}, len(list))
	for i, u := range list {
		results[i] = map[string]interface{}{
			"rank":         i + 1,
			"username":     u.name,
			"rating_count": u.count,
		}
	}
	return results
}

// GetRecent returns the N most recent ratings.
func (s *RatingService) GetRecent(limit int) []model.Rating {
	s.mu.RLock()
	defer s.mu.RUnlock()

	n := len(s.ratings)
	if limit <= 0 || limit > n {
		limit = n
	}
	result := make([]model.Rating, limit)
	for i := 0; i < limit; i++ {
		result[i] = s.ratings[n-1-i]
	}
	return result
}

// GetVenueStats returns average rating and count for a venue.
func (s *RatingService) GetVenueStats(venueID string) (avgRating float64, count int) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var total float64
	for _, r := range s.ratings {
		if r.VenueID == venueID {
			total += float64(r.Score)
			count++
		}
	}
	if count > 0 {
		avgRating = total / float64(count)
	}
	return
}
