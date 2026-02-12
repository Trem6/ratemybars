package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/ratemybars/backend/internal/handler"
	"github.com/ratemybars/backend/internal/middleware"
	"github.com/ratemybars/backend/internal/seeddata"
	"github.com/ratemybars/backend/internal/service"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	// Initialize services
	schoolSvc := service.NewSchoolService()
	venueSvc := service.NewVenueService()
	ratingSvc := service.NewRatingService()
	authSvc := service.NewAuthService()

	// Load school data: prefer DATA_PATH env var, then local files, then embedded
	dataPath := os.Getenv("DATA_PATH")
	if dataPath == "" {
		candidates := []string{
			"data/schools.json",
			"../data/schools.json",
			"../../data/schools.json",
		}
		for _, c := range candidates {
			abs, _ := filepath.Abs(c)
			if _, err := os.Stat(abs); err == nil {
				dataPath = abs
				break
			}
		}
	}

	if dataPath != "" {
		if err := schoolSvc.LoadFromJSON(dataPath); err != nil {
			log.Printf("WARNING: Failed to load school data from file: %v", err)
		} else {
			log.Printf("Loaded %d schools from %s", schoolSvc.Count(), dataPath)
		}
	} else {
		// Fall back to embedded data
		if err := schoolSvc.LoadFromBytes(seeddata.SchoolsJSON); err != nil {
			log.Printf("WARNING: Failed to parse embedded school data: %v", err)
		} else {
			log.Printf("Loaded %d schools from embedded data", schoolSvc.Count())
		}
	}

	// Seed venue data
	venueSeeds := make([]struct {
		SchoolID    string
		Name        string
		Category    string
		Description string
		Address     string
		Latitude    float64
		Longitude   float64
	}, len(seeddata.SeedVenues))
	for i, sv := range seeddata.SeedVenues {
		venueSeeds[i].SchoolID = sv.SchoolID
		venueSeeds[i].Name = sv.Name
		venueSeeds[i].Category = sv.Category
		venueSeeds[i].Description = sv.Description
		venueSeeds[i].Address = sv.Address
		venueSeeds[i].Latitude = sv.Latitude
		venueSeeds[i].Longitude = sv.Longitude
	}
	venueSvc.LoadSeedData(venueSeeds)
	log.Printf("Seeded %d venues", venueSvc.Count())

	// Seed ratings for all venues
	allVenues := venueSvc.GetAllVenues()
	ratingSeeds := make([]struct{ ID string }, len(allVenues))
	for i, v := range allVenues {
		ratingSeeds[i].ID = v.ID
	}
	ratingSvc.LoadSeedData(ratingSeeds)
	log.Printf("Seeded %d ratings", ratingSvc.Count())

	// Update venue rating stats
	venueSvc.UpdateRatingStats(ratingSvc.GetVenueStats)

	// Update venue counts on schools
	venueCounts := make(map[string]int)
	for _, v := range allVenues {
		venueCounts[v.SchoolID]++
	}
	schoolSvc.UpdateVenueCounts(venueCounts)
	log.Printf("Updated venue counts for %d schools", len(venueCounts))

	// Initialize handlers
	schoolHandler := handler.NewSchoolHandler(schoolSvc)
	venueHandler := handler.NewVenueHandler(venueSvc)
	ratingHandler := handler.NewRatingHandler(ratingSvc)
	authHandler := handler.NewAuthHandler(authSvc)

	// Build router
	r := chi.NewRouter()

	// Global middleware
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.Timeout(30 * time.Second))

	// CORS
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{frontendURL, "https://frontend-orpin-alpha-25.vercel.app"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","schools":` + fmt.Sprintf("%d", schoolSvc.Count()) + `}`))
	})

	// API routes
	r.Route("/api", func(r chi.Router) {
		// Public read routes (lenient rate limit)
		r.Group(func(r chi.Router) {
			r.Use(middleware.ReadRateLimit())

			// School routes
			r.Get("/schools", schoolHandler.Search)
			r.Get("/schools/map", schoolHandler.GetMapData)
			r.Get("/schools/geo", schoolHandler.GetGeo)
			r.Get("/schools/states", schoolHandler.GetStates)
			r.Get("/schools/{id}", schoolHandler.GetByID)
			r.Get("/schools/{id}/venues", venueHandler.ListBySchool)

			// Venue routes
			r.Get("/venues/{id}", venueHandler.GetByID)
			r.Get("/venues/{id}/ratings", ratingHandler.ListByVenue)

			// Stats
			r.Get("/stats", func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(map[string]int{
					"schools": schoolSvc.Count(),
					"venues":  venueSvc.Count(),
					"ratings": ratingSvc.Count(),
				})
			})
		})

		// Auth routes (moderate rate limit)
		r.Group(func(r chi.Router) {
			r.Use(middleware.RateLimit(0.2, 10)) // ~12 req/min
			r.Use(middleware.SanitizeInput)

			r.Post("/auth/register", authHandler.Register)
			r.Post("/auth/login", authHandler.Login)
			r.Post("/auth/logout", authHandler.Logout)
		})

		// Protected routes (auth required, strict rate limit)
		r.Group(func(r chi.Router) {
			r.Use(middleware.AuthRequired)
			r.Use(middleware.StrictRateLimit())
			r.Use(middleware.SanitizeInput)

			r.Get("/auth/me", authHandler.Me)
			r.Post("/venues", venueHandler.Create)
			r.Post("/ratings", ratingHandler.Create)
		})
	})

	log.Printf("RateMyBars API starting on :%s", port)
	log.Printf("Frontend CORS origin: %s", frontendURL)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}
