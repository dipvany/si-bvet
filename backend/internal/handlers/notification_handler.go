package handlers

import (
	"net/http"
	"strconv"

	"si-bvet/internal/services"

	"github.com/gin-gonic/gin"
)

func GetMyNotifications(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	notifications, err := services.GetMyNotifications(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "Notifications retrieved successfully",
		"notifications": notifications,
	})
}

func MarkNotificationAsRead(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	idParam := c.Param("id")
	notificationID, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid notification id"})
		return
	}

	if err := services.MarkMyNotificationAsRead(userID, uint(notificationID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification marked as read"})
}

func MarkAllNotificationsAsRead(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	if err := services.MarkAllMyNotificationsAsRead(userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "All notifications marked as read"})
}
