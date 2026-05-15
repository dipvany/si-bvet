package dto

type TestServiceRequest struct {
	TestName      string  `json:"test_name" binding:"required"`
	UnitLab       string  `json:"unit_lab"`
	Target        string  `json:"target"`
	Method        string  `json:"method"`
	ResultType    string  `json:"result_type"`
	TestReference string  `json:"test_reference"`
	Price         float64 `json:"price"`
	Duration      string  `json:"duration"`
	Description   string  `json:"description"`
	SampleReqmt   string  `json:"sample_reqmt"`
}