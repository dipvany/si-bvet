package handlers

import (
	"net/http"

	"si-bvet/internal/models"
	"si-bvet/internal/services"
	"si-bvet/internal/utils"

	"github.com/gin-gonic/gin"
)

type NotificationServiceInterface interface {
	GetMyNotifications(userID uint) ([]models.Notification, error)
	MarkMyNotificationAsRead(userID, notificationID uint) error
	MarkAllMyNotificationsAsRead(userID uint) error
}

type defaultNotificationService struct{}

func (defaultNotificationService) GetMyNotifications(userID uint) ([]models.Notification, error) {
	return services.GetMyNotifications(userID)
}

func (defaultNotificationService) MarkMyNotificationAsRead(userID, notificationID uint) error {
	return services.MarkMyNotificationAsRead(userID, notificationID)
}

func (defaultNotificationService) MarkAllMyNotificationsAsRead(userID uint) error {
	return services.MarkAllMyNotificationsAsRead(userID)
}

type NotificationHandler struct {
	Service NotificationServiceInterface
}

func NewNotificationHandler(service NotificationServiceInterface) *NotificationHandler {
	return &NotificationHandler{Service: service}
}

var defaultNotificationHandler = NewNotificationHandler(defaultNotificationService{})

func NewNotificationHandlerWithDefault() *NotificationHandler {
	return defaultNotificationHandler
}

func GetMyNotifications(c *gin.Context) {
	defaultNotificationHandler.GetMyNotifications(c)
}

func (h *NotificationHandler) GetMyNotifications(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}

	notifications, err := h.Service.GetMyNotifications(userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "Notifications retrieved successfully",
		"notifications": notifications,
	})
}

func MarkNotificationAsRead(c *gin.Context) {
	defaultNotificationHandler.MarkNotificationAsRead(c)
}

func (h *NotificationHandler) MarkNotificationAsRead(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}

	notificationID, err := GetUintParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid notification id")
		return
	}

	if err := h.Service.MarkMyNotificationAsRead(userID, notificationID); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Notification marked as read")
}

func MarkAllNotificationsAsRead(c *gin.Context) {
	defaultNotificationHandler.MarkAllNotificationsAsRead(c)
}

func (h *NotificationHandler) MarkAllNotificationsAsRead(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}

	if err := h.Service.MarkAllMyNotificationsAsRead(userID); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "All notifications marked as read")
}
