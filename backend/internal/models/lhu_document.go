package models

import "time"

type LhuDocument struct {
	ID           uint       `json:"id" gorm:"primaryKey;column:id"`
	SubmissionID uint       `json:"submission_id" gorm:"column:submission_id;not null;uniqueIndex:idx_lhu_submission_id"`
	NoLhu        string     `json:"no_lhu" gorm:"column:no_lhu;type:varchar(255);not null"`
	FilePath     string     `json:"file_path" gorm:"column:file_path;type:text"`
	DateOfPub    *time.Time `json:"date_of_pub" gorm:"column:date_of_pub"`

	Submission Submission `json:"-" gorm:"foreignKey:SubmissionID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
}

func (LhuDocument) TableName() string {
	return "LhuDocuments"
}