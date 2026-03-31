package models

type Sample struct {
	ID                uint   `json:"id" gorm:"primaryKey;column:id"`
	SubmissionID      uint   `json:"submission_id" gorm:"column:submission_id;not null"`
	SampleCodeCust    string `json:"sample_code_cust" gorm:"column:sample_code_cust;not null"`
	SampleType        string `json:"sample_type" gorm:"column:sample_type;not null"`
	Species           string `json:"species" gorm:"column:species;"`
	Age               string `json:"age" gorm:"column:age;"`
	Volume            string `json:"volume" gorm:"column:volume;"`
	Condition         string `json:"condition" gorm:"column:condition;"`
	LocationSmplTaken string `json:"location_smpl_taken" gorm:"column:location_smpl_taken;"`
	TotalSample       int64  `json:"total_sample" gorm:"column:total_sample;not null"`

	Submission   Submission    `json:"submission_info" gorm:"foreignKey:SubmissionID"`
	TestRequests []TestRequest `json:"test_requests" gorm:"foreignKey:SamplesID"`
}

func (Sample) TableName() string {
	return "Samples"
}