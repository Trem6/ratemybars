package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ratemybars/backend/internal/model"
	"golang.org/x/crypto/bcrypt"
)

// AuthService handles user registration and authentication
// using PostgreSQL for persistent storage.
type AuthService struct {
	pool *pgxpool.Pool
}

func NewAuthService(pool *pgxpool.Pool) *AuthService {
	return &AuthService{pool: pool}
}

// Migrate creates the users table if it doesn't exist.
func (s *AuthService) Migrate(ctx context.Context) error {
	query := `
		CREATE TABLE IF NOT EXISTS users (
			id            TEXT PRIMARY KEY,
			email         TEXT UNIQUE NOT NULL,
			username      TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`
	_, err := s.pool.Exec(ctx, query)
	return err
}

// Register creates a new user account.
func (s *AuthService) Register(req model.RegisterRequest) (*model.AuthResponse, error) {
	if req.Email == "" || req.Password == "" || req.Username == "" {
		return nil, fmt.Errorf("email, password, and username are required")
	}
	if len(req.Password) < 8 {
		return nil, fmt.Errorf("password must be at least 8 characters")
	}
	if len(req.Username) < 3 || len(req.Username) > 30 {
		return nil, fmt.Errorf("username must be between 3 and 30 characters")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	userID := generateID()
	now := time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = s.pool.Exec(ctx,
		`INSERT INTO users (id, email, username, password_hash, created_at)
		 VALUES ($1, $2, $3, $4, $5)`,
		userID, req.Email, req.Username, string(hash), now,
	)
	if err != nil {
		// Check for unique constraint violations
		errMsg := err.Error()
		if contains(errMsg, "users_email_key") || contains(errMsg, "unique") && contains(errMsg, "email") {
			return nil, fmt.Errorf("email already registered")
		}
		if contains(errMsg, "users_username_key") || contains(errMsg, "unique") && contains(errMsg, "username") {
			return nil, fmt.Errorf("username already taken")
		}
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	user := model.User{
		ID:        userID,
		Username:  req.Username,
		CreatedAt: now,
	}

	token, err := generateToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &model.AuthResponse{
		Token: token,
		User:  &user,
	}, nil
}

// Login authenticates a user with email/password.
func (s *AuthService) Login(req model.LoginRequest) (*model.AuthResponse, error) {
	if req.Email == "" || req.Password == "" {
		return nil, fmt.Errorf("email and password are required")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var userID, username, passwordHash string
	var createdAt time.Time

	err := s.pool.QueryRow(ctx,
		`SELECT id, username, password_hash, created_at FROM users WHERE email = $1`,
		req.Email,
	).Scan(&userID, &username, &passwordHash, &createdAt)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("invalid email or password")
		}
		return nil, fmt.Errorf("login failed: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		return nil, fmt.Errorf("invalid email or password")
	}

	user := model.User{
		ID:        userID,
		Username:  username,
		CreatedAt: createdAt,
	}

	token, err := generateToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &model.AuthResponse{
		Token: token,
		User:  &user,
	}, nil
}

// GetUser retrieves a user by ID.
func (s *AuthService) GetUser(userID string) (*model.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user model.User
	err := s.pool.QueryRow(ctx,
		`SELECT id, username, created_at FROM users WHERE id = $1`,
		userID,
	).Scan(&user.ID, &user.Username, &user.CreatedAt)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return &user, nil
}

func generateToken(user model.User) (string, error) {
	signingKey := os.Getenv("AUTH_SIGNING_KEY")
	if signingKey == "" {
		signingKey = "dev-signing-key-change-in-production"
	}

	claims := jwt.MapClaims{
		"sub":      user.ID,
		"username": user.Username,
		"iat":      time.Now().Unix(),
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(signingKey))
}

func generateID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// contains checks if s contains substr (simple helper to avoid importing strings).
func contains(s, substr string) bool {
	return len(s) >= len(substr) && searchString(s, substr)
}

func searchString(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
