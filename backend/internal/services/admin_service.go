package services

import (
	"errors"
	"fmt"
	"os"
	"si-bvet/internal/constants"
	"si-bvet/internal/db"
	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/repositories"
	"si-bvet/internal/utils"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrUserNotFound      = errors.New("user not found")
	ErrAccountNotFound   = errors.New("account not found")
	ErrInvalidRole       = errors.New("role must be admin or superadmin")
	ErrNotManagedAccount = errors.New("target user is not a managed account")
	ErrNotCustomerAccount = errors.New("target user is not a customer account")
	ErrDeleteOwnAccount  = errors.New("cannot delete your own account")
)

type UpdateAdminAccountRequest struct {
	FullName   *string
	Email      *string
	Phone      *string
	Position   *string
	UnitLab    *string
	EmployeeNo *string
	Role       *string
}

func IsManagedRole(role string) bool {
	return role == constants.RoleAdmin || role == constants.RoleSuperAdmin
}

func CreateAdminAccount(req dto.AdminRequest) error {
	if !IsManagedRole(req.Role) {
		return ErrInvalidRole
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	return db.DB.Transaction(func(tx *gorm.DB) error {
		user := models.User{
			FullName:     req.FullName,
			Email:        req.Email,
			Phone:        req.Phone,
			PasswordHash: string(hash),
			Role:         req.Role,
			IsVerified:   false,
		}

		if err := repositories.CreateUserTx(tx, &user); err != nil {
			return err
		}

		admin := models.Admin{
			UserID:     user.ID,
			Position:   req.Position,
			UnitLab:    req.UnitLab,
			EmployeeNo: req.EmployeeNo,
		}

		if err := repositories.CreateAdminProfileTx(tx, &admin); err != nil {
			return err
		}
		LogSystemActivity(fmt.Sprintf("Akun admin/superadmin baru dibuat untuk %s (%s) dengan role %s", user.FullName, user.Email, user.Role))
		return nil
	})
}

func CreateCustomerAccount(req dto.CustomerCreateRequest) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	return db.DB.Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		user := models.User{
			FullName:     req.FullName,
			Email:        req.Email,
			Phone:        req.Phone,
			PasswordHash: string(hash),
			Role:         constants.RoleCustomer,
			IsVerified:   true,
			IsActive:     req.IsActive,
			VerifiedAt:   &now,
			Institution:  req.Institution,
		}

		if err := repositories.CreateUserTx(tx, &user); err != nil {
			return err
		}

		customer := models.Customer{
			UserID: user.ID,
			Group:  req.Group,
			MembershipNo: req.MembershipNo,
			PICName:      req.PICName,
			PICContact:   req.PICContact,
			Province:     req.Province,
			City:         req.City,
			Subdistrict:  req.Subdistrict,
			Village:      req.Village,
			Address:      req.Address,
			ZipCode:      req.ZipCode,
		}

		if err := repositories.CreateCustomerTx(tx, &customer); err != nil {
			return err
		}

		LogSystemActivity(fmt.Sprintf(
			"Akun customer baru dibuat oleh Superadmin untuk %s (%s)",
			user.FullName, user.Email,
		))
		return nil
	})
}

func UpdateCustomerAccount(userID uint, req dto.CustomerUpdateRequest) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		user, err := repositories.GetUserByIDTx(tx, userID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrAccountNotFound
			}
			return err
		}

		if user.Role != constants.RoleCustomer {
			return ErrNotCustomerAccount
		}

		// Update user fields
		if req.FullName != nil {
			user.FullName = *req.FullName
		}
		if req.Email != nil {
			user.Email = *req.Email
		}
		if req.Phone != nil {
			user.Phone = *req.Phone
		}
		if req.Institution != nil {
			user.Institution = *req.Institution
		}
		if req.IsActive != nil {
			user.IsActive = *req.IsActive
		}

		if err := repositories.SaveUserTx(tx, &user); err != nil {
			return err
		}

		// Update customer profile fields
		customer, err := repositories.GetCustomerProfileByUserIDTx(tx, user.ID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				// Jika profil tidak ada, buat baru (opsional, tergantung kebutuhan)
				customer = models.Customer{UserID: user.ID}
			} else {
				return err
			}
		}

		if req.Group != nil {
			customer.Group = *req.Group
		}
		if req.MembershipNo != nil {
			customer.MembershipNo = *req.MembershipNo
		}
		if req.PICName != nil {
			customer.PICName = *req.PICName
		}
		if req.PICContact != nil {
			customer.PICContact = *req.PICContact
		}
		if req.Province != nil {
			customer.Province = *req.Province
		}
		if req.City != nil {
			customer.City = *req.City
		}
		if req.Subdistrict != nil {
			customer.Subdistrict = *req.Subdistrict
		}
		if req.Village != nil {
			customer.Village = *req.Village
		}
		if req.Address != nil {
			customer.Address = *req.Address
		}
		if req.ZipCode != nil {
			customer.ZipCode = *req.ZipCode
		}

		LogSystemActivity(fmt.Sprintf("Profil akun customer untuk %s (%s) diperbarui", user.FullName, user.Email))
		return repositories.SaveCustomerProfileTx(tx, &customer)
	})
}

func GetManagedAccounts(roleFilter string) ([]models.Admin, error) {
	if roleFilter != "" && !IsManagedRole(roleFilter) {
		return nil, ErrInvalidRole
	}

	admins, err := repositories.GetAllAdminProfilesWithUser()
	if err != nil {
		return nil, err
	}

	filtered := make([]models.Admin, 0, len(admins))
	for _, admin := range admins {
		if !IsManagedRole(admin.User.Role) {
			continue
		}
		if roleFilter != "" && admin.User.Role != roleFilter {
			continue
		}
		filtered = append(filtered, admin)
	}

	return filtered, nil
}

func VerifyUserByID(userID uint) (models.User, error) {
	user, err := repositories.GetUserByID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.User{}, ErrUserNotFound
		}
		return models.User{}, err
	}

	now := time.Now()
	token, err := utils.GenerateRandomToken(32)
	if err != nil {
		return models.User{}, err
	}

	expiresAt := now.Add(24 * time.Hour)
	user.IsVerified = true
	user.VerifiedAt = &now
	user.LoginLinkTokenHash = utils.HashOneTimeLoginToken(token)
	user.LoginLinkExpiresAt = &expiresAt
	user.LoginLinkUsedAt = nil

	if err := repositories.SaveUser(&user); err != nil {
		return models.User{}, err
	}

	loginBaseURL := os.Getenv("APP_LOGIN_URL")
	loginURL, err := utils.BuildOneTimeLoginURL(loginBaseURL, user.ID, token, expiresAt)
	if err != nil {
		return models.User{}, err
	}

	SendVerificationApprovedEmail(user.FullName, user.Email, loginURL)
	LogSystemActivity(fmt.Sprintf("Verifikasi akun untuk %s (%s) disetujui", user.FullName, user.Email))
	return user, nil
}

func RejectUserByID(userID uint) error {
	user, err := repositories.GetUserByID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrUserNotFound
		}
		return err
	}

	SendVerificationRejectedEmail(user.FullName, user.Email)
	LogSystemActivity(fmt.Sprintf("Verifikasi akun untuk %s (%s) ditolak dan data dihapus", user.FullName, user.Email))
	return repositories.DeleteUserByID(user.ID)
}

func DeleteManagedAccount(targetID, actorID uint) error {
	if actorID != 0 && actorID == targetID {
		return ErrDeleteOwnAccount
	}

	return db.DB.Transaction(func(tx *gorm.DB) error {
		user, err := repositories.GetUserByIDTx(tx, targetID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrAccountNotFound
			}
			return err
		}

		if !IsManagedRole(user.Role) {
			return ErrNotManagedAccount
		}

		if err := repositories.DeleteAdminProfileByUserIDTx(tx, user.ID); err != nil {
			return err
		}

		LogSystemActivity(fmt.Sprintf("Akun terkelola %s (%s) dihapus oleh user ID %d", user.FullName, user.Email, actorID))
		return repositories.DeleteUserByIDTx(tx, user.ID)
	})
}

func DeleteCustomerAccount(targetID uint) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		user, err := repositories.GetUserByIDTx(tx, targetID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrAccountNotFound
			}
			return err
		}

		if user.Role != constants.RoleCustomer {
			return ErrNotCustomerAccount
		}

		if err := repositories.DeleteCustomerProfileByUserIDTx(tx, user.ID); err != nil {
			return err
		}

		LogSystemActivity(fmt.Sprintf(
			"Akun customer %s (%s) telah dihapus oleh Superadmin",
			user.FullName, user.Email))
		return repositories.DeleteUserByIDTx(tx, user.ID)
	})
}

func UpdateManagedAccount(userID uint, req UpdateAdminAccountRequest) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		user, err := repositories.GetUserByIDTx(tx, userID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrAccountNotFound
			}
			return err
		}

		if !IsManagedRole(user.Role) {
			return ErrNotManagedAccount
		}

		if req.FullName != nil {
			user.FullName = *req.FullName
		}
		if req.Email != nil {
			user.Email = *req.Email
		}
		if req.Phone != nil {
			user.Phone = *req.Phone
		}
		if req.Role != nil {
			if !IsManagedRole(*req.Role) {
				return ErrInvalidRole
			}
			user.Role = *req.Role
		}

		if err := repositories.SaveUserTx(tx, &user); err != nil {
			return err
		}

		admin, err := repositories.GetAdminProfileByUserIDTx(tx, user.ID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				admin = models.Admin{UserID: user.ID}
			} else {
				return err
			}
		}

		if req.Position != nil {
			admin.Position = *req.Position
		}
		if req.UnitLab != nil {
			admin.UnitLab = *req.UnitLab
		}
		if req.EmployeeNo != nil {
			admin.EmployeeNo = *req.EmployeeNo
		}

		LogSystemActivity(fmt.Sprintf("Profil akun terkelola untuk %s (%s) diperbarui", user.FullName, user.Email))
		return repositories.SaveAdminProfileTx(tx, &admin)
	})
}
