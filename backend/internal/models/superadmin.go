package models

type SuperAdmin struct {
	UserID     uint   `json:"user_id" gorm:"primaryKey;autoIncrement:false;column:user_id;not null"`
	Position   string `json:"position" gorm:"column:position"`
	UnitLab    string `json:"unit_lab" gorm:"column:unit_lab"`
	EmployeeNo string `json:"employee_no" gorm:"column:employee_no"`

	User User `gorm:"foreignKey:UserID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"user_info"`
}

func (SuperAdmin) TableName() string {
	return "SuperAdmin"
}
