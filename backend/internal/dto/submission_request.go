package dto

type SampleRequest struct {
	SampleCodeCust    string `json:"sample_code_cust" binding:"required"`
	SampleType        string `json:"sample_type" binding:"required"`
	Species           string `json:"species"`
	Age               string `json:"age"`
	Volume            string `json:"volume"`
	Condition         string `json:"condition"`
	LocationSmplTaken string `json:"location_smpl_taken"`
	TotalSample       int64  `json:"total_sample" binding:"required"`
}

type SubmissionRequest struct {
	TypeService   string          `json:"type_service"`
	PurposeOfTest string          `json:"purpose_of_test"`
	SampleTaker   string          `json:"sample_taker"`
	SamplesCount  int             `json:"samples_count"`
	Notes         string          `json:"notes"`
	Samples       []SampleRequest `json:"samples"`
}