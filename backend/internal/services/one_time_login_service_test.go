package services_test

import (
	"fmt"
	"os"
	"si-bvet/internal/db"
	"si-bvet/internal/models"
	"si-bvet/internal/services"
	"si-bvet/internal/utils"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"
	"gorm.io/gorm"
)

var _ = ginkgo.Describe("One Time Login Link", func() {
	var gdb *gorm.DB

	ginkgo.BeforeEach(func() {
		var err error
		dsn := fmt.Sprintf("file:one_time_login_%d?mode=memory&cache=shared", time.Now().UnixNano())
		gdb, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{})
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		db.DB = gdb

		err = db.DB.AutoMigrate(&models.User{})
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		previousSecret, hadSecret := os.LookupEnv("ONE_TIME_LOGIN_SECRET")
		_ = os.Setenv("ONE_TIME_LOGIN_SECRET", "test-one-time-login-secret")

		ginkgo.DeferCleanup(func() {
			if hadSecret {
				_ = os.Setenv("ONE_TIME_LOGIN_SECRET", previousSecret)
				return
			}
			_ = os.Unsetenv("ONE_TIME_LOGIN_SECRET")
		})
	})

	ginkgo.It("consumes the link exactly once", func() {
		token, err := utils.GenerateRandomToken(32)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		expiresAt := time.Now().Add(1 * time.Hour)
		user := models.User{
			FullName:           "Customer Test",
			Email:              "customer@test.com",
			PasswordHash:       "hash",
			Role:               "customer",
			IsVerified:         true,
			LoginLinkTokenHash: utils.HashOneTimeLoginToken(token),
			LoginLinkExpiresAt: &expiresAt,
		}
		db.DB.Create(&user)

		signature, err := utils.SignOneTimeLoginLink(user.ID, token, expiresAt.Unix())
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		consumedUser, err := services.ConsumeOneTimeLoginLink(user.ID, token, expiresAt.Unix(), signature)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
		gomega.Expect(consumedUser.ID).To(gomega.Equal(user.ID))
		gomega.Expect(consumedUser.LoginLinkUsedAt).NotTo(gomega.BeNil())

		_, err = services.ConsumeOneTimeLoginLink(user.ID, token, expiresAt.Unix(), signature)
		gomega.Expect(err).To(gomega.Equal(services.ErrOneTimeLoginLinkUsed))
	})

	ginkgo.It("rejects expired links", func() {
		token, err := utils.GenerateRandomToken(32)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		expiresAt := time.Now().Add(-1 * time.Hour)
		user := models.User{
			FullName:           "Expired Customer",
			Email:              "expired@test.com",
			PasswordHash:       "hash",
			Role:               "customer",
			IsVerified:         true,
			LoginLinkTokenHash: utils.HashOneTimeLoginToken(token),
			LoginLinkExpiresAt: &expiresAt,
		}
		db.DB.Create(&user)

		signature, err := utils.SignOneTimeLoginLink(user.ID, token, expiresAt.Unix())
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		_, err = services.ConsumeOneTimeLoginLink(user.ID, token, expiresAt.Unix(), signature)
		gomega.Expect(err).To(gomega.Equal(services.ErrOneTimeLoginLinkExpired))
	})
})