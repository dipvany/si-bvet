package utils

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"os"
	"strconv"
	"strings"
	"time"
)

func SendEmail(to, subject, body string) error {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	username := os.Getenv("SMTP_USERNAME")
	password := os.Getenv("SMTP_PASSWORD")
	from := os.Getenv("SMTP_FROM")

	if from == "" {
		from = username
	}

	if host == "" || port == "" || from == "" {
		// SMTP not configured, do not fail business flow.
		return nil
	}

	headers := []string{
		"From: " + from,
		"To: " + to,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
	}

	message := strings.Join(headers, "\r\n") + "\r\n\r\n" + body

	maxAttempts := parseIntWithDefault(os.Getenv("SMTP_MAX_RETRIES"), 3)
	if maxAttempts < 1 {
		maxAttempts = 1
	}

	timeoutSec := parseIntWithDefault(os.Getenv("SMTP_TIMEOUT_SECONDS"), 10)
	if timeoutSec < 1 {
		timeoutSec = 10
	}
	timeout := time.Duration(timeoutSec) * time.Second

	var lastErr error
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		err := sendEmailWithTimeout(host, port, username, password, from, to, []byte(message), timeout)
		if err == nil {
			return nil
		}

		lastErr = err
		if attempt < maxAttempts {
			backoff := time.Duration(attempt*attempt) * time.Second
			time.Sleep(backoff)
		}
	}

	return fmt.Errorf("smtp send failed after %d attempt(s): %w", maxAttempts, lastErr)
}

func sendEmailWithTimeout(host, port, username, password, from, to string, message []byte, timeout time.Duration) error {
	addr := net.JoinHostPort(host, port)

	dialer := &net.Dialer{Timeout: timeout}
	conn, err := dialer.Dial("tcp", addr)
	if err != nil {
		return err
	}

	if port == "465" {
		tlsConn := tls.Client(conn, &tls.Config{ServerName: host})
		if err := tlsConn.SetDeadline(time.Now().Add(timeout)); err != nil {
			tlsConn.Close()
			return err
		}

		client, err := smtp.NewClient(tlsConn, host)
		if err != nil {
			tlsConn.Close()
			return err
		}
		defer client.Close()

		return sendSMTPMessage(client, host, username, password, from, to, message)
	}

	client, err := smtp.NewClient(conn, host)
	if err != nil {
		conn.Close()
		return err
	}
	defer client.Close()

	if err := client.Hello("localhost"); err != nil {
		return err
	}

	if ok, _ := client.Extension("STARTTLS"); ok {
		tlsConfig := &tls.Config{ServerName: host}
		if err := client.StartTLS(tlsConfig); err != nil {
			return err
		}
	}

	return sendSMTPMessage(client, host, username, password, from, to, message)
}

func sendSMTPMessage(client *smtp.Client, host, username, password, from, to string, message []byte) error {
	if username != "" || password != "" {
		auth := smtp.PlainAuth("", username, password, host)
		if err := client.Auth(auth); err != nil {
			return err
		}
	}

	if err := client.Mail(from); err != nil {
		return err
	}

	if err := client.Rcpt(to); err != nil {
		return err
	}

	w, err := client.Data()
	if err != nil {
		return err
	}

	if _, err := w.Write(message); err != nil {
		w.Close()
		return err
	}

	if err := w.Close(); err != nil {
		return err
	}

	return client.Quit()
}

func parseIntWithDefault(raw string, defaultValue int) int {
	if raw == "" {
		return defaultValue
	}

	v, err := strconv.Atoi(raw)
	if err != nil {
		return defaultValue
	}

	return v
}
