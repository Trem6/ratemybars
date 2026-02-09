package middleware

import (
	"bytes"
	"io"
	"net/http"

	"github.com/microcosm-cc/bluemonday"
)

var policy = bluemonday.StrictPolicy()

// SanitizeInput sanitizes all request body input by stripping HTML/scripts.
func SanitizeInput(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Body != nil && r.ContentLength > 0 {
			body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20)) // 1MB max
			r.Body.Close()
			if err != nil {
				http.Error(w, `{"error":"bad_request","message":"Could not read request body"}`, http.StatusBadRequest)
				return
			}

			sanitized := policy.SanitizeBytes(body)
			r.Body = io.NopCloser(bytes.NewReader(sanitized))
			r.ContentLength = int64(len(sanitized))
		}
		next.ServeHTTP(w, r)
	})
}

// SanitizeString strips HTML tags and scripts from a string.
func SanitizeString(s string) string {
	return policy.Sanitize(s)
}
