package model

import "time"

// School represents a college/university imported from IPEDS data.
type School struct {
	ID        string  `json:"id"`
	UnitID    int     `json:"unitid"`
	Name      string  `json:"name"`
	AliasName string  `json:"alias_name,omitempty"`
	Address   string  `json:"address"`
	City      string  `json:"city"`
	State     string  `json:"state"`
	Zip       string  `json:"zip"`
	Control   string  `json:"control"` // "public" or "private_nonprofit"
	ICLevel   int     `json:"iclevel"`
	Website   string  `json:"website,omitempty"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	County    string  `json:"county,omitempty"`
	Locale    int     `json:"locale,omitempty"`
	HBCU      bool    `json:"hbcu"`

	// Computed fields
	VenueCount int     `json:"venue_count"`
	AvgRating  float64 `json:"avg_rating,omitempty"`
}

// Venue represents a user-submitted party venue.
type Venue struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Category    string    `json:"category"` // bar, nightclub, frat, party_host, other
	Description string    `json:"description,omitempty"`
	Address     string    `json:"address,omitempty"`
	Latitude    float64   `json:"latitude,omitempty"`
	Longitude   float64   `json:"longitude,omitempty"`
	SchoolID    string    `json:"school_id"`
	SchoolName  string    `json:"school_name,omitempty"`
	CreatedByID string    `json:"created_by_id"`
	CreatedAt   time.Time `json:"created_at"`
	Verified    bool      `json:"verified"`

	// Computed fields
	AvgRating   float64 `json:"avg_rating"`
	RatingCount int     `json:"rating_count"`
}

// Rating represents a user's rating and review of a venue.
type Rating struct {
	ID         string    `json:"id"`
	Score      float32   `json:"score"`
	Review     string    `json:"review,omitempty"`
	VenueID    string    `json:"venue_id"`
	AuthorID   string    `json:"author_id"`
	AuthorName string    `json:"author_name,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

// User represents an authenticated user.
type User struct {
	ID               string    `json:"id"`
	Username         string    `json:"username"`
	Role             string    `json:"role"` // "user" or "admin"
	DisplayName      string    `json:"display_name,omitempty"`
	AvatarURL        string    `json:"avatar_url,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
	LastRatingAt     time.Time `json:"last_rating_at,omitempty"`
	RatingCountToday int       `json:"rating_count_today"`
}

// --- Request/Response DTOs ---

type CreateVenueRequest struct {
	Name        string  `json:"name"`
	Category    string  `json:"category"`
	Description string  `json:"description,omitempty"`
	Address     string  `json:"address,omitempty"`
	Latitude    float64 `json:"latitude,omitempty"`
	Longitude   float64 `json:"longitude,omitempty"`
	SchoolID    string  `json:"school_id"`
}

type CreateRatingRequest struct {
	Score   float32 `json:"score"`
	Review  string  `json:"review,omitempty"`
	VenueID string  `json:"venue_id"`
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Username string `json:"username"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  *User  `json:"user"`
}

type SchoolSearchParams struct {
	Query   string  `json:"query,omitempty"`
	State   string  `json:"state,omitempty"`
	Control string  `json:"control,omitempty"` // "public" or "private_nonprofit"
	Sort    string  `json:"sort,omitempty"`    // "venue_count", "name"
	Page    int     `json:"page"`
	Limit   int     `json:"limit"`
	MinLat  float64 `json:"min_lat,omitempty"`
	MaxLat  float64 `json:"max_lat,omitempty"`
	MinLng  float64 `json:"min_lng,omitempty"`
	MaxLng  float64 `json:"max_lng,omitempty"`
}

type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Total      int         `json:"total"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	TotalPages int         `json:"total_pages"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}
