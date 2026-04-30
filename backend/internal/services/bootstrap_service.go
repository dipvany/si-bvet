package services

import (
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"si-bvet/internal/constants"
	"si-bvet/internal/db"
	"si-bvet/internal/models"
	"si-bvet/internal/repositories"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const (
	bootstrapEmailEnv      = "BOOTSTRAP_SUPERADMIN_EMAIL"
	bootstrapPasswordEnv   = "BOOTSTRAP_SUPERADMIN_PASSWORD"
	bootstrapFullNameEnv   = "BOOTSTRAP_SUPERADMIN_FULLNAME"
	bootstrapPhoneEnv      = "BOOTSTRAP_SUPERADMIN_PHONE"
	bootstrapPositionEnv   = "BOOTSTRAP_SUPERADMIN_POSITION"
	bootstrapUnitLabEnv    = "BOOTSTRAP_SUPERADMIN_UNIT_LAB"
	bootstrapEmployeeNoEnv = "BOOTSTRAP_SUPERADMIN_EMPLOYEE_NO"
)

func BootstrapInitialSuperAdmin() error {
	email := strings.TrimSpace(os.Getenv(bootstrapEmailEnv))
	password := strings.TrimSpace(os.Getenv(bootstrapPasswordEnv))

	// If bootstrap env is not configured, skip safely.
	if email == "" && password == "" {
		log.Println("Initial superadmin bootstrap skipped: env not configured")
		return nil
	}

	if email == "" || password == "" {
		return fmt.Errorf("initial superadmin bootstrap requires both %s and %s", bootstrapEmailEnv, bootstrapPasswordEnv)
	}

	var superAdminCount int64
	if err := db.DB.Model(&models.User{}).
		Where("role = ?", constants.RoleSuperAdmin).
		Count(&superAdminCount).Error; err != nil {
		return err
	}

	if superAdminCount > 0 {
		log.Println("Initial superadmin bootstrap skipped: superadmin already exists")
		return nil
	}

	existingByEmail, err := repositories.GetUserByEmail(email)
	if err == nil && existingByEmail != nil {
		return fmt.Errorf("cannot bootstrap superadmin: user with email %s already exists", email)
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	fullName := strings.TrimSpace(os.Getenv(bootstrapFullNameEnv))
	if fullName == "" {
		fullName = "Initial Superadmin"
	}

	phone := strings.TrimSpace(os.Getenv(bootstrapPhoneEnv))
	if phone == "" {
		phone = "080000000000"
	}

	now := time.Now()

	return db.DB.Transaction(func(tx *gorm.DB) error {
		user := models.User{
			FullName:     fullName,
			Email:        email,
			Phone:        phone,
			PasswordHash: string(hash),
			Role:         constants.RoleSuperAdmin,
			IsVerified:   true,
			VerifiedAt:   &now,
		}

		if err := repositories.CreateUserTx(tx, &user); err != nil {
			return err
		}

		admin := models.Admin{
			UserID:     user.ID,
			Position:   strings.TrimSpace(os.Getenv(bootstrapPositionEnv)),
			UnitLab:    strings.TrimSpace(os.Getenv(bootstrapUnitLabEnv)),
			EmployeeNo: strings.TrimSpace(os.Getenv(bootstrapEmployeeNoEnv)),
		}

		if err := repositories.CreateAdminProfileTx(tx, &admin); err != nil {
			return err
		}

		log.Printf("Initial superadmin bootstrap completed for %s", email)
		return nil
	})
}