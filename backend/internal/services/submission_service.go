package services

import (
	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/repositories"
)

func CreateSubmission(sub *models.Submission) error {
	sub.ProcessStatus = "pending_verification"

	return repositories.CreateSubmission(sub)
}

func GetUserSubmission(userID uint) ([]models.Submission, error) {
	return repositories.GetSubmissionsByUser(userID)
}

func CreateSubmissionWithSamples(userID uint, req dto.SubmissionRequest) error {

	submission := models.Submission{
		UserID:        userID,
		TypeService:   req.TypeService,
		PurposeOfTest: req.PurposeOfTest,
		SampleTaker:   req.SampleTaker,
		SamplesCount:  int64(req.SamplesCount),
		Notes:         req.Notes,
		ProcessStatus: "pending_verification",
	}

	var samples []models.Sample

	for _, s := range req.Samples {
		samples = append(samples, models.Sample{
			SampleCodeCust:    s.SampleCodeCust,
			SampleType:        s.SampleType,
			Species:           s.Species,
			Age:               s.Age,
			Volume:            s.Volume,
			Condition:         s.Condition,
			LocationSmplTaken: s.LocationSmplTaken,
			TotalSample:       s.TotalSample,
		})
	}

	return repositories.CreateSubmissionWithSamples(&submission, samples)
}