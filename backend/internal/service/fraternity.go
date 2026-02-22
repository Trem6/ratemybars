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
	byName   map[string][]string // frat_name -> school IDs
	allNames []string            // sorted unique frat names
	statsFn  StatsFunc
}

func NewFraternityService() *FraternityService {
	return &FraternityService{
		bySchool: make(map[string][]string),
		byName:   make(map[string][]string),
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
	s.byName = make(map[string][]string, 120)
	nameSet := make(map[string]bool, 120)

	for _, e := range entries {
		s.bySchool[e.SchoolID] = append(s.bySchool[e.SchoolID], e.Name)
		s.byName[e.Name] = append(s.byName[e.Name], e.SchoolID)
		nameSet[e.Name] = true
	}

	for schoolID := range s.bySchool {
		sort.Strings(s.bySchool[schoolID])
	}

	s.allNames = make([]string, 0, len(nameSet))
	for name := range nameSet {
		s.allNames = append(s.allNames, name)
	}
	sort.Strings(s.allNames)

	return nil
}

// ListAll returns all unique fraternity names, sorted.
func (s *FraternityService) ListAll() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.allNames
}

// GetSchoolsByFrat returns the school IDs that have a given fraternity.
func (s *FraternityService) GetSchoolsByFrat(fratName string) []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.byName[fratName]
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

	sort.SliceStable(result, func(i, j int) bool {
		if result[i].RatingCount != result[j].RatingCount {
			return result[i].RatingCount > result[j].RatingCount
		}
		return result[i].Name < result[j].Name
	})

	return result
}

// AddToSchool links a fraternity to a school. Returns false if already present.
func (s *FraternityService) AddToSchool(fratName, schoolID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, n := range s.bySchool[schoolID] {
		if n == fratName {
			return false
		}
	}

	s.bySchool[schoolID] = append(s.bySchool[schoolID], fratName)
	sort.Strings(s.bySchool[schoolID])

	s.byName[fratName] = append(s.byName[fratName], schoolID)

	// Rebuild allNames if this is a new fraternity
	found := false
	for _, n := range s.allNames {
		if n == fratName {
			found = true
			break
		}
	}
	if !found {
		s.allNames = append(s.allNames, fratName)
		sort.Strings(s.allNames)
	}

	return true
}

// RemoveFromSchool unlinks a fraternity from a school. Returns false if not found.
func (s *FraternityService) RemoveFromSchool(fratName, schoolID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	names := s.bySchool[schoolID]
	idx := -1
	for i, n := range names {
		if n == fratName {
			idx = i
			break
		}
	}
	if idx == -1 {
		return false
	}

	s.bySchool[schoolID] = append(names[:idx], names[idx+1:]...)
	if len(s.bySchool[schoolID]) == 0 {
		delete(s.bySchool, schoolID)
	}

	ids := s.byName[fratName]
	for i, id := range ids {
		if id == schoolID {
			s.byName[fratName] = append(ids[:i], ids[i+1:]...)
			break
		}
	}
	if len(s.byName[fratName]) == 0 {
		delete(s.byName, fratName)
		// Remove from allNames
		for i, n := range s.allNames {
			if n == fratName {
				s.allNames = append(s.allNames[:i], s.allNames[i+1:]...)
				break
			}
		}
	}

	return true
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
