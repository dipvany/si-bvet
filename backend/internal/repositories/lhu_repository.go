package repositories

import (
	"si-bvet/internal/db"
	"si-bvet/internal/models"
	"time"
)

func CreateLhu(lhu *models.LhuDocument) error {
	return db.DB.Create(lhu).Error
}

func GetLhuBySubmissionID(submissionID uint) (models.LhuDocument, error) {

	var lhu models.LhuDocument

	err := db.DB.
		Where("submission_id = ?", submissionID).
		First(&lhu).Error

	return lhu, err
}

func UpdateLhu(submissionID uint, noLhu string, filePath string, dateOfPub *time.Time) error {

	return db.DB.
		Model(&models.LhuDocument{}).
		Where("submission_id = ?", submissionID).
		Updates(map[string]interface{}{
			"no_lhu":      noLhu,
			"file_path":   filePath,
			"date_of_pub": dateOfPub,
		}).Error
}
