package handlers

import (
	"errors"
	"net/http"
	"si-bvet/internal/utils"
	"strconv"

	"github.com/gin-gonic/gin"
)

func GetUserID(c *gin.Context) (uint, error) {
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		return 0, errors.New("user_id not found")
	}

	userID, ok := userIDInterface.(uint)
	if !ok {
		return 0, errors.New("invalid user_id type")
	}

	return userID, nil
}

func GetRole(c *gin.Context) (string, error) {
	roleInterface, exists := c.Get("role")
	if !exists {
		return "", errors.New("role not found")
	}

	role, ok := roleInterface.(string)
	if !ok {
		return "", errors.New("invalid role type")
	}

	return role, nil
}

func GetUintParam(c *gin.Context, paramKey string) (uint, error) {
	idParam := c.Param(paramKey)
	idUint, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		return 0, errors.New("invalid id parameter")
	}

	return uint(idUint), nil
}

func RespondUserIDError(c *gin.Context, err error) {
	if err == nil {
		return
	}

	if err.Error() == "user_id not found" {
		utils.ErrorResponse(c, http.StatusUnauthorized, err.Error())
		return
	}

	utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
}
