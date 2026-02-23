package models

type Admin struct {
	UserID     uint `gorm:"primaryKey;column:user_id"`
	Position   string
	UnitLab    string `gorm:"column:unit_lab"`
	EmployeeNo string `gorm:"column:employee_no"`

	User User `gorm:"foreignKey:UserID"`
}

func (Admin) TableName() string {
	return "Admin"
}