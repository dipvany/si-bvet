package dto

type TestServiceRequest struct {
	TestName    string  `json:"test_name" binding:"required"`
	UnitLab     string  `json:"unit_lab"`
	Target      string  `json:"target"`
	Price       float64 `json:"price"`
	Description string  `json:"description"`
	SampleReqmt string  `json:"sample_reqmt"`
}