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
	svc *service.RatingService
}

func NewRatingHandler(svc *service.RatingService) *RatingHandler {
	return &RatingHandler{svc: svc}
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
		// Distinguish between validation errors and server errors
		status := http.StatusBadRequest
		if err.Error() == "authentication required" {
			status = http.StatusUnauthorized
		}
		writeError(w, status, err.Error())
		return
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
