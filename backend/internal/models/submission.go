package models

import "time"

type Submission struct {
	ID               uint      `gorm:"primaryKey"`
	UserID           uint      `gorm:"column:user_id;not null"`
	NoRegistration   string    `gorm:"column:no_registration"`
	NoEpi            string    `gorm:"column:no_epi"`
	NoTicket         string    `gorm:"column:no_ticket;not null"`
	TypeService      string    `gorm:"column:type_service;not null"`
	PurposeOfTest    string    `gorm:"column:purpose_of_test;type:text;not null"`
	DateOfSend       *time.Time `gorm:"column:date_of_send"`
	DateOfReceive    *time.Time `gorm:"column:date_of_receive"`
	SampleTaker      string    `gorm:"column:sample_taker"`
	IDIsikhnas        string     `gorm:"column:id_isikhnas"`
	DiagnosisRequired bool     `gorm:"column:diagnosis_required"`
	AgendaNo          string     `gorm:"column:agenda_no"`
	CustLetterNo      string     `gorm:"column:cust_letter_no"`
	CourierName       string     `gorm:"column:courier_name"`
	CourierContact    string     `gorm:"column:courier_contact"`
	Notes             string     `gorm:"column:notes"`
	SamplesCount     int64     `gorm:"column:samples_count;not null"`
	ProcessStatus    string    `gorm:"column:process_status;not null"`
	AttachmentDoc string    `gorm:"column:attachment_doc"`

	CreatedAt        time.Time 
	UpdatedAt        time.Time 

	User User `gorm:"foreignKey:UserID"`
}

func (Submission) TableName() string {
	return "Submission"
}