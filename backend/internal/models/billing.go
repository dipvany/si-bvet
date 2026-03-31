package models

import "time"

type Billing struct {
	ID           uint      `json:"id" gorm:"primaryKey;column:id"`
	SubmissionID uint      `json:"submission_id" gorm:"column:submission_id;not null"`
	EBillingCode string    `json:"ebilling_code" gorm:"column:ebilling_code"`
	TotalAmount  float64  `json:"total_amount" gorm:"column:total_amount"`
	PaymentStatus string  `json:"payment_status" gorm:"column:payment_status"`
	PaidAt       *time.Time `json:"paid_at" gorm:"column:paid_at"`
	IssuedAt     *time.Time `json:"issued_at" gorm:"column:issued_at"`
	ProofPayment string `json:"proof_payment" gorm:"column:proof_payment"`

	// Submission Submission `gorm:"foreignKey:SubmissionID"`
}

func (Billing) TableName() string {
	return "Billing"
}