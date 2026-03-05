package services

import (
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