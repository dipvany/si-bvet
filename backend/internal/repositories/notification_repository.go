package repositories

import (
	"time"

	"si-bvet/internal/db"
	"si-bvet/internal/models"
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
	return db.DB.
		Model(&models.Notification{}).
		Where("id = ? AND user_id = ?", notificationID, userID).
		Updates(map[string]interface{}{
			"is_read": true,
			"read_at": readAt,
		}).Error
}

func MarkAllNotificationsAsRead(userID uint, readAt time.Time) error {
	return db.DB.
		Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Updates(map[string]interface{}{
			"is_read": true,
			"read_at": readAt,
		}).Error
}
