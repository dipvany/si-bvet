package dto

type TestInput struct {
	TestServiceID uint `json:"test_service_id"`
}

type SampleInput struct {
	SampleCodeCust string `json:"sample_code_cust" binding:"required"`
	SampleModel    string `json:"sample_model" binding:"required"`
	SampleCodePool string `json:"sample_code_pool"`
	SpecimenGroup  string `json:"specimen_group"`
	SpecimenType   string `json:"specimen_type"`
	Species        string `json:"species"`
	// Batch          string      `json:"batch"`
	Preservative   string      `json:"preservative"`
	Packaging      string      `json:"packaging"`
	ProductionDate string      `json:"production_date"`
	ExpiredDate    string      `json:"expired_date"`
	Sex            string      `json:"sex"`
	Age            float64     `json:"age"`
	UnitAge        string      `json:"unit_age"`
	Owner          string      `json:"owner"`
	TestType       string      `json:"test_type"`
	TestServiceID  uint        `json:"test_service_id"`
	LocationType   string      `json:"location_type"`
	LocationSmpl   string      `json:"location_smpl"`
	IsVaccinated   string      `json:"is_vaccinated"`
	Volume         string      `json:"volume"`
	Condition      string      `json:"condition"`
	TotalSample    int64       `json:"total_sample" binding:"required"`
	Tests          []TestInput `json:"tests" binding:"required"`
}

type SubmissionRequest struct {
	// Fields mapped from models.Submission
	NoRegistration    string        `json:"no_registration" form:"no_registration"`
	NoEpi             string        `json:"no_epi" form:"no_epi"`
	NoTicket          string        `json:"no_ticket" form:"no_ticket"`
	TypeService       string        `json:"type_service" form:"type_service"`
	PurposeOfTest     string        `json:"purpose_of_test" form:"purpose_of_test"`
	DateOfSend        string        `json:"date_of_send" form:"date_of_send"`
	DateOfReceive     string        `json:"date_of_receive" form:"date_of_receive"`
	SampleTaker       string        `json:"sample_taker" form:"sample_taker"`
	IDIsikhnas        string        `json:"id_isikhnas" form:"id_isikhnas"`
	DiagnosisRequired bool          `json:"diagnosis_required" form:"diagnosis_required"`
	AgendaNo          string        `json:"agenda_no" form:"agenda_no"`
	CustLetterNo      string        `json:"cust_letter_no" form:"cust_letter_no"`
	CourierName       string        `json:"courier_name" form:"courier_name"`
	CourierContact    string        `json:"courier_contact" form:"courier_contact"`
	Notes             string        `json:"notes" form:"notes"`
	SamplesCount      int           `json:"samples_count" form:"samples_count"`
	ProcessStatus     string        `json:"process_status" form:"process_status"`
	AttachmentDoc     string        `json:"attachment_doc" form:"attachment_doc"`
	Samples           []SampleInput `json:"samples"`
}

type UpdateSubmissionRequest struct {
	NoRegistration    string        `json:"no_registration,omitempty"`
	NoEpi             string        `json:"no_epi,omitempty"`
	NoTicket          string        `json:"no_ticket,omitempty"`
	TypeService       string        `json:"type_service,omitempty"`
	PurposeOfTest     string        `json:"purpose_of_test,omitempty"`
	DateOfSend        string        `json:"date_of_send,omitempty"`
	DateOfReceive     string        `json:"date_of_receive,omitempty"`
	SampleTaker       string        `json:"sample_taker,omitempty"`
	IDIsikhnas        string        `json:"id_isikhnas,omitempty"`
	DiagnosisRequired *bool         `json:"diagnosis_required,omitempty"`
	AgendaNo          string        `json:"agenda_no,omitempty"`
	CustLetterNo      string        `json:"cust_letter_no,omitempty"`
	CourierName       string        `json:"courier_name,omitempty"`
	CourierContact    string        `json:"courier_contact,omitempty"`
	Notes             string        `json:"notes,omitempty"`
	SamplesCount      *int          `json:"samples_count,omitempty"`
	ProcessStatus     string        `json:"process_status,omitempty"`
	AttachmentDoc     string        `json:"attachment_doc,omitempty"`
	Samples           []SampleInput `json:"samples,omitempty"`
}
