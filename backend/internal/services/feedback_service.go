package services

import (
	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/repositories"
	"time"
)

func CreateFeedback(userID uint, req dto.FeedbackRequest) error {
	now := time.Now()

	feedback := models.Feedback{
		UserID:    userID,
		Rating:   req.Rating,
		Comments: req.Comments,
		CreatedAt: &now,
	}

	return repositories.CreateFeedback(&feedback)
}

func GetAllFeedbacks() ([]models.Feedback, error) {
	return repositories.GetAllFeedbacks()
}

func GetFeedbackByUserID(userID uint) ([]models.Feedback, error) {
	return repositories.GetFeedbacksByUserID(userID)
}
