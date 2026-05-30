package dto

type TestInput struct {
	TestServiceID uint `json:"test_service_id"`
}

type SampleInput struct {
	SampleCodeCust string      `json:"sample_code_cust" binding:"required"`
	SampleModel    string      `json:"sample_model" binding:"required"`
	SampleCodePool string      `json:"sample_code_pool"`
	SpecimenGroup  string      `json:"specimen_group"`
	SpecimenType   string      `json:"specimen_type"`
	Species        string      `json:"species"`
	Batch          string      `json:"batch"`
	Preservative   string      `json:"preservative"`
	Packaging      string      `json:"packaging"`
	ProductionDate string      `json:"production_date"`
	ExpiredDate    string      `json:"expired_date"`
	Sex            string      `json:"sex"`
	Age            float64     `json:"age"`
	UnitAge        string      `json:"unit_age"`
	Owner          string      `json:"owner"`
	TestType       string      `json:"test_type"`
	Sampling       string      `json:"sampling"`
	SamplingInfra  string      `json:"sampling_infra"`
	LocationType   string      `json:"location_type"`
	LocationSmpl   string      `json:"location_smpl"`
	IsVaccinated   string      `json:"is_vaccinated"`
	Volume         string      `json:"volume"`
	Condition      string      `json:"condition"`
	TotalSample    int64       `json:"total_sample" binding:"required"`
	Tests          []TestInput `json:"tests" binding:"required"`
}

type SubmissionRequest struct {
	TypeService   string        `json:"type_service" form:"type_service"`
	PurposeOfTest string        `json:"purpose_of_test" form:"purpose_of_test"`
	SampleTaker   string        `json:"sample_taker" form:"sample_taker"`
	Notes         string        `json:"notes" form:"notes"`
	Samples       []SampleInput `json:"samples"`
}

type UpdateSubmissionRequest struct {
	TypeService   string        `json:"type_service,omitempty"`
	PurposeOfTest string        `json:"purpose_of_test,omitempty"`
	SampleTaker   string        `json:"sample_taker,omitempty"`
	Notes         string        `json:"notes,omitempty"`
	Samples       []SampleInput `json:"samples,omitempty"`
}