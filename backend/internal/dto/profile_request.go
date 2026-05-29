package dto

type ProfileRequest struct {
	FullName *string `json:"fullname"`
	Phone    *string `json:"phone"`

	// customer only
	Group        *string `json:"group"`
	IsMembership *bool   `json:"is_membership"`
	MembershipNo *string `json:"membership_no"`
	PICName      *string `json:"pic_name"`
	PICContact   *string `json:"pic_contact"`
	Province     *string `json:"province"`
	City         *string `json:"city"`
	Subdistrict  *string `json:"subdistrict"`
	Village      *string `json:"village"`
	Address      *string `json:"address"`
	ZipCode      *string `json:"zip_code"`
	Occupation   *string `json:"occupation"`

	// admin only
	Position   *string `json:"position"`
	UnitLab    *string `json:"unit_lab"`
	EmployeeNo *string `json:"employee_no"`
}
