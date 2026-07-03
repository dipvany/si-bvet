package services

import (
	"errors"
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

func validFeedbackRequest() dto.FeedbackRequest {
    return dto.FeedbackRequest{
        Fullname:      "Budi Santoso",
        Email:         "budi@example.com",
        Gender:        "Laki-laki",
        LastEducation: "S1",
        Occupation:    "ASN",
        TypeService:   "Konsultasi",
        Answers: []dto.FeedbackAnswerRequest{
            {QuestionID: 1, Rating: 5},
            {QuestionID: 2, Rating: 4},
            {QuestionID: 3, Rating: 5},
        },
    }
}

var _ = ginkgo.Describe("Feedback Service", func() {
    var gdb *gorm.DB

    ginkgo.BeforeEach(func() {
        dsn := fmt.Sprintf("file:feedback_%d?mode=memory&cache=shared", time.Now().UnixNano())
        var err error
        gdb, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{})
        gomega.Expect(err).NotTo(gomega.HaveOccurred())

        db.DB = gdb

        err = db.DB.AutoMigrate(
            &models.Feedback{},
            &models.FeedbackAnswer{},
            &models.FeedbackQuestion{},
        )
        gomega.Expect(err).NotTo(gomega.HaveOccurred())

        // Seed questions
        questions := []models.FeedbackQuestion{
            {ID: 1, QuestionText: "Q1"},
            {ID: 2, QuestionText: "Q2"},
            {ID: 3, QuestionText: "Q3"},
        }
        err = db.DB.Create(&questions).Error
        gomega.Expect(err).NotTo(gomega.HaveOccurred())
    })

    ginkgo.Describe("CreateFeedback", func() {
        ginkgo.It("should create feedback with valid data", func() {
            req := validFeedbackRequest()

            err := CreateFeedback(req)
            gomega.Expect(err).NotTo(gomega.HaveOccurred())

            var feedback models.Feedback
            err = db.DB.Preload("Answers").First(&feedback, "email = ?", req.Email).Error
            gomega.Expect(err).NotTo(gomega.HaveOccurred())

            gomega.Expect(feedback.Fullname).To(gomega.Equal(req.Fullname))
            gomega.Expect(feedback.Email).To(gomega.Equal(req.Email))
            gomega.Expect(feedback.Answers).To(gomega.HaveLen(3))
            gomega.Expect(feedback.Answers[0].QuestionID).To(gomega.Equal(uint(1)))
            gomega.Expect(feedback.Answers[0].Rating).To(gomega.Equal(5))
            gomega.Expect(feedback.Answers[1].QuestionID).To(gomega.Equal(uint(2)))
            gomega.Expect(feedback.Answers[1].Rating).To(gomega.Equal(4))
            gomega.Expect(feedback.CreatedAt.IsZero()).To(gomega.BeFalse())
        })

        ginkgo.It("should create feedback with minimum rating values", func() {
            req := validFeedbackRequest()
            req.Answers = []dto.FeedbackAnswerRequest{
                {QuestionID: 1, Rating: 1},
                {QuestionID: 2, Rating: 1},
                {QuestionID: 3, Rating: 1},
            }

            err := CreateFeedback(req)
            gomega.Expect(err).NotTo(gomega.HaveOccurred())

            var feedback models.Feedback
            err = db.DB.Preload("Answers").First(&feedback, "email = ?", req.Email).Error
            gomega.Expect(err).NotTo(gomega.HaveOccurred())
            gomega.Expect(feedback.Answers).To(gomega.HaveLen(3))
            gomega.Expect(feedback.Answers[0].Rating).To(gomega.Equal(1))
            gomega.Expect(feedback.Answers[1].Rating).To(gomega.Equal(1))
            gomega.Expect(feedback.Answers[2].Rating).To(gomega.Equal(1))
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

            for i := 1; i <= 3; i++ {
                feedback := &models.Feedback{
                    Fullname:      fmt.Sprintf("User %d", i),
                    Email:         fmt.Sprintf("user%d@example.com", i),
                    Gender:        "Laki-laki",
                    LastEducation: "S1",
                    Occupation:    "ASN",
                    TypeService:   "Konsultasi",
                    CreatedAt:     now,
                }
                err := db.DB.Create(feedback).Error
                gomega.Expect(err).NotTo(gomega.HaveOccurred())

                answer := &models.FeedbackAnswer{FeedbackID: feedback.ID, QuestionID: 1, Rating: i}
                err = db.DB.Create(answer).Error
                gomega.Expect(err).NotTo(gomega.HaveOccurred())
            }

            feedbacks, err := GetAllFeedbacks()

            gomega.Expect(err).NotTo(gomega.HaveOccurred())
            gomega.Expect(feedbacks).To(gomega.HaveLen(3))
            gomega.Expect(feedbacks[0].Email).To(gomega.Equal("user3@example.com"))
            gomega.Expect(feedbacks[1].Email).To(gomega.Equal("user2@example.com"))
            gomega.Expect(feedbacks[2].Email).To(gomega.Equal("user1@example.com"))
        })

        ginkgo.It("should return feedbacks from multiple users", func() {
            now := time.Now()

            feedback1 := &models.Feedback{
                Fullname:      "User 1",
                Email:         "user1@example.com",
                Gender:        "Laki-laki",
                LastEducation: "S1",
                Occupation:    "ASN",
                TypeService:   "Konsultasi",
                CreatedAt:     now,
            }
            err := db.DB.Create(feedback1).Error
            gomega.Expect(err).NotTo(gomega.HaveOccurred())
            db.DB.Create(&models.FeedbackAnswer{FeedbackID: feedback1.ID, QuestionID: 1, Rating: 5})

            feedback2 := &models.Feedback{
                Fullname:      "User 2",
                Email:         "user2@example.com",
                Gender:        "Perempuan",
                LastEducation: "S2",
                Occupation:    "Swasta",
                TypeService:   "Administrasi",
                CreatedAt:     now,
            }
            err = db.DB.Create(feedback2).Error
            gomega.Expect(err).NotTo(gomega.HaveOccurred())

            feedbacks, err := GetAllFeedbacks()

            gomega.Expect(err).NotTo(gomega.HaveOccurred())
            gomega.Expect(feedbacks).To(gomega.HaveLen(2))
        })
    })

    ginkgo.Describe("GetFeedbackByID", func() {
        ginkgo.It("should return feedback for specific id", func() {
            now := time.Now()

            feedback := &models.Feedback{
                Fullname:      "Budi Santoso",
                Email:         "budi@example.com",
                Gender:        "Laki-laki",
                LastEducation: "S1",
                Occupation:    "ASN",
                TypeService:   "Konsultasi",
                CreatedAt:     now,
            }
            err := db.DB.Create(feedback).Error
            gomega.Expect(err).NotTo(gomega.HaveOccurred())

            answer := &models.FeedbackAnswer{FeedbackID: feedback.ID, QuestionID: 1, Rating: 5}
            err = db.DB.Create(answer).Error
            gomega.Expect(err).NotTo(gomega.HaveOccurred())

            feedbackResult, err := GetFeedbackByID(feedback.ID)

            gomega.Expect(err).NotTo(gomega.HaveOccurred())
            gomega.Expect(feedbackResult).NotTo(gomega.BeNil())
            gomega.Expect(feedbackResult.Email).To(gomega.Equal("budi@example.com"))
            gomega.Expect(feedbackResult.Fullname).To(gomega.Equal("Budi Santoso"))
        })
    })

	ginkgo.Describe("FeedbackQuestion Management", func() {
		ginkgo.It("should create a feedback question", func() {
			isActive := true
			req := dto.FeedbackQuestionRequest{
				QuestionText: "Seberapa puaskah Anda?",
				IsActive:     &isActive,
			}

			question, err := CreateFeedbackQuestion(req)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(question).NotTo(gomega.BeNil())
			gomega.Expect(question.ID).To(gomega.BeNumerically(">", 0))
			gomega.Expect(question.QuestionText).To(gomega.Equal("Seberapa puaskah Anda?"))
			gomega.Expect(question.IsActive).To(gomega.BeTrue())

			var savedQuestion models.FeedbackQuestion
			err = db.DB.First(&savedQuestion, question.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(savedQuestion.QuestionText).To(gomega.Equal(req.QuestionText))
		})

		ginkgo.It("should update a feedback question", func() {
			initialQuestion := models.FeedbackQuestion{
				QuestionText: "Old Question",
				IsActive:     true,
			}
			err := db.DB.Create(&initialQuestion).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			isInactive := false
			updateReq := dto.FeedbackQuestionRequest{
				QuestionText: "New Updated Question",
				IsActive:     &isInactive,
			}

			updatedQuestion, err := UpdateFeedbackQuestion(initialQuestion.ID, updateReq)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(updatedQuestion).NotTo(gomega.BeNil())
			gomega.Expect(updatedQuestion.QuestionText).To(gomega.Equal("New Updated Question"))
			gomega.Expect(updatedQuestion.IsActive).To(gomega.BeFalse())

			var savedQuestion models.FeedbackQuestion
			err = db.DB.First(&savedQuestion, initialQuestion.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(savedQuestion.IsActive).To(gomega.BeFalse())
		})

		ginkgo.It("should only update text when IsActive is nil", func() {
			initialQuestion := models.FeedbackQuestion{
				QuestionText: "Only Text",
				IsActive:     true,
			}
			err := db.DB.Create(&initialQuestion).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			updateReq := dto.FeedbackQuestionRequest{
				QuestionText: "Only Text Updated",
			}

			_, err = UpdateFeedbackQuestion(initialQuestion.ID, updateReq)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			var savedQuestion models.FeedbackQuestion
			err = db.DB.First(&savedQuestion, initialQuestion.ID).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())
			gomega.Expect(savedQuestion.QuestionText).To(gomega.Equal("Only Text Updated"))
			gomega.Expect(savedQuestion.IsActive).To(gomega.BeTrue())
		})

		ginkgo.It("should delete a feedback question", func() {
			question := models.FeedbackQuestion{
				QuestionText: "To be deleted",
				IsActive:     true,
			}
			err := db.DB.Create(&question).Error
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			err = DeleteFeedbackQuestion(question.ID)
			gomega.Expect(err).NotTo(gomega.HaveOccurred())

			var deletedQuestion models.FeedbackQuestion
			err = db.DB.First(&deletedQuestion, question.ID).Error
			gomega.Expect(err).To(gomega.HaveOccurred())
			gomega.Expect(errors.Is(err, gorm.ErrRecordNotFound)).To(gomega.BeTrue())
		})

		ginkgo.It("should return error when deleting non-existent question", func() {
			err := DeleteFeedbackQuestion(9999)
			gomega.Expect(err).To(gomega.HaveOccurred())
			gomega.Expect(errors.Is(err, gorm.ErrRecordNotFound)).To(gomega.BeTrue())
		})
	})
})