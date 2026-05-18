package services_test

import (
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"si-bvet/internal/constants"
	"si-bvet/internal/db"
	"si-bvet/internal/models"
	"si-bvet/internal/services"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupBootstrapDB(t *testing.T) {
	t.Helper()

	dsn := fmt.Sprintf("file:bootstrap_%d?mode=memory&cache=shared", time.Now().UnixNano())
	gdb, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}

	db.DB = gdb

	if err := db.DB.AutoMigrate(&models.User{}, &models.Admin{}); err != nil {
		t.Fatalf("auto migrate bootstrap tables: %v", err)
	}
}

func setTestEnv(t *testing.T, key, value string) {
	t.Helper()

	previous, hadPrevious := os.LookupEnv(key)
	if err := os.Setenv(key, value); err != nil {
		t.Fatalf("set env %s: %v", key, err)
	}

	t.Cleanup(func() {
		if hadPrevious {
			_ = os.Setenv(key, previous)
			return
		}
		_ = os.Unsetenv(key)
	})
}

func unsetTestEnv(t *testing.T, key string) {
	t.Helper()

	previous, hadPrevious := os.LookupEnv(key)
	_ = os.Unsetenv(key)

	t.Cleanup(func() {
		if hadPrevious {
			_ = os.Setenv(key, previous)
		}
	})
}

func TestBootstrapInitialSuperAdmin(t *testing.T) {
	t.Run("skips when env is not configured", func(t *testing.T) {
		setupBootstrapDB(t)
		unsetTestEnv(t, "BOOTSTRAP_SUPERADMIN_EMAIL")
		unsetTestEnv(t, "BOOTSTRAP_SUPERADMIN_PASSWORD")

		if err := services.BootstrapInitialSuperAdmin(); err != nil {
			t.Fatalf("expected nil error, got %v", err)
		}
	})

	t.Run("requires email and password together", func(t *testing.T) {
		setupBootstrapDB(t)
		setTestEnv(t, "BOOTSTRAP_SUPERADMIN_EMAIL", "bootstrap@example.com")
		unsetTestEnv(t, "BOOTSTRAP_SUPERADMIN_PASSWORD")

		err := services.BootstrapInitialSuperAdmin()
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if !strings.Contains(err.Error(), "BOOTSTRAP_SUPERADMIN_EMAIL") || !strings.Contains(err.Error(), "BOOTSTRAP_SUPERADMIN_PASSWORD") {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("skips when superadmin already exists", func(t *testing.T) {
		setupBootstrapDB(t)
		setTestEnv(t, "BOOTSTRAP_SUPERADMIN_EMAIL", "bootstrap@example.com")
		setTestEnv(t, "BOOTSTRAP_SUPERADMIN_PASSWORD", "password123")

		existing := models.User{
			FullName:     "Existing Superadmin",
			Email:        "existing@example.com",
			Phone:        "080000000001",
			PasswordHash: "hash",
			Role:         constants.RoleSuperAdmin,
			IsVerified:   true,
		}
		if err := db.DB.Create(&existing).Error; err != nil {
			t.Fatalf("seed superadmin: %v", err)
		}

		if err := services.BootstrapInitialSuperAdmin(); err != nil {
			t.Fatalf("expected nil error, got %v", err)
		}

		var count int64
		if err := db.DB.Model(&models.User{}).Where("role = ?", constants.RoleSuperAdmin).Count(&count).Error; err != nil {
			t.Fatalf("count superadmins: %v", err)
		}
		if count != 1 {
			t.Fatalf("expected 1 superadmin, got %d", count)
		}
	})

	t.Run("rejects bootstrap when email already exists", func(t *testing.T) {
		setupBootstrapDB(t)
		setTestEnv(t, "BOOTSTRAP_SUPERADMIN_EMAIL", "bootstrap@example.com")
		setTestEnv(t, "BOOTSTRAP_SUPERADMIN_PASSWORD", "password123")

		user := models.User{
			FullName:     "Existing User",
			Email:        "bootstrap@example.com",
			Phone:        "080000000002",
			PasswordHash: "hash",
			Role:         "customer",
			IsVerified:   true,
		}
		if err := db.DB.Create(&user).Error; err != nil {
			t.Fatalf("seed user: %v", err)
		}

		err := services.BootstrapInitialSuperAdmin()
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		if !strings.Contains(err.Error(), "cannot bootstrap superadmin") {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("creates initial superadmin and admin profile", func(t *testing.T) {
		setupBootstrapDB(t)
		setTestEnv(t, "BOOTSTRAP_SUPERADMIN_EMAIL", "bootstrap@example.com")
		setTestEnv(t, "BOOTSTRAP_SUPERADMIN_PASSWORD", "password123")
		setTestEnv(t, "BOOTSTRAP_SUPERADMIN_FULLNAME", "Bootstrap Superadmin")
		setTestEnv(t, "BOOTSTRAP_SUPERADMIN_PHONE", "080000000099")
		setTestEnv(t, "BOOTSTRAP_SUPERADMIN_POSITION", "Head Admin")
		setTestEnv(t, "BOOTSTRAP_SUPERADMIN_UNIT_LAB", "Central Lab")
		setTestEnv(t, "BOOTSTRAP_SUPERADMIN_EMPLOYEE_NO", "EMP-001")

		if err := services.BootstrapInitialSuperAdmin(); err != nil {
			t.Fatalf("expected nil error, got %v", err)
		}

		var createdUser models.User
		if err := db.DB.Where("email = ?", "bootstrap@example.com").First(&createdUser).Error; err != nil {
			t.Fatalf("load bootstrap user: %v", err)
		}
		if createdUser.Role != constants.RoleSuperAdmin || !createdUser.IsVerified {
			t.Fatalf("unexpected bootstrap user: %+v", createdUser)
		}
		if createdUser.VerifiedAt == nil {
			t.Fatal("expected verified timestamp to be set")
		}

		var createdAdmin models.Admin
		if err := db.DB.Where("user_id = ?", createdUser.ID).First(&createdAdmin).Error; err != nil {
			t.Fatalf("load bootstrap admin: %v", err)
		}
		if createdAdmin.Position != "Head Admin" || createdAdmin.UnitLab != "Central Lab" || createdAdmin.EmployeeNo != "EMP-001" {
			t.Fatalf("unexpected bootstrap admin: %+v", createdAdmin)
		}
	})
}