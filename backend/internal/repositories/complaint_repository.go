package repositories

import (
	"si-bvet/internal/db"
	"si-bvet/internal/models"

	"gorm.io/gorm"
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
	result := db.DB.Model(&models.Complaint{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"admin_response": response,
			"status":         "responded",
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func GetComplaintByID(id uint) (*models.Complaint, error) {
	var complaint models.Complaint
	err := db.DB.First(&complaint, id).Error
	if err != nil {
		return nil, err
	}
	return &complaint, nil
}