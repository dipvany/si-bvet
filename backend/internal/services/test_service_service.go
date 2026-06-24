package services

import (
	"fmt"
	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/repositories"
)

func CreateTestService(req dto.TestServiceRequest) error {
	service := models.TestService{
		TestName:      req.TestName,
		UnitLab:       req.UnitLab,
		Target:        req.Target,
		Method:        req.Method,
		ResultType:    req.ResultType,
		TestReference: req.TestReference,
		Price:         req.Price,
		Duration:      req.Duration,
		Description:   req.Description,
	}

	err := repositories.CreateTestService(&service)
	if err == nil {
		LogSystemActivity(fmt.Sprintf("Layanan pengujian baru dibuat: '%s'", req.TestName))
	}
	return err
}

func GetAllTestServices() ([]models.TestService, error) {
	return repositories.GetAllTestServices()
}

func GetTestServiceByID(id uint) (models.TestService, error) {
	return repositories.GetTestServiceByID(id)
}

func UpdateTestService(id uint, req dto.TestServiceRequest) error {
	service, err := repositories.GetTestServiceByID(id)
	if err != nil {
		return err
	}

	service.TestName = req.TestName
	service.UnitLab = req.UnitLab
	service.Target = req.Target
	service.Method = req.Method
	service.ResultType = req.ResultType
	service.TestReference = req.TestReference
	service.Price = req.Price
	service.Duration = req.Duration
	service.Description = req.Description

	err = repositories.UpdateTestService(&service)
	if err == nil {
		LogSystemActivity(fmt.Sprintf("Layanan pengujian ID %d ('%s') diperbarui", id, req.TestName))
	}
	return err
}

func DeleteTestService(id uint) error {
	err := repositories.DeleteTestService(id)
	if err == nil {
		LogSystemActivity(fmt.Sprintf("Layanan pengujian ID %d dihapus", id))
	}
	return err
}
