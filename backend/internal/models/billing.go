package models

import "time"

type Billing struct {
	ID            uint       `json:"id" gorm:"primaryKey;column:id"`
	SubmissionID  uint       `json:"submission_id" gorm:"column:submission_id;not null;uniqueIndex:idx_billing_submission_id"`
	EBillingCode  string     `json:"ebilling_code" gorm:"column:ebilling_code"`
	TotalAmount   float64    `json:"total_amount" gorm:"column:total_amount;type:numeric(14,2);not null;default:0"`
	PaymentStatus string     `json:"payment_status" gorm:"column:payment_status;type:varchar(50);not null;default:unpaid;index:idx_billing_payment_status"`
	PaidAt        *time.Time `json:"paid_at" gorm:"column:paid_at"`
	IssuedAt      *time.Time `json:"issued_at" gorm:"column:issued_at"`
	InvoiceDoc    string     `json:"invoice_doc" gorm:"column:invoice_doc;type:text"`
	ProofPayment  string     `json:"proof_payment" gorm:"column:proof_payment;type:text"`

	Submission Submission `json:"-" gorm:"foreignKey:SubmissionID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
}

func (Billing) TableName() string {
	return "Billing"
}