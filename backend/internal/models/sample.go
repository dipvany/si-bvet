package models

type Sample struct {
	ID                uint   `gorm:"primaryKey"`
	SubmissionID      uint   `gorm:"column:submission_id;not null"`
	SampleCodeCust    string `gorm:"column:sample_code_cust;not null"`
	SampleType        string `gorm:"column:sample_type;not null"`
	Species           string `gorm:"column:species;"`
	Age               string `gorm:"column:age;"`
	Volume            string `gorm:"column:volume;"`
	Condition         string `gorm:"column:condition;"`
	LocationSmplTaken string `gorm:"column:location_smpl_taken;"`
	TotalSample       int64  `gorm:"column:total_sample;not null"`

	Submission Submission `gorm:"foreignKey:SubmissionID"`
}

func (Sample) TableName() string {
	return "Samples"
}