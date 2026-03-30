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


// get feedback by my user id
func GetFeedbacksByUserID(userID uint) ([]models.Feedback, error) {
	var feedbacks []models.Feedback

	err := db.DB.Where("user_id = ?", userID).
		Order("id desc").
		Find(&feedbacks).Error
	
	return feedbacks, err
}

