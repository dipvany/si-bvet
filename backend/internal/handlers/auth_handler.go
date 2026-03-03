package handlers

import (
	"net/http"

	"si-bvet/internal/models"
	"si-bvet/internal/services"
	"si-bvet/internal/utils"

	"github.com/gin-gonic/gin"
)

// type RegisterRequest struct {
// 	FullName string `json:"fullname" binding:"required"`
// 	Email    string `json:"email" binding:"required,email"`
// 	Phone    string `json:"phone" binding:"required"`
// 	Password string `json:"password" binding:"required,min=6"`
// }

func Register(c *gin.Context) {

	fullname := c.PostForm("fullname")
	email := c.PostForm("email")
	phone := c.PostForm("phone")
	password := c.PostForm("password")

	file, err := c.FormFile("registration_doc")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "dokumen wajib diupload"})
		return
	}

	// Simpan file
	filePath := "uploads/" + file.Filename
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyimpan file"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Registrasi berhasil, menunggu verifikasi admin",
	})
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func Login(c *gin.Context) {
	var req LoginRequest

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
		"message": "Login berhasil",
		"token": token,
		"user": gin.H{
			"id":       user.ID,
			"fullname": user.FullName,
			"email":    user.Email,
			"role":     user.Role,
		},
	})

}
