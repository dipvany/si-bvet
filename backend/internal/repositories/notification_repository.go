package repositories

import (
	"time"

	"si-bvet/internal/db"
	"si-bvet/internal/models"

	"gorm.io/gorm"
)

func CreateNotification(notification *models.Notification) error {
	return db.DB.Create(notification).Error
}

func GetNotificationsByUserID(userID uint) ([]models.Notification, error) {
	var notifications []models.Notification

	err := db.DB.
		Where("user_id = ?", userID).
		Order("id desc").
		Find(&notifications).Error

	return notifications, err
}

func MarkNotificationAsRead(notificationID uint, userID uint, readAt time.Time) error {
	result := db.DB.
		Model(&models.Notification{}).
		Where("id = ? AND user_id = ?", notificationID, userID).
		Updates(map[string]interface{}{
			"is_read": true,
			"read_at": readAt,
		})
	
	if result.Error != nil {
		return result.Error
	}
	
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	
	return nil
}

func MarkAllNotificationsAsRead(userID uint, readAt time.Time) error {
	result := db.DB.
		Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Updates(map[string]interface{}{
			"is_read": true,
			"read_at": readAt,
		})
	
	if result.Error != nil {
		return result.Error
	}
	
	// Note: RowsAffected == 0 is valid here (user has no unread notifications)
	// Only return error if there's a database error
	return nil
}
