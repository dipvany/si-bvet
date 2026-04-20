package dto

type BillingRequest struct {
	EBillingCode   string  `json:"ebilling_code" binding:"required"`
	TotalAmount    float64 `json:"total_amount" binding:"required"`
	NoRegistration string  `json:"no_registration"`
	NoEpi          string  `json:"no_epi"`
	IssuedAt       string  `json:"issued_at"`
	PaidAt         string  `json:"paid_at"`
	ProofPayment   string  `json:"proof_payment"`
}
