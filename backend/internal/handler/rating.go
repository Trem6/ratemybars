package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/ratemybars/backend/internal/model"
	"github.com/ratemybars/backend/internal/service"
)

// RatingHandler handles rating-related HTTP requests.
type RatingHandler struct {
	svc       *service.RatingService
	venueSvc  *service.VenueService
	schoolSvc *service.SchoolService
}

func NewRatingHandler(svc *service.RatingService, venueSvc *service.VenueService, schoolSvc *service.SchoolService) *RatingHandler {
	return &RatingHandler{svc: svc, venueSvc: venueSvc, schoolSvc: schoolSvc}
}

// Create handles POST /api/ratings
func (h *RatingHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req model.CreateRatingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	rating, err := h.svc.Create(r.Context(), req)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "authentication required" {
			status = http.StatusUnauthorized
		}
		writeError(w, status, err.Error())
		return
	}

	avg, count := h.svc.GetVenueStats(req.VenueID)
	up, down := h.svc.GetVenueThumbs(req.VenueID)
	schoolID := h.venueSvc.UpdateSingleVenueStats(req.VenueID, avg, count, up, down)

	if schoolID != "" {
		schoolAvg := h.venueSvc.GetSchoolAvgRating(schoolID)
		h.schoolSvc.UpdateSingleSchoolRating(schoolID, schoolAvg)
	}

	writeJSON(w, http.StatusCreated, rating)
}

// ListByVenue handles GET /api/venues/{id}/ratings
func (h *RatingHandler) ListByVenue(w http.ResponseWriter, r *http.Request) {
	venueID := chi.URLParam(r, "id")

	ratings, err := h.svc.ListByVenue(r.Context(), venueID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, ratings)
}

// ListBySchool handles GET /api/schools/{id}/ratings — returns recent reviews across all venues at a school.
func (h *RatingHandler) ListBySchool(w http.ResponseWriter, r *http.Request) {
	schoolID := chi.URLParam(r, "id")

	venueIDs := h.venueSvc.GetVenueIDsBySchool(schoolID)
	ratings := h.svc.ListByVenues(venueIDs)

	if ratings == nil {
		ratings = []model.Rating{}
	}

	// Sort by most recent first (in-place, ratings is a copy)
	for i := 0; i < len(ratings); i++ {
		for j := i + 1; j < len(ratings); j++ {
			if ratings[j].CreatedAt.After(ratings[i].CreatedAt) {
				ratings[i], ratings[j] = ratings[j], ratings[i]
			}
		}
	}

	// Limit to 20 most recent
	if len(ratings) > 20 {
		ratings = ratings[:20]
	}

	writeJSON(w, http.StatusOK, ratings)
}
