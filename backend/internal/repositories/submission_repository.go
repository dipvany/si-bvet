package repositories

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"si-bvet/internal/db"
	"si-bvet/internal/models"
	"time"

	"gorm.io/gorm"
)

func InTransaction(fn func(tx *gorm.DB) error) error {
	return db.DB.Transaction(fn)
}

func CreateSubmission(sub *models.Submission) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		return CreateSubmissionWithTicket(tx, sub)
	})
}

func CreateSubmissionWithTicket(tx *gorm.DB, sub *models.Submission) error {
	sub.NoTicket = generateSubmissionTicket()

	if err := tx.Create(sub).Error; err != nil {
		return err
	}

	return nil
}

func generateSubmissionTicket() string {
	return fmt.Sprintf("TCK-%d-%s", time.Now().Year(), randomTicketSuffix())
}

func randomTicketSuffix() string {
	buffer := make([]byte, 4)
	if _, err := rand.Read(buffer); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}

	return hex.EncodeToString(buffer)
}

func GetSubmissionByIDTx(tx *gorm.DB, id uint) (models.Submission, error) {
	var submission models.Submission
	err := tx.First(&submission, id).Error
	return submission, err
}

func SaveSubmissionTx(tx *gorm.DB, submission *models.Submission) error {
	return tx.Save(submission).Error
}

func CreateSampleTx(tx *gorm.DB, sample *models.Sample) error {
	return tx.Create(sample).Error
}

func GetTestServiceByIDTx(tx *gorm.DB, id uint) (models.TestService, error) {
	var service models.TestService
	err := tx.First(&service, id).Error
	return service, err
}

func CreateTestRequestTx(tx *gorm.DB, testReq *models.TestRequest) error {
	return tx.Create(testReq).Error
}

func DeleteTestRequestsBySubmissionIDTx(tx *gorm.DB, submissionID uint) error {
	return tx.Exec(`
		DELETE FROM "TestRequest"
		WHERE samples_id IN (
			SELECT id FROM "Samples" WHERE submission_id = ?
		)
	`, submissionID).Error
}

func DeleteSamplesBySubmissionIDTx(tx *gorm.DB, submissionID uint) error {
	return tx.Where("submission_id = ?", submissionID).Delete(&models.Sample{}).Error
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

func GetSubmissionByIDWithUser(id uint) (models.Submission, error) {
	var submission models.Submission
	err := db.DB.
		Preload("User").
		First(&submission, id).Error

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
