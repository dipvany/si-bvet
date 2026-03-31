package models

import "time"

type LhuDocument struct {
	ID           uint   `json:"id" gorm:"primaryKey;column:id"`
	SubmissionID uint   `json:"submission_id" gorm:"column:submission_id;not null"`
	NoLhu        string `json:"no_lhu" gorm:"column:no_lhu;not null"`
	FilePath     string `json:"file_path" gorm:"column:file_path"`
	DateOfPub    *time.Time `json:"date_of_pub" gorm:"column:date_of_pub"`
}

func (LhuDocument) TableName() string {
	return "LhuDocuments"
}