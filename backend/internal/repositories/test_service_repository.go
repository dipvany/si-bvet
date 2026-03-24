package repositories

import (
	"si-bvet/internal/db"
	"si-bvet/internal/models"
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
	return db.DB.Delete(&models.TestService{}, id).Error
}