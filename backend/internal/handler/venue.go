package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/ratemybars/backend/internal/model"
	"github.com/ratemybars/backend/internal/service"
)

// VenueHandler handles venue-related HTTP requests.
type VenueHandler struct {
	svc *service.VenueService
}

func NewVenueHandler(svc *service.VenueService) *VenueHandler {
	return &VenueHandler{svc: svc}
}

// Create handles POST /api/venues
func (h *VenueHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req model.CreateVenueRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	venue, err := h.svc.Create(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, venue)
}

// GetByID handles GET /api/venues/{id}
func (h *VenueHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	venue, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, venue)
}

// ListBySchool handles GET /api/schools/{id}/venues
func (h *VenueHandler) ListBySchool(w http.ResponseWriter, r *http.Request) {
	schoolID := chi.URLParam(r, "id")
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))

	result, err := h.svc.ListBySchool(r.Context(), schoolID, page, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, result)
}

// ListPending handles GET /api/admin/venues/pending (admin only)
func (h *VenueHandler) ListPending(w http.ResponseWriter, r *http.Request) {
	pending := h.svc.ListPending()
	writeJSON(w, http.StatusOK, pending)
}

// Approve handles POST /api/admin/venues/{id}/approve (admin only)
func (h *VenueHandler) Approve(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.ApproveVenue(id); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "venue approved"})
}

// Reject handles DELETE /api/admin/venues/{id}/reject (admin only)
func (h *VenueHandler) Reject(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.RejectVenue(id); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "venue rejected"})
}

// Delete handles DELETE /api/admin/venues/{id} (admin only, removes any venue)
func (h *VenueHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.DeleteVenue(id); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "venue deleted"})
}

// SearchVenues handles GET /api/admin/venues/search?q=... (admin only)
func (h *VenueHandler) SearchVenues(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		writeJSON(w, http.StatusOK, []model.Venue{})
		return
	}
	results := h.svc.SearchVenues(q, 20)
	if results == nil {
		results = []model.Venue{}
	}
	writeJSON(w, http.StatusOK, results)
}
