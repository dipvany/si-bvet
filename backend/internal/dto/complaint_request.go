package dto

type ComplaintRequest struct {
	Fullname        string `json:"fullname" form:"fullname" binding:"required"`
	IDNumber        string `json:"id_number" form:"id_number" binding:"required"`
	Email           string `json:"email" form:"email" binding:"required,email"`
	Phone           string `json:"phone" form:"phone" binding:"required"`
	Description     string `json:"description" form:"description" binding:"required"`
	Suggestion      string `json:"suggestion" form:"suggestion"`
	DateOfComplaint string `json:"date_of_complaint" form:"date_of_complaint"`
}

type ComplaintResponseRequest struct {
	AdminResponse string `json:"admin_response" binding:"required"`
}