package services

import (
	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/repositories"
	"time"
)

func CreateComplaint(userID uint, req dto.ComplaintRequest, filePath string) error {
	now := time.Now()

	// Determine complaint date: prefer client-provided value, fallback to now
	var complaintDate time.Time
	if req.DateOfComplaint != "" {
		// try RFC3339 first
		if parsed, err := time.Parse(time.RFC3339, req.DateOfComplaint); err == nil {
			complaintDate = parsed
		} else if parsed2, err2 := time.Parse("2006-01-02", req.DateOfComplaint); err2 == nil {
			complaintDate = parsed2
		} else {
			complaintDate = now
		}
	} else {
		complaintDate = now
	}

	complaint := models.Complaint{
		UserID:         userID,
		Subjects:       req.Subjects,
		Description:    req.Description,
		DateOfComplaint: complaintDate,
		Status:         "open",
		AttachmentPath: filePath,
		CreatedAt:      &now,
	}

	return repositories.CreateComplaint(&complaint)
}

func GetAllComplaints() ([]models.Complaint, error) {
	return repositories.GetAllComplaint()
}

func UpdateComplaintResponse(id uint, response string) error {
	return repositories.UpdateComplaintResponse(id, response)
}

func GetComplaintsByUserID(userID uint) ([]models.Complaint, error) {
	return repositories.GetComplaintsByUserID(userID)
}