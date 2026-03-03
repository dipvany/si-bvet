package handlers

import (
	"net/http"
	"time"

	"si-bvet/internal/db"
	"si-bvet/internal/models"

	"github.com/gin-gonic/gin"
)

func AdminDashboard(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "Welcome to the admin dashboard",
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