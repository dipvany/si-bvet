package services

import (
	"fmt"
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

	err := repositories.CreateComplaint(&complaint)
	if err == nil {
		LogSystemActivity(fmt.Sprintf("Keluhan baru dibuat oleh user ID %d dengan subjek: %s", userID, req.Subjects))
	}
	return err
}

func GetAllComplaints() ([]models.Complaint, error) {
	return repositories.GetAllComplaint()
}

func UpdateComplaintResponse(id uint, response string) error {
	err := repositories.UpdateComplaintResponse(id, response)
	if err == nil {
		LogSystemActivity(fmt.Sprintf("Admin memberikan respon untuk keluhan ID %d", id))
	}
	return err
}

func GetComplaintsByUserID(userID uint) ([]models.Complaint, error) {
	return repositories.GetComplaintsByUserID(userID)
}