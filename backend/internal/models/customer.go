package models

type Customer struct {
	UserID       uint   `gorm:"primaryKey;column:user_id"`
	Group        string `gorm:"column:group"`
	IsMembership bool   `gorm:"column:is_membership"`
	MembershipNo string `gorm:"column:membership_no"`
	PICName      string `gorm:"column:pic_name"`
	PICContact   string `gorm:"column:pic_contact"`
	Province     string
	City         string
	Village      string
	Address      string `gorm:"type:text"`
	ZipCode      string `gorm:"column:zip_code"`
	Occupation   string

	User User `gorm:"foreignKey:UserID"`
}

func (Customer) TableName() string {
	return "Customer"
}