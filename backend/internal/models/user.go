package models

import "time"

type User struct {
	ID           uint      `json:"id" gorm:"primaryKey;column:id"`
	FullName     string    `json:"fullname" gorm:"column:fullname;type:varchar(255);not null"`
	Email        string    `json:"email" gorm:"column:email;type:varchar(255);unique;not null"`
	Phone        string    `json:"phone" gorm:"column:phone;type:varchar(255);not null"`
	PasswordHash string    `json:"-" gorm:"column:password_hash;type:varchar(255);not null"`
	Role         string    `json:"role" gorm:"column:role;type:varchar(255);not null"`
	IsVerified   bool      `json:"is_verified" gorm:"column:is_verified"`
	VerifiedAt   *time.Time `json:"verified_at" gorm:"column:verified_at"`
	RegistrationDoc string    `json:"-" gorm:"column:registration_doc"`
	Customer     *Customer `json:"customer,omitempty" gorm:"foreignKey:UserID;references:ID"`
	Admin        *Admin    `json:"admin,omitempty" gorm:"foreignKey:UserID;references:ID"`
	CreatedAt    *time.Time `json:"created_at" gorm:"column:create_at"`
	UpdatedAt    *time.Time `json:"updated_at" gorm:"column:update_at"`
}

func (User) TableName() string {
	return "Users"
}