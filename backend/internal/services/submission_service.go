package services

import (
	"errors"
	"si-bvet/internal/db"
	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/repositories"
)

func CreateSubmission(sub *models.Submission) error {
	sub.ProcessStatus = "pending_verification"

	return repositories.CreateSubmission(sub)
}

func CreateSubmissionWithSamplesAndTests(userID uint, req dto.SubmissionRequest) error {

	tx := db.DB.Begin()

	submission := models.Submission{
		UserID:        userID,
		TypeService:   req.TypeService,
		PurposeOfTest: req.PurposeOfTest,
		SampleTaker:   req.SampleTaker,
		SamplesCount:  len(req.Samples),
		Notes:         req.Notes,
		ProcessStatus: "pending_verification",
	}

	if err := repositories.CreateSubmissionWithTicket(tx, &submission); err != nil {
		tx.Rollback()
		return err
	}

	for _, s := range req.Samples {

		sample := models.Sample{
			SubmissionID:      submission.ID,
			SampleCodeCust:    s.SampleCodeCust,
			SampleType:        s.SampleType,
			Species:           s.Species,
			Age:               s.Age,
			Volume:            s.Volume,
			Condition:         s.Condition,
			LocationSmplTaken: s.LocationSmplTaken,
			TotalSample:       int64(s.TotalSample),
		}

		if err := tx.Create(&sample).Error; err != nil {
			tx.Rollback()
			return err
		}

		for _, t := range s.Tests {

			var service models.TestService

			if err := tx.First(&service, t.TestServiceID).Error; err != nil {
				tx.Rollback()
				return err
			}

			testReq := models.TestRequest{
				SamplesID:     sample.ID,
				TestServiceID: t.TestServiceID,
				PriceAtMoment: service.Price,
				Discount:      0,
			}

			if err := tx.Create(&testReq).Error; err != nil {
				tx.Rollback()
				return err
			}

		}

	}

	if err := tx.Commit().Error; err != nil {
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
	return UpdateSubmissionStatusWithNotification(id, "approved")
}

func RejectSubmission(id uint) error {
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

	tx := db.DB.Begin()

	var submission models.Submission
	if err := tx.First(&submission, submissionID).Error; err != nil {
		tx.Rollback()
		return err
	}

	// ownership check
	if submission.UserID != userID {
		tx.Rollback()
		return errors.New("unauthorized")
	}

	// hanya boleh edit sebelum diverifikasi
	if submission.ProcessStatus != "pending_verification" {
		tx.Rollback()
		return errors.New("submission tidak dapat diedit")
	}

	// update parent submission
	submission.TypeService = req.TypeService
	submission.PurposeOfTest = req.PurposeOfTest
	submission.SampleTaker = req.SampleTaker
	submission.Notes = req.Notes
	submission.SamplesCount = len(req.Samples)

	if err := tx.Save(&submission).Error; err != nil {
		tx.Rollback()
		return err
	}

	// hapus child lama
	// if err := tx.Where("submission_id = ?", submissionID).
	// 	Delete(&models.Sample{}).Error; err != nil {
	// 	tx.Rollback()
	// 	return err
	// }

	// hapus test request via join sample
	if err := tx.Exec(`
		DELETE FROM "TestRequest"
		WHERE samples_id IN (
			SELECT id FROM "Samples" WHERE submission_id = ?
		)
	`, submissionID).Error; err != nil {
		tx.Rollback()
		return err
	}

	if err := tx.Where("submission_id = ?", submissionID).
		Delete(&models.Sample{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// insert ulang sample + test baru
	for _, sampleReq := range req.Samples {
		sample := models.Sample{
			SubmissionID:      submission.ID,
			SampleCodeCust:    sampleReq.SampleCodeCust,
			SampleType:        sampleReq.SampleType,
			Species:           sampleReq.Species,
			Age:               sampleReq.Age,
			Volume:            sampleReq.Volume,
			Condition:         sampleReq.Condition,
			LocationSmplTaken: sampleReq.LocationSmplTaken,
			TotalSample:       int64(sampleReq.TotalSample),
		}

		if err := tx.Create(&sample).Error; err != nil {
			tx.Rollback()
			return err
		}

		for _, testReq := range sampleReq.Tests {
			var service models.TestService
			if err := tx.First(&service, testReq.TestServiceID).Error; err != nil {
				tx.Rollback()
				return err
			}

			test := models.TestRequest{
				SamplesID:     sample.ID,
				TestServiceID: testReq.TestServiceID,
				PriceAtMoment: service.Price,
			}

			if err := tx.Create(&test).Error; err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	return tx.Commit().Error
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
		LHUAvailable:  submission.Lhu != nil,
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

	case "menunggu_pembayaran":
		currentStep = 3
		steps[1].Status = "completed"
		steps[2].Status = "current"

	case "menunggu_verifikasi_pembayaran":
		currentStep = 3
		steps[1].Status = "completed"
		steps[2].Status = "current"

	case "diproses":
		currentStep = 4
		steps[1].Status = "completed"
		steps[2].Status = "completed"
		steps[3].Status = "current"

	case "selesai":
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
