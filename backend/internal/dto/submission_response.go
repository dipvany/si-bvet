package dto

import "time"

type SubmissionCustomerDetailResponse struct {
    ID                uint                            `json:"id"`
    NoRegistration    string                          `json:"no_registration,omitempty"`
    NoEpi             string                          `json:"no_epi,omitempty"`
    NoTicket          string                          `json:"no_ticket"`
    TypeService       string                          `json:"type_service"`
    PurposeOfTest     string                          `json:"purpose_of_test"`
    DateOfSend        *time.Time                      `json:"date_of_send,omitempty"`
    DateOfReceive     *time.Time                      `json:"date_of_receive,omitempty"`
    SampleTaker       string                          `json:"sample_taker,omitempty"`
    IDIsikhnas        string                          `json:"id_isikhnas,omitempty"`
    DiagnosisRequired bool                            `json:"diagnosis_required"`
    AgendaNo          string                          `json:"agenda_no,omitempty"`
    CustLetterNo      string                          `json:"cust_letter_no,omitempty"`
    CourierName       string                          `json:"courier_name,omitempty"`
    CourierContact    string                          `json:"courier_contact,omitempty"`
    Notes             string                          `json:"notes,omitempty"`
    SamplesCount      int                             `json:"samples_count"`
    ProcessStatus     string                          `json:"process_status"`
    AttachmentDoc     string                          `json:"attachment_doc,omitempty"`
    CreatedAt         *time.Time                      `json:"created_at,omitempty"`
    UpdatedAt         *time.Time                      `json:"updated_at,omitempty"`
    Samples           []SubmissionCustomerSampleResponse `json:"samples,omitempty"`
    Billing           *SubmissionCustomerBillingResponse `json:"billing,omitempty"`
    LHUDocument       *SubmissionCustomerLHUResponse   `json:"lhu_document,omitempty"`
}

type SubmissionCustomerSampleResponse struct {
    ID             uint                                 `json:"id"`
    SampleModel    string                               `json:"sample_model,omitempty"`
    SampleCodeCust string                               `json:"sample_code_cust"`
    SpecimenGroup  string                               `json:"specimen_group,omitempty"`
    SpecimenType   string                               `json:"specimen_type,omitempty"`
    Species        string                               `json:"species,omitempty"`
    Preservative   string                               `json:"preservative,omitempty"`
    Packaging      string                               `json:"packaging,omitempty"`
    ProductionDate *time.Time                           `json:"production_date,omitempty"`
    ExpiredDate    *time.Time                           `json:"expired_date,omitempty"`
    Sex            string                               `json:"sex,omitempty"`
    Age            float64                              `json:"age,omitempty"`
    UnitAge        string                               `json:"unit_age,omitempty"`
    Owner          string                               `json:"owner,omitempty"`
    TestType       string                               `json:"test_type,omitempty"`
    LocationType   string                               `json:"location_type,omitempty"`
    LocationSmpl   string                               `json:"location_smpl,omitempty"`
    IsVaccinated   string                               `json:"is_vaccinated,omitempty"`
    Volume         string                               `json:"volume,omitempty"`
    Condition      string                               `json:"condition,omitempty"`
    TotalSample    int64                                `json:"total_sample"`
    TestRequests   []SubmissionCustomerTestRequestResponse `json:"test_requests,omitempty"`
}

type SubmissionCustomerTestRequestResponse struct {
    ID            uint                               `json:"id"`
    TestServiceID  uint                               `json:"test_service_id"`
    Discount      float64                             `json:"discount"`
    PriceAtMoment float64                             `json:"price_at_moment"`
    TestService   *SubmissionCustomerTestServiceResponse `json:"test_service,omitempty"`
}

type SubmissionCustomerTestServiceResponse struct {
    ID            uint    `json:"id"`
    TestName      string  `json:"test_name"`
    UnitLab       string  `json:"unit_lab"`
    Target        string  `json:"target,omitempty"`
    Method        string  `json:"method,omitempty"`
    ResultType    string  `json:"result_type,omitempty"`
    TestReference string  `json:"test_reference,omitempty"`
    Price         float64 `json:"price"`
    Duration      string  `json:"duration,omitempty"`
    Description   string  `json:"description,omitempty"`
}

type SubmissionCustomerBillingResponse struct {
    ID            uint       `json:"id"`
    EBillingCode  string     `json:"ebilling_code,omitempty"`
    TotalAmount   float64    `json:"total_amount"`
    PaymentStatus string     `json:"payment_status"`
    PaidAt        *time.Time `json:"paid_at,omitempty"`
    IssuedAt      *time.Time `json:"issued_at,omitempty"`
    InvoiceDoc    string     `json:"invoice_doc,omitempty"`
    ProofPayment  string     `json:"proof_payment,omitempty"`
}

type SubmissionCustomerLHUResponse struct {
    ID         uint       `json:"id"`
    NoLhu      string     `json:"no_lhu"`
    FilePath   string     `json:"file_path,omitempty"`
    DateOfPub  *time.Time `json:"date_of_pub,omitempty"`
}