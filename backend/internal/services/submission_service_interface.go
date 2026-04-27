package services

import (
	"si-bvet/internal/dto"
	"si-bvet/internal/models"
)

type SubmissionServiceInterface interface {
	Create(userID uint, req dto.SubmissionRequest) error
	GetByUser(userID uint) ([]models.Submission, error)
	GetAll() ([]models.Submission, error)
	Approve(id uint) error
	Reject(id uint) error
	Update(submissionID uint, userID uint, req dto.UpdateSubmissionRequest) error
	GetTrackingTimeline(submissionID uint, userID uint) (dto.SubmissionTrackingTimelineResponse, error)
}

type SubmissionService struct{}

func NewSubmissionService() SubmissionServiceInterface {
	return &SubmissionService{}
}

func (s *SubmissionService) Create(userID uint, req dto.SubmissionRequest) error {
	return CreateSubmissionWithSamplesAndTests(userID, req)
}

func (s *SubmissionService) GetByUser(userID uint) ([]models.Submission, error) {
	return GetSubmissionsByUser(userID)
}

func (s *SubmissionService) GetAll() ([]models.Submission, error) {
	return GetAllSubmissions()
}

func (s *SubmissionService) Approve(id uint) error {
	return ApproveSubmission(id)
}

func (s *SubmissionService) Reject(id uint) error {
	return RejectSubmission(id)
}

func (s *SubmissionService) Update(submissionID uint, userID uint, req dto.UpdateSubmissionRequest) error {
	return UpdateSubmissionWithSamplesAndTests(submissionID, userID, req)
}

func (s *SubmissionService) GetTrackingTimeline(submissionID uint, userID uint) (dto.SubmissionTrackingTimelineResponse, error) {
	return GetSubmissionTrackingTimeline(submissionID, userID)
}
