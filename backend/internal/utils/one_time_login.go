package utils

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

func GenerateRandomToken(byteLength int) (string, error) {
	if byteLength < 1 {
		return "", errors.New("token length must be greater than zero")
	}

	raw := make([]byte, byteLength)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}

	return hex.EncodeToString(raw), nil
}

func HashOneTimeLoginToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func oneTimeLoginSignatureSecret() ([]byte, error) {
	secret := os.Getenv("ONE_TIME_LOGIN_SECRET")
	if secret == "" {
		secret = os.Getenv("JWT_SECRET")
	}
	if secret == "" {
		return nil, errors.New("ONE_TIME_LOGIN_SECRET or JWT_SECRET is empty")
	}

	return []byte(secret), nil
}

func SignOneTimeLoginLink(userID uint, token string, expiresUnix int64) (string, error) {
	secret, err := oneTimeLoginSignatureSecret()
	if err != nil {
		return "", err
	}

	payload := fmt.Sprintf("%d|%s|%d", userID, token, expiresUnix)
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write([]byte(payload))

	return hex.EncodeToString(mac.Sum(nil)), nil
}

func ValidateOneTimeLoginSignature(userID uint, token string, expiresUnix int64, signature string) error {
	expected, err := SignOneTimeLoginLink(userID, token, expiresUnix)
	if err != nil {
		return err
	}

	if !hmac.Equal([]byte(strings.ToLower(signature)), []byte(strings.ToLower(expected))) {
		return errors.New("invalid login link signature")
	}

	return nil
}

func BuildOneTimeLoginURL(baseURL string, userID uint, token string, expiresAt time.Time) (string, error) {
	trimmedBaseURL := strings.TrimSpace(baseURL)
	if trimmedBaseURL == "" {
		trimmedBaseURL = "http://localhost:3000"
	}

	trimmedBaseURL = strings.TrimRight(trimmedBaseURL, "/")
	if strings.HasSuffix(strings.ToLower(trimmedBaseURL), "/login") {
		trimmedBaseURL = strings.TrimRight(strings.TrimSuffix(trimmedBaseURL, "/login"), "/")
	}

	parsedURL, err := url.Parse(trimmedBaseURL)
	if err != nil {
		return "", err
	}
	if parsedURL.Scheme == "" || parsedURL.Host == "" {
		return "", errors.New("invalid login base url")
	}

	parsedURL.Path = strings.TrimRight(parsedURL.Path, "/") + fmt.Sprintf("/verify-email/%d/%s", userID, token)

	expiresUnix := expiresAt.Unix()
	signature, err := SignOneTimeLoginLink(userID, token, expiresUnix)
	if err != nil {
		return "", err
	}

	query := parsedURL.Query()
	query.Set("expires", strconv.FormatInt(expiresUnix, 10))
	query.Set("signature", signature)
	parsedURL.RawQuery = query.Encode()

	return parsedURL.String(), nil
}