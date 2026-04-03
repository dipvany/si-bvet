package dto

type SubmissionTrackingResponse struct {
	SubmissionID  uint   `json:"submission_id"`
	ProcessStatus string `json:"process_status"`
	BillingStatus string `json:"billing_status,omitempty"`
	LHUAvailable  bool   `json:"lhu_available"`
	LastUpdated   string `json:"last_updated,omitempty"`
}

type TrackingStep struct {
	Step   int    `json:"step"`
	Label  string `json:"label"`
	Status string `json:"status"`
}

type SubmissionTrackingTimelineResponse struct {
	SubmissionID  uint           `json:"submission_id"`
	CurrentStep   int            `json:"current_step"`
	CurrentStatus string         `json:"current_status"`
	Timeline      []TrackingStep `json:"timeline"`
}