package middleware

import (
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// IPRateLimiter manages per-IP rate limiters.
type IPRateLimiter struct {
	mu       sync.RWMutex
	limiters map[string]*rateLimiterEntry
	rate     rate.Limit
	burst    int
	cleanup  time.Duration
}

type rateLimiterEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// NewIPRateLimiter creates a new IP-based rate limiter.
// r is requests per second, b is burst size.
func NewIPRateLimiter(r rate.Limit, b int) *IPRateLimiter {
	rl := &IPRateLimiter{
		limiters: make(map[string]*rateLimiterEntry),
		rate:     r,
		burst:    b,
		cleanup:  3 * time.Minute,
	}

	// Background cleanup of stale entries
	go rl.cleanupLoop()

	return rl
}

func (rl *IPRateLimiter) getLimiter(ip string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	entry, exists := rl.limiters[ip]
	if !exists {
		limiter := rate.NewLimiter(rl.rate, rl.burst)
		rl.limiters[ip] = &rateLimiterEntry{
			limiter:  limiter,
			lastSeen: time.Now(),
		}
		return limiter
	}

	entry.lastSeen = time.Now()
	return entry.limiter
}

func (rl *IPRateLimiter) cleanupLoop() {
	ticker := time.NewTicker(rl.cleanup)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()
		for ip, entry := range rl.limiters {
			if time.Since(entry.lastSeen) > rl.cleanup {
				delete(rl.limiters, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// RateLimit returns an HTTP middleware that enforces per-IP rate limiting.
func RateLimit(requestsPerSecond float64, burst int) func(http.Handler) http.Handler {
	limiter := NewIPRateLimiter(rate.Limit(requestsPerSecond), burst)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := extractIP(r)
			if !limiter.getLimiter(ip).Allow() {
				http.Error(w, `{"error":"rate_limit_exceeded","message":"Too many requests. Please slow down."}`, http.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// StrictRateLimit is a stricter rate limiter for write operations.
func StrictRateLimit() func(http.Handler) http.Handler {
	return RateLimit(0.1, 5) // ~6 req/min, burst of 5
}

// ReadRateLimit is a more lenient rate limiter for read operations.
func ReadRateLimit() func(http.Handler) http.Handler {
	return RateLimit(1.0, 30) // ~60 req/min, burst of 30
}

func extractIP(r *http.Request) string {
	// Check X-Forwarded-For first (for reverse proxies)
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		return forwarded
	}
	// Check X-Real-IP
	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		return realIP
	}
	return r.RemoteAddr
}
