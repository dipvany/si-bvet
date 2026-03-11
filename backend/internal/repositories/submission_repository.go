package repositories

import (
	"si-bvet/internal/db"
	"si-bvet/internal/models"
)

func CreateSubmission(sub *models.Submission) error {
	return db.DB.Create(sub).Error
}

func CreateSubmissionWithSamples(submission *models.Submission, samples []models.Sample) error {
	
	tx := db.DB.Begin()

	if err := tx.Create(submission).Error; err != nil {
		tx.Rollback()
		return err
	}

	for i := range samples {
		samples[i].SubmissionID = submission.ID
	}

	if err := tx.Create(&samples).Error; err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

func GetSubmissionsByUser(userID uint) ([]models.Submission, error) {
	var submissions []models.Submission

	err := db.DB.Where("user_id = ?", userID).
		Order("id desc").
		Find(&submissions).Error

	return submissions, err
}

func GetAllSubmissions() ([]models.Submission, error) {

	var submissions []models.Submission

	err := db.DB.
		Preload("User").
		Order("id desc").
		Find(&submissions).Error
	
	return submissions, err
}

func UpdateSubmissionStatus(id uint, status string) error {
	return db.DB.
		Model(&models.Submission{}).
		Where("id = ?", id).
		Update("process_status", status).Error
}