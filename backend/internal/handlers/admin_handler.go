package handlers

import (
	"net/http"
	"time"

	"si-bvet/internal/db"
	"si-bvet/internal/models"
	"si-bvet/internal/services"

	"github.com/gin-gonic/gin"
)

func AdminDashboard(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "Welcome to the admin dashboard",
	})
}

func CreateAdmin(c *gin.Context) {
	
	var req struct {
		FullName string `json:"fullname" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		Phone    string `json:"phone" binding:"required"`
		Password string `json:"password" binding:"required,min=6"`
		Position string `json:"position"` 
		UnitLab   string `json:"unit_lab"`
		EmployeeNo string `json:"employee_no"` 
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	user := models.User{
		FullName:     req.FullName,
		Email:        req.Email,
		Phone:        req.Phone,
		PasswordHash: req.Password,
		Role:         "admin",
		IsVerified:   true,
	}

	err := services.RegisterUser(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	admin := models.Admin{
		UserID:     user.ID,
		Position:   req.Position,
		UnitLab:    req.UnitLab,
		EmployeeNo: req.EmployeeNo,
	}

	db.DB.Create(&admin)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Admin berhasil dibuat",
	})
}


func VerifyUser(c *gin.Context) {

	id := c.Param("id")

	var user models.User
	if err := db.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user tidak ditemukan"})
		return
	}

	user.IsVerified = true
	now := time.Now()
	user.VerifiedAt = &now

	db.DB.Save(&user)

	c.JSON(http.StatusOK, gin.H{
		"message": "User berhasil diverifikasi",
	})
}