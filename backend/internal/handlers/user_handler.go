package handlers

import (
	"net/http"
	"si-bvet/internal/dto"
	"si-bvet/internal/services"

	"github.com/gin-gonic/gin"
)

// get semua data profile berdasarkan userID dan role
func Profile(c *gin.Context) {

	userID := c.MustGet("user_id").(uint)

	profile, err := services.GetUserProfile(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"profile": profile,
	})
}

func UpdateProfile(c *gin.Context) {

	userID := c.MustGet("user_id").(uint)
	role := c.MustGet("role").(string)

	var req dto.ProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	err := services.UpdateProfile(userID, role, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile berhasil diperbarui",
	})
}

// dashboard user berdasarkan role
func UserDashboard(c *gin.Context) {

	role := c.MustGet("role").(string)
	c.JSON(http.StatusOK, gin.H{
		"message": "Welcome to the " + role + " dashboard",
	})
}

