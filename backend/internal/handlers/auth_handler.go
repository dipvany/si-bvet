package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/services"
	"si-bvet/internal/storage"
	"si-bvet/internal/utils"

	"github.com/gin-gonic/gin"
)

// AuthHandler menyimpan dependency untuk auth operations
type AuthHandler struct {
	authService services.AuthServiceInterface
	documentStorage storage.DocumentStorage
}

// NewAuthHandler membuat instance baru AuthHandler dengan injected service
func NewAuthHandler(authService services.AuthServiceInterface, documentStorage ...storage.DocumentStorage) *AuthHandler {
	var storageImpl storage.DocumentStorage
	if len(documentStorage) > 0 && documentStorage[0] != nil {
		storageImpl = documentStorage[0]
	} else {
		storageImpl = storage.NewLocalDocumentStorage("")
	}

	return &AuthHandler{
		authService:     authService,
		documentStorage: storageImpl,
	}
}

// RegisterCustomer menangani registrasi customer baru
func (h *AuthHandler) RegisterCustomer(c *gin.Context) {

	var req dto.RegisterRequest

	if err := c.ShouldBind(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	file, err := c.FormFile("registration_doc")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "document registration is required")
		return
	}

	filePath, err := h.documentStorage.SaveRegistrationDocument(c.Request.Context(), file)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "failed to save file")
		return
	}

	user := models.User{
		FullName:        req.FullName,
		Email:           req.Email,
		Phone:           req.Phone,
		PasswordHash:    req.Password,
		Role:            "customer",
		IsVerified:      false,
		Institution:    req.Institution,
		RegistrationDoc: filePath,
	}

	if err := h.authService.RegisterUser(&user); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	go services.SendRegistrationPendingEmail(user.FullName, user.Email)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Registration successful, waiting for admin verification",
	})
}

// Login menangani login user
func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	user, err := h.authService.LoginUser(req.Email, req.Password)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, err.Error())
		return
	}

	token, err := utils.GenerateToken(user.ID, user.Role)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "failed to generate token")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"token":   token,
		"user": gin.H{
			"id":       user.ID,
			"fullname": user.FullName,
			"email":    user.Email,
			"role":     user.Role,
		},
	})
}

func (h *AuthHandler) ChangePassword(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		RespondUserIDError(c, err)
		return
	}

	var req dto.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.authService.ChangePassword(userID, req.CurrentPassword, req.NewPassword); err != nil {
		switch {
		case errors.Is(err, services.ErrCurrentPasswordIncorrect):
			utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		default:
			utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		}
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Password updated successfully")
}

func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req dto.ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.authService.RequestPasswordReset(req.Email); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.MessageResponse(c, http.StatusOK, "If the email exists, a password reset link has been sent")
}

func (h *AuthHandler) ResetPassword(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid user id")
		return
	}

	token := c.Param("token")
	expiresRaw := c.Query("expires")
	signature := c.Query("signature")
	if token == "" || expiresRaw == "" || signature == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "reset link is incomplete")
		return
	}

	expiresUnix, err := strconv.ParseInt(expiresRaw, 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid reset link expiry")
		return
	}

	var req dto.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.authService.ResetPassword(uint(userID), token, expiresUnix, signature, req.Password); err != nil {
		switch {
		case errors.Is(err, services.ErrPasswordResetLinkExpired), errors.Is(err, services.ErrPasswordResetLinkUsed), errors.Is(err, services.ErrPasswordResetLinkInvalid), errors.Is(err, services.ErrPasswordResetNotFound):
			utils.ErrorResponse(c, http.StatusUnauthorized, err.Error())
		default:
			utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		}
		return
	}

	utils.MessageResponse(c, http.StatusOK, "Password reset successfully")
}

// VerifyEmailLogin memvalidasi one-time login link dan mengembalikan JWT
func (h *AuthHandler) VerifyEmailLogin(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid user id")
		return
	}

	token := c.Param("token")
	expiresRaw := c.Query("expires")
	signature := c.Query("signature")
	if token == "" || expiresRaw == "" || signature == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "login link is incomplete")
		return
	}

	expiresUnix, err := strconv.ParseInt(expiresRaw, 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "invalid login link expiry")
		return
	}

	user, err := services.ConsumeOneTimeLoginLink(uint(userID), token, expiresUnix, signature)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrOneTimeLoginLinkExpired):
			utils.ErrorResponse(c, http.StatusUnauthorized, err.Error())
		case errors.Is(err, services.ErrOneTimeLoginLinkUsed):
			utils.ErrorResponse(c, http.StatusUnauthorized, err.Error())
		case errors.Is(err, services.ErrOneTimeLoginLinkInvalid):
			utils.ErrorResponse(c, http.StatusUnauthorized, err.Error())
		default:
			utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		}
		return
	}

	jwtToken, err := utils.GenerateToken(user.ID, user.Role)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "failed to generate token")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "One-time login successful",
		"token":   jwtToken,
		"user": gin.H{
			"id":       user.ID,
			"fullname": user.FullName,
			"email":    user.Email,
			"role":     user.Role,
		},
	})
}
