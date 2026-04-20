package services

import (
	"errors"
	"si-bvet/internal/db"
	"si-bvet/internal/models"
	"si-bvet/internal/repositories"
	"time"

	"gorm.io/gorm"
)

func CreateBilling(submissionID uint, code string, amount float64, noRegistration string, noEpi string, now time.Time) error {
	if now.IsZero() {
		now = time.Now()
	}

	// cek apakah billing sudah ada untuk submission ini
	exists, _ := repositories.IsBillingExists(submissionID)
	if exists {
		return errors.New("billing sudah ada untuk submission ini")
	}

	return db.DB.Transaction(func(tx *gorm.DB) error {
		billing := models.Billing{
			SubmissionID:  submissionID,
			EBillingCode:  code,
			TotalAmount:   amount,
			PaymentStatus: "unpaid",
			IssuedAt:      &now,
		}

		if err := tx.Create(&billing).Error; err != nil {
			return err
		}

		if err := tx.Model(&models.Submission{}).
			Where("id = ?", submissionID).
			Updates(map[string]interface{}{
				"no_registration": noRegistration,
				"no_epi":          noEpi,
				"process_status":  "awaiting_payment",
			}).Error; err != nil {
			return err
		}

		return nil
	})
}

func GetBillingBySubmissionID(submissionID uint) (*models.Billing, error) {
	return repositories.GetBillingBySubmissionID(submissionID)
}

func UpdateBilling(submissionID uint, code string, amount float64, noRegistration string, noEpi string) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.Billing{}).
			Where("submission_id = ?", submissionID).
			Updates(map[string]interface{}{
				"ebilling_code": code,
				"total_amount":  amount,
			}).Error; err != nil {
			return err
		}

		if err := tx.Model(&models.Submission{}).
			Where("id = ?", submissionID).
			Updates(map[string]interface{}{
				"no_registration": noRegistration,
				"no_epi":          noEpi,
			}).Error; err != nil {
			return err
		}

		return nil
	})
}

func UploadBillingProof(submissionID uint, proofPath string) error {
	return repositories.UploadBillingProof(submissionID, proofPath)
}

func IsBillingExists(submissionID uint) (bool, error) {
	return repositories.IsBillingExists(submissionID)
}

// function untuk memverifikasi pembayaran
func VerifyPayment(submissionID uint) error {

	now := time.Now()

	err := repositories.MarkAsPaid(submissionID, now)
	if err != nil {
		return err
	}

	return repositories.UpdateSubmissionStatus(submissionID, "processed")
}

// function untuk menolak pembayaran
func RejectPayment(submissionID uint) error {
	err := repositories.UpdateBilling(submissionID, "", 0)
	if err != nil {
		return err
	}

	return repositories.UpdateSubmissionStatus(submissionID, "payment_rejected")
}
