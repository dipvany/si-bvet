package services

import (
	"errors"
	"fmt"
	"os"
	"time"

	"si-bvet/internal/models"
	"si-bvet/internal/repositories"
	"si-bvet/internal/utils"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// UserRepository interface untuk dependency injection
type UserRepository interface {
	CreateUser(user *models.User) error
	GetUserByEmail(email string) (*models.User, error)
	GetUserByID(id uint) (*models.User, error)
	SaveUser(user *models.User) error
}

// AuthServiceInterface defines auth service contract untuk testing
type AuthServiceInterface interface {
	RegisterUser(user *models.User) error
	LoginUser(email, password string) (*models.User, error)
	ChangePassword(userID uint, currentPassword, newPassword string) error
	RequestPasswordReset(email string) error
	ResetPassword(userID uint, token string, expiresUnix int64, signature, newPassword string) error
}

var (
	ErrPasswordResetLinkExpired = errors.New("password reset link expired")
	ErrPasswordResetLinkUsed    = errors.New("password reset link already used")
	ErrPasswordResetLinkInvalid  = errors.New("password reset link invalid")
	ErrCurrentPasswordIncorrect  = errors.New("current password incorrect")
	ErrPasswordResetNotFound     = errors.New("password reset request not found")
)

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
	err = s.userRepo.CreateUser(user)
	if err == nil {
		LogSystemActivity(fmt.Sprintf("Registrasi akun baru diterima untuk %s (%s)", user.FullName, user.Email))
	}
	return err
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
		// Log percobaan login gagal tanpa mengekspos detail user
		actor := user.FullName
		LogActivity(actor, user.Role, fmt.Sprintf("Percobaan login gagal untuk email %s (password salah)", email), &user.ID, "N/A", "POST", "/api/auth/login")
		return nil, errors.New("password incorrect")
	}

	return user, nil
}

func (s *AuthService) ChangePassword(userID uint, currentPassword, newPassword string) error {
	user, err := s.userRepo.GetUserByID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("user not found")
		}
		return err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(currentPassword)); err != nil {
		return ErrCurrentPasswordIncorrect
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user.PasswordHash = string(hash)
	user.ResetPasswordTokenHash = ""
	user.ResetPasswordExpiresAt = nil
	user.ResetPasswordUsedAt = nil

	err = s.userRepo.SaveUser(user)
	if err == nil {
		LogUserActivity(user, "Berhasil mengganti password", "N/A", "PATCH", "/api/auth/change-password")
	}
	return err
}

func (s *AuthService) RequestPasswordReset(email string) error {
	user, err := s.userRepo.GetUserByEmail(email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}

	if !user.IsVerified {
		return nil
	}

	token, err := utils.GenerateRandomToken(32)
	if err != nil {
		return err
	}

	expiresAt := time.Now().Add(1 * time.Hour)
	user.ResetPasswordTokenHash = utils.HashOneTimeLoginToken(token)
	user.ResetPasswordExpiresAt = &expiresAt
	user.ResetPasswordUsedAt = nil

	if err := s.userRepo.SaveUser(user); err != nil {
		return err
	}

	resetURL, err := utils.BuildPasswordResetURL(os.Getenv("APP_LOGIN_URL"), user.ID, token, expiresAt)
	if err != nil {
		return err
	}

	SendPasswordResetEmail(user.FullName, user.Email, resetURL)
	LogUserActivity(user, "Meminta reset password", "N/A", "POST", "/api/auth/forgot-password")
	return nil
}

func (s *AuthService) ResetPassword(userID uint, token string, expiresUnix int64, signature, newPassword string) error {
	if err := utils.ValidateOneTimeLoginSignature(userID, token, expiresUnix, signature); err != nil {
		return ErrPasswordResetLinkInvalid
	}

	user, err := s.userRepo.GetUserByID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrPasswordResetNotFound
		}
		return err
	}

	if user.ResetPasswordUsedAt != nil {
		return ErrPasswordResetLinkUsed
	}

	if user.ResetPasswordExpiresAt == nil || user.ResetPasswordTokenHash == "" {
		return ErrPasswordResetNotFound
	}

	if time.Now().After(*user.ResetPasswordExpiresAt) || time.Now().Unix() > expiresUnix {
		return ErrPasswordResetLinkExpired
	}

	if user.ResetPasswordTokenHash != utils.HashOneTimeLoginToken(token) {
		return ErrPasswordResetLinkInvalid
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	now := time.Now()
	user.PasswordHash = string(hash)
	user.ResetPasswordTokenHash = ""
	user.ResetPasswordExpiresAt = nil
	user.ResetPasswordUsedAt = &now

	err = s.userRepo.SaveUser(user)
	if err == nil {
		LogUserActivity(user, "Berhasil mereset password melalui link email", "N/A", "POST", "/api/auth/reset-password")
	}
	return err
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

func (d *DefaultUserRepository) GetUserByID(id uint) (*models.User, error) {
	user, err := repositories.GetUserByID(id)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (d *DefaultUserRepository) SaveUser(user *models.User) error {
	return repositories.SaveUser(user)
}