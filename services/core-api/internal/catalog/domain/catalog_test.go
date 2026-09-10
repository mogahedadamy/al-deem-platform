// Unit tests — Catalog domain (Blueprint 18: state transitions).
package domain

import (
	"testing"
	"time"
)

var now = time.Date(2026, 9, 10, 12, 0, 0, 0, time.UTC)

func draft() *Course {
	return &Course{ID: "c1", Status: CourseDraft}
}

func pendingReview() *Course {
	c := draft()
	_ = c.SubmitForReview(now)
	return c
}

func published() *Course {
	c := pendingReview()
	_ = c.Publish("reviewer-1", now)
	return c
}

// ===== Course state machine =====

func TestSubmitForReview_FromDraft(t *testing.T) {
	c := draft()
	if err := c.SubmitForReview(now); err != nil {
		t.Fatalf("draft → pending_review must succeed, got %v", err)
	}
	if c.Status != CoursePendingReview {
		t.Fatalf("status = %s, want pending_review", c.Status)
	}
}

func TestSubmitForReview_FromPublished(t *testing.T) {
	c := published()
	if err := c.SubmitForReview(now); err == nil {
		t.Fatal("published → pending_review must be rejected")
	}
}

func TestPublish_RequiresPendingReview(t *testing.T) {
	c := draft()
	if err := c.Publish("r1", now); err == nil {
		t.Fatal("draft → published must be rejected (skip review)")
	}
	p := pendingReview()
	if err := p.Publish("r1", now); err != nil {
		t.Fatalf("pending_review → published must succeed: %v", err)
	}
	if p.PublishedAt == nil || p.ReviewedBy == nil {
		t.Fatal("publish must set PublishedAt and ReviewedBy")
	}
}

func TestReject_RequiresNotes(t *testing.T) {
	c := pendingReview()
	if err := c.Reject("r1", "", now); err == nil {
		t.Fatal("rejection without notes must be rejected")
	}
	if err := c.Reject("r1", "أضف مصادر أكثر", now); err != nil {
		t.Fatalf("rejection with notes must succeed: %v", err)
	}
	if c.Status != CourseDraft {
		t.Fatalf("after reject status = %s, want draft", c.Status)
	}
	if c.ReviewNotes == nil || *c.ReviewNotes != "أضف مصادر أكثر" {
		t.Fatal("review notes must be saved")
	}
}

func TestArchive_OnlyPublished(t *testing.T) {
	c := draft()
	if err := c.Archive(now); err == nil {
		t.Fatal("archiving draft must be rejected")
	}
	p := published()
	if err := p.Archive(now); err != nil {
		t.Fatalf("archiving published must succeed: %v", err)
	}
	// archived cannot be archived again
	if err := p.Archive(now); err == nil {
		t.Fatal("double archive must be rejected")
	}
}

// ===== Instructor ownership =====

func TestCanModifyCourse(t *testing.T) {
	if !CanModifyCourse("instructor-1", "instructor-1") {
		t.Fatal("owner must be able to modify")
	}
	if CanModifyCourse("instructor-2", "instructor-1") {
		t.Fatal("non-owner must not modify")
	}
}
