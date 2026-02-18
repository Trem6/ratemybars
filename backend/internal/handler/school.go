package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/ratemybars/backend/internal/model"
	"github.com/ratemybars/backend/internal/service"
)

// SchoolHandler handles school-related HTTP requests.
type SchoolHandler struct {
	svc *service.SchoolService
}

func NewSchoolHandler(svc *service.SchoolService) *SchoolHandler {
	return &SchoolHandler{svc: svc}
}

// Search handles GET /api/schools
func (h *SchoolHandler) Search(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	iclevel, _ := strconv.Atoi(q.Get("iclevel"))
	minLat, _ := strconv.ParseFloat(q.Get("min_lat"), 64)
	maxLat, _ := strconv.ParseFloat(q.Get("max_lat"), 64)
	minLng, _ := strconv.ParseFloat(q.Get("min_lng"), 64)
	maxLng, _ := strconv.ParseFloat(q.Get("max_lng"), 64)

	params := model.SchoolSearchParams{
		Query:   q.Get("q"),
		State:   q.Get("state"),
		Control: q.Get("control"),
		ICLevel: iclevel,
		Sort:    q.Get("sort"),
		Page:    page,
		Limit:   limit,
		MinLat:  minLat,
		MaxLat:  maxLat,
		MinLng:  minLng,
		MaxLng:  maxLng,
	}

	result, err := h.svc.Search(r.Context(), params)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, result)
}

// GetByID handles GET /api/schools/{id}
func (h *SchoolHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	school, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, school)
}

// GetGeo handles GET /api/schools/geo
func (h *SchoolHandler) GetGeo(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	minLat, _ := strconv.ParseFloat(q.Get("min_lat"), 64)
	maxLat, _ := strconv.ParseFloat(q.Get("max_lat"), 64)
	minLng, _ := strconv.ParseFloat(q.Get("min_lng"), 64)
	maxLng, _ := strconv.ParseFloat(q.Get("max_lng"), 64)

	schools, err := h.svc.GetGeo(r.Context(), minLat, maxLat, minLng, maxLng)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, schools)
}

// GetMapData handles GET /api/schools/map - returns minimal data for all schools
func (h *SchoolHandler) GetMapData(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.GetAllForMap(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, data)
}

// GetStates handles GET /api/schools/states
func (h *SchoolHandler) GetStates(w http.ResponseWriter, r *http.Request) {
	states := h.svc.GetStates(r.Context())
	writeJSON(w, http.StatusOK, states)
}

// --- Helpers ---

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(model.ErrorResponse{
		Error:   http.StatusText(status),
		Message: message,
	})
}
