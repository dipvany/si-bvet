package models

import "time"

// ActivityLog merepresentasikan sebuah entri log aktivitas dalam sistem.
type ActivityLog struct {
	ID        uint      `gorm:"primarykey"`
	Timestamp time.Time `gorm:"index"`
	Actor     string    `gorm:"size:255;index"` // Nama user, atau "SYSTEM"
	ActorID   *uint     // Nullable foreign key ke tabel users 
	User      *User     `gorm:"foreignKey:ActorID"`
	Role      string    `gorm:"size:50;index"` // Role dari actor
	Activity  string `gorm:"type:text"`    // Deskripsi aktivitas
	IPAddress string `gorm:"size:45"`
	Method    string `gorm:"size:10"`
	Endpoint  string `gorm:"size:255"`
}

func (ActivityLog) TableName() string {
	return "ActivityLogs"
}