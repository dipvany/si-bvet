package models

type Admin struct {
	UserID     uint   `json:"user_id" gorm:"primaryKey;column:user_id"`
	Position   string `json:"position" gorm:"column:position"`
	UnitLab    string `json:"unit_lab" gorm:"column:unit_lab"`
	EmployeeNo string `json:"employee_no" gorm:"column:employee_no"`

	User User `gorm:"foreignKey:UserID" json:"user_info"`
}

func (Admin) TableName() string {
	return "Admin"
}