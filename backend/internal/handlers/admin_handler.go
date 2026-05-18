package handlers

import (
	"net/http"
	"strconv"

	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/services"
	"si-bvet/internal/utils"

	"github.com/gin-gonic/gin"
)

type AdminServiceInterface interface {
	CreateAdminAccount(req dto.AdminRequest) error
	GetManagedAccounts(roleFilter string) ([]models.Admin, error)
	VerifyUserByID(userID uint) (models.User, error)
	RejectUserByID(userID uint) error
	DeleteManagedAccount(targetID, actorID uint) error
	UpdateManagedAccount(userID uint, req services.UpdateAdminAccountRequest) error
	GetUnverifiedCustomers() ([]models.User, error)
}

type defaultAdminService struct{}

func (defaultAdminService) CreateAdminAccount(req dto.AdminRequest) error {
	return services.CreateAdminAccount(req)
}

func (defaultAdminService) GetManagedAccounts(roleFilter string) ([]models.Admin, error) {
	return services.GetManagedAccounts(roleFilter)
}

func (defaultAdminService) VerifyUserByID(userID uint) (models.User, error) {
	return services.VerifyUserByID(userID)
}

func (defaultAdminService) RejectUserByID(userID uint) error {
	return services.RejectUserByID(userID)
}

func (defaultAdminService) DeleteManagedAccount(targetID, actorID uint) error {
	return services.DeleteManagedAccount(targetID, actorID)
}

func (defaultAdminService) UpdateManagedAccount(userID uint, req services.UpdateAdminAccountRequest) error {
	return services.UpdateManagedAccount(userID, req)
}

func (defaultAdminService) GetUnverifiedCustomers() ([]models.User, error) {
	return services.GetUnverifiedCustomers()
}

type AdminHandler struct {
	Service AdminServiceInterface
}

func NewAdminHandler(service AdminServiceInterface) *AdminHandler {
	return &AdminHandler{Service: service}
}

var defaultAdminHandler = NewAdminHandler(defaultAdminService{})

func NewAdminHandlerWithDefault() *AdminHandler {
	return defaultAdminHandler
}

func CreateAdmin(c *gin.Context) {
	defaultAdminHandler.CreateAdmin(c)
}

func (h *AdminHandler) CreateAdmin(c *gin.Context) {
	var req dto.AdminRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	if req.Role != "admin" && req.Role != "superadmin" {
		utils.ErrorResponse(c, http.StatusBadRequest, "role must be admin or superadmin")
		return
	}

	if err := h.Service.CreateAdminAccount(req); err != nil {
		if err == services.ErrInvalidRole {
			utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Account created successfully"})
}

// get all managed accounts (admin + superadmin) from a single profile table
func GetAllAdminAccounts(c *gin.Context) {
	defaultAdminHandler.GetAllAdminAccounts(c)
}

func (h *AdminHandler) GetAllAdminAccounts(c *gin.Context) {
	roleFilter := c.Query("role")
	if roleFilter != "" && roleFilter != "admin" && roleFilter != "superadmin" {
		utils.ErrorResponse(c, http.StatusBadRequest, "role filter must be admin or superadmin")
		return
	}

	admins, err := h.Service.GetManagedAccounts(roleFilter)
	if err != nil {
		if err == services.ErrInvalidRole {
			utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "failed to retrieve managed accounts")
		return
	}

	var accountList []map[string]interface{}
	for _, admin := range admins {
		accountData := map[string]interface{}{
			"id":          admin.User.ID,
			"fullname":    admin.User.FullName,
			"email":       admin.User.Email,
			"phone":       admin.User.Phone,
			"position":    admin.Position,
			"unit_lab":    admin.UnitLab,
			"employee_no": admin.EmployeeNo,
			"role":        admin.User.Role,
			"is_verified": admin.User.IsVerified,
		}
		accountList = append(accountList, accountData)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Managed accounts retrieved successfully",
		"accounts": accountList,
	})
}

func VerifyUser(c *gin.Context) {
	defaultAdminHandler.VerifyUser(c)
}

func (h *AdminHandler) VerifyUser(c *gin.Context) {
	id := c.Param("id")
	idUint, err := strconv.ParseUint(id, 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid user id")
		return
	}

	_, err = h.Service.VerifyUserByID(uint(idUint))
	if err != nil {
		if err == services.ErrUserNotFound {
			utils.ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User verification successful",
	})
}

// reject user verification and delete from database
func RejectUser(c *gin.Context) {
	defaultAdminHandler.RejectUser(c)
}

func (h *AdminHandler) RejectUser(c *gin.Context) {

	id := c.Param("id")
	idUint, err := strconv.ParseUint(id, 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid user id")
		return
	}

	err = h.Service.RejectUserByID(uint(idUint))
	if err != nil {
		if err == services.ErrUserNotFound {
			utils.ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User verification rejected and deleted",
	})
}

func DeleteAdminAccount(c *gin.Context) {
	defaultAdminHandler.DeleteAdminAccount(c)
}

func (h *AdminHandler) DeleteAdminAccount(c *gin.Context) {
	idParam := c.Param("id")
	targetID, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid account id")
		return
	}

	var actorID uint
	if actorIDAny, exists := c.Get("user_id"); exists {
		if parsedActorID, ok := actorIDAny.(uint); ok {
			actorID = parsedActorID
		}
	}

	err = h.Service.DeleteManagedAccount(uint(targetID), actorID)
	if err != nil {
		switch err {
		case services.ErrDeleteOwnAccount:
			utils.ErrorResponse(c, http.StatusForbidden, err.Error())
			return
		case services.ErrAccountNotFound:
			utils.ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		case services.ErrNotManagedAccount:
			utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
			return
		default:
			utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Account successfully deleted",
	})
}

// update managed account details (except password)
func UpdateAdminAccount(c *gin.Context) {
	defaultAdminHandler.UpdateAdminAccount(c)
}

func (h *AdminHandler) UpdateAdminAccount(c *gin.Context) {
	idParam := c.Param("id")
	userID, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid account id")
		return
	}

	var req struct {
		FullName   *string `json:"fullname"`
		Email      *string `json:"email" binding:"omitempty,email"`
		Phone      *string `json:"phone"`
		Position   *string `json:"position"`
		UnitLab    *string `json:"unit_lab"`
		EmployeeNo *string `json:"employee_no"`
		Role       *string `json:"role"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	err = h.Service.UpdateManagedAccount(uint(userID), services.UpdateAdminAccountRequest{
		FullName:   req.FullName,
		Email:      req.Email,
		Phone:      req.Phone,
		Position:   req.Position,
		UnitLab:    req.UnitLab,
		EmployeeNo: req.EmployeeNo,
		Role:       req.Role,
	})
	if err != nil {
		switch err {
		case services.ErrAccountNotFound:
			utils.ErrorResponse(c, http.StatusNotFound, err.Error())
			return
		case services.ErrNotManagedAccount, services.ErrInvalidRole:
			utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
			return
		default:
			utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Account successfully updated",
	})
}

// get customer unverified list for admin to verify
func GetUnverifiedCustomers(c *gin.Context) {
	defaultAdminHandler.GetUnverifiedCustomers(c)
}

func (h *AdminHandler) GetUnverifiedCustomers(c *gin.Context) {
	customers, err := h.Service.GetUnverifiedCustomers()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Unverified customers retrieved successfully",
		"customers": customers,
	})
}
