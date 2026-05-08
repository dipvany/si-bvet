package services

import (
	"errors"
	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/repositories"

	"gorm.io/gorm"
)

func CreateSubmission(sub *models.Submission) error {
	sub.ProcessStatus = "pending_verification"

	return repositories.CreateSubmission(sub)
}

func CreateSubmissionWithSamplesAndTests(userID uint, req dto.SubmissionRequest) error {
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
		return err
	}

	NotifySubmissionStatusChanged(submission.ID, submission.ProcessStatus)
	return nil
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
		sample := models.Sample{
			SubmissionID:      submissionID,
			SampleCodeCust:    sampleReq.SampleCodeCust,
			SampleType:        sampleReq.SampleType,
			Species:           sampleReq.Species,
			Age:               sampleReq.Age,
			Volume:            sampleReq.Volume,
			Condition:         sampleReq.Condition,
			LocationSmplTaken: sampleReq.LocationSmplTaken,
			TotalSample:       int64(sampleReq.TotalSample),
		}

		if err := repositories.CreateSampleTx(tx, &sample); err != nil {
			return err
		}

		for _, testReq := range sampleReq.Tests {
			service, err := repositories.GetTestServiceByIDTx(tx, testReq.TestServiceID)
			if err != nil {
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
