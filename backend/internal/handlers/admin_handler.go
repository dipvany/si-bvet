package handlers

import (
	"net/http"
	"time"

	"si-bvet/internal/db"
	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/services"

	"github.com/gin-gonic/gin"
)

func CreateAdmin(c *gin.Context) {
	
	var req dto.AdminRequest

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
		Role:         req.Role,
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

// reject user verification and delete from database
func RejectUser(c *gin.Context) {

	id := c.Param("id")

	var user models.User
	if err := db.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user tidak ditemukan"})
		return
	}

	db.DB.Delete(&user)

	c.JSON(http.StatusOK, gin.H{
		"message": "User verification rejected and deleted",
	})
}

func DeleteAdminAccount(c *gin.Context) {

	id := c.Param("id")

	var user models.User
	if err := db.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "admin tidak ditemukan"})
		return
	}

	db.DB.Delete(&user)

	c.JSON(http.StatusOK, gin.H{
		"message": "Admin berhasil dihapus",
	})
}

// update admin account details (except password)
func UpdateAdminAccount(c *gin.Context) {
	id := c.Param("id")

	var user models.User
	if err := db.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "admin tidak ditemukan"})
		return
	}

	var req struct {
		FullName string `json:"fullname"`
		Email    string `json:"email" binding:"email"`
		Phone    string `json:"phone"`
		Position string `json:"position"` 
		UnitLab   string `json:"unit_lab"`
		EmployeeNo string `json:"employee_no"` 
		Role	 string `json:"role"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	user.FullName = req.FullName
	user.Email = req.Email
	user.Phone = req.Phone
	user.Role = req.Role

	var admin models.Admin
	if err := db.DB.Where("user_id = ?", user.ID).First(&admin).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "admin tidak ditemukan"})
		return
	}

	admin.Position = req.Position
	admin.UnitLab = req.UnitLab
	admin.EmployeeNo = req.EmployeeNo

	db.DB.Save(&user)
	db.DB.Save(&admin)

	c.JSON(http.StatusOK, gin.H{
		"message": "Admin berhasil diperbarui",
	})
}

// get customer unverified list for admin to verify
func GetUnverifiedCustomers(c *gin.Context) {
	customers, err := services.GetUnverifiedCustomers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"customers": customers,
	})
}
