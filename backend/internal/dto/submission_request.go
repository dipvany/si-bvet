package dto

type TestInput struct {
	TestServiceID uint `json:"test_service_id"`
}

type SampleInput struct {
	SampleCodeCust    string      `json:"sample_code_cust" binding:"required"`
	SampleType        string      `json:"sample_type" binding:"required"`
	Species           string      `json:"species"`
	Age               string      `json:"age"`
	Volume            string      `json:"volume"`
	Condition         string      `json:"condition"`
	LocationSmplTaken string      `json:"location_smpl_taken"`
	TotalSample       int         `json:"total_sample" binding:"required"`
	Tests             []TestInput `json:"tests" binding:"required"`
}

type SubmissionRequest struct {
	TypeService   string        `json:"type_service"`
	PurposeOfTest string        `json:"purpose_of_test"`
	SampleTaker   string        `json:"sample_taker"`
	Notes         string        `json:"notes"`
	Samples       []SampleInput `json:"samples"`
}

type UpdateSubmissionRequest struct {
	TypeService   string        `json:"type_service,omitempty"`
	PurposeOfTest string        `json:"purpose_of_test,omitempty"`
	SampleTaker   string        `json:"sample_taker,omitempty"`
	Notes         string        `json:"notes,omitempty"`
	Samples       []SampleInput `json:"samples,omitempty"`
}