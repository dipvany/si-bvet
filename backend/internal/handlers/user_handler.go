package handlers

import (
	"net/http"
	"si-bvet/internal/dto"
	"si-bvet/internal/services"

	"github.com/gin-gonic/gin"
)

// get user profile
func Profile(c *gin.Context) {

	userID := c.MustGet("user_id").(uint)
	user, err := services.GetUserByID(userID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": user,
	})
}

func UpdateProfile(c *gin.Context) {

	userID := c.MustGet("user_id").(uint)
	role := c.MustGet("role").(string)

	var req dto.UpdateProfileRequest
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
