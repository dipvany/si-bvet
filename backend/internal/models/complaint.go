package models

import "time"

type Complaint struct {
	ID             uint `gorm:"primaryKey"`
	UserID         uint `gorm:"column:user_id"`
	Subjects       string     `gorm:"column:subjects"`
	Description    string     `gorm:"column:description"`
	Status         string     `gorm:"column:status"`
	AdminResponse  string     `gorm:"column:admin_response"`
	AttachmentPath string     `gorm:"column:attachment_path"`
	CreateAt       *time.Time `gorm:"column:create_at"`
}

func (Complaint) TableName() string {
	return "Complaint"
}