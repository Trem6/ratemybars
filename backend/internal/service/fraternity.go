package service

import (
	"encoding/json"
	"fmt"
	"sort"
	"sync"

	"github.com/ratemybars/backend/internal/model"
)

type fratEntry struct {
	Name     string `json:"name"`
	SchoolID string `json:"school_id"`
}

// StatsFunc returns rating stats for all frats at a school.
type StatsFunc func(schoolID string) map[string]model.FratWithRating

// FraternityService provides access to fraternity chapter data with live rating stats.
type FraternityService struct {
	mu       sync.RWMutex
	bySchool map[string][]string // school_id -> sorted fraternity names
	statsFn  StatsFunc
}

func NewFraternityService() *FraternityService {
	return &FraternityService{
		bySchool: make(map[string][]string),
	}
}

// SetStatsFunc sets the callback used to enrich fraternity listings with rating data.
func (s *FraternityService) SetStatsFunc(fn StatsFunc) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.statsFn = fn
}

// Load parses the embedded fraternities.json data.
func (s *FraternityService) Load(data []byte) error {
	var entries []fratEntry
	if err := json.Unmarshal(data, &entries); err != nil {
		return fmt.Errorf("failed to parse fraternities JSON: %w", err)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	s.bySchool = make(map[string][]string, 1000)
	for _, e := range entries {
		s.bySchool[e.SchoolID] = append(s.bySchool[e.SchoolID], e.Name)
	}

	for schoolID := range s.bySchool {
		sort.Strings(s.bySchool[schoolID])
	}

	return nil
}

// GetBySchool returns fraternities enriched with live rating data.
func (s *FraternityService) GetBySchool(schoolID string) []model.FratWithRating {
	s.mu.RLock()
	names := s.bySchool[schoolID]
	statsFn := s.statsFn
	s.mu.RUnlock()

	if len(names) == 0 {
		return nil
	}

	var stats map[string]model.FratWithRating
	if statsFn != nil {
		stats = statsFn(schoolID)
	}

	result := make([]model.FratWithRating, 0, len(names))
	for _, name := range names {
		if fwr, ok := stats[name]; ok {
			result = append(result, fwr)
		} else {
			result = append(result, model.FratWithRating{Name: name})
		}
	}

	// Rated frats first (by rating count desc), then unrated alphabetically
	sort.SliceStable(result, func(i, j int) bool {
		if result[i].RatingCount != result[j].RatingCount {
			return result[i].RatingCount > result[j].RatingCount
		}
		return result[i].Name < result[j].Name
	})

	return result
}

// Count returns the number of fraternities at a school.
func (s *FraternityService) Count(schoolID string) int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.bySchool[schoolID])
}

// SchoolCount returns the number of schools that have fraternities.
func (s *FraternityService) SchoolCount() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.bySchool)
}
