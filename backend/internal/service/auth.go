package service

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/ratemybars/backend/internal/model"
	"golang.org/x/crypto/bcrypt"
)

// AuthService handles user registration and authentication.
// In production, this integrates with Gel ext::auth.
// For prototype, uses in-memory storage with bcrypt.
type AuthService struct {
	mu    sync.RWMutex
	users map[string]*userRecord // keyed by email
}

type userRecord struct {
	User         model.User
	Email        string
	PasswordHash string
}

func NewAuthService() *AuthService {
	return &AuthService{
		users: make(map[string]*userRecord),
	}
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

	s.mu.Lock()
	defer s.mu.Unlock()

	// Check existing email
	if _, exists := s.users[req.Email]; exists {
		return nil, fmt.Errorf("email already registered")
	}

	// Check existing username
	for _, rec := range s.users {
		if rec.User.Username == req.Username {
			return nil, fmt.Errorf("username already taken")
		}
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	userID := generateID()
	user := model.User{
		ID:        userID,
		Username:  req.Username,
		CreatedAt: time.Now(),
	}

	s.users[req.Email] = &userRecord{
		User:         user,
		Email:        req.Email,
		PasswordHash: string(hash),
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

	s.mu.RLock()
	rec, exists := s.users[req.Email]
	s.mu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(rec.PasswordHash), []byte(req.Password)); err != nil {
		return nil, fmt.Errorf("invalid email or password")
	}

	token, err := generateToken(rec.User)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &model.AuthResponse{
		Token: token,
		User:  &rec.User,
	}, nil
}

// GetUser retrieves a user by ID.
func (s *AuthService) GetUser(userID string) (*model.User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, rec := range s.users {
		if rec.User.ID == userID {
			return &rec.User, nil
		}
	}
	return nil, fmt.Errorf("user not found")
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
