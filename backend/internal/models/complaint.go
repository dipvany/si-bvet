package models

import "time"

type Complaint struct {
	ID             uint       `json:"id" gorm:"primaryKey;column:id"`
	Fullname       string     `json:"fullname" gorm:"column:fullname;type:varchar(255);not null"`
	IDNumber       string     `json:"id_number" gorm:"column:id_number;type:varchar(50);not null"`
	Email          string     `json:"email" gorm:"column:email;type:varchar(255);not null"`
	Phone          string     `json:"phone" gorm:"column:phone;type:varchar(255);not null"`
	Description    string     `json:"description" gorm:"column:description;type:text;not null"`
	Suggestion     string     `json:"suggestion" gorm:"column:suggestion;type:text"`
	DateOfComplaint time.Time  `json:"date_of_complaint" gorm:"column:date_of_complaint;not null"`
	Status         string     `json:"status" gorm:"column:status;type:varchar(50);not null;default:open;index:idx_complaint_status"`
	AdminResponse  string     `json:"admin_response" gorm:"column:admin_response;type:text"`
	AttachmentPath string     `json:"attachment_path" gorm:"column:attachment_path;type:text"`
	
	CreatedAt      *time.Time `json:"created_at" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt      *time.Time `json:"updated_at" gorm:"column:updated_at;autoUpdateTime"`
}

func (Complaint) TableName() string {
	return "Complaint"
}