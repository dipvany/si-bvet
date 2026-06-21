package dto

type CustomerResponse struct {
	ID              uint   `json:"id"`
	FullName        string `json:"fullname"`
	Email           string `json:"email"`
	Phone           string `json:"phone"`
	Role            string `json:"role"`
	IsVerified      bool   `json:"is_verified"`
	Institution     string `json:"institution"`
	RegistrationDoc string `json:"registration_doc"`
}