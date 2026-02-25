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

const maxRatingsPerDay = 20

// RatingService manages rating CRUD with spam prevention.
type RatingService struct {
	mu      sync.RWMutex
	pool    *pgxpool.Pool
	ratings []model.Rating
	nextID  int

	userDailyCounts map[string]*dailyCount
}

type dailyCount struct {
	count int
	date  string // YYYY-MM-DD
}

func NewRatingService(pool *pgxpool.Pool) *RatingService {
	svc := &RatingService{
		pool:            pool,
		ratings:         []model.Rating{},
		nextID:          1,
		userDailyCounts: make(map[string]*dailyCount),
	}
	if pool != nil {
		svc.loadFromDB()
	}
	return svc
}

func (s *RatingService) loadFromDB() {
	rows, err := s.pool.Query(context.Background(),
		`SELECT id, score, COALESCE(review,''), venue_id, author_id, COALESCE(author_name,''), created_at, upvotes, downvotes
		 FROM ratings ORDER BY created_at`)
	if err != nil {
		log.Printf("WARNING: Failed to load ratings from DB: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var r model.Rating
		if err := rows.Scan(&r.ID, &r.Score, &r.Review, &r.VenueID, &r.AuthorID, &r.AuthorName, &r.CreatedAt, &r.Upvotes, &r.Downvotes); err != nil {
			log.Printf("WARNING: Failed to scan rating row: %v", err)
			continue
		}
		s.ratings = append(s.ratings, r)
		s.nextID++
	}
	log.Printf("Loaded %d ratings from DB", len(s.ratings))
}

// Create adds a new rating with spam prevention.
func (s *RatingService) Create(ctx context.Context, req model.CreateRatingRequest) (*model.Rating, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	if req.Score < 1 || req.Score > 5 {
		return nil, fmt.Errorf("score must be between 1 and 5")
	}

	if req.VenueID == "" {
		return nil, fmt.Errorf("venue_id is required")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	today := time.Now().Format("2006-01-02")
	dc, exists := s.userDailyCounts[userID]
	if exists && dc.date == today && dc.count >= maxRatingsPerDay {
		return nil, fmt.Errorf("daily rating limit reached (%d per day)", maxRatingsPerDay)
	}

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

	if !exists || dc.date != today {
		s.userDailyCounts[userID] = &dailyCount{count: 1, date: today}
	} else {
		dc.count++
	}

	if s.pool != nil {
		_, err := s.pool.Exec(context.Background(),
			`INSERT INTO ratings (id, score, review, venue_id, author_id, author_name, created_at, upvotes, downvotes)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0)
			 ON CONFLICT (venue_id, author_id) DO NOTHING`,
			rating.ID, rating.Score, rating.Review, rating.VenueID, rating.AuthorID, rating.AuthorName, rating.CreatedAt)
		if err != nil {
			log.Printf("WARNING: Failed to persist rating: %v", err)
		}
	}

	return &rating, nil
}

// Vote allows a user to upvote or downvote a review. Toggle semantics:
// voting the same direction again removes the vote.
func (s *RatingService) Vote(ctx context.Context, ratingID, direction string) (upvotes, downvotes int, err error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return 0, 0, fmt.Errorf("authentication required")
	}
	if direction != "up" && direction != "down" {
		return 0, 0, fmt.Errorf("direction must be 'up' or 'down'")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	idx := -1
	for i := range s.ratings {
		if s.ratings[i].ID == ratingID {
			idx = i
			break
		}
	}
	if idx == -1 {
		return 0, 0, fmt.Errorf("rating not found")
	}

	if s.ratings[idx].AuthorID == userID {
		return 0, 0, fmt.Errorf("cannot vote on your own review")
	}

	if s.pool != nil {
		var existing string
		err := s.pool.QueryRow(context.Background(),
			`SELECT direction FROM review_votes WHERE rating_id=$1 AND user_id=$2`,
			ratingID, userID).Scan(&existing)

		if err == nil {
			// Existing vote found
			if existing == direction {
				// Same direction: remove vote (toggle off)
				_, _ = s.pool.Exec(context.Background(),
					`DELETE FROM review_votes WHERE rating_id=$1 AND user_id=$2`, ratingID, userID)
				if direction == "up" {
					s.ratings[idx].Upvotes--
				} else {
					s.ratings[idx].Downvotes--
				}
			} else {
				// Different direction: switch vote
				_, _ = s.pool.Exec(context.Background(),
					`UPDATE review_votes SET direction=$1 WHERE rating_id=$2 AND user_id=$3`,
					direction, ratingID, userID)
				if direction == "up" {
					s.ratings[idx].Upvotes++
					s.ratings[idx].Downvotes--
				} else {
					s.ratings[idx].Downvotes++
					s.ratings[idx].Upvotes--
				}
			}
		} else {
			// No existing vote: insert
			_, _ = s.pool.Exec(context.Background(),
				`INSERT INTO review_votes (rating_id, user_id, direction) VALUES ($1, $2, $3)`,
				ratingID, userID, direction)
			if direction == "up" {
				s.ratings[idx].Upvotes++
			} else {
				s.ratings[idx].Downvotes++
			}
		}

		// Sync counts back to ratings table
		_, _ = s.pool.Exec(context.Background(),
			`UPDATE ratings SET upvotes=$1, downvotes=$2 WHERE id=$3`,
			s.ratings[idx].Upvotes, s.ratings[idx].Downvotes, ratingID)
	} else {
		// In-memory only: simple toggle (no per-user tracking without DB)
		if direction == "up" {
			s.ratings[idx].Upvotes++
		} else {
			s.ratings[idx].Downvotes++
		}
	}

	return s.ratings[idx].Upvotes, s.ratings[idx].Downvotes, nil
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

	// Skip seed data if we already loaded real data from DB
	if len(s.ratings) > 0 {
		return
	}

	reviews := []struct {
		Score  float32
		Review string
		Author string
	}{
		{5, "Best bar near campus, always a great time!", "PartyGator22"},
		{4, "Good drinks, gets really packed on weekends", "NightOwl99"},
		{5, "Legendary spot, every student needs to go here", "CollegeLyfe"},
		{4, "Fun atmosphere, music could be better", "BarHopper23"},
		{2, "Decent but overpriced drinks", "BudgetDrinker"},
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
		{5, "Always a good crowd and good energy", "VibeChecker"},
		{5, "Nothing beats this place on a Friday night", "FridayFanatic"},
		{2, "It's okay, the hype is a bit much", "RealTalk420"},
		{4, "Cheap drinks and a fun dance floor", "DanceFloorDiva"},
		{5, "A must-visit if you're in town", "TouristTips"},
	}

	reviewIdx := 0
	for _, venue := range venues {
		numRatings := 2 + (s.nextID % 3)
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

// GetVenueThumbs returns thumbs up and thumbs down counts for a venue.
func (s *RatingService) GetVenueThumbs(venueID string) (up, down int) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, r := range s.ratings {
		if r.VenueID == venueID {
			if r.Score >= 4 {
				up++
			} else if r.Score <= 2 {
				down++
			}
		}
	}
	return
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
