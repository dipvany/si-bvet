package repositories

import (
	"si-bvet/internal/db"
	"si-bvet/internal/models"
	"time"
)

func CreateBilling(billing *models.Billing) error {
	return db.DB.Create(billing).Error
}

func GetBillingBySubmissionID(submissionID uint) (*models.Billing, error) {
	
	var billing models.Billing

	err := db.DB.
		Where("submission_id = ?", submissionID).
		First(&billing).Error

	return &billing, err
}

func UpdateBilling(submissionID uint, code string, amount float64) error {

	return db.DB.
		Model(&models.Billing{}).
		Where("submission_id = ?", submissionID).
		Updates(map[string]interface{}{
			"ebilling_code": code,
			"total_amount":  amount,
		}).Error
}

func UploadBillingProof(submissionID uint, proofPath string) error {

	return db.DB.
		Model(&models.Billing{}).
		Where("submission_id = ?", submissionID).
		Update("proof_payment", proofPath).Error
}

func MarkAsPaid(submissionID uint, paidAt time.Time) error {

	return db.DB.
		Model(&models.Billing{}).
		Where("submission_id = ?", submissionID).
		Updates(map[string]interface{}{
			"payment_status": "paid",
			"paid_at":       paidAt,
		}).Error
}

func IsBillingExists(submissionID uint) (bool, error) {

	var count int64

	err := db.DB.
		Model(&models.Billing{}).
		Where("submission_id = ?", submissionID).
		Count(&count).Error

	return count > 0, err
}


