package middleware

import (
	"net/http"
	"strings"

	"github.com/microcosm-cc/bluemonday"
)

var policy = bluemonday.StrictPolicy()

// SanitizeInput is a no-op middleware for JSON APIs.
// JSON bodies must not be run through an HTML sanitizer (it converts
// quotes to &#34; and breaks the JSON). Instead, individual string
// fields are sanitized after decoding via SanitizeString.
func SanitizeInput(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip body sanitization for JSON content types —
		// use SanitizeString on individual fields after decoding instead.
		ct := r.Header.Get("Content-Type")
		if strings.Contains(ct, "application/json") {
			next.ServeHTTP(w, r)
			return
		}
		// For non-JSON content types, pass through as-is.
		next.ServeHTTP(w, r)
	})
}

// SanitizeString strips HTML tags and scripts from a string.
func SanitizeString(s string) string {
	return policy.Sanitize(s)
}
