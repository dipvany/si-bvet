package models

import "time"

type SubmissionSampleTemplate struct {
	ID               uint      `json:"id" gorm:"primaryKey;column:id"`
	UploadedByUserID uint      `json:"uploaded_by_user_id" gorm:"column:uploaded_by_user_id;not null"`
	FilePath         string    `json:"file_path" gorm:"column:file_path;type:text;not null"`
	FileName         string    `json:"file_name" gorm:"column:file_name;type:text;not null"`
	CreatedAt        *time.Time `json:"created_at" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt        *time.Time `json:"updated_at" gorm:"column:updated_at;autoUpdateTime"`

	UploadedBy User `json:"uploaded_by" gorm:"foreignKey:UploadedByUserID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"`
}

func (SubmissionSampleTemplate) TableName() string {
	return "SubmissionSampleTemplate"
}