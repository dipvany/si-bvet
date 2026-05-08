package repositories

import (
	"si-bvet/internal/db"
	"si-bvet/internal/models"
	"time"

	"gorm.io/gorm"
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
	result := db.DB.
		Model(&models.Billing{}).
		Where("submission_id = ?", submissionID).
		Updates(map[string]interface{}{
			"ebilling_code": code,
			"total_amount":  amount,
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func UploadBillingProof(submissionID uint, proofPath string) error {
	result := db.DB.
		Model(&models.Billing{}).
		Where("submission_id = ?", submissionID).
		Update("proof_payment", proofPath)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func MarkAsPaid(submissionID uint, paidAt time.Time) error {
	result := db.DB.
		Model(&models.Billing{}).
		Where("submission_id = ?", submissionID).
		Updates(map[string]interface{}{
			"payment_status": "paid",
			"paid_at":       paidAt,
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func IsBillingExists(submissionID uint) (bool, error) {

	var count int64

	err := db.DB.
		Model(&models.Billing{}).
		Where("submission_id = ?", submissionID).
		Count(&count).Error

	return count > 0, err
}


