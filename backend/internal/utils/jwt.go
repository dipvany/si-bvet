package utils

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type JWTClaims struct {
	UserID uint `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func GenerateToken(userID uint, role string) (string, error) {
	secretStr := os.Getenv("JWT_SECRET")
	if secretStr == "" {
		return "", errors.New("JWT_SECRET is empty")
	}

	secret := []byte(secretStr)

	expHours := 24
	if h := os.Getenv("JWT_EXPIRED_HOURS"); h != "" {
		if v, err := time.ParseDuration(h + "h"); err == nil {
			expHours = int(v.Hours())
		}
	}

	claims := JWTClaims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expHours)*time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret)

}

func ValidateToken(tokenStr string) (*JWTClaims, error) {
	secret := []byte(os.Getenv("JWT_SECRET"))
	
	token, err := jwt.ParseWithClaims(
		tokenStr, 
		&JWTClaims{}, 
		func(token *jwt.Token) (interface{}, error) {
			return (secret), nil
		},
	
	)

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok && token.Valid {
		return nil, jwt.ErrTokenInvalidClaims
	}

	return claims, nil
}