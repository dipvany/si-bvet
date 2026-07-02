package repositories

import (
	"si-bvet/internal/db"
	"si-bvet/internal/models"
)

func CreateFeedback(feedback *models.Feedback) error {
	return db.DB.Create(feedback).Error
}

func GetAllFeedbacks() ([]models.Feedback, error) {
	var feedbacks []models.Feedback
	err := db.DB.Order("id desc").Find(&feedbacks).Error
	return feedbacks, err
}

func GetFeedbackByID(id uint) (*models.Feedback, error) {
	var feedback models.Feedback
	err := db.DB.First(&feedback, id).Error
	return &feedback, err
}