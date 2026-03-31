package models

import "time"

type Feedback struct {
	ID       uint   `json:"id" gorm:"primaryKey;column:id"`
	UserID   uint   `json:"user_id" gorm:"column:user_id"`
	Rating   int    `json:"rating" gorm:"column:rating"`
	Comments string `json:"comments" gorm:"column:comments"`
	CreateAt *time.Time `json:"create_at" gorm:"column:create_at"`
}

func (Feedback) TableName() string {
	return "Feedback"
}