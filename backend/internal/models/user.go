package models

import "time"

type User struct {
	ID              uint       `json:"id" gorm:"primaryKey;column:id"`
	FullName        string     `json:"fullname" gorm:"column:fullname;type:varchar(255);not null"`
	Email           string     `json:"email" gorm:"column:email;type:varchar(255);not null;uniqueIndex:idx_users_email"`
	Phone           string     `json:"phone" gorm:"column:phone;type:varchar(255);not null;index:idx_users_phone"`
	PasswordHash    string     `json:"-" gorm:"column:password_hash;type:varchar(255);not null"`
	Role            string     `json:"role" gorm:"column:role;type:varchar(32);not null;check:role IN ('superadmin','admin','customer')"`
	IsVerified      bool       `json:"is_verified" gorm:"column:is_verified;not null;default:false"`
	VerifiedAt      *time.Time `json:"verified_at" gorm:"column:verified_at"`
	RegistrationDoc string     `json:"-" gorm:"column:registration_doc;type:text"`

	Customer *Customer `json:"customer,omitempty" gorm:"foreignKey:UserID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	Admin    *Admin    `json:"admin,omitempty" gorm:"foreignKey:UserID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`

	CreatedAt *time.Time `json:"created_at" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt *time.Time `json:"updated_at" gorm:"column:updated_at;autoUpdateTime"`
}

func (User) TableName() string {
	return "Users"
}