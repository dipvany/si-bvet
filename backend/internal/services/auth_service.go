package services

import (
	"errors"
	"si-bvet/internal/models"
	"si-bvet/internal/repositories"

	"golang.org/x/crypto/bcrypt"
)

func RegisterUser(user *models.User) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(user.PasswordHash), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	user.PasswordHash = string(hash)
	return repositories.CreateUser(user)
}

func LoginUser(email, password string) (*models.User, error) {
	user, err := repositories.GetUserByEmail(email)
	if err != nil {
		return nil, errors.New("email tidak terdaftar")
	}
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return nil, errors.New("password salah")
	}
	return user, nil
}