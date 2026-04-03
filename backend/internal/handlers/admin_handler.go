package handlers

import (
	"net/http"
	"strconv"
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
		"message": "Admin account created successfully",
	})
}

// get all admin account
func GetAllAdminAccounts(c *gin.Context) {

	var admins []models.Admin
	if err := db.DB.Preload("User").Find(&admins).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve admin accounts"})
		return
	}

	var adminList []map[string]interface{}
	for _, admin := range admins {
		adminData := map[string]interface{}{
			"id":         admin.User.ID,
			"fullname":   admin.User.FullName,
			"email":      admin.User.Email,
			"phone":      admin.User.Phone,
			"position":   admin.Position,
			"unit_lab":   admin.UnitLab,	
			"employee_no": admin.EmployeeNo,
			"role":       admin.User.Role,
		}
		adminList = append(adminList, adminData)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Admin accounts retrieved successfully",
		"admins": adminList,
	})
}

func VerifyUser(c *gin.Context) {

	id := c.Param("id")

	var user models.User
	if err := db.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	user.IsVerified = true
	now := time.Now()
	user.VerifiedAt = &now

	db.DB.Save(&user)

	c.JSON(http.StatusOK, gin.H{
		"message": "User verification successful",
	})
}

// reject user verification and delete from database
func RejectUser(c *gin.Context) {

	id := c.Param("id")

	var user models.User
	if err := db.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
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
		c.JSON(http.StatusNotFound, gin.H{"error": "admin not found"})
		return
	}

	db.DB.Delete(&user)

	c.JSON(http.StatusOK, gin.H{
		"message": "Admin successfully deleted",
	})
}

// update admin account details (except password)
func UpdateAdminAccount(c *gin.Context) {
	idParam := c.Param("id")
	userID, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid admin id"})
		return
	}

	var admin models.Admin
	if err := db.DB.Preload("User").Where("user_id = ?", uint(userID)).First(&admin).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "admin profile not found for this user"})
		return
	}

	user := admin.User

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
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	if req.FullName != nil {
		user.FullName = *req.FullName
	}
	if req.Email != nil {
		user.Email = *req.Email
	}
	if req.Phone != nil {
		user.Phone = *req.Phone
	}
	if req.Role != nil {
		user.Role = *req.Role
	}

	if req.Position != nil {
		admin.Position = *req.Position
	}
	if req.UnitLab != nil {
		admin.UnitLab = *req.UnitLab
	}
	if req.EmployeeNo != nil {
		admin.EmployeeNo = *req.EmployeeNo
	}

	db.DB.Save(&user)
	db.DB.Save(&admin)

	c.JSON(http.StatusOK, gin.H{
		"message": "Admin successfully updated",
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
		"message": "Unverified customers retrieved successfully",
		"customers": customers,
	})
}
