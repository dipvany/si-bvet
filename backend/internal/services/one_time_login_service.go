package services

import (
	"errors"
	"time"

	"si-bvet/internal/db"
	"si-bvet/internal/models"
	"si-bvet/internal/repositories"
	"si-bvet/internal/utils"

	"gorm.io/gorm"
)

var (
	ErrOneTimeLoginLinkInvalid = errors.New("one-time login link is invalid")
	ErrOneTimeLoginLinkExpired = errors.New("one-time login link has expired")
	ErrOneTimeLoginLinkUsed    = errors.New("one-time login link has already been used")
)

func ConsumeOneTimeLoginLink(userID uint, token string, expiresUnix int64, signature string) (models.User, error) {
	if err := utils.ValidateOneTimeLoginSignature(userID, token, expiresUnix, signature); err != nil {
		return models.User{}, ErrOneTimeLoginLinkInvalid
	}

	if time.Unix(expiresUnix, 0).Before(time.Now()) {
		return models.User{}, ErrOneTimeLoginLinkExpired
	}

	var authenticatedUser models.User
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		user, err := repositories.GetUserByIDTx(tx, userID)
		if err != nil {
			return err
		}

		if !user.IsVerified {
			return ErrOneTimeLoginLinkInvalid
		}
		if user.LoginLinkUsedAt != nil {
			return ErrOneTimeLoginLinkUsed
		}
		if user.LoginLinkExpiresAt == nil {
			return ErrOneTimeLoginLinkInvalid
		}
		if user.LoginLinkExpiresAt.Unix() != expiresUnix {
			return ErrOneTimeLoginLinkInvalid
		}
		if user.LoginLinkTokenHash == "" {
			return ErrOneTimeLoginLinkInvalid
		}
		if utils.HashOneTimeLoginToken(token) != user.LoginLinkTokenHash {
			return ErrOneTimeLoginLinkInvalid
		}

		now := time.Now()
		user.LoginLinkUsedAt = &now
		user.LoginLinkTokenHash = ""
		user.LoginLinkExpiresAt = nil

		if err := repositories.SaveUserTx(tx, &user); err != nil {
			return err
		}

		authenticatedUser = user
		return nil
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.User{}, ErrOneTimeLoginLinkInvalid
		}
		if errors.Is(err, ErrOneTimeLoginLinkExpired) || errors.Is(err, ErrOneTimeLoginLinkUsed) || errors.Is(err, ErrOneTimeLoginLinkInvalid) {
			return models.User{}, err
		}
		return models.User{}, err
	}

	LogUserActivity(&authenticatedUser, "Berhasil login menggunakan tautan sekali pakai", "N/A", "GET", "/api/auth/one-time-login")
	return authenticatedUser, nil
}