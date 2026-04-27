package repositories

import (
	"si-bvet/internal/db"
	"si-bvet/internal/models"

	"gorm.io/gorm"
)

func CreateAdminProfile(admin *models.Admin) error {
	return db.DB.Create(admin).Error
}

func GetAllAdminProfilesWithUser() ([]models.Admin, error) {
	var admins []models.Admin
	err := db.DB.Preload("User").Find(&admins).Error
	return admins, err
}

func GetAdminProfileByUserID(userID uint) (models.Admin, error) {
	var admin models.Admin
	err := db.DB.Where("user_id = ?", userID).First(&admin).Error
	return admin, err
}

func SaveAdminProfile(admin *models.Admin) error {
	return db.DB.Save(admin).Error
}

func DeleteAdminProfileByUserID(userID uint) error {
	return db.DB.Where("user_id = ?", userID).Delete(&models.Admin{}).Error
}

func CreateAdminProfileTx(tx *gorm.DB, admin *models.Admin) error {
	return tx.Create(admin).Error
}

func GetAdminProfileByUserIDTx(tx *gorm.DB, userID uint) (models.Admin, error) {
	var admin models.Admin
	err := tx.Where("user_id = ?", userID).First(&admin).Error
	return admin, err
}

func SaveAdminProfileTx(tx *gorm.DB, admin *models.Admin) error {
	return tx.Save(admin).Error
}

func DeleteAdminProfileByUserIDTx(tx *gorm.DB, userID uint) error {
	return tx.Where("user_id = ?", userID).Delete(&models.Admin{}).Error
}
