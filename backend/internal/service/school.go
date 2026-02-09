package service

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"strings"
	"sync"

	"github.com/ratemybars/backend/internal/model"
)

// SchoolService handles school-related operations.
// Uses an in-memory store loaded from the JSON data file
// for fast reads and map queries.
type SchoolService struct {
	mu      sync.RWMutex
	schools []model.School
	byID    map[string]*model.School
	byState map[string][]*model.School
}

func NewSchoolService() *SchoolService {
	return &SchoolService{
		byID:    make(map[string]*model.School),
		byState: make(map[string][]*model.School),
	}
}

// LoadFromJSON loads school data from the JSON file.
func (s *SchoolService) LoadFromJSON(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("failed to read schools file: %w", err)
	}

	var rawSchools []struct {
		UnitID    int     `json:"unitid"`
		Name      string  `json:"name"`
		Alias     string  `json:"alias"`
		Address   string  `json:"address"`
		City      string  `json:"city"`
		State     string  `json:"state"`
		Zip       string  `json:"zip"`
		Control   string  `json:"control"`
		ICLevel   int     `json:"iclevel"`
		Website   string  `json:"website"`
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
		County    string  `json:"county"`
		Locale    int     `json:"locale"`
		HBCU      bool    `json:"hbcu"`
		Sector    int     `json:"sector"`
	}

	if err := json.Unmarshal(data, &rawSchools); err != nil {
		return fmt.Errorf("failed to parse schools JSON: %w", err)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	s.schools = make([]model.School, 0, len(rawSchools))
	s.byID = make(map[string]*model.School, len(rawSchools))
	s.byState = make(map[string][]*model.School)

	for _, rs := range rawSchools {
		school := model.School{
			ID:        fmt.Sprintf("%d", rs.UnitID),
			UnitID:    rs.UnitID,
			Name:      rs.Name,
			AliasName: rs.Alias,
			Address:   rs.Address,
			City:      rs.City,
			State:     rs.State,
			Zip:       rs.Zip,
			Control:   rs.Control,
			ICLevel:   rs.ICLevel,
			Website:   rs.Website,
			Latitude:  rs.Latitude,
			Longitude: rs.Longitude,
			County:    rs.County,
			Locale:    rs.Locale,
			HBCU:      rs.HBCU,
		}
		s.schools = append(s.schools, school)
		ptr := &s.schools[len(s.schools)-1]
		s.byID[school.ID] = ptr
		s.byState[school.State] = append(s.byState[school.State], ptr)
	}

	return nil
}

// Search performs a filtered search on schools.
func (s *SchoolService) Search(_ context.Context, params model.SchoolSearchParams) (*model.PaginatedResponse, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if params.Limit <= 0 {
		params.Limit = 50
	}
	if params.Limit > 200 {
		params.Limit = 200
	}
	if params.Page <= 0 {
		params.Page = 1
	}

	var filtered []*model.School

	// Start with state filter if provided
	var candidates []*model.School
	if params.State != "" {
		candidates = s.byState[strings.ToUpper(params.State)]
	} else {
		candidates = make([]*model.School, len(s.schools))
		for i := range s.schools {
			candidates[i] = &s.schools[i]
		}
	}

	query := strings.ToLower(strings.TrimSpace(params.Query))

	for _, school := range candidates {
		// Control filter
		if params.Control != "" && school.Control != params.Control {
			continue
		}

		// Bounding box filter
		if params.MinLat != 0 || params.MaxLat != 0 || params.MinLng != 0 || params.MaxLng != 0 {
			if school.Latitude < params.MinLat || school.Latitude > params.MaxLat ||
				school.Longitude < params.MinLng || school.Longitude > params.MaxLng {
				continue
			}
		}

		// Text search filter
		if query != "" {
			name := strings.ToLower(school.Name)
			alias := strings.ToLower(school.AliasName)
			city := strings.ToLower(school.City)
			if !strings.Contains(name, query) &&
				!strings.Contains(alias, query) &&
				!strings.Contains(city, query) {
				continue
			}
		}

		filtered = append(filtered, school)
	}

	total := len(filtered)
	totalPages := int(math.Ceil(float64(total) / float64(params.Limit)))
	start := (params.Page - 1) * params.Limit
	end := start + params.Limit
	if start > total {
		start = total
	}
	if end > total {
		end = total
	}

	page := filtered[start:end]
	result := make([]model.School, len(page))
	for i, p := range page {
		result[i] = *p
	}

	return &model.PaginatedResponse{
		Data:       result,
		Total:      total,
		Page:       params.Page,
		Limit:      params.Limit,
		TotalPages: totalPages,
	}, nil
}

// GetByID retrieves a school by its UNITID.
func (s *SchoolService) GetByID(_ context.Context, id string) (*model.School, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	school, ok := s.byID[id]
	if !ok {
		return nil, fmt.Errorf("school not found: %s", id)
	}
	return school, nil
}

// GetGeo returns all schools within a bounding box for map display.
func (s *SchoolService) GetGeo(_ context.Context, minLat, maxLat, minLng, maxLng float64) ([]model.School, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var results []model.School
	for _, school := range s.schools {
		if school.Latitude >= minLat && school.Latitude <= maxLat &&
			school.Longitude >= minLng && school.Longitude <= maxLng {
			results = append(results, school)
		}
	}
	return results, nil
}

// GetAllForMap returns minimal data for all schools (for initial map load).
func (s *SchoolService) GetAllForMap(_ context.Context) ([]map[string]interface{}, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	results := make([]map[string]interface{}, 0, len(s.schools))
	for _, school := range s.schools {
		results = append(results, map[string]interface{}{
			"id":        school.ID,
			"name":      school.Name,
			"latitude":  school.Latitude,
			"longitude": school.Longitude,
			"state":     school.State,
			"control":   school.Control,
			"hbcu":      school.HBCU,
		})
	}
	return results, nil
}

// GetStates returns all unique states.
func (s *SchoolService) GetStates(_ context.Context) []string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	states := make([]string, 0, len(s.byState))
	for state := range s.byState {
		states = append(states, state)
	}
	return states
}

// Count returns total number of loaded schools.
func (s *SchoolService) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.schools)
}
