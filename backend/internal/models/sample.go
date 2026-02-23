package models

type Sample struct {
	ID             uint   `gorm:"primaryKey"`
	SubmissionID   uint   `gorm:"column:submission_id;not null"`
	SampleCodeCust string `gorm:"column:sample_code_cust;not null"`
	SampleType     string `gorm:"column:sample_type;not null"`
	Species        string
	Condition      string

	Submission Submission `gorm:"foreignKey:SubmissionID"`
}

func (Sample) TableName() string {
	return "Samples"
}