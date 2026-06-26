package services

import (
	"fmt"
	"log"
	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/repositories"
	"time"

	"gorm.io/gorm"
)

func CreateComplaint(req dto.ComplaintRequest, filePath string) error {
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
		Fullname:        req.Fullname,
		IDNumber:        req.IDNumber,
		Email:           req.Email,
		Phone:           req.Phone,
		Description:     req.Description,
		Suggestion:      req.Suggestion,
		DateOfComplaint: complaintDate,
		Status:         "open",
		AttachmentPath: filePath,
		CreatedAt:      &now,
	}

	if err := repositories.CreateComplaint(&complaint); err != nil {
		return err
	}

	SendNewComplaintEmail(complaint.Fullname, complaint.Email, complaint.ID)
	LogSystemActivity(fmt.Sprintf("Keluhan baru dibuat oleh %s (%s) dengan ID: %d", complaint.Fullname, complaint.Email, complaint.ID))

	return nil
}

func GetAllComplaints() ([]models.Complaint, error) {
	return repositories.GetAllComplaint()
}

func UpdateComplaintResponse(id uint, response string) error {
	if err := repositories.UpdateComplaintResponse(id, response); err != nil {
		if err == gorm.ErrRecordNotFound {
			return gorm.ErrRecordNotFound
		}
		return err
	}

	complaint, err := repositories.GetComplaintByID(id)
	if err != nil {
		// Log error but don't fail the operation, response is already saved
		log.Printf("[ERROR] Failed to get complaint for notification after responding (ID: %d): %v", id, err)
		return nil
	}

	SendComplaintResponseEmail(complaint.Fullname, complaint.Email, complaint.ID, response)
	LogSystemActivity(fmt.Sprintf("Admin memberikan respon untuk keluhan ID %d", id))
	return nil
}