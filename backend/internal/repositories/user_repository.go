package repositories

import (
	"si-bvet/internal/db"
	"si-bvet/internal/models"
)

func CreateUser(user *models.User) error {
	return db.DB.Create(user).Error
}

func GetUserByEmail(email string) (*models.User, error) {
	var user models.User
	err := db.DB.Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func GetUserByID(userID uint) (models.User, error) {
	var user models.User
	err := db.DB.First(&user, userID).Error
	return user, err
}

func UpdateUserProfile(userID uint, fullName string, phone string) error {
	return db.DB.Model(&models.User{}).
		Where("id = ?", userID).
		Updates(map[string]interface{}{
			"fullname": fullName,
			"phone":    phone,
		}).Error
}

func UpdateCustomerProfile(userID uint, data map[string]interface{}) error {
	return db.DB.Model(&models.Customer{}).
		Where("user_id = ?", userID).
		Updates(data).Error
}

func UpdateAdminProfile(userID uint, data map[string]interface{}) error {
	return db.DB.Model(&models.Admin{}).
		Where("user_id = ?", userID).
		Updates(data).Error
}

