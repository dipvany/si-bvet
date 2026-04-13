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

// update submission sebelum diapprove/reject
func UpdateSubmission(id uint, data map[string]interface{}) error {
	return db.DB.Model(&models.Submission{}).
		Where("id = ?", id).
		Updates(data).Error
}

func UpdateSubmissionStatus(id uint, status string) error {
	return db.DB.
		Model(&models.Submission{}).
		Where("id = ?", id).
		Update("process_status", status).Error
}

func GetSubmissionByID(id uint) (models.Submission, error) {
	var submission models.Submission
	err := db.DB.First(&submission, id).Error
	return submission, err
}

func GetSubmissionTracking(id uint) (models.Submission, error) {
	var submission models.Submission
	
	err := db.DB.
		Preload("Billing").
		Preload("LHU").
		First(&submission, id).Error
		
	return submission, err
}

func GetSubmissionsForExport(ids []uint, exportAll bool) ([]models.Submission, error) {
	var submissions []models.Submission
	
	query := db.DB.
		Preload("User").
		Preload("Samples.TestRequests.TestService").
		Preload("Billing")

	if !exportAll {
		query = query.Where("id IN ?", ids)
	}

	err := query.Find(&submissions).Error
	return submissions, err
}