package services

import (
	"fmt"
	"time"

	"si-bvet/internal/db"
	"si-bvet/internal/dto"
	"si-bvet/internal/models"

	"github.com/glebarez/sqlite"
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"
	"gorm.io/gorm"
)

var _ = ginkgo.Describe("Feedback Service", func() {
	var gdb *gorm.DB

	ginkgo.BeforeEach(func() {
		dsn := fmt.Sprintf("file:feedback_%d?mode=memory&cache=shared", time.Now().UnixNano())
		var err error
		gdb, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{})
		gomega.Expect(err).NotTo(gomega.HaveOccurred())

		db.DB = gdb

		// Migrate models
		err = db.DB.AutoMigrate(
			&models.User{},
			&models.Feedback{},
		)
		gomega.Expect(err).NotTo(gomega.HaveOccurred())
	})

	ginkgo.Describe("CreateFeedback", func() {
		ginkgo.It("should create feedback with valid data", func() {
			userID := uint(1)
			req := dto.FeedbackRequest{
				Rating:   5,
				Comments: "Excellent service",
			}

			err := CreateFeedback(userID, req)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			// Verify in DB
			var feedback models.Feedback
			err = db.DB.First(&feedback, "user_id = ?", userID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(feedback.UserID).To(gomega.Equal(userID))
			gomega.Expect(feedback.Rating).To(gomega.Equal(5))
			gomega.Expect(feedback.Comments).To(gomega.Equal("Excellent service"))
		})

		ginkgo.It("should create feedback with minimum rating", func() {
			userID := uint(1)
			req := dto.FeedbackRequest{
				Rating:   1,
				Comments: "Need improvement",
			}

			err := CreateFeedback(userID, req)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			var feedback models.Feedback
			err = db.DB.First(&feedback, "user_id = ?", userID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(feedback.Rating).To(gomega.Equal(1))
		})

		ginkgo.It("should create feedback with empty comments", func() {
			userID := uint(1)
			req := dto.FeedbackRequest{
				Rating:   3,
				Comments: "",
			}

			err := CreateFeedback(userID, req)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			var feedback models.Feedback
			err = db.DB.First(&feedback, "user_id = ?", userID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(feedback.Comments).To(gomega.Equal(""))
		})

		ginkgo.It("should set created_at timestamp", func() {
			userID := uint(1)
			req := dto.FeedbackRequest{
				Rating:   4,
				Comments: "Good",
			}

			err := CreateFeedback(userID, req)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			var feedback models.Feedback
			err = db.DB.First(&feedback, "user_id = ?", userID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(feedback.CreatedAt).NotTo(gomega.BeNil())
		})
	})

	ginkgo.Describe("GetAllFeedbacks", func() {
		ginkgo.It("should return empty list when no feedbacks exist", func() {
			feedbacks, err := GetAllFeedbacks()

			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(feedbacks).To(gomega.BeEmpty())
		})

		ginkgo.It("should return all feedbacks sorted by desc id", func() {
			now := time.Now()

			// Create feedbacks
			for i := 1; i <= 3; i++ {
				feedback := &models.Feedback{
					UserID:    uint(i),
					Rating:    i,
					Comments:  fmt.Sprintf("Feedback %d", i),
					CreatedAt: &now,
				}
				err := db.DB.Create(feedback).Error
				gomega.Expect(err).NotTo(gomega.HaveOccurred())
				time.Sleep(1 * time.Millisecond)
			}

			feedbacks, err := GetAllFeedbacks()

			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(feedbacks).To(gomega.HaveLen(3))
			// Should be ordered by desc id (latest first)
			gomega.Expect(feedbacks[0].UserID).To(gomega.Equal(uint(3)))
			gomega.Expect(feedbacks[1].UserID).To(gomega.Equal(uint(2)))
			gomega.Expect(feedbacks[2].UserID).To(gomega.Equal(uint(1)))
		})

		ginkgo.It("should return feedbacks from multiple users", func() {
			now := time.Now()

			feedback1 := &models.Feedback{
				UserID:    1,
				Rating:    5,
				Comments:  "Great",
				CreatedAt: &now,
			}
			err := db.DB.Create(feedback1).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			feedback2 := &models.Feedback{
				UserID:    2,
				Rating:    3,
				Comments:  "OK",
				CreatedAt: &now,
			}
			err = db.DB.Create(feedback2).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			feedbacks, err := GetAllFeedbacks()

			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(feedbacks).To(gomega.HaveLen(2))
		})
	})

	ginkgo.Describe("GetFeedbackByUserID", func() {
		ginkgo.It("should return empty list when user has no feedback", func() {
			userID := uint(1)

			feedbacks, err := GetFeedbackByUserID(userID)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(feedbacks).To(gomega.BeEmpty())
		})

		ginkgo.It("should return feedback for specific user", func() {
			now := time.Now()

			feedback := &models.Feedback{
				UserID:    1,
				Rating:    5,
				Comments:  "Excellent",
				CreatedAt: &now,
			}
			err := db.DB.Create(feedback).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			feedbacks, err := GetFeedbackByUserID(1)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(feedbacks).To(gomega.HaveLen(1))
			gomega.Expect(feedbacks[0].UserID).To(gomega.Equal(uint(1)))
			gomega.Expect(feedbacks[0].Rating).To(gomega.Equal(5))
		})

		ginkgo.It("should not return feedback from other users", func() {
			now := time.Now()

			feedback1 := &models.Feedback{
				UserID:    1,
				Rating:    5,
				Comments:  "Great",
				CreatedAt: &now,
			}
			err := db.DB.Create(feedback1).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			feedback2 := &models.Feedback{
				UserID:    2,
				Rating:    3,
				Comments:  "OK",
				CreatedAt: &now,
			}
			err = db.DB.Create(feedback2).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			feedbacks, err := GetFeedbackByUserID(1)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(feedbacks).To(gomega.HaveLen(1))
			gomega.Expect(feedbacks[0].UserID).To(gomega.Equal(uint(1)))
		})

		ginkgo.It("should return multiple feedbacks for same user sorted by desc id", func() {
			now := time.Now()

			for i := 1; i <= 3; i++ {
				feedback := &models.Feedback{
					UserID:    1,
					Rating:    i,
					Comments:  fmt.Sprintf("Feedback %d", i),
					CreatedAt: &now,
				}
				err := db.DB.Create(feedback).Error
				gomega.Expect(err).NotTo(gomega.HaveOccurred())
				time.Sleep(1 * time.Millisecond)
			}

			feedbacks, err := GetFeedbackByUserID(1)

			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(feedbacks).To(gomega.HaveLen(3))
			// Should be ordered by desc id
			gomega.Expect(feedbacks[0].Rating).To(gomega.Equal(3))
			gomega.Expect(feedbacks[1].Rating).To(gomega.Equal(2))
			gomega.Expect(feedbacks[2].Rating).To(gomega.Equal(1))
		})
	})
})
