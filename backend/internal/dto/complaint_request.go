package dto

type ComplaintRequest struct {
	Subjects        string `json:"subjects" binding:"required"`
	Description     string `json:"description" binding:"required"`
	DateOfComplaint string `json:"date_of_complaint" binding:"-"`
}

type ComplaintResponseRequest struct {
	AdminResponse string `json:"admin_response" binding:"required"`
}