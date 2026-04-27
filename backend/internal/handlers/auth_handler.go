package handlers

import (
	"net/http"

	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/services"
	"si-bvet/internal/utils"

	"github.com/gin-gonic/gin"
)

func RegisterCustomer(c *gin.Context) {

	var req dto.RegisterRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	file, err := c.FormFile("registration_doc")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "document registration is required")
		return
	}

	// Simpan file
	filePath := "uploads/" + file.Filename
	if err := c.SaveUploadedFile(file, filePath); err != nil {
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
		RegistrationDoc: filePath,
	}

	if err := services.RegisterUser(&user); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	services.SendRegistrationPendingEmail(user.FullName, user.Email)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Registration successful, waiting for admin verification",
	})
}

func Login(c *gin.Context) {
	var req dto.LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	user, err := services.LoginUser(req.Email, req.Password)
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
