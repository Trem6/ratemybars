package service

import (
	"context"
	"fmt"
	"log"
	"math"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ratemybars/backend/internal/middleware"
	"github.com/ratemybars/backend/internal/model"
)

// VenueService manages venue CRUD operations.
type VenueService struct {
	mu     sync.RWMutex
	pool   *pgxpool.Pool
	venues []model.Venue
	nextID int
}

func NewVenueService(pool *pgxpool.Pool) *VenueService {
	svc := &VenueService{
		pool:   pool,
		venues: []model.Venue{},
		nextID: 1,
	}
	if pool != nil {
		svc.loadFromDB()
	}
	return svc
}

func (s *VenueService) loadFromDB() {
	rows, err := s.pool.Query(context.Background(),
		`SELECT id, name, category, COALESCE(description,''), COALESCE(address,''),
		        COALESCE(latitude,0), COALESCE(longitude,0), school_id, COALESCE(created_by,''),
		        created_at, verified
		 FROM venues ORDER BY created_at`)
	if err != nil {
		log.Printf("WARNING: Failed to load venues from DB: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var v model.Venue
		if err := rows.Scan(&v.ID, &v.Name, &v.Category, &v.Description, &v.Address,
			&v.Latitude, &v.Longitude, &v.SchoolID, &v.CreatedByID, &v.CreatedAt, &v.Verified); err != nil {
			log.Printf("WARNING: Failed to scan venue row: %v", err)
			continue
		}
		s.venues = append(s.venues, v)
		s.nextID++
	}
	log.Printf("Loaded %d venues from DB", len(s.venues))
}

// Create adds a new venue. Admin submissions are auto-approved.
func (s *VenueService) Create(ctx context.Context, req model.CreateVenueRequest) (*model.Venue, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	validCategories := map[string]bool{
		"bar": true, "nightclub": true, "frat": true, "party_host": true, "other": true,
	}
	if !validCategories[req.Category] {
		return nil, fmt.Errorf("invalid category: %s", req.Category)
	}

	if req.Name == "" {
		return nil, fmt.Errorf("venue name is required")
	}
	if req.SchoolID == "" {
		return nil, fmt.Errorf("school_id is required")
	}

	role := middleware.GetUserRole(ctx)
	approved := role == "admin"

	s.mu.Lock()
	defer s.mu.Unlock()

	venue := model.Venue{
		ID:          fmt.Sprintf("venue_%d", s.nextID),
		Name:        middleware.SanitizeString(req.Name),
		Category:    req.Category,
		Description: middleware.SanitizeString(req.Description),
		Address:     middleware.SanitizeString(req.Address),
		Latitude:    req.Latitude,
		Longitude:   req.Longitude,
		SchoolID:    req.SchoolID,
		CreatedByID: userID,
		CreatedAt:   time.Now(),
		Verified:    approved,
	}
	s.nextID++
	s.venues = append(s.venues, venue)

	if s.pool != nil {
		_, err := s.pool.Exec(context.Background(),
			`INSERT INTO venues (id, name, category, description, address, latitude, longitude, school_id, created_by, created_at, verified)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
			venue.ID, venue.Name, venue.Category, venue.Description, venue.Address,
			venue.Latitude, venue.Longitude, venue.SchoolID, venue.CreatedByID, venue.CreatedAt, venue.Verified)
		if err != nil {
			log.Printf("WARNING: Failed to persist venue: %v", err)
		}
	}

	return &venue, nil
}

// GetByID retrieves a venue by ID.
func (s *VenueService) GetByID(_ context.Context, id string) (*model.Venue, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for i := range s.venues {
		if s.venues[i].ID == id {
			return &s.venues[i], nil
		}
	}
	return nil, fmt.Errorf("venue not found: %s", id)
}

// ListBySchool returns approved venues for a school (public view).
func (s *VenueService) ListBySchool(_ context.Context, schoolID string, page, limit int) (*model.PaginatedResponse, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if limit <= 0 {
		limit = 20
	}
	if page <= 0 {
		page = 1
	}

	var filtered []model.Venue
	for _, v := range s.venues {
		if v.SchoolID == schoolID && v.Verified {
			filtered = append(filtered, v)
		}
	}

	total := len(filtered)
	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	start := (page - 1) * limit
	end := start + limit
	if start > total {
		start = total
	}
	if end > total {
		end = total
	}

	return &model.PaginatedResponse{
		Data:       filtered[start:end],
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}

// ListPending returns all venues that are not yet approved.
func (s *VenueService) ListPending() []model.Venue {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var pending []model.Venue
	for _, v := range s.venues {
		if !v.Verified {
			pending = append(pending, v)
		}
	}
	return pending
}

// ApproveVenue marks a venue as approved.
func (s *VenueService) ApproveVenue(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i := range s.venues {
		if s.venues[i].ID == id {
			s.venues[i].Verified = true

			if s.pool != nil {
				_, err := s.pool.Exec(context.Background(),
					`UPDATE venues SET verified=true WHERE id=$1`, id)
				if err != nil {
					log.Printf("WARNING: Failed to persist venue approval: %v", err)
				}
			}
			return nil
		}
	}
	return fmt.Errorf("venue not found: %s", id)
}

// RejectVenue removes a pending venue.
func (s *VenueService) RejectVenue(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i := range s.venues {
		if s.venues[i].ID == id {
			if s.venues[i].Verified {
				return fmt.Errorf("cannot reject an already approved venue")
			}
			s.venues = append(s.venues[:i], s.venues[i+1:]...)

			if s.pool != nil {
				_, err := s.pool.Exec(context.Background(),
					`DELETE FROM venues WHERE id=$1`, id)
				if err != nil {
					log.Printf("WARNING: Failed to delete rejected venue from DB: %v", err)
				}
			}
			return nil
		}
	}
	return fmt.Errorf("venue not found: %s", id)
}

// DeleteVenue removes a venue by ID (admin action, works on any venue).
func (s *VenueService) DeleteVenue(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i := range s.venues {
		if s.venues[i].ID == id {
			s.venues = append(s.venues[:i], s.venues[i+1:]...)

			if s.pool != nil {
				_, err := s.pool.Exec(context.Background(),
					`DELETE FROM venues WHERE id=$1`, id)
				if err != nil {
					log.Printf("WARNING: Failed to delete venue from DB: %v", err)
				}
			}
			return nil
		}
	}
	return fmt.Errorf("venue not found: %s", id)
}

// SearchVenues returns verified venues matching a query string.
func (s *VenueService) SearchVenues(query string, limit int) []model.Venue {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if limit <= 0 {
		limit = 20
	}
	q := strings.ToLower(query)
	var results []model.Venue
	for _, v := range s.venues {
		if v.Verified && strings.Contains(strings.ToLower(v.Name), q) {
			results = append(results, v)
			if len(results) >= limit {
				break
			}
		}
	}
	return results
}

// Count returns the total number of approved venues.
func (s *VenueService) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	count := 0
	for _, v := range s.venues {
		if v.Verified {
			count++
		}
	}
	return count
}

// LoadSeedData populates the venue service with seed data.
func (s *VenueService) LoadSeedData(seeds []struct {
	SchoolID    string
	Name        string
	Category    string
	Description string
	Address     string
	Latitude    float64
	Longitude   float64
}) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Skip seed data if we already loaded real data from DB
	if len(s.venues) > 0 {
		return
	}

	for _, seed := range seeds {
		venue := model.Venue{
			ID:          fmt.Sprintf("venue_%d", s.nextID),
			Name:        seed.Name,
			Category:    seed.Category,
			Description: seed.Description,
			Address:     seed.Address,
			Latitude:    seed.Latitude,
			Longitude:   seed.Longitude,
			SchoolID:    seed.SchoolID,
			CreatedByID: "system",
			CreatedAt:   time.Now().Add(-time.Duration(s.nextID) * 24 * time.Hour),
			Verified:    true,
		}
		s.nextID++
		s.venues = append(s.venues, venue)
	}
}

// GetAllVenues returns all approved venues (for computing counts).
func (s *VenueService) GetAllVenues() []model.Venue {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var out []model.Venue
	for _, v := range s.venues {
		if v.Verified {
			out = append(out, v)
		}
	}
	return out
}

// GetVenueIDsBySchool returns all venue IDs for a school.
func (s *VenueService) GetVenueIDsBySchool(schoolID string) []string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var ids []string
	for _, v := range s.venues {
		if v.SchoolID == schoolID && v.Verified {
			ids = append(ids, v.ID)
		}
	}
	return ids
}

// ThumbsStatsFunc returns thumbs_up and thumbs_down counts for a venue.
type ThumbsStatsFunc func(venueID string) (up, down int)

// UpdateRatingStats updates avg_rating, rating_count, and thumbs for all venues.
func (s *VenueService) UpdateRatingStats(statsFunc func(venueID string) (float64, int), thumbsFunc ThumbsStatsFunc) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i := range s.venues {
		avg, count := statsFunc(s.venues[i].ID)
		s.venues[i].AvgRating = avg
		s.venues[i].RatingCount = count
		if thumbsFunc != nil {
			up, down := thumbsFunc(s.venues[i].ID)
			s.venues[i].ThumbsUp = up
			s.venues[i].ThumbsDown = down
		}
	}
}

// UpdateSingleVenueStats updates rating stats for a single venue and returns its school_id.
func (s *VenueService) UpdateSingleVenueStats(venueID string, avgRating float64, ratingCount int, thumbsUp int, thumbsDown int) string {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i := range s.venues {
		if s.venues[i].ID == venueID {
			s.venues[i].AvgRating = avgRating
			s.venues[i].RatingCount = ratingCount
			s.venues[i].ThumbsUp = thumbsUp
			s.venues[i].ThumbsDown = thumbsDown
			return s.venues[i].SchoolID
		}
	}
	return ""
}

// GetRecent returns the N most recently created verified venues.
func (s *VenueService) GetRecent(limit int) []model.Venue {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var verified []model.Venue
	for i := len(s.venues) - 1; i >= 0; i-- {
		if s.venues[i].Verified {
			verified = append(verified, s.venues[i])
			if len(verified) >= limit {
				break
			}
		}
	}
	return verified
}

// GetSchoolAvgRating computes the average rating across all venues at a school.
func (s *VenueService) GetSchoolAvgRating(schoolID string) float64 {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var total float64
	var count int
	for _, v := range s.venues {
		if v.SchoolID == schoolID && v.RatingCount > 0 {
			total += v.AvgRating
			count++
		}
	}
	if count == 0 {
		return 0
	}
	return total / float64(count)
}
