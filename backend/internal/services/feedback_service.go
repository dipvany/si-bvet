package services

import (
	"fmt"
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

	err := repositories.CreateFeedback(&feedback)
	if err == nil {
		LogSystemActivity(fmt.Sprintf("Feedback baru diterima dari user ID %d dengan rating %d", userID, req.Rating))
	}
	return err
}

func GetAllFeedbacks() ([]models.Feedback, error) {
	return repositories.GetAllFeedbacks()
}

func GetFeedbackByUserID(userID uint) ([]models.Feedback, error) {
	return repositories.GetFeedbacksByUserID(userID)
}
