package dto

type AdminRequest struct {
	FullName   string `json:"fullname" binding:"required"`
	Email      string `json:"email" binding:"required,email"`
	Phone      string `json:"phone" binding:"required"`
	Password   string `json:"password" binding:"required,min=8"`
	Position   string `json:"position"`
	UnitLab    string `json:"unit_lab"`
	EmployeeNo string `json:"employee_no"`
	Role       string `json:"role" binding:"required,oneof=admin superadmin"`
	IsVerified bool   `json:"is_verified"`
}