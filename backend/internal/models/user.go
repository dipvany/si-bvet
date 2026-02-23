package models

import "time"

type User struct {
	ID           uint      `gorm:"primaryKey"`
	FullName     string    `gorm:"column:fullname;type:varchar(255);not null"`
	Email        string    `gorm:"type:varchar(255);unique;not null"`
	Phone        string    `gorm:"type:varchar(255);not null"`
	PasswordHash string    `gorm:"column:password_hash;type:varchar(255);not null"`
	Role         string    `gorm:"type:varchar(255);not null"`
	IsVerified   bool      `gorm:"column:is_verified"`
	VerifiedAt   *time.Time `gorm:"column:verified_at"`
	CreatedAt    *time.Time `gorm:"column:create_at"`
	UpdatedAt    *time.Time `gorm:"column:update_at"`
}

func (User) TableName() string {
	return "Users"
}