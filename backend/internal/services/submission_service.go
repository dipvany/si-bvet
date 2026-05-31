package services

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"
	"unicode"

	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/repositories"

	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type SubmissionServiceInterface interface {
	Create(userID uint, req dto.SubmissionRequest) (models.Submission, error)
	GetByUser(userID uint) ([]models.Submission, error)
	GetAll() ([]models.Submission, error)
	Approve(id uint) error
	Reject(id uint) error
	Update(submissionID uint, userID uint, req dto.UpdateSubmissionRequest) error
	GetTrackingTimeline(submissionID uint, userID uint) (dto.SubmissionTrackingTimelineResponse, error)
	GetSampleTemplate() (*bytes.Buffer, error)
	GetUploadedSampleTemplate() (*models.SubmissionSampleTemplate, error)
	SaveUploadedSampleTemplate(userID uint, filePath string, fileName string) error
	ImportSamplesFromTemplate(submissionID uint, file io.Reader) (dto.SampleTemplateImportResponse, error)
}

type SubmissionService struct{}

func NewSubmissionService() SubmissionServiceInterface {
	return &SubmissionService{}
}

func (s *SubmissionService) Create(userID uint, req dto.SubmissionRequest) (models.Submission, error) {
	id, err := CreateSubmissionWithSamplesAndTests(userID, req)
	if err != nil {
		return models.Submission{}, err
	}

	submission, err := repositories.GetSubmissionByIDWithRelations(id)
	if err != nil {
		return models.Submission{}, err
	}

	return submission, nil
}

func (s *SubmissionService) GetByUser(userID uint) ([]models.Submission, error) {
	return GetSubmissionsByUser(userID)
}

func (s *SubmissionService) GetAll() ([]models.Submission, error) {
	return GetAllSubmissions()
}

func (s *SubmissionService) Approve(id uint) error {
	return ApproveSubmission(id)
}

func (s *SubmissionService) Reject(id uint) error {
	return RejectSubmission(id)
}

func (s *SubmissionService) Update(submissionID uint, userID uint, req dto.UpdateSubmissionRequest) error {
	return UpdateSubmissionWithSamplesAndTests(submissionID, userID, req)
}

func (s *SubmissionService) GetTrackingTimeline(submissionID uint, userID uint) (dto.SubmissionTrackingTimelineResponse, error) {
	return GetSubmissionTrackingTimeline(submissionID, userID)
}

func (s *SubmissionService) GetSampleTemplate() (*bytes.Buffer, error) {
	return GenerateSampleTemplateExcel()
}

func (s *SubmissionService) GetUploadedSampleTemplate() (*models.SubmissionSampleTemplate, error) {
	return repositories.GetLatestSubmissionSampleTemplate()
}

func (s *SubmissionService) SaveUploadedSampleTemplate(userID uint, filePath string, fileName string) error {
	return repositories.CreateSubmissionSampleTemplate(&models.SubmissionSampleTemplate{
		UploadedByUserID: userID,
		FilePath:         filePath,
		FileName:         fileName,
	})
}

func (s *SubmissionService) ImportSamplesFromTemplate(submissionID uint, file io.Reader) (dto.SampleTemplateImportResponse, error) {
	samples, err := ParseSamplesFromTemplateExcel(file)
	if err != nil {
		return dto.SampleTemplateImportResponse{}, err
	}

	return dto.SampleTemplateImportResponse{
		SubmissionID: submissionID,
		Samples:      samples,
		TotalSamples: len(samples),
	}, nil
}

func CreateSubmission(sub *models.Submission) error {
	sub.ProcessStatus = "pending_verification"

	return repositories.CreateSubmission(sub)
}

func CreateSubmissionWithSamplesAndTests(userID uint, req dto.SubmissionRequest) (uint, error) {
	submission := buildSubmission(userID, req)

	err := repositories.InTransaction(func(tx *gorm.DB) error {
		if err := repositories.CreateSubmissionWithTicket(tx, &submission); err != nil {
			return err
		}

		if err := createSamplesAndTestsTx(tx, submission.ID, req.Samples); err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return 0, err
	}

	NotifySubmissionStatusChanged(submission.ID, submission.ProcessStatus)
	return submission.ID, nil
}

func GetSubmissionsByUser(userID uint) ([]models.Submission, error) {
	return repositories.GetSubmissionsByUser(userID)
}

func GetAllSubmissions() ([]models.Submission, error) {
	return repositories.GetAllSubmissions()
}

func UpdateSubmission(id uint, data map[string]interface{}) error {
	return repositories.UpdateSubmission(id, data)
}

func ApproveSubmission(id uint) error {
	// Verify submission exists and is in correct status for approval
	submission, err := repositories.GetSubmissionByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("submission not found")
		}
		return err
	}

	if submission.ProcessStatus != "pending_verification" {
		return errors.New("submission can only be approved when status is pending_verification")
	}

	return UpdateSubmissionStatusWithNotification(id, "approved")
}

func RejectSubmission(id uint) error {
	// Verify submission exists and is in correct status for rejection
	submission, err := repositories.GetSubmissionByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("submission not found")
		}
		return err
	}

	if submission.ProcessStatus != "pending_verification" {
		return errors.New("submission can only be rejected when status is pending_verification")
	}

	return UpdateSubmissionStatusWithNotification(id, "rejected")
}

func UpdateSubmissionStatusWithNotification(submissionID uint, status string) error {
	if err := repositories.UpdateSubmissionStatus(submissionID, status); err != nil {
		return err
	}

	NotifySubmissionStatusChanged(submissionID, status)
	return nil
}

func UpdateSubmissionWithSamplesAndTests(
	submissionID uint,
	userID uint,
	req dto.UpdateSubmissionRequest,
) error {
	return repositories.InTransaction(func(tx *gorm.DB) error {
		submission, err := repositories.GetSubmissionByIDTx(tx, submissionID)
		if err != nil {
			return err
		}

		if submission.UserID != userID {
			return errors.New("unauthorized")
		}

		if submission.ProcessStatus != "pending_verification" {
			return errors.New("submission cannot be edited after verification")
		}

		submission.TypeService = req.TypeService
		submission.PurposeOfTest = req.PurposeOfTest
		submission.SampleTaker = req.SampleTaker
		submission.Notes = req.Notes
		submission.SamplesCount = len(req.Samples)

		if err := repositories.SaveSubmissionTx(tx, &submission); err != nil {
			return err
		}

		if err := repositories.DeleteTestRequestsBySubmissionIDTx(tx, submissionID); err != nil {
			return err
		}

		if err := repositories.DeleteSamplesBySubmissionIDTx(tx, submissionID); err != nil {
			return err
		}

		if err := createSamplesAndTestsTx(tx, submission.ID, req.Samples); err != nil {
			return err
		}

		return nil
	})
}

func buildSubmission(userID uint, req dto.SubmissionRequest) models.Submission {
	return models.Submission{
		UserID:        userID,
		TypeService:   req.TypeService,
		PurposeOfTest: req.PurposeOfTest,
		SampleTaker:   req.SampleTaker,
		SamplesCount:  len(req.Samples),
		Notes:         req.Notes,
		ProcessStatus: "pending_verification",
	}
}

func createSamplesAndTestsTx(tx *gorm.DB, submissionID uint, samples []dto.SampleInput) error {
	for _, sampleReq := range samples {
		productionDate, err := parseDate(sampleReq.ProductionDate)
		if err != nil {
			return fmt.Errorf("invalid production_date for sample %s: %w", sampleReq.SampleCodeCust, err)
		}

		expiredDate, err := parseDate(sampleReq.ExpiredDate)
		if err != nil {
			return fmt.Errorf("invalid expired_date for sample %s: %w", sampleReq.SampleCodeCust, err)
		}

		sample := models.Sample{
			SubmissionID:   submissionID,
			SampleCodeCust: sampleReq.SampleCodeCust,
			SampleModel:    sampleReq.SampleModel,
			SpecimenGroup:  sampleReq.SpecimenGroup,
			SpecimenType:   sampleReq.SpecimenType,
			Species:        sampleReq.Species,
			Batch:          sampleReq.Batch,
			Preservative:   sampleReq.Preservative,
			Packaging:      sampleReq.Packaging,
			ProductionDate: productionDate,
			ExpiredDate:    expiredDate,
			Sex:            sampleReq.Sex,
			Age:            sampleReq.Age,
			UnitAge:        sampleReq.UnitAge,
			Owner:          sampleReq.Owner,
			TestType:       sampleReq.TestType,
			LocationType:   sampleReq.LocationType,
			Volume:         sampleReq.Volume,
			Condition:      sampleReq.Condition,
			LocationSmpl:   sampleReq.LocationSmpl,
			IsVaccinated:   sampleReq.IsVaccinated,
			TotalSample:    int64(sampleReq.TotalSample),
		}

		if err := repositories.CreateSampleTx(tx, &sample); err != nil {
			return err
		}

		for _, testReq := range sampleReq.Tests {
			service, err := repositories.GetTestServiceByIDTx(tx, testReq.TestServiceID)
			if err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return fmt.Errorf("test service with id %d not found", testReq.TestServiceID)
				}
				return err
			}

			createReq := models.TestRequest{
				SampleID:      sample.ID,
				TestServiceID: testReq.TestServiceID,
				PriceAtMoment: service.Price,
				Discount:      0,
			}

			if err := repositories.CreateTestRequestTx(tx, &createReq); err != nil {
				return err
			}
		}
	}

	return nil
}

func GetSubmissionTracking(submissionID uint, userID uint) (dto.SubmissionTrackingResponse, error) {

	submission, err := repositories.GetSubmissionTracking(submissionID)
	if err != nil {
		return dto.SubmissionTrackingResponse{}, err
	}

	// ownership validation
	if submission.UserID != userID {
		return dto.SubmissionTrackingResponse{}, errors.New("unauthorized")
	}

	resp := dto.SubmissionTrackingResponse{
		SubmissionID:  submission.ID,
		ProcessStatus: submission.ProcessStatus,
		LHUAvailable:  submission.LHU != nil,
	}

	if submission.Billing != nil {
		resp.BillingStatus = submission.Billing.PaymentStatus
	}

	return resp, nil
}

func GetSubmissionTrackingTimeline(
	submissionID uint,
	userID uint,
) (dto.SubmissionTrackingTimelineResponse, error) {

	submission, err := repositories.GetSubmissionTracking(submissionID)
	if err != nil {
		return dto.SubmissionTrackingTimelineResponse{}, err
	}

	if submission.UserID != userID {
		return dto.SubmissionTrackingTimelineResponse{}, errors.New("unauthorized")
	}

	steps := []dto.TrackingStep{
		{Step: 1, Label: "Pengajuan dibuat", Status: "completed"},
		{Step: 2, Label: "Diverifikasi admin", Status: "pending"},
		{Step: 3, Label: "Menunggu pembayaran", Status: "pending"},
		{Step: 4, Label: "Sedang diproses lab", Status: "pending"},
		{Step: 5, Label: "LHU tersedia", Status: "pending"},
	}

	currentStep := 1

	switch submission.ProcessStatus {
	case "pending_verification":
		currentStep = 1
		steps[0].Status = "current"

	case "awaiting_payment", "menunggu_pembayaran":
		currentStep = 3
		steps[1].Status = "completed"
		steps[2].Status = "current"

	case "awaiting_verification", "menunggu_verifikasi_pembayaran":
		currentStep = 3
		steps[1].Status = "completed"
		steps[2].Status = "current"

	case "processed", "diproses":
		currentStep = 4
		steps[1].Status = "completed"
		steps[2].Status = "completed"
		steps[3].Status = "current"

	case "done", "selesai":
		currentStep = 5
		for i := range steps[:4] {
			steps[i].Status = "completed"
		}
		steps[4].Status = "current"
	}

	return dto.SubmissionTrackingTimelineResponse{
		SubmissionID:  submission.ID,
		CurrentStep:   currentStep,
		CurrentStatus: submission.ProcessStatus,
		Timeline:      steps,
	}, nil
}

func ExportSubmissionsExcel(
	req dto.ExportSubmissionRequest,
	exportedBy string,
) (*bytes.Buffer, error) {

	submissions, err := repositories.GetSubmissionsForExport(
		req.SubmissionIDs,
		req.ExportAll,
	)
	if err != nil {
		return nil, err
	}

	f := excelize.NewFile()

	// =========================
	// SHEET 1: METADATA
	// =========================
	metaSheet := "Metadata"
	f.SetSheetName("Sheet1", metaSheet)

	totalSamples := 0
	totalTests := 0

	for _, s := range submissions {
		totalSamples += len(s.Samples)
		for _, sample := range s.Samples {
			totalTests += len(sample.TestRequests)
		}
	}

	exportMode := "SELECTED"
	if req.ExportAll {
		exportMode = "ALL"
	}

	metadata := [][]interface{}{
		{"Generated At", time.Now().Format("2006-01-02 15:04:05")},
		{"Generated By", exportedBy},
		{"Export Mode", exportMode},
		{"Total Submissions", len(submissions)},
		{"Total Samples", totalSamples},
		{"Total Tests", totalTests},
	}

	for i, row := range metadata {
		f.SetCellValue(metaSheet, fmt.Sprintf("A%d", i+1), row[0])
		f.SetCellValue(metaSheet, fmt.Sprintf("B%d", i+1), row[1])
	}

	// =========================
	// SHEET 2: SUMMARY
	// =========================
	f.NewSheet("Summary")
	f.SetCellValue("Summary", "A1", "Submission ID")
	f.SetCellValue("Summary", "B1", "Customer")
	f.SetCellValue("Summary", "C1", "Email")
	f.SetCellValue("Summary", "D1", "Status")
	f.SetCellValue("Summary", "E1", "Samples Count")

	row := 2
	for _, s := range submissions {
		f.SetCellValue("Summary", fmt.Sprintf("A%d", row), s.ID)
		f.SetCellValue("Summary", fmt.Sprintf("B%d", row), s.User.FullName)
		f.SetCellValue("Summary", fmt.Sprintf("C%d", row), s.User.Email)
		f.SetCellValue("Summary", fmt.Sprintf("D%d", row), s.ProcessStatus)
		f.SetCellValue("Summary", fmt.Sprintf("E%d", row), len(s.Samples))
		row++
	}

	// =========================
	// SHEET 3: SAMPLES
	// =========================
	f.NewSheet("Samples")
	f.SetCellValue("Samples", "A1", "Submission ID")
	f.SetCellValue("Samples", "B1", "Sample Code")
	f.SetCellValue("Samples", "C1", "Sample Model")
	f.SetCellValue("Samples", "D1", "Specimen Group")
	f.SetCellValue("Samples", "E1", "Specimen Type")
	f.SetCellValue("Samples", "F1", "Species")
	f.SetCellValue("Samples", "G1", "Batch")
	f.SetCellValue("Samples", "H1", "Preservative")
	f.SetCellValue("Samples", "I1", "Packaging")
	f.SetCellValue("Samples", "J1", "Production Date")
	f.SetCellValue("Samples", "K1", "Expired Date")
	f.SetCellValue("Samples", "L1", "Sex")
	f.SetCellValue("Samples", "M1", "Age")
	f.SetCellValue("Samples", "N1", "Unit Age")
	f.SetCellValue("Samples", "O1", "Owner")
	f.SetCellValue("Samples", "P1", "Test Type")
	f.SetCellValue("Samples", "Q1", "Location Type")
	f.SetCellValue("Samples", "R1", "Location Sample")
	f.SetCellValue("Samples", "S1", "Vaccinated")
	f.SetCellValue("Samples", "T1", "Volume")
	f.SetCellValue("Samples", "U1", "Condition")
	f.SetCellValue("Samples", "V1", "Total Sample")

	row = 2
	for _, s := range submissions {
		for _, sample := range s.Samples {
			f.SetCellValue("Samples", fmt.Sprintf("A%d", row), s.ID)
			f.SetCellValue("Samples", fmt.Sprintf("B%d", row), sample.SampleCodeCust)
			f.SetCellValue("Samples", fmt.Sprintf("C%d", row), sample.SampleModel)
			f.SetCellValue("Samples", fmt.Sprintf("D%d", row), sample.SpecimenGroup)
			f.SetCellValue("Samples", fmt.Sprintf("E%d", row), sample.SpecimenType)
			f.SetCellValue("Samples", fmt.Sprintf("F%d", row), sample.Species)
			f.SetCellValue("Samples", fmt.Sprintf("G%d", row), sample.Batch)
			f.SetCellValue("Samples", fmt.Sprintf("H%d", row), sample.Preservative)
			f.SetCellValue("Samples", fmt.Sprintf("I%d", row), sample.Packaging)
			if sample.ProductionDate != nil {
				f.SetCellValue("Samples", fmt.Sprintf("J%d", row), sample.ProductionDate.Format("2006-01-02"))
			}
			if sample.ExpiredDate != nil {
				f.SetCellValue("Samples", fmt.Sprintf("K%d", row), sample.ExpiredDate.Format("2006-01-02"))
			}
			f.SetCellValue("Samples", fmt.Sprintf("L%d", row), sample.Sex)
			f.SetCellValue("Samples", fmt.Sprintf("M%d", row), sample.Age)
			f.SetCellValue("Samples", fmt.Sprintf("N%d", row), sample.UnitAge)
			f.SetCellValue("Samples", fmt.Sprintf("O%d", row), sample.Owner)
			f.SetCellValue("Samples", fmt.Sprintf("P%d", row), sample.TestType)
			f.SetCellValue("Samples", fmt.Sprintf("Q%d", row), sample.LocationType)
			f.SetCellValue("Samples", fmt.Sprintf("R%d", row), sample.LocationSmpl)
			f.SetCellValue("Samples", fmt.Sprintf("S%d", row), sample.IsVaccinated)
			f.SetCellValue("Samples", fmt.Sprintf("T%d", row), sample.Volume)
			f.SetCellValue("Samples", fmt.Sprintf("U%d", row), sample.Condition)
			f.SetCellValue("Samples", fmt.Sprintf("V%d", row), sample.TotalSample)
			row++
		}
	}

	// =========================
	// SHEET 4: TESTS
	// =========================
	f.NewSheet("Tests")
	f.SetCellValue("Tests", "A1", "Submission ID")
	f.SetCellValue("Tests", "B1", "Sample Code")
	f.SetCellValue("Tests", "C1", "Test Name")
	f.SetCellValue("Tests", "D1", "Price")

	row = 2
	for _, s := range submissions {
		for _, sample := range s.Samples {
			for _, test := range sample.TestRequests {
				f.SetCellValue("Tests", fmt.Sprintf("A%d", row), s.ID)
				f.SetCellValue("Tests", fmt.Sprintf("B%d", row), sample.SampleCodeCust)
				f.SetCellValue("Tests", fmt.Sprintf("C%d", row), test.TestService.TestName)
				f.SetCellValue("Tests", fmt.Sprintf("D%d", row), test.PriceAtMoment)
				row++
			}
		}
	}

	// =========================
	// SHEET 5: BILLING
	// =========================
	f.NewSheet("Billing")
	f.SetCellValue("Billing", "A1", "Submission ID")
	f.SetCellValue("Billing", "B1", "Billing Code")
	f.SetCellValue("Billing", "C1", "Amount")
	f.SetCellValue("Billing", "D1", "Payment Status")

	row = 2
	for _, s := range submissions {
		if s.Billing != nil {
			f.SetCellValue("Billing", fmt.Sprintf("A%d", row), s.ID)
			f.SetCellValue("Billing", fmt.Sprintf("B%d", row), s.Billing.EBillingCode)
			f.SetCellValue("Billing", fmt.Sprintf("C%d", row), s.Billing.TotalAmount)
			f.SetCellValue("Billing", fmt.Sprintf("D%d", row), s.Billing.PaymentStatus)
			row++
		}
	}

	buf := new(bytes.Buffer)
	if err := f.Write(buf); err != nil {
		return nil, err
	}

	return buf, nil
}

func GenerateSampleTemplateExcel() (*bytes.Buffer, error) {
	f := excelize.NewFile()
	sheet := "SampleTemplate"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{
		"sample_code_cust",
		"sample_model",
		"specimen_group",
		"specimen_type",
		"species",
		"batch",
		"preservative",
		"packaging",
		"production_date",
		"expired_date",
		"sex",
		"age",
		"unit_age",
		"owner",
		"test_type",
		"location_type",
		"location_smpl",
		"is_vaccinated",
		"volume",
		"condition",
		"total_sample",
		"test_service_ids",
	}

	for idx, h := range headers {
		col, _ := excelize.ColumnNumberToName(idx + 1)
		f.SetCellValue(sheet, col+"1", h)
	}

	// Example row for quicker onboarding in customer side.
	example := []interface{}{
		"SAMPLE-001",
		"Serum",
		"Darah",
		"Serum",
		"Ayam",
		"BATCH-2026-01",
		"None",
		"Tube",
		"2026-05-01",
		"2026-05-03",
		"N/A",
		1,
		"hari",
		"PT Maju Ternak",
		"Diagnostik",
		"Kandang",
		"Bandung",
		"ya",
		"5 ml",
		"baik",
		1,
		"1,3",
	}

	for idx, value := range example {
		col, _ := excelize.ColumnNumberToName(idx + 1)
		f.SetCellValue(sheet, col+"2", value)
	}

	buf := new(bytes.Buffer)
	if err := f.Write(buf); err != nil {
		return nil, err
	}

	return buf, nil
}

func ParseSamplesFromTemplateExcel(file io.Reader) ([]dto.SampleInput, error) {
	f, err := excelize.OpenReader(file)
	if err != nil {
		return nil, errors.New("failed to read excel file")
	}

	sheetName := f.GetSheetName(0)
	if sheetName == "" {
		return nil, errors.New("excel sheet is empty")
	}

	rows, err := f.GetRows(sheetName)
	if err != nil {
		return nil, err
	}

	if len(rows) < 2 {
		return nil, errors.New("template must contain header and at least one data row")
	}

	headerMap, headerRowIdx, err := resolveSampleTemplateHeaderMap(rows)
	if err != nil {
		return nil, err
	}

	samples := make([]dto.SampleInput, 0)
	for rowIdx := headerRowIdx + 1; rowIdx < len(rows); rowIdx++ {
		row := rows[rowIdx]

		if isRowEmpty(row) {
			continue
		}

		sample := dto.SampleInput{
			SampleCodeCust: getCellValueByHeader(row, headerMap, []string{"samplecodecust", "samplecodecustomer", "samplecode", "sample code customer", "sample code cust", "kodesampel", "kodesampelcustomer"}),
			SampleModel:    getCellValueByHeader(row, headerMap, []string{"samplemodel", "sample model", "model sampel"}),
			SpecimenGroup:  getCellValueByHeader(row, headerMap, []string{"specimengroup", "specimen group", "kelompokspesimen"}),
			SpecimenType:   getCellValueByHeader(row, headerMap, []string{"specimentype", "specimen", "jenisspesimen"}),
			Species:        getCellValueByHeader(row, headerMap, []string{"species", "hewanspecies", "hewan species", "spesies"}),
			Batch:          getCellValueByHeader(row, headerMap, []string{"batch"}),
			Preservative:   getCellValueByHeader(row, headerMap, []string{"preservative", "pengawet"}),
			Packaging:      getCellValueByHeader(row, headerMap, []string{"packaging", "kemasan"}),
			ProductionDate: getCellValueByHeader(row, headerMap, []string{"productiondate", "tanggalproduksi"}),
			ExpiredDate:    getCellValueByHeader(row, headerMap, []string{"expireddate", "tanggalkedaluwarsa", "tanggalkadaluarsa"}),
			Sex:            getCellValueByHeader(row, headerMap, []string{"sex", "jeniskelamin"}),
			UnitAge:        getCellValueByHeader(row, headerMap, []string{"unitage", "satuanumur"}),
			Owner:          getCellValueByHeader(row, headerMap, []string{"owner", "pemilik", "pemilikihewan"}),
			TestType:       getCellValueByHeader(row, headerMap, []string{"testtype", "test type", "jenis uji", "jenisuji", "tipepengujian"}),
			LocationType:   getCellValueByHeader(row, headerMap, []string{"locationtype", "location type", "jenis lokasi", "jenislokasi", "tipelokasi"}),
			LocationSmpl:   getCellValueByHeader(row, headerMap, []string{"locationsmpl", "location sample", "lokasi sampel", "lokasisampel"}),
			IsVaccinated:   getCellValueByHeader(row, headerMap, []string{"isvaccinated", "is vaccinated", "telah divaksin", "vaksinasi"}),
			Volume:         getCellValueByHeader(row, headerMap, []string{"volume"}),
			Condition:      getCellValueByHeader(row, headerMap, []string{"condition", "kondisi"}),
		}

		if sample.SampleCodeCust == "" && sample.SampleModel == "" {
			continue
		}

		if sample.SampleCodeCust == "" {
			return nil, fmt.Errorf("row %d: sample_code_cust is required", rowIdx+1)
		}
		if sample.SampleModel == "" {
			return nil, fmt.Errorf("row %d: sample_model is required", rowIdx+1)
		}

		if sample.ProductionDate != "" {
			if _, err := parseDate(sample.ProductionDate); err != nil {
				return nil, fmt.Errorf("row %d: invalid production_date format, expected YYYY-MM-DD", rowIdx+1)
			}
		}
		if sample.ExpiredDate != "" {
			if _, err := parseDate(sample.ExpiredDate); err != nil {
				return nil, fmt.Errorf("row %d: invalid expired_date format, expected YYYY-MM-DD", rowIdx+1)
			}
		}

		ageStr := getCellValueByHeader(row, headerMap, []string{"age", "umur"})
		if ageStr != "" {
			age, err := strconv.ParseFloat(strings.TrimSpace(ageStr), 64)
			if err != nil {
				return nil, fmt.Errorf("row %d: age must be a number", rowIdx+1)
			}
			sample.Age = age
		}

		totalSampleStr := getCellValueByHeader(row, headerMap, []string{"totalsample", "total sample", "jumlahsampel"})
		if totalSampleStr == "" {
			sample.TotalSample = 1
		} else {
			totalSample, err := strconv.ParseInt(strings.TrimSpace(totalSampleStr), 10, 64)
			if err != nil || totalSample <= 0 {
				return nil, fmt.Errorf("row %d: total_sample must be a positive integer", rowIdx+1)
			}
			sample.TotalSample = totalSample
		}

		testsRaw := getCellValueByHeader(row, headerMap, []string{"testserviceids", "test service ids", "testids", "idpengujian"})
		if strings.TrimSpace(testsRaw) != "" {
			tests, err := parseOptionalTestServiceIDs(testsRaw)
			if err != nil {
				return nil, fmt.Errorf("row %d: %w", rowIdx+1, err)
			}
			sample.Tests = tests
		}

		samples = append(samples, sample)
	}

	if len(samples) == 0 {
		return nil, errors.New("no valid sample data found")
	}

	return samples, nil
}

type headerSpec struct {
	canonical string
	aliases   []string
}

func resolveSampleTemplateHeaderMap(rows [][]string) (map[string]int, int, error) {
	headerSpecs := []headerSpec{
		{canonical: "samplecodecust", aliases: []string{"samplecodecust", "samplecodecustomer", "samplecode", "sample code cust", "sample code customer", "kode sampel", "kodesampelcustomer"}},
		{canonical: "samplemodel", aliases: []string{"samplemodel", "sample model", "model sampel"}},
		{canonical: "specimengroup", aliases: []string{"specimengroup", "specimen group", "kelompokspesimen"}},
		{canonical: "specimentype", aliases: []string{"specimentype", "specimen", "jenisspesimen"}},
		{canonical: "species", aliases: []string{"species", "hewanspecies", "hewan species", "spesies"}},
		{canonical: "batch", aliases: []string{"batch"}},
		{canonical: "preservative", aliases: []string{"preservative", "pengawet"}},
		{canonical: "packaging", aliases: []string{"packaging", "kemasan"}},
		{canonical: "productiondate", aliases: []string{"productiondate", "production date", "tanggalproduksi"}},
		{canonical: "expireddate", aliases: []string{"expireddate", "expired date", "tanggalkedaluwarsa", "tanggalkadaluarsa"}},
		{canonical: "sex", aliases: []string{"sex", "jeniskelamin"}},
		{canonical: "age", aliases: []string{"age", "umur"}},
		{canonical: "unitage", aliases: []string{"unitage", "unit age", "satuanumur"}},
		{canonical: "owner", aliases: []string{"owner", "pemilik", "pemilikihewan"}},
		{canonical: "testtype", aliases: []string{"testtype", "test type", "jenis uji", "jenisuji", "tipepengujian"}},
		{canonical: "locationtype", aliases: []string{"locationtype", "location type", "jenis lokasi", "jenislokasi", "tipelokasi"}},
		{canonical: "locationsmpl", aliases: []string{"locationsmpl", "location sample", "lokasi sampel", "lokasisampel"}},
		{canonical: "isvaccinated", aliases: []string{"isvaccinated", "is vaccinated", "telah divaksin", "vaksinasi"}},
		{canonical: "volume", aliases: []string{"volume"}},
		{canonical: "condition", aliases: []string{"condition", "kondisi"}},
		{canonical: "totalsample", aliases: []string{"totalsample", "total sample", "jumlahsampel"}},
		{canonical: "testserviceids", aliases: []string{"testserviceids", "test service ids", "testids", "idpengujian"}},
	}

	bestHeaderMap := map[string]int{}
	bestHeaderRowIdx := -1
	bestMatchCount := 0

	maxHeaderScanRows := len(rows)
	if maxHeaderScanRows > 10 {
		maxHeaderScanRows = 10
	}

	for rowIdx := 0; rowIdx < maxHeaderScanRows; rowIdx++ {
		row := rows[rowIdx]
		headerMap := map[string]int{}
		for idx, cell := range row {
			normalized := normalizeHeader(cell)
			if normalized != "" {
				headerMap[normalized] = idx
			}
		}

		matchCount := 0
		missingCore := false
		for _, spec := range headerSpecs {
			if _, ok := findHeaderIndex(headerMap, spec.aliases); ok {
				matchCount++
				continue
			}

			if spec.canonical == "samplecodecust" || spec.canonical == "samplemodel" {
				missingCore = true
			}
		}

		if missingCore {
			continue
		}

		if matchCount > bestMatchCount {
			bestMatchCount = matchCount
			bestHeaderMap = headerMap
			bestHeaderRowIdx = rowIdx
		}

		if matchCount == len(headerSpecs) {
			return headerMap, rowIdx, nil
		}
	}

	if bestHeaderRowIdx == -1 {
		return nil, -1, fmt.Errorf("missing required column: %s", "samplecodecust")
	}

	for _, required := range []headerSpec{
		{canonical: "samplecodecust", aliases: []string{"samplecodecust", "samplecodecustomer", "samplecode", "sample code cust", "sample code customer", "kode sampel", "kodesampelcustomer"}},
		{canonical: "samplemodel", aliases: []string{"samplemodel", "sample model", "model sampel"}},
	} {
		if _, ok := findHeaderIndex(bestHeaderMap, required.aliases); !ok {
			return nil, -1, fmt.Errorf("missing required column: %s", required.canonical)
		}
	}

	return bestHeaderMap, bestHeaderRowIdx, nil
}

func findHeaderIndex(headerMap map[string]int, aliases []string) (int, bool) {
	for _, alias := range aliases {
		if idx, ok := headerMap[normalizeHeader(alias)]; ok {
			return idx, true
		}
	}

	return 0, false
}

func parseOptionalTestServiceIDs(raw string) ([]dto.TestInput, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}

	return parseTestServiceIDs(raw)
}

func parseTestServiceIDs(raw string) ([]dto.TestInput, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, errors.New("test_service_ids is required")
	}

	tokens := strings.Split(raw, ",")
	tests := make([]dto.TestInput, 0, len(tokens))

	for _, token := range tokens {
		trimmed := strings.TrimSpace(token)
		if trimmed == "" {
			continue
		}

		id, err := strconv.ParseUint(trimmed, 10, 64)
		if err != nil || id == 0 {
			return nil, fmt.Errorf("invalid test_service_ids value: %s", trimmed)
		}

		tests = append(tests, dto.TestInput{TestServiceID: uint(id)})
	}

	if len(tests) == 0 {
		return nil, errors.New("test_service_ids must contain at least one valid ID")
	}

	return tests, nil
}

func normalizeHeader(header string) string {
	header = strings.ToLower(strings.TrimSpace(header))
	return strings.Map(func(r rune) rune {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			return r
		}
		return -1
	}, header)
}

func getCellValueByHeader(row []string, headerMap map[string]int, keys []string) string {
	for _, key := range keys {
		if idx, ok := headerMap[normalizeHeader(key)]; ok {
			if idx >= 0 && idx < len(row) {
				return strings.TrimSpace(row[idx])
			}
		}
	}
	return ""
}

func isRowEmpty(row []string) bool {
	for _, cell := range row {
		if strings.TrimSpace(cell) != "" {
			return false
		}
	}
	return true
}

func parseDate(value string) (*time.Time, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil, nil
	}

	if serial, err := strconv.ParseFloat(trimmed, 64); err == nil {
		parsed, err := excelize.ExcelDateToTime(serial, false)
		if err == nil {
			return &parsed, nil
		}
	}

	dateLayouts := []string{
		time.DateOnly,
		"02/01/2006",
		"02-01-2006",
		"02/01/06",
		"02-01-06",
		"2006/01/02",
		"2006-1-2",
		"2/1/2006",
		"2-1-2006",
	}

	var lastErr error
	for _, layout := range dateLayouts {
		t, err := time.Parse(layout, trimmed)
		if err == nil {
			return &t, nil
		}
		lastErr = err
	}

	if lastErr == nil {
		lastErr = fmt.Errorf("invalid date")
	}

	return nil, lastErr
}
