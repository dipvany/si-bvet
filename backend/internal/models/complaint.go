package models

import "time"

type Complaint struct {
	ID             uint       `json:"id" gorm:"primaryKey;column:id"`
	UserID         uint       `json:"user_id" gorm:"column:user_id;not null;index:idx_complaint_user_id"`
	Subjects       string     `json:"subjects" gorm:"column:subjects;type:varchar(255);not null"`
	Description    string     `json:"description" gorm:"column:description;type:text;not null"`
	DateOfComplaint time.Time  `json:"date_of_complaint" gorm:"column:date_of_complaint;not null"`
	Status         string     `json:"status" gorm:"column:status;type:varchar(50);not null;default:open;index:idx_complaint_status"`
	AdminResponse  string     `json:"admin_response" gorm:"column:admin_response;type:text"`
	AttachmentPath string     `json:"attachment_path" gorm:"column:attachment_path;type:text"`
	CreatedAt      *time.Time `json:"created_at" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt      *time.Time `json:"updated_at" gorm:"column:updated_at;autoUpdateTime"`

	User User `json:"-" gorm:"foreignKey:UserID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
}

func (Complaint) TableName() string {
	return "Complaint"
}