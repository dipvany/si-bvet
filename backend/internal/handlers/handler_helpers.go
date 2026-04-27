package handlers

import (
	"net/http"
	"si-bvet/internal/utils"
	"strconv"

	"github.com/gin-gonic/gin"
)

func currentUserID(c *gin.Context) (uint, bool) {
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "user_id not found")
		return 0, false
	}

	userID, ok := userIDInterface.(uint)
	if !ok {
		utils.ErrorResponse(c, http.StatusInternalServerError, "invalid user_id type")
		return 0, false
	}

	return userID, true
}

func parseUintParam(c *gin.Context, paramKey string, invalidMessage string) (uint, bool) {
	idParam := c.Param(paramKey)
	idUint, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, invalidMessage)
		return 0, false
	}

	return uint(idUint), true
}
