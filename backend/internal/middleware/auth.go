package middleware

import (
	"context"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const (
	UserIDKey   contextKey = "user_id"
	UserNameKey contextKey = "username"
)

// AuthRequired is a middleware that checks for a valid JWT in the Authorization header or cookie.
func AuthRequired(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenStr := extractToken(r)
		if tokenStr == "" {
			http.Error(w, `{"error":"unauthorized","message":"Authentication required"}`, http.StatusUnauthorized)
			return
		}

		signingKey := os.Getenv("AUTH_SIGNING_KEY")
		if signingKey == "" {
			signingKey = "dev-signing-key-change-in-production"
		}

		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(signingKey), nil
		})

		if err != nil || !token.Valid {
			http.Error(w, `{"error":"unauthorized","message":"Invalid or expired token"}`, http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, `{"error":"unauthorized","message":"Invalid token claims"}`, http.StatusUnauthorized)
			return
		}

		userID, _ := claims["sub"].(string)
		username, _ := claims["username"].(string)

		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		ctx = context.WithValue(ctx, UserNameKey, username)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// OptionalAuth extracts user info if present but doesn't require it.
func OptionalAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenStr := extractToken(r)
		if tokenStr == "" {
			next.ServeHTTP(w, r)
			return
		}

		signingKey := os.Getenv("AUTH_SIGNING_KEY")
		if signingKey == "" {
			signingKey = "dev-signing-key-change-in-production"
		}

		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(signingKey), nil
		})

		if err == nil && token.Valid {
			claims, ok := token.Claims.(jwt.MapClaims)
			if ok {
				userID, _ := claims["sub"].(string)
				username, _ := claims["username"].(string)
				ctx := context.WithValue(r.Context(), UserIDKey, userID)
				ctx = context.WithValue(ctx, UserNameKey, username)
				r = r.WithContext(ctx)
			}
		}

		next.ServeHTTP(w, r)
	})
}

func extractToken(r *http.Request) string {
	// Check Authorization header first
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && strings.EqualFold(parts[0], "bearer") {
			return parts[1]
		}
	}

	// Check cookie
	cookie, err := r.Cookie("auth_token")
	if err == nil {
		return cookie.Value
	}

	return ""
}

// GetUserID extracts user ID from context.
func GetUserID(ctx context.Context) string {
	if v, ok := ctx.Value(UserIDKey).(string); ok {
		return v
	}
	return ""
}

// GetUsername extracts username from context.
func GetUsername(ctx context.Context) string {
	if v, ok := ctx.Value(UserNameKey).(string); ok {
		return v
	}
	return ""
}
