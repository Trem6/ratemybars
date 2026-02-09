package service

import (
	"context"
	"fmt"
	"math"
	"sync"
	"time"

	"github.com/ratemybars/backend/internal/middleware"
	"github.com/ratemybars/backend/internal/model"
)

// VenueService manages venue CRUD operations.
// In production, this would be backed by Gel database queries.
// For now, uses in-memory storage as a working prototype.
type VenueService struct {
	mu     sync.RWMutex
	venues []model.Venue
	nextID int
}

func NewVenueService() *VenueService {
	return &VenueService{
		venues: []model.Venue{},
		nextID: 1,
	}
}

// Create adds a new venue.
func (s *VenueService) Create(ctx context.Context, req model.CreateVenueRequest) (*model.Venue, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}

	// Validate category
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
		Verified:    false,
	}
	s.nextID++
	s.venues = append(s.venues, venue)

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

// ListBySchool returns all venues for a school.
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
		if v.SchoolID == schoolID {
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
