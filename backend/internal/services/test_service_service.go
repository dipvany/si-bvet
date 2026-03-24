package services

import (
	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/repositories"
)

func CreateTestService(req dto.TestServiceRequest) error {
	
	service := models.TestService{
		TestName:    req.TestName,
		UnitLab:     req.UnitLab,
		Target:      req.Target,	
		Price:       req.Price,
		Description: req.Description,
		SampleReqmt: req.SampleReqmt,
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
	service.Price = req.Price
	service.Description = req.Description
	service.SampleReqmt = req.SampleReqmt

	return repositories.UpdateTestService(&service)
}

func DeleteTestService(id uint) error {
	return repositories.DeleteTestService(id)
}
