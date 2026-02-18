package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ratemybars/backend/internal/model"
	"golang.org/x/crypto/bcrypt"
)

// AuthService handles user registration and authentication.
// Supports PostgreSQL for persistent storage or in-memory fallback.
type AuthService struct {
	pool *pgxpool.Pool // nil = in-memory mode

	// In-memory fallback fields
	mu    sync.RWMutex
	users map[string]*userRecord
}

type userRecord struct {
	User         model.User
	Email        string
	PasswordHash string
}

// NewAuthService creates an auth service backed by PostgreSQL.
func NewAuthService(pool *pgxpool.Pool) *AuthService {
	return &AuthService{pool: pool}
}

// NewAuthServiceInMemory creates an auth service with in-memory storage (no persistence).
func NewAuthServiceInMemory() *AuthService {
	return &AuthService{
		users: make(map[string]*userRecord),
	}
}

func (s *AuthService) persistent() bool {
	return s.pool != nil
}

// Migrate creates the users table if it doesn't exist.
func (s *AuthService) Migrate(ctx context.Context) error {
	if !s.persistent() {
		return nil
	}
	query := `
		CREATE TABLE IF NOT EXISTS users (
			id            TEXT PRIMARY KEY,
			email         TEXT UNIQUE NOT NULL,
			username      TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			role          TEXT NOT NULL DEFAULT 'user',
			created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`
	if _, err := s.pool.Exec(ctx, query); err != nil {
		return err
	}
	// Add role column if table already existed without it
	_, _ = s.pool.Exec(ctx, `ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'`)
	return nil
}

// isAdminEmail checks if the given email is in the ADMIN_EMAILS env var.
func isAdminEmail(email string) bool {
	adminEmails := os.Getenv("ADMIN_EMAILS")
	if adminEmails == "" {
		return false
	}
	email = strings.ToLower(strings.TrimSpace(email))
	for _, ae := range strings.Split(adminEmails, ",") {
		if strings.ToLower(strings.TrimSpace(ae)) == email {
			return true
		}
	}
	return false
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
	role := "user"
	if isAdminEmail(req.Email) {
		role = "admin"
	}

	if s.persistent() {
		err = s.registerDB(userID, req.Email, req.Username, string(hash), role, now)
	} else {
		err = s.registerMemory(userID, req.Email, req.Username, string(hash), role, now)
	}
	if err != nil {
		return nil, err
	}

	user := model.User{
		ID:        userID,
		Username:  req.Username,
		Role:      role,
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

func (s *AuthService) registerDB(id, email, username, hash, role string, now time.Time) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := s.pool.Exec(ctx,
		`INSERT INTO users (id, email, username, password_hash, role, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		id, email, username, hash, role, now,
	)
	if err != nil {
		errMsg := err.Error()
		if contains(errMsg, "users_email_key") || contains(errMsg, "unique") && contains(errMsg, "email") {
			return fmt.Errorf("email already registered")
		}
		if contains(errMsg, "users_username_key") || contains(errMsg, "unique") && contains(errMsg, "username") {
			return fmt.Errorf("username already taken")
		}
		return fmt.Errorf("failed to create user: %w", err)
	}
	return nil
}

func (s *AuthService) registerMemory(id, email, username, hash, role string, now time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.users[email]; exists {
		return fmt.Errorf("email already registered")
	}
	for _, rec := range s.users {
		if rec.User.Username == username {
			return fmt.Errorf("username already taken")
		}
	}

	s.users[email] = &userRecord{
		User: model.User{
			ID:        id,
			Username:  username,
			Role:      role,
			CreatedAt: now,
		},
		Email:        email,
		PasswordHash: hash,
	}
	return nil
}

// Login authenticates a user with email/password.
func (s *AuthService) Login(req model.LoginRequest) (*model.AuthResponse, error) {
	if req.Email == "" || req.Password == "" {
		return nil, fmt.Errorf("email and password are required")
	}

	var user model.User
	var passwordHash string
	var err error

	if s.persistent() {
		user, passwordHash, err = s.loginDB(req.Email)
	} else {
		user, passwordHash, err = s.loginMemory(req.Email)
	}
	if err != nil {
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		return nil, fmt.Errorf("invalid email or password")
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

func (s *AuthService) loginDB(email string) (model.User, string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user model.User
	var passwordHash string

	err := s.pool.QueryRow(ctx,
		`SELECT id, username, role, password_hash, created_at FROM users WHERE email = $1`,
		email,
	).Scan(&user.ID, &user.Username, &user.Role, &passwordHash, &user.CreatedAt)

	if err != nil {
		if err == pgx.ErrNoRows {
			return model.User{}, "", fmt.Errorf("invalid email or password")
		}
		return model.User{}, "", fmt.Errorf("login failed: %w", err)
	}

	// If ADMIN_EMAILS changed, update role dynamically
	if isAdminEmail(email) && user.Role != "admin" {
		user.Role = "admin"
		s.pool.Exec(ctx, `UPDATE users SET role = 'admin' WHERE id = $1`, user.ID)
	}

	return user, passwordHash, nil
}

func (s *AuthService) loginMemory(email string) (model.User, string, error) {
	s.mu.RLock()
	rec, exists := s.users[email]
	s.mu.RUnlock()

	if !exists {
		return model.User{}, "", fmt.Errorf("invalid email or password")
	}

	// Dynamically update role if ADMIN_EMAILS changed
	if isAdminEmail(email) && rec.User.Role != "admin" {
		rec.User.Role = "admin"
	}

	return rec.User, rec.PasswordHash, nil
}

// GetUser retrieves a user by ID.
func (s *AuthService) GetUser(userID string) (*model.User, error) {
	if s.persistent() {
		return s.getUserDB(userID)
	}
	return s.getUserMemory(userID)
}

func (s *AuthService) getUserDB(userID string) (*model.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user model.User
	err := s.pool.QueryRow(ctx,
		`SELECT id, username, role, created_at FROM users WHERE id = $1`,
		userID,
	).Scan(&user.ID, &user.Username, &user.Role, &user.CreatedAt)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return &user, nil
}

func (s *AuthService) getUserMemory(userID string) (*model.User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, rec := range s.users {
		if rec.User.ID == userID {
			u := rec.User
			return &u, nil
		}
	}
	return nil, fmt.Errorf("user not found")
}

// UserInfo is a summary of a user for the admin panel (includes email).
type UserInfo struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Username  string    `json:"username"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

// ListUsers returns all users (admin only).
func (s *AuthService) ListUsers() ([]UserInfo, error) {
	if s.persistent() {
		return s.listUsersDB()
	}
	return s.listUsersMemory(), nil
}

func (s *AuthService) listUsersDB() ([]UserInfo, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := s.pool.Query(ctx,
		`SELECT id, email, username, role, created_at FROM users ORDER BY created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}
	defer rows.Close()

	var users []UserInfo
	for rows.Next() {
		var u UserInfo
		if err := rows.Scan(&u.ID, &u.Email, &u.Username, &u.Role, &u.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, u)
	}
	return users, nil
}

func (s *AuthService) listUsersMemory() []UserInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var users []UserInfo
	for _, rec := range s.users {
		users = append(users, UserInfo{
			ID:        rec.User.ID,
			Email:     rec.Email,
			Username:  rec.User.Username,
			Role:      rec.User.Role,
			CreatedAt: rec.User.CreatedAt,
		})
	}
	return users
}

// UpdateUserRole changes a user's role. Returns an error if the user is not found.
func (s *AuthService) UpdateUserRole(userID, role string) error {
	if role != "user" && role != "admin" {
		return fmt.Errorf("invalid role: must be 'user' or 'admin'")
	}
	if s.persistent() {
		return s.updateUserRoleDB(userID, role)
	}
	return s.updateUserRoleMemory(userID, role)
}

func (s *AuthService) updateUserRoleDB(userID, role string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tag, err := s.pool.Exec(ctx, `UPDATE users SET role = $1 WHERE id = $2`, role, userID)
	if err != nil {
		return fmt.Errorf("failed to update role: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("user not found")
	}
	return nil
}

func (s *AuthService) updateUserRoleMemory(userID, role string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, rec := range s.users {
		if rec.User.ID == userID {
			rec.User.Role = role
			return nil
		}
	}
	return fmt.Errorf("user not found")
}

func generateToken(user model.User) (string, error) {
	signingKey := os.Getenv("AUTH_SIGNING_KEY")
	if signingKey == "" {
		signingKey = "dev-signing-key-change-in-production"
	}

	role := user.Role
	if role == "" {
		role = "user"
	}

	claims := jwt.MapClaims{
		"sub":      user.ID,
		"username": user.Username,
		"role":     role,
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
