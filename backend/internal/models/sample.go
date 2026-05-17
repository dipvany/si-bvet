package models

type Sample struct {
	ID              uint   `json:"id" gorm:"primaryKey;column:id"`
	SubmissionID    uint   `json:"submission_id" gorm:"column:submission_id;not null;index:idx_samples_submission_id"`
	SampleType      string `json:"sample_type" gorm:"column:sample_type;not null"`
	SampleCodeCust  string `json:"sample_code_cust" gorm:"column:sample_code_cust;not null"`
	SampeleCodePool string `json:"sample_code_pool" gorm:"column:sample_code_pool"`
	SpecimenGroup   string `json:"specimen_group" gorm:"column:specimen_group"`
	Species         string `json:"species" gorm:"column:species"`
	Batch           string `json:"batch" gorm:"column:batch"`
	Preservative    string `json:"preservative" gorm:"column:preservative"`
	Packaging       string `json:"packaging" gorm:"column:packaging"`
	ProductionDate  string `json:"production_date" gorm:"column:production_date"`
	ExpiredDate     string `json:"expired_date" gorm:"column:expired_date"`
	Sex             string `json:"sex" gorm:"column:sex"`
	Age             string `json:"age" gorm:"column:age"`
	UnitAge         string `json:"unit_age" gorm:"column:unit_age"`
	Owner           string `json:"owner" gorm:"column:owner"`
	TestType        string `json:"test_type" gorm:"column:test_type"`
	Sampling        string `json:"sampling" gorm:"column:sampling"`
	SampingInfra    string `json:"samping_infra" gorm:"column:samping_infra"`
	LocationType    string `json:"location_type" gorm:"column:location_type"`
	LocationSmpl    string `json:"location_smpl" gorm:"column:location_smpl"`
	IsVactinated    string `json:"is_vaccinated" gorm:"column:is_vaccinated"`

	Volume      string `json:"volume" gorm:"column:volume"`
	Condition   string `json:"condition" gorm:"column:condition"`
	TotalSample int64  `json:"total_sample" gorm:"column:total_sample;not null"`

	Submission   Submission    `json:"submission_info" gorm:"foreignKey:SubmissionID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	TestRequests []TestRequest `json:"test_requests" gorm:"foreignKey:SampleID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
}

func (Sample) TableName() string {
	return "Samples"
}