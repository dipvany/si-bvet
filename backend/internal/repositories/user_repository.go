package repositories

import (
	"errors"
	"si-bvet/internal/db"
	"si-bvet/internal/models"

	"gorm.io/gorm"
)

func CreateUser(user *models.User) error {
	return db.DB.Create(user).Error
}

func CreateUserTx(tx *gorm.DB, user *models.User) error {
	return tx.Create(user).Error
}

func CreateCustomer(customer *models.Customer) error {
	return db.DB.Create(customer).Error
}

func CreateCustomerTx(tx *gorm.DB, customer *models.Customer) error {
	return tx.Create(customer).Error
}

func RegisterCustomerAccount(user *models.User) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		if err := CreateUserTx(tx, user); err != nil {
			return err
		}

		if user.Role == "customer" {
			customer := models.Customer{UserID: user.ID}
			if err := CreateCustomerTx(tx, &customer); err != nil {
				return err
			}
		}

		return nil
	})
}

func GetUserByEmail(email string) (*models.User, error) {
	var user models.User
	err := db.DB.Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func GetUserByID(id uint) (models.User, error) {
	var user models.User
	err := db.DB.First(&user, id).Error
	return user, err
}

func SaveUser(user *models.User) error {
	return db.DB.Save(user).Error
}

func DeleteUserByID(id uint) error {
	return db.DB.Delete(&models.User{}, id).Error
}

func GetUserByIDTx(tx *gorm.DB, id uint) (models.User, error) {
	var user models.User
	err := tx.First(&user, id).Error
	return user, err
}

func SaveUserTx(tx *gorm.DB, user *models.User) error {
	return tx.Save(user).Error
}

func SaveCustomerProfileTx(tx *gorm.DB, customer *models.Customer) error {
	return tx.Save(customer).Error
}

func DeleteUserByIDTx(tx *gorm.DB, id uint) error {
	return tx.Delete(&models.User{}, id).Error
}

func DeleteCustomerProfileByUserIDTx(tx *gorm.DB, userID uint) error {
	return tx.Delete(&models.Customer{}, "user_id = ?", userID).Error
}

func UpdateUserProfile(userID uint, data map[string]interface{}) error {
	if len(data) == 0 {
		return nil
	}

	return db.DB.Model(&models.User{}).
		Where("id = ?", userID).
		Updates(data).Error
}

func UpdateCustomerProfile(userID uint, data map[string]interface{}) error {
	if len(data) == 0 {
		return nil
	}

	return db.DB.Model(&models.Customer{}).
		Where("user_id = ?", userID).
		Updates(data).Error
}

func UpdateAdminProfile(userID uint, data map[string]interface{}) error {
	if len(data) == 0 {
		return nil
	}

	return db.DB.Model(&models.Admin{}).
		Where("user_id = ?", userID).
		Updates(data).Error
}

func UpdateProfileTx(
    userID uint,
    role string,
    userUpdates map[string]interface{},
    customerUpdates map[string]interface{},
    adminUpdates map[string]interface{},
) error {
    return db.DB.Transaction(func(tx *gorm.DB) error {
        if len(userUpdates) > 0 {
            if err := tx.Model(&models.User{}).
                Where("id = ?", userID).
                Updates(userUpdates).Error; err != nil {
                return err
            }
        }

        switch role {
        case "customer":
            if err := upsertCustomerProfileTx(tx, userID, customerUpdates); err != nil {
                return err
            }
        case "admin":
            if err := upsertAdminProfileTx(tx, userID, adminUpdates); err != nil {
                return err
            }
        }

        return nil
    })
}

func upsertCustomerProfileTx(tx *gorm.DB, userID uint, updates map[string]interface{}) error {
    customer, err := GetCustomerProfileTx(tx, userID)
    if err != nil {
        if !errors.Is(err, gorm.ErrRecordNotFound) {
            return err
        }
        customer = models.Customer{UserID: userID}
    }

    applyCustomerUpdates(&customer, updates)
    return SaveCustomerProfileTx(tx, &customer)
}

func upsertAdminProfileTx(tx *gorm.DB, userID uint, updates map[string]interface{}) error {
    admin, err := getAdminProfileTx(tx, userID)
    if err != nil {
        if !errors.Is(err, gorm.ErrRecordNotFound) {
            return err
        }
        admin = models.Admin{UserID: userID}
    }

    applyAdminUpdates(&admin, updates)
    return saveAdminProfileTx(tx, &admin)
}

func getAdminProfileTx(tx *gorm.DB, userID uint) (models.Admin, error) {
    var admin models.Admin
    err := tx.Where("user_id = ?", userID).First(&admin).Error
    return admin, err
}

func saveAdminProfileTx(tx *gorm.DB, admin *models.Admin) error {
    return tx.Save(admin).Error
}

func applyCustomerUpdates(customer *models.Customer, updates map[string]interface{}) {
    if v, ok := updates["group"].(string); ok {
        customer.Group = v
    }
    if v, ok := updates["is_membership"].(bool); ok {
        customer.IsMembership = v
    }
    if v, ok := updates["membership_no"].(string); ok {
        customer.MembershipNo = v
    }
    if v, ok := updates["pic_name"].(string); ok {
        customer.PICName = v
    }
    if v, ok := updates["pic_contact"].(string); ok {
        customer.PICContact = v
    }
    if v, ok := updates["province"].(string); ok {
        customer.Province = v
    }
    if v, ok := updates["city"].(string); ok {
        customer.City = v
    }
    if v, ok := updates["subdistrict"].(string); ok {
        customer.Subdistrict = v
    }
    if v, ok := updates["village"].(string); ok {
        customer.Village = v
    }
    if v, ok := updates["address"].(string); ok {
        customer.Address = v
    }
    if v, ok := updates["zip_code"].(string); ok {
        customer.ZipCode = v
    }
    if v, ok := updates["lhu_receiver_name"].(string); ok {
        customer.LhuReceiverName = v
    }
    if v, ok := updates["lhu_receiver_contact"].(string); ok {
        customer.LhuReceiverContact = v
    }
}

func applyAdminUpdates(admin *models.Admin, updates map[string]interface{}) {
    if v, ok := updates["position"].(string); ok {
        admin.Position = v
    }
    if v, ok := updates["unit_lab"].(string); ok {
        admin.UnitLab = v
    }
    if v, ok := updates["employee_no"].(string); ok {
        admin.EmployeeNo = v
    }
}

func GetAllCustomers() ([]models.User, error) {
	var users []models.User
	err := db.DB.Where("role = ?", "customer").Find(&users).Error
	return users, err
}

func GetUserProfileByRole(userID uint, role string) (interface{}, error) {
	if role == "customer" {
		return GetCustomerProfile(userID)
	} else if role == "admin" || role == "superadmin" {
		return GetAdminProfile(userID)
	}
	return nil, nil
}

func GetUserProfile(userID uint) (models.User, error) {
	var user models.User
	err := db.DB.Preload("Customer").Preload("Admin").First(&user, userID).Error
	return user, err
}

func GetAdminProfile(userID uint) (models.Admin, error) {
	var admin models.Admin
	err := db.DB.Where("user_id = ?", userID).First(&admin).Error
	return admin, err
}

func GetCustomerProfile(userID uint) (models.Customer, error) {
	var customer models.Customer
	err := db.DB.Where("user_id = ?", userID).First(&customer).Error
	return customer, err
}

func GetCustomerProfileTx(tx *gorm.DB, userID uint) (models.Customer, error) {
	var customer models.Customer
	err := tx.Where("user_id = ?", userID).First(&customer).Error
	return customer, err
}

