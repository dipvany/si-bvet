package services

import (
	"errors"
	"si-bvet/internal/models"
	"si-bvet/internal/repositories"

	"golang.org/x/crypto/bcrypt"
)

// UserRepository interface untuk dependency injection
type UserRepository interface {
	CreateUser(user *models.User) error
	GetUserByEmail(email string) (*models.User, error)
}

// AuthServiceInterface defines auth service contract untuk testing
type AuthServiceInterface interface {
	RegisterUser(user *models.User) error
	LoginUser(email, password string) (*models.User, error)
}

// AuthService menyimpan dependency untuk auth operations
type AuthService struct {
	userRepo UserRepository
}

// NewAuthService membuat instance baru AuthService dengan injected repository
func NewAuthService(userRepo UserRepository) *AuthService {
	return &AuthService{
		userRepo: userRepo,
	}
}

// RegisterUser melakukan hashing password dan menyimpan user ke database
func (s *AuthService) RegisterUser(user *models.User) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(user.PasswordHash), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	user.PasswordHash = string(hash)
	return s.userRepo.CreateUser(user)
}

// LoginUser memvalidasi email dan password, mengembalikan user jika valid
func (s *AuthService) LoginUser(email, password string) (*models.User, error) {
	user, err := s.userRepo.GetUserByEmail(email)
	if err != nil {
		return nil, errors.New("email not found")
	}

	if !user.IsVerified {
		return nil, errors.New("account not verified by admin")
	}

	err = bcrypt.CompareHashAndPassword(
		[]byte(user.PasswordHash), 
		[]byte(password),
	)
	if err != nil {
		return nil, errors.New("password incorrect")
	}

	return user, nil
}

// DefaultUserRepository adapter untuk kompatibilitas dengan kode yang sudah ada
// Ini menghubungkan interface ke concrete repository implementation
type DefaultUserRepository struct{}

func (d *DefaultUserRepository) CreateUser(user *models.User) error {
	return repositories.CreateUser(user)
}

func (d *DefaultUserRepository) GetUserByEmail(email string) (*models.User, error) {
	return repositories.GetUserByEmail(email)
}

// Global variable untuk service, akan diinisialisasi di main atau routes
var authService *AuthService

// InitAuthService menginisialisasi global auth service (untuk backward compatibility)
func InitAuthService(userRepo UserRepository) {
	authService = NewAuthService(userRepo)
}

// GetAuthService mengembalikan global auth service instance
func GetAuthService() *AuthService {
	if authService == nil {
		authService = NewAuthService(&DefaultUserRepository{})
	}
	return authService
}