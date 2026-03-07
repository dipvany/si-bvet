package repositories

import (
	"si-bvet/internal/db"
	"si-bvet/internal/models"
)

func CreateSubmission(sub *models.Submission) error {
	return db.DB.Create(sub).Error
}

func GetSubmissionsByUser(userID uint) ([]models.Submission, error) {
	var submissions []models.Submission

	err := db.DB.Where("user_id = ?", userID).
		Order("created_at desc").
		Find(&submissions).Error

	return submissions, err
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