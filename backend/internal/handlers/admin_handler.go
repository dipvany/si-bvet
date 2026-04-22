package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"si-bvet/internal/db"
	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func CreateAdmin(c *gin.Context) {
	var req dto.AdminRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	if req.Role != "admin" && req.Role != "superadmin" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "role must be admin or superadmin"})
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

	if err := services.RegisterUser(&user); err != nil {
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

	if err := db.DB.Create(&admin).Error; err != nil {
		db.DB.Delete(&user)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Account created successfully"})
}

// get all managed accounts (admin + superadmin) from a single profile table
func GetAllAdminAccounts(c *gin.Context) {
	roleFilter := c.Query("role")
	if roleFilter != "" && roleFilter != "admin" && roleFilter != "superadmin" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "role filter must be admin or superadmin"})
		return
	}

	var admins []models.Admin
	if err := db.DB.Preload("User").Find(&admins).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve managed accounts"})
		return
	}

	var accountList []map[string]interface{}
	for _, admin := range admins {
		if roleFilter != "" && admin.User.Role != roleFilter {
			continue
		}

		if admin.User.Role != "admin" && admin.User.Role != "superadmin" {
			continue
		}

		accountData := map[string]interface{}{
			"id":          admin.User.ID,
			"fullname":    admin.User.FullName,
			"email":       admin.User.Email,
			"phone":       admin.User.Phone,
			"position":    admin.Position,
			"unit_lab":    admin.UnitLab,
			"employee_no": admin.EmployeeNo,
			"role":        admin.User.Role,
		}
		accountList = append(accountList, accountData)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Managed accounts retrieved successfully",
		"accounts": accountList,
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
	services.SendVerificationApprovedEmail(user.FullName, user.Email)

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

	services.SendVerificationRejectedEmail(user.FullName, user.Email)

	db.DB.Delete(&user)

	c.JSON(http.StatusOK, gin.H{
		"message": "User verification rejected and deleted",
	})
}

func DeleteAdminAccount(c *gin.Context) {
	idParam := c.Param("id")
	targetID, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid account id"})
		return
	}

	actorIDAny, exists := c.Get("user_id")
	if exists {
		if actorID, ok := actorIDAny.(uint); ok && actorID == uint(targetID) {
			c.JSON(http.StatusForbidden, gin.H{"error": "cannot delete your own account"})
			return
		}
	}

	var user models.User
	if err := db.DB.First(&user, uint(targetID)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "account not found"})
		return
	}

	if user.Role != "admin" && user.Role != "superadmin" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "target user is not a managed account"})
		return
	}

	db.DB.Where("user_id = ?", user.ID).Delete(&models.Admin{})

	db.DB.Delete(&user)

	c.JSON(http.StatusOK, gin.H{
		"message": "Account successfully deleted",
	})
}

// update managed account details (except password)
func UpdateAdminAccount(c *gin.Context) {
	idParam := c.Param("id")
	userID, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid account id"})
		return
	}

	var user models.User
	if err := db.DB.Where("id = ?", uint(userID)).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "account not found"})
		return
	}

	if user.Role != "admin" && user.Role != "superadmin" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "target user is not a managed account"})
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
		if *req.Role != "admin" && *req.Role != "superadmin" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "role must be admin or superadmin"})
			return
		}
		user.Role = *req.Role
	}

	err = db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&user).Error; err != nil {
			return err
		}

		var admin models.Admin
		err := tx.Where("user_id = ?", user.ID).First(&admin).Error
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			admin = models.Admin{UserID: user.ID}
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

		if err := tx.Save(&admin).Error; err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Account successfully updated",
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
		"message":   "Unverified customers retrieved successfully",
		"customers": customers,
	})
}
