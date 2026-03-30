package models

import "time"

type Feedback struct {
	ID       uint   `gorm:"primaryKey"`
	UserID   uint   `gorm:"column:user_id"`
	Rating   int    `gorm:"column:rating"`
	Comments string `gorm:"column:comments"`
	CreateAt *time.Time `gorm:"column:create_at"`
}

func (Feedback) TableName() string {
	return "Feedback"
}