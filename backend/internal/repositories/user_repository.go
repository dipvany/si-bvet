package repositories

import (
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

func DeleteUserByIDTx(tx *gorm.DB, id uint) error {
	return tx.Delete(&models.User{}, id).Error
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
// get all customers
func GetAllCustomers() ([]models.User, error) {
	var users []models.User
	err := db.DB.Where("role = ?", "customer").Find(&users).Error
	return users, err
}

// get semua data profile berdasarkan userID dan role
func GetUserProfile(userID uint) (models.User, error) {
	var user models.User
	err := db.DB.Preload("Customer").Preload("Admin").Where("id = ?", userID).First(&user).Error
	return user, err
}

