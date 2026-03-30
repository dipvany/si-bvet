package repositories

import (
	"si-bvet/internal/db"
	"si-bvet/internal/models"
)

func CreateComplaint(complaint *models.Complaint) error {
	return db.DB.Create(complaint).Error
}

func GetAllComplaint() ([]models.Complaint, error) {
	var complaints []models.Complaint
	err := db.DB.Order("id desc").Find(&complaints).Error
	return complaints, err
}

func UpdateComplaintResponse(id uint, response string) error {
	return db.DB.Model(&models.Complaint{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"admin_response": response,
			"status":         "responded",
		}).Error
}

// get complaint by my user id
func GetComplaintsByUserID(userID uint) ([]models.Complaint, error) {
	var complaints []models.Complaint
	err := db.DB.Where("user_id = ?", userID).
		Order("id desc").
		Find(&complaints).Error
	return complaints, err
}