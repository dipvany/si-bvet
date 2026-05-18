package handlers

import (
	"net/http"
	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/services"
	"si-bvet/internal/utils"

	"github.com/gin-gonic/gin"
)

type UserServiceInterface interface {
	GetUserProfile(userID uint) (models.User, error)
	UpdateProfile(userID uint, role string, req dto.ProfileRequest) error
}

type defaultUserService struct{}

func (defaultUserService) GetUserProfile(userID uint) (models.User, error) {
	return services.GetUserProfile(userID)
}

func (defaultUserService) UpdateProfile(userID uint, role string, req dto.ProfileRequest) error {
	return services.UpdateProfile(userID, role, req)
}

type UserHandler struct {
	Service UserServiceInterface
}

func NewUserHandler(service UserServiceInterface) *UserHandler {
	return &UserHandler{Service: service}
}

var defaultUserHandler = NewUserHandler(defaultUserService{})

func NewUserHandlerWithDefault() *UserHandler {
	return defaultUserHandler
}

func Profile(c *gin.Context) {
	defaultUserHandler.Profile(c)
}

// get semua data profile berdasarkan userID dan role
func (h *UserHandler) Profile(c *gin.Context) {

	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}

	profile, err := h.Service.GetUserProfile(userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile retrieved successfully",
		"profile": profile,
	})
}

func UpdateProfile(c *gin.Context) {
	defaultUserHandler.UpdateProfile(c)
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {

	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}

	role, err := GetRole(c)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	var req dto.ProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	err = h.Service.UpdateProfile(userID, role, req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Profile updated successfully")
}

// dashboard user berdasarkan role
func UserDashboard(c *gin.Context) {
	defaultUserHandler.UserDashboard(c)
}

func (h *UserHandler) UserDashboard(c *gin.Context) {

	role, err := GetRole(c)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "Welcome to the " + role + " dashboard",
	})
}
