package services

import (
	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/repositories"
	"time"
)

func CreateComplaint(userID uint, req dto.ComplaintRequest, filePath string) error {
	now := time.Now()

	complaint := models.Complaint{
		UserID:   userID,
		Subjects: req.Subjects,
		Description:  req.Description,
		Status: "open",
		AttachmentPath: filePath,
		CreatedAt: &now,
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