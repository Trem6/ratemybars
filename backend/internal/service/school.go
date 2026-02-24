package service

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"sort"
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

// LoadFromBytes loads school data from raw JSON bytes.
func (s *SchoolService) LoadFromBytes(data []byte) error {
	return s.loadData(data)
}

// LoadFromJSON loads school data from the JSON file.
func (s *SchoolService) LoadFromJSON(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("failed to read schools file: %w", err)
	}
	return s.loadData(data)
}

func (s *SchoolService) loadData(data []byte) error {

	var rawSchools []struct {
		UnitID         int     `json:"unitid"`
		Name           string  `json:"name"`
		Alias          string  `json:"alias"`
		Address        string  `json:"address"`
		City           string  `json:"city"`
		State          string  `json:"state"`
		Zip            string  `json:"zip"`
		Control        string  `json:"control"`
		ICLevel        int     `json:"iclevel"`
		Website        string  `json:"website"`
		Latitude       float64 `json:"latitude"`
		Longitude      float64 `json:"longitude"`
		County         string  `json:"county"`
		Locale         int     `json:"locale"`
		HBCU           bool    `json:"hbcu"`
		Sector         int     `json:"sector"`
		InstSize       int     `json:"instsize"`
		IsOnline       bool    `json:"is_online"`
		IsTribal       bool    `json:"is_tribal"`
		IsReligious    bool    `json:"is_religious"`
		IsCommunityCol bool    `json:"is_community_college"`
		IsLiberalArts  bool    `json:"is_liberal_arts"`
		IsGraduateOnly bool    `json:"is_graduate_only"`
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
			ID:             fmt.Sprintf("%d", rs.UnitID),
			UnitID:         rs.UnitID,
			Name:           rs.Name,
			AliasName:      rs.Alias,
			Address:        rs.Address,
			City:           rs.City,
			State:          rs.State,
			Zip:            rs.Zip,
			Control:        rs.Control,
			ICLevel:        rs.ICLevel,
			Website:        rs.Website,
			Latitude:       rs.Latitude,
			Longitude:      rs.Longitude,
			County:         rs.County,
			Locale:         rs.Locale,
			HBCU:           rs.HBCU,
			InstSize:       rs.InstSize,
			IsOnline:       rs.IsOnline,
			IsTribal:       rs.IsTribal,
			IsReligious:    rs.IsReligious,
			IsCommunityCol: rs.IsCommunityCol,
			IsLiberalArts:  rs.IsLiberalArts,
			IsGraduateOnly: rs.IsGraduateOnly,
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

		// ICLevel filter (1 = 4-year, 2 = 2-year, 3 = less-than-2-year)
		if params.ICLevel > 0 && school.ICLevel != params.ICLevel {
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

	// Sort results
	switch params.Sort {
	case "venue_count":
		sort.Slice(filtered, func(i, j int) bool {
			return filtered[i].VenueCount > filtered[j].VenueCount
		})
	case "name":
		sort.Slice(filtered, func(i, j int) bool {
			return filtered[i].Name < filtered[j].Name
		})
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
			"id":                   school.ID,
			"name":                 school.Name,
			"latitude":             school.Latitude,
			"longitude":            school.Longitude,
			"state":                school.State,
			"control":              school.Control,
			"iclevel":              school.ICLevel,
			"venue_count":          school.VenueCount,
			"avg_rating":           school.AvgRating,
			"frat_count":           school.FratCount,
			"instsize":             school.InstSize,
			"hbcu":                 school.HBCU,
			"is_online":            school.IsOnline,
			"is_tribal":            school.IsTribal,
			"is_religious":         school.IsReligious,
			"is_community_college": school.IsCommunityCol,
			"is_liberal_arts":      school.IsLiberalArts,
			"is_graduate_only":     school.IsGraduateOnly,
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

// UpdateVenueCounts updates each school's VenueCount based on venue data.
func (s *SchoolService) UpdateVenueCounts(venueCounts map[string]int) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i := range s.schools {
		if count, ok := venueCounts[s.schools[i].ID]; ok {
			s.schools[i].VenueCount = count
		}
	}
}

// UpdateSchoolRatings updates venue avg ratings via a callback.
func (s *SchoolService) UpdateSchoolRatings(schoolAvgs map[string]float64) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i := range s.schools {
		if avg, ok := schoolAvgs[s.schools[i].ID]; ok {
			s.schools[i].AvgRating = avg
		}
	}
}

// UpdateSingleSchoolRating updates the avg_rating for a single school.
func (s *SchoolService) UpdateSingleSchoolRating(schoolID string, avgRating float64) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i := range s.schools {
		if s.schools[i].ID == schoolID {
			s.schools[i].AvgRating = avgRating
			return
		}
	}
}

// GetTopSchools returns schools sorted by party score for the leaderboard.
func (s *SchoolService) GetTopSchools(limit int) []map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()

	type scored struct {
		school model.School
		score  float64
	}

	var list []scored
	for _, school := range s.schools {
		if school.VenueCount == 0 && school.AvgRating == 0 {
			continue
		}
		venueScore := float64(school.VenueCount)
		if venueScore > 5 {
			venueScore = 5
		}
		score := (venueScore / 5 * 60) + (school.AvgRating / 5 * 40)
		list = append(list, scored{school: school, score: score})
	}

	// Sort by score desc
	for i := 0; i < len(list); i++ {
		for j := i + 1; j < len(list); j++ {
			if list[j].score > list[i].score {
				list[i], list[j] = list[j], list[i]
			}
		}
	}

	if limit > 0 && len(list) > limit {
		list = list[:limit]
	}

	results := make([]map[string]interface{}, len(list))
	for i, item := range list {
		results[i] = map[string]interface{}{
			"rank":        i + 1,
			"id":          item.school.ID,
			"name":        item.school.Name,
			"state":       item.school.State,
			"control":     item.school.Control,
			"venue_count": item.school.VenueCount,
			"avg_rating":  item.school.AvgRating,
			"frat_count":  item.school.FratCount,
			"party_score": int(item.score),
		}
	}
	return results
}

// UpdateFratCounts updates each school's FratCount using a lookup function.
func (s *SchoolService) UpdateFratCounts(countFn func(string) int) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i := range s.schools {
		s.schools[i].FratCount = countFn(s.schools[i].ID)
	}
}
