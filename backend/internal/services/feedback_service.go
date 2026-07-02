package services

import (
	"fmt"
	"log"
	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/repositories"
	"time"
)

func CreateFeedback(req dto.FeedbackRequest) error {
    now := time.Now()

    feedback := models.Feedback{
        Fullname:      req.Fullname,
        Email:         req.Email,
        Gender:        req.Gender,
        LastEducation: req.LastEducation,
        Occupation:    req.Occupation,
        TypeService:   req.TypeService,
        Rating1:       req.Rating1,
        Rating2:       req.Rating2,
        Rating3:       req.Rating3,
        Rating4:       req.Rating4,
        Rating5:       req.Rating5,
        Rating6:       req.Rating6,
        Rating7:       req.Rating7,
        Rating8:       req.Rating8,
        Rating9:       req.Rating9,
        CreatedAt:     now,
    }

	err := repositories.CreateFeedback(&feedback)
	if err == nil {
		if emailErr := SendFeedbackSubmittedEmail(req); emailErr != nil {
			log.Printf("failed to send feedback confirmation email for %s: %v", feedback.Email, emailErr)
		}
    	LogSystemActivity(fmt.Sprintf("Feedback created from: %s", feedback.Fullname))
	}
	return err
}

func GetAllFeedbacks() ([]models.Feedback, error) {
	return repositories.GetAllFeedbacks()
}

func GetFeedbackByID(id uint) (*models.Feedback, error) {
	return repositories.GetFeedbackByID(id)
}
