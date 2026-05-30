package repositories

import (
	"errors"

	"si-bvet/internal/db"
	"si-bvet/internal/models"

	"gorm.io/gorm"
)

func CreateSubmissionSampleTemplate(template *models.SubmissionSampleTemplate) error {
	return db.DB.Create(template).Error
}

func GetLatestSubmissionSampleTemplate() (*models.SubmissionSampleTemplate, error) {
	var template models.SubmissionSampleTemplate
	err := db.DB.Order("id desc").First(&template).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &template, nil
}