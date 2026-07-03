package repositories

import (
	"si-bvet/internal/db"
	"si-bvet/internal/models"

	"gorm.io/gorm"
)

func CreateFeedback(feedback *models.Feedback) error {
	return db.DB.Create(feedback).Error
}

func CreateFeedbackTx(tx *gorm.DB, feedback *models.Feedback) error {
	return tx.Create(feedback).Error
}

func CreateFeedbackAnswer(answer *models.FeedbackAnswer) error {
	return db.DB.Create(answer).Error
}

func CreateFeedbackAnswerTx(tx *gorm.DB, answer *models.FeedbackAnswer) error {
	return tx.Create(answer).Error
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

func GetFeedbackQuestionsByIDs(ids []uint) ([]models.FeedbackQuestion, error) {
	var questions []models.FeedbackQuestion
	if len(ids) == 0 {
		return questions, nil
	}
	err := db.DB.Where("id IN ?", ids).Find(&questions).Error
	return questions, err
}

func CreateFeedbackQuestion(question *models.FeedbackQuestion) error {
	return db.DB.Create(question).Error
}

func CreateFeedbackQuestionsTx(tx *gorm.DB, questions []*models.FeedbackQuestion) error {
	return tx.Create(questions).Error
}

func GetFeedbackQuestionByID(id uint) (*models.FeedbackQuestion, error) {
	var question models.FeedbackQuestion
	err := db.DB.First(&question, id).Error
	return &question, err
}

func UpdateFeedbackQuestion(question *models.FeedbackQuestion) error {
	return db.DB.Save(question).Error
}

func DeleteFeedbackQuestion(id uint) error {
	result := db.DB.Delete(&models.FeedbackQuestion{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}