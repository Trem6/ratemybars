package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/ratemybars/backend/internal/model"
	"github.com/ratemybars/backend/internal/service"
)

type FraternityHandler struct {
	svc       *service.FraternityService
	ratingSvc *service.FratRatingService
}

func NewFraternityHandler(svc *service.FraternityService, ratingSvc *service.FratRatingService) *FraternityHandler {
	return &FraternityHandler{svc: svc, ratingSvc: ratingSvc}
}

// GetBySchool handles GET /api/schools/{id}/fraternities
func (h *FraternityHandler) GetBySchool(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	frats := h.svc.GetBySchool(id)
	if frats == nil {
		frats = []model.FratWithRating{}
	}
	writeJSON(w, http.StatusOK, frats)
}

// ListAll handles GET /api/fraternities
func (h *FraternityHandler) ListAll(w http.ResponseWriter, r *http.Request) {
	names := h.svc.ListAll()
	if names == nil {
		names = []string{}
	}
	writeJSON(w, http.StatusOK, names)
}

// GetSchoolsByFrat handles GET /api/fraternities/schools?name=...
func (h *FraternityHandler) GetSchoolsByFrat(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		writeError(w, http.StatusBadRequest, "name parameter is required")
		return
	}
	ids := h.svc.GetSchoolsByFrat(name)
	if ids == nil {
		ids = []string{}
	}
	writeJSON(w, http.StatusOK, ids)
}

// CreateRating handles POST /api/frat-ratings
func (h *FraternityHandler) CreateRating(w http.ResponseWriter, r *http.Request) {
	var req model.CreateFratRatingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	rating, err := h.ratingSvc.Create(r.Context(), req)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "authentication required" {
			status = http.StatusUnauthorized
		}
		writeError(w, status, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, rating)
}
