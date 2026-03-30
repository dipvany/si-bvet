package dto

type ComplaintRequest struct {
	Subjects    string `json:"subjects" binding:"required"`
	Description string `json:"description" binding:"required"`
}

type ComplaintResponseRequest struct {
	AdminResponse string `json:"admin_response" binding:"required"`
}