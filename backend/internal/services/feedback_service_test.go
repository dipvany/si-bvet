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

func validFeedbackRequest() dto.FeedbackRequest {
    return dto.FeedbackRequest{
        Fullname:      "Budi Santoso",
        Email:         "budi@example.com",
        Gender:        "Laki-laki",
        LastEducation: "S1",
        Occupation:    "ASN",
        TypeService:   "Konsultasi",
        Rating1:       5,
        Rating2:       4,
        Rating3:       5,
        Rating4:       4,
        Rating5:       5,
        Rating6:       4,
        Rating7:       5,
        Rating8:       4,
        Rating9:       5,
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

        err = db.DB.Exec(`
            CREATE TABLE Feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fullname TEXT NOT NULL,
                email TEXT NOT NULL,
                gender TEXT NOT NULL,
                last_education TEXT NOT NULL,
                occupation TEXT NOT NULL,
                type_service TEXT NOT NULL,
                score1 INTEGER NOT NULL,
                score2 INTEGER NOT NULL,
                score3 INTEGER NOT NULL,
                score4 INTEGER NOT NULL,
                score5 INTEGER NOT NULL,
                score6 INTEGER NOT NULL,
                score7 INTEGER NOT NULL,
                score8 INTEGER NOT NULL,
                score9 INTEGER NOT NULL,
                created_at DATETIME NOT NULL
            );
        `).Error
        gomega.Expect(err).NotTo(gomega.HaveOccurred())
    })

    ginkgo.Describe("CreateFeedback", func() {
        ginkgo.It("should create feedback with valid data", func() {
            req := validFeedbackRequest()

            err := CreateFeedback(req)
            gomega.Expect(err).NotTo(gomega.HaveOccurred())

            var feedback models.Feedback
            err = db.DB.First(&feedback, "email = ?", req.Email).Error
            gomega.Expect(err).NotTo(gomega.HaveOccurred())

            gomega.Expect(feedback.Fullname).To(gomega.Equal(req.Fullname))
            gomega.Expect(feedback.Email).To(gomega.Equal(req.Email))
            gomega.Expect(feedback.Gender).To(gomega.Equal(req.Gender))
            gomega.Expect(feedback.LastEducation).To(gomega.Equal(req.LastEducation))
            gomega.Expect(feedback.Occupation).To(gomega.Equal(req.Occupation))
            gomega.Expect(feedback.TypeService).To(gomega.Equal(req.TypeService))
            gomega.Expect(feedback.Rating1).To(gomega.Equal(req.Rating1))
            gomega.Expect(feedback.Rating2).To(gomega.Equal(req.Rating2))
            gomega.Expect(feedback.Rating3).To(gomega.Equal(req.Rating3))
            gomega.Expect(feedback.Rating4).To(gomega.Equal(req.Rating4))
            gomega.Expect(feedback.Rating5).To(gomega.Equal(req.Rating5))
            gomega.Expect(feedback.Rating6).To(gomega.Equal(req.Rating6))
            gomega.Expect(feedback.Rating7).To(gomega.Equal(req.Rating7))
            gomega.Expect(feedback.Rating8).To(gomega.Equal(req.Rating8))
            gomega.Expect(feedback.Rating9).To(gomega.Equal(req.Rating9))
            gomega.Expect(feedback.CreatedAt.IsZero()).To(gomega.BeFalse())
        })

        ginkgo.It("should create feedback with minimum rating values", func() {
            req := validFeedbackRequest()
            req.Rating1 = 1
            req.Rating2 = 1
            req.Rating3 = 1
            req.Rating4 = 1
            req.Rating5 = 1
            req.Rating6 = 1
            req.Rating7 = 1
            req.Rating8 = 1
            req.Rating9 = 1

            err := CreateFeedback(req)
            gomega.Expect(err).NotTo(gomega.HaveOccurred())

            var feedback models.Feedback
            err = db.DB.First(&feedback, "email = ?", req.Email).Error
            gomega.Expect(err).NotTo(gomega.HaveOccurred())
            gomega.Expect(feedback.Rating1).To(gomega.Equal(1))
            gomega.Expect(feedback.Rating9).To(gomega.Equal(1))
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
                    Rating1:       i,
                    Rating2:       i,
                    Rating3:       i,
                    Rating4:       i,
                    Rating5:       i,
                    Rating6:       i,
                    Rating7:       i,
                    Rating8:       i,
                    Rating9:       i,
                    CreatedAt:     now,
                }
                err := db.DB.Create(feedback).Error
                gomega.Expect(err).NotTo(gomega.HaveOccurred())
                time.Sleep(1 * time.Millisecond)
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
                Rating1:       5,
                Rating2:       5,
                Rating3:       5,
                Rating4:       5,
                Rating5:       5,
                Rating6:       5,
                Rating7:       5,
                Rating8:       5,
                Rating9:       5,
                CreatedAt:     now,
            }
            err := db.DB.Create(feedback1).Error
            gomega.Expect(err).NotTo(gomega.HaveOccurred())

            feedback2 := &models.Feedback{
                Fullname:      "User 2",
                Email:         "user2@example.com",
                Gender:        "Perempuan",
                LastEducation: "S2",
                Occupation:    "Pegawai Swasta",
                TypeService:   "Administrasi",
                Rating1:       3,
                Rating2:       3,
                Rating3:       3,
                Rating4:       3,
                Rating5:       3,
                Rating6:       3,
                Rating7:       3,
                Rating8:       3,
                Rating9:       3,
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
                Rating1:       5,
                Rating2:       4,
                Rating3:       5,
                Rating4:       4,
                Rating5:       5,
                Rating6:       4,
                Rating7:       5,
                Rating8:       4,
                Rating9:       5,
                CreatedAt:     now,
            }
            err := db.DB.Create(feedback).Error
            gomega.Expect(err).NotTo(gomega.HaveOccurred())

            feedbackResult, err := GetFeedbackByID(1)

            gomega.Expect(err).NotTo(gomega.HaveOccurred())
            gomega.Expect(feedbackResult).NotTo(gomega.BeNil())
            gomega.Expect(feedbackResult.Email).To(gomega.Equal("budi@example.com"))
            gomega.Expect(feedbackResult.Fullname).To(gomega.Equal("Budi Santoso"))
        })
    })
})