package services

import (
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

	return repositories.CreateTestService(&service)
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

	return repositories.UpdateTestService(&service)
}

func DeleteTestService(id uint) error {
	return repositories.DeleteTestService(id)
}
