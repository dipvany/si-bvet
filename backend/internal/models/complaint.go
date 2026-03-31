package models

import "time"

type Complaint struct {
	ID             uint `json:"id" gorm:"primaryKey;column:id"`
	UserID         uint `json:"user_id" gorm:"column:user_id"`
	Subjects       string     `json:"subjects" gorm:"column:subjects"`
	Description    string     `json:"description" gorm:"column:description"`
	Status         string     `json:"status" gorm:"column:status"`
	AdminResponse  string     `json:"admin_response" gorm:"column:admin_response"`
	AttachmentPath string     `json:"attachment_path" gorm:"column:attachment_path"`
	CreateAt       *time.Time `json:"create_at" gorm:"column:create_at"`
}

func (Complaint) TableName() string {
	return "Complaint"
}