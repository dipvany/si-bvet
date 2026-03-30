package models

type LhuDocument struct {
	ID           uint   `gorm:"primaryKey"`
	SubmissionID uint   `gorm:"column:submission_id;not null"`
	NoLhu        string `gorm:"column:no_lhu;not null"`
	FilePath     string `gorm:"column:file_path"`
	DateOfPub    string `gorm:"column:date_of_pub"`
}

func (LhuDocument) TableName() string {
	return "LhuDocuments"
}