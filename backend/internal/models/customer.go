package models

type Customer struct {
	UserID       uint   `json:"user_id" gorm:"primaryKey;autoIncrement:false;column:user_id;not null"`
	Group        string `json:"group" gorm:"column:group"`
	IsMembership bool   `json:"is_membership" gorm:"column:is_membership"`
	MembershipNo string `json:"membership_no" gorm:"column:membership_no"`
	PICName      string `json:"pic_name" gorm:"column:pic_name"`
	PICContact   string `json:"pic_contact" gorm:"column:pic_contact"`
	Province     string `json:"province" gorm:"column:province"`
	City         string `json:"city" gorm:"column:city"`
	District     string `json:"district" gorm:"column:district"`
	Village      string `json:"village" gorm:"column:village"`
	Address      string `json:"address" gorm:"type:text"`
	ZipCode      string `json:"zip_code" gorm:"column:zip_code"`
	Occupation   string `json:"occupation" gorm:"column:occupation"`

	User User `gorm:"foreignKey:UserID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
}

func (Customer) TableName() string {
	return "Customer"
}