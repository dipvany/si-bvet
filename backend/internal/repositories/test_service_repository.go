package repositories

import (
	"si-bvet/internal/db"
	"si-bvet/internal/models"

	"gorm.io/gorm"
)

func CreateTestService(service *models.TestService) error {
	return db.DB.Create(service).Error
}

func GetAllTestServices() ([]models.TestService, error) {
	
	var services []models.TestService

	err := db.DB.
		Order("test_name asc").
		Find(&services).Error

	return services, err
}

func GetTestServiceByID(id uint) (models.TestService, error) {
	
	var service models.TestService

	err := db.DB.First(&service, id).Error

	return service, err
}

func UpdateTestService(service *models.TestService) error {
	return db.DB.Save(service).Error
}

func DeleteTestService(id uint) error {
	result := db.DB.Delete(&models.TestService{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}