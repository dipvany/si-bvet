package models

import "time"

type Billing struct {
	ID           uint      `gorm:"primaryKey"`
	SubmissionID uint      `gorm:"column:submission_id;not null"`
	EBillingCode string    `gorm:"column:ebilling_code"`
	TotalAmount  float64  `gorm:"column:total_amount"`
	PaymentStatus string  `gorm:"column:payment_status"`
	PaidAt       *time.Time `gorm:"column:paid_at"`
	IssuedAt     *time.Time `gorm:"column:issued_at"`

	Submission Submission `gorm:"foreignKey:SubmissionID"`
}

func (Billing) TableName() string {
	return "Billing"
}