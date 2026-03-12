package services

import (
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

	if err := tx.Create(&submission).Error; err != nil {
		tx.Rollback()
		return err
	}

	for _, s := range req.Samples {
		
		sample := models.Sample{
			SubmissionID: submission.ID,
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
				SamplesID:      sample.ID,
				TestServiceID: t.TestServiceID,
				PriceAtMoment: service.Price,
				Discount: 0,
			}

			if err := tx.Create(&testReq).Error; err != nil {
				tx.Rollback()
				return err
			}

		}

	}

	return tx.Commit().Error
}

func GetSubmissionsByUser(userID uint) ([]models.Submission, error) {
	return repositories.GetSubmissionsByUser(userID)
}

func GetAllSubmissions() ([]models.Submission, error) {
	return repositories.GetAllSubmissions()
}

func ApproveSubmission(id uint) error {
	return repositories.UpdateSubmissionStatus(id, "approved")
}

func RejectSubmission(id uint) error {
	return repositories.UpdateSubmissionStatus(id, "rejected")
}