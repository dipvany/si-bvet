package services

import (
	"fmt"
	"log"
	"si-bvet/internal/db"
	"si-bvet/internal/dto"
	"si-bvet/internal/models"
	"si-bvet/internal/repositories"

	"gorm.io/gorm"
)

func CreateFeedback(req dto.FeedbackRequest) error {
	feedback := models.Feedback{
		Fullname:      req.Fullname,
		Email:         req.Email,
		Gender:        req.Gender,
		LastEducation: req.LastEducation,
		Occupation:    req.Occupation,
		TypeService:   req.TypeService,
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := repositories.CreateFeedbackTx(tx, &feedback); err != nil {
			return err
		}

		for _, ans := range req.Answers {
			answer := models.FeedbackAnswer{
				FeedbackID: feedback.ID,
				QuestionID: ans.QuestionID,
				Rating:     ans.Rating,
			}
			if err := repositories.CreateFeedbackAnswerTx(tx, &answer); err != nil {
				return err
			}
		}
		return nil
	})

    if err == nil {
        go func(email string, fullname string) {
            if emailErr := SendFeedbackSubmittedEmail(req); emailErr != nil {
                log.Printf("failed to send feedback confirmation email for %s: %v", feedback.Email, emailErr)
            }
            LogSystemActivity(fmt.Sprintf("Feedback created from: %s", feedback.Fullname))
        }(feedback.Email, feedback.Fullname)
    }

	return err
}

func GetAllFeedbacks() ([]models.Feedback, error) {
	return repositories.GetAllFeedbacks()
}

func GetFeedbackByID(id uint) (*models.Feedback, error) {
	return repositories.GetFeedbackByID(id)
}

func CreateFeedbackQuestion(req dto.FeedbackQuestionRequest) (*models.FeedbackQuestion, error) {
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	question := &models.FeedbackQuestion{
		QuestionText: req.QuestionText,
		IsActive:     isActive,
	}

	err := repositories.CreateFeedbackQuestion(question)
	if err != nil {
		return nil, err
	}

	LogSystemActivity(fmt.Sprintf("Pertanyaan feedback baru dibuat: '%s'", question.QuestionText))
	return question, nil
}

func CreateFeedbackQuestions(reqs []dto.FeedbackQuestionRequest) ([]*models.FeedbackQuestion, error) {
	var questions []*models.FeedbackQuestion
	for _, req := range reqs {
		isActive := true
		if req.IsActive != nil {
			isActive = *req.IsActive
		}
		question := &models.FeedbackQuestion{
			QuestionText: req.QuestionText,
			IsActive:     isActive,
		}
		questions = append(questions, question)
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		return repositories.CreateFeedbackQuestionsTx(tx, questions)
	})

	if err != nil {
		return nil, err
	}

	LogSystemActivity(fmt.Sprintf("%d pertanyaan feedback baru berhasil dibuat (bulk)", len(questions)))

	return questions, nil
}

func UpdateFeedbackQuestion(id uint, req dto.FeedbackQuestionRequest) (*models.FeedbackQuestion, error) {
	question, err := repositories.GetFeedbackQuestionByID(id)
	if err != nil {
		return nil, err
	}

	if req.QuestionText != "" {
		question.QuestionText = req.QuestionText
	}

	if req.IsActive != nil {
		question.IsActive = *req.IsActive
	}

	if err := repositories.UpdateFeedbackQuestion(question); err != nil {
		return nil, err
	}

	LogSystemActivity(fmt.Sprintf("Pertanyaan feedback ID %d diperbarui: '%s'", id, question.QuestionText))
	return question, nil
}

func DeleteFeedbackQuestion(id uint) error {
	err := repositories.DeleteFeedbackQuestion(id)
	if err == nil {
		LogSystemActivity(fmt.Sprintf("Pertanyaan feedback ID %d dihapus", id))
	}
	return err
}
