package services

import (
	"errors"
	"si-bvet/internal/models"
	"si-bvet/internal/repositories"
	"time"
)

func CreateBilling(submissionID uint, code string, amount float64) error {
	now := time.Now()

	// cek apakah billing sudah ada untuk submission ini
	exists, _ := repositories.IsBillingExists(submissionID)
	if exists {
		return errors.New("billing sudah ada untuk submission ini")
	}

	billing := models.Billing{
		SubmissionID: submissionID,
		EBillingCode: code,
		TotalAmount: amount,
		PaymentStatus: "unpaid",
		IssuedAt: &now,
	}

	err := repositories.CreateBilling(&billing)
	if err != nil {
		return err
	}

	return repositories.UpdateSubmissionStatus(submissionID, "awaiting_payment")
}

func GetBillingBySubmissionID(submissionID uint) (*models.Billing, error) {
	return repositories.GetBillingBySubmissionID(submissionID)
}

func UpdateBilling(submissionID uint, code string, amount float64) error {
	return repositories.UpdateBilling(submissionID, code, amount)
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



