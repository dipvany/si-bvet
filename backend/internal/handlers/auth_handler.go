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

	fullname := c.PostForm("fullname")
	email := c.PostForm("email")
	phone := c.PostForm("phone")
	password := c.PostForm("password")

	file, err := c.FormFile("registration_doc")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "document registration is required"})
		return
	}

	// Simpan file
	filePath := "uploads/" + file.Filename
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to save file",
		})
		return
	}

	user := models.User{
		FullName:        fullname,
		Email:           email,
		Phone:           phone,
		PasswordHash:    password,
		Role:            "customer",
		IsVerified:      false,
		RegistrationDoc: filePath,
	}

	if err := services.RegisterUser(&user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := services.LoginUser(req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	token, err := utils.GenerateToken(user.ID, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
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
