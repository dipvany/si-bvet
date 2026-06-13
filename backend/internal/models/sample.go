package models

import "time"

type Sample struct {
	ID             uint       `json:"id" gorm:"primaryKey;column:id"`
	SubmissionID   uint       `json:"submission_id" gorm:"column:submission_id;not null;index:idx_samples_submission_id"`
	SampleModel    string     `json:"sample_model" gorm:"column:sample_model;not null;default:''"`
	SampleCodeCust string     `json:"sample_code_cust" gorm:"column:sample_code_cust;not null"`
	SpecimenGroup  string     `json:"specimen_group" gorm:"column:specimen_group"`
	SpecimenType   string     `json:"specimen_type" gorm:"column:specimen_type"`
	Species        string     `json:"species" gorm:"column:species"`
	// Batch          string     `json:"batch" gorm:"column:batch"`
	Preservative   string     `json:"preservative" gorm:"column:preservative"`
	Packaging      string     `json:"packaging" gorm:"column:packaging"`
	ProductionDate *time.Time `json:"production_date" gorm:"column:production_date"`
	ExpiredDate    *time.Time `json:"expired_date" gorm:"column:expired_date"`
	Sex            string     `json:"sex" gorm:"column:sex"`
	Age            float64        `json:"age" gorm:"column:age"`
	UnitAge        string     `json:"unit_age" gorm:"column:unit_age"`
	Owner          string     `json:"owner" gorm:"column:owner"`
	TestType       string     `json:"test_type" gorm:"column:test_type"`
	// LocationType   string     `json:"location_type" gorm:"column:location_type"`
	// LocationSmpl   string     `json:"location_smpl" gorm:"column:location_smpl"`
	IsVaccinated   string     `json:"is_vaccinated" gorm:"column:is_vaccinated"`

	Volume      string `json:"volume" gorm:"column:volume"`
	Condition   string `json:"condition" gorm:"column:condition"`
	TotalSample int64  `json:"total_sample" gorm:"column:total_sample;not null"`

	Submission   Submission    `json:"submission_info" gorm:"foreignKey:SubmissionID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	TestRequests []TestRequest `json:"test_requests" gorm:"foreignKey:SampleID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
}

func (Sample) TableName() string {
	return "Samples"
}