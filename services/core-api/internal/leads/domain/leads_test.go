// Unit tests — Leads domain (state machine للاستفسارات).
package domain

import "testing"

func TestCanAdvance(t *testing.T) {
	valid := [][2]LeadStatus{
		{LeadNew, LeadContacted},
		{LeadNew, LeadQualified},
		{LeadNew, LeadLost},
		{LeadContacted, LeadQualified},
		{LeadContacted, LeadLost},
		{LeadQualified, LeadConverted},
		{LeadQualified, LeadLost},
	}
	for _, tr := range valid {
		if !CanAdvance(tr[0], tr[1]) {
			t.Errorf("valid %s→%s rejected", tr[0], tr[1])
		}
	}
	invalid := [][2]LeadStatus{
		{LeadNew, LeadConverted},      // قفز: يجب التأهيل أولًا
		{LeadContacted, LeadConverted},
		{LeadConverted, LeadNew},      // محوّل نهائيًا
		{LeadLost, LeadContacted},      // مفقود نهائيًا
		{LeadConverted, LeadLost},
	}
	for _, tr := range invalid {
		if CanAdvance(tr[0], tr[1]) {
			t.Errorf("invalid %s→%s allowed", tr[0], tr[1])
		}
	}
}

func TestLeadStatusValid(t *testing.T) {
	for _, s := range []LeadStatus{LeadNew, LeadContacted, LeadQualified, LeadConverted, LeadLost} {
		if !s.Valid() {
			t.Errorf("%s must be valid", s)
		}
	}
	if LeadStatus("unknown").Valid() {
		t.Fatal("unknown status must be invalid")
	}
}
