package repositories

import (
	"si-bvet/internal/db"
	"si-bvet/internal/models"
)

func CreateUser(user *models.User) error {
	return db.DB.Create(user).Error
}

func GetUserByEmail(email string) (*models.User, error) {
	var user models.User
	err := db.DB.Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}
