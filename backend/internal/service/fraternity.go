package service

import (
	"encoding/json"
	"fmt"
	"sort"
	"sync"
)

type fratEntry struct {
	Name     string `json:"name"`
	SchoolID string `json:"school_id"`
}

// FraternityService provides read-only access to fraternity chapter data.
type FraternityService struct {
	mu       sync.RWMutex
	bySchool map[string][]string // school_id -> sorted fraternity names
}

func NewFraternityService() *FraternityService {
	return &FraternityService{
		bySchool: make(map[string][]string),
	}
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

// GetBySchool returns the sorted list of fraternity names for a school.
func (s *FraternityService) GetBySchool(schoolID string) []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.bySchool[schoolID]
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
