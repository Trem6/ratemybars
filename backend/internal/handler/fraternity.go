package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/ratemybars/backend/internal/service"
)

type FraternityHandler struct {
	svc *service.FraternityService
}

func NewFraternityHandler(svc *service.FraternityService) *FraternityHandler {
	return &FraternityHandler{svc: svc}
}

// GetBySchool handles GET /api/schools/{id}/fraternities
func (h *FraternityHandler) GetBySchool(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	frats := h.svc.GetBySchool(id)
	if frats == nil {
		frats = []string{}
	}
	writeJSON(w, http.StatusOK, frats)
}
