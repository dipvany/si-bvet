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

type CustomerCreateRequest struct {
	FullName     string `json:"fullname" binding:"required"`
	Email        string `json:"email" binding:"required,email"`
	Phone        string `json:"phone" binding:"required"`
	Password     string `json:"password" binding:"required,min=8"`
	Institution  string `json:"institution" binding:"required"`
	Group        string `json:"group"`
	MembershipNo string `json:"membership_no"`
	PICName      string `json:"pic_name"`
	PICContact   string `json:"pic_contact"`
	Province     string `json:"province"`
	City         string `json:"city"`
	Subdistrict  string `json:"subdistrict"`
	Village      string `json:"village"`
	Address      string `json:"address"`
	ZipCode      string `json:"zip_code"`
	IsActive     bool   `json:"is_active"`
}

type CustomerUpdateRequest struct {
	FullName     *string `json:"fullname"`
	Email        *string `json:"email" binding:"omitempty,email"`
	Phone        *string `json:"phone"`
	Institution  *string `json:"institution"`
	Group        *string `json:"group"`
	MembershipNo *string `json:"membership_no"`
	PICName      *string `json:"pic_name"`
	PICContact   *string `json:"pic_contact"`
	Province     *string `json:"province"`
	City         *string `json:"city"`
	Subdistrict  *string `json:"subdistrict"`
	Village      *string `json:"village"`
	Address      *string `json:"address"`
	ZipCode      *string `json:"zip_code"`
	IsActive     *bool   `json:"is_active"`
}