MediCare Scheduler – Product Requirements Document
1. Project Overview
Purpose: Internal tool for one admin to create, track and update healthcare appointments.

End-users:
– Admin: full web interface.
– Staff: have NO access to the app; they only receive Google Calendar events and one daily e-mail agenda.

Tech stack
– Frontend / API: Next.js 14 (TypeScript) + React 18 + Tailwind CSS
– Database: Supabase PostgreSQL (start locally in Docker, later migrate to Supabase Cloud)
– Auth: none (single-user), optional basic password on deploy
– External APIs: Google Calendar v3 (bidirectional), SMTP (daily e-mails)

Timezone: GMT+4 (Dubai) - Date format: DD/MM/YYYY

2. Core Features
Patient Management
Store patient info, address, manual Google Maps link and uploaded ID document.

Staff Management
Maintain staff directory (doctors, nurses, physiotherapists, caregivers, drivers, lab techs) with Google Calendar IDs.

Appointment Scheduling
– Six appointment types (Doctor on Call, Lab Test, Teleconsultation, Physiotherapy, Caregiver, IV Therapy).
– Multiple staff per appointment; always exactly one driver or self-transport option.
– Unlimited recurring patterns.
– “Copy appointment” modal to clone to a new date.

Google Calendar Integration
– Creates a separate event for each assigned staff member.
– Driver event contains only address, phone & Maps link.
– Medical staff events contain full details (no Maps link).
– Bidirectional sync: updates in the app or Google propagate both ways.

Daily E-mail Agendas
Every morning at 06:00 Dubai time each staff member receives an HTML e-mail listing that day’s appointments.

Calendar UI (Admin)
FullCalendar-based view mimicking Google Calendar (day/week/month/agenda, drag-and-drop, color-coded by type).

3. Data Models
3.1 Patients
field	type	notes
id	UUID PK	generated
name	text	required
phone	text	required
id_document_url	text	Supabase Storage path
id_document_filename	text	original name
flat_villa_no	text	required
building_street	text	required
area	text	required
city	text	required
google_maps_link	text	manual
medical_notes	text	optional
emergency_contact	text	optional
preferred_transport	text	optional
created_at, updated_at	timestamptz	
3.2 Staff
field	type	notes
id	UUID PK	
first_name, last_name	text	
staff_type	enum: doctor, nurse, physiotherapist, caregiver, driver, lab_technician	
specialization	text	
phone	text	
email	text	
google_calendar_id	text	
available_days	int[] (1-7)	
working_hours_start / end	time	
status	active / inactive	
email_notifications_enabled	bool	
3.3 Appointments
field	type	notes
id	UUID PK	
patient_id	FK → patients	
appointment_type	enum listed above	
appointment_date	date	
start_time	time	
duration_minutes	int	
status	scheduled / confirmed / completed / cancelled	
custom_fields	JSONB	
transportation_type	driver / self_transport	
transportation_method	text	
driver_id	FK → staff	
notes	text	
recurring_rule	JSONB	
google_event_ids	JSONB (staff_id → eventId)	
created_at, updated_at	timestamptz	
3.4 appointment_staff (junction)
| appointment_id | staff_id | role | is_primary | google_event_id |

4. Appointment-Type Templates
4.1 Doctor on Call
Duration 30/45/60/90 min

Chief Complaint (text, required)

Primary Doctor (select)

Assisting Nurse (optional)

Transportation: Driver select OR Self-transport (Won’t work, Family member, Taxi, Public transport, Walking)

Notes (text)

4.2 Lab Test
Duration 15/30/45 min

Test List (textarea)

Lab Name (AVM, Forte, Lifenity, Other)

Sample Types (multi-select: Blood, Urine, Stool, Saliva, Swab, Tissue, Other)

Nurse (select)

Transportation as above

Fasting Required (yes/no)

Notes

4.3 Teleconsultation
Duration 15/30/45/60 min

Platform (Zoom, Google Meet, WhatsApp Video, Phone Call)

Doctor (select)

Consultation Type (Follow-up, New, Emergency)

Notes

4.4 Physiotherapy
Duration 45/60/90/120 min

Physiotherapist (select)

Condition / Injury (text)

Session Type (Assessment, Treatment, Follow-up)

Transportation as above

Notes

4.5 Caregiver
Duration 2/4/6/8/12/24 h

Primary Caregiver (select)

Backup Caregiver (optional)

Transportation as above

Notes

4.6 IV Therapy
Duration 1/2/3/4 h

Nurse (select)

Doctor (optional)

IV Type (text)

IV Company (Revitalife, Magenta, Centric, Self)

Transportation as above

Notes

5. Google Calendar Specification
5.1 Event Title
[Patient First] - [Area] - [Type] - [Staff Firsts]

5.2 Event Location
Full patient address.

5.3 Event Description
Drivers

text
📍 PICKUP DETAILS
Address: <full address>
Phone: <patient phone>
Google Maps: <link>

Appointment ID: <id>
Medical Staff (Doctor, Nurse, etc.) – example for Lab Test

text
📋 APPOINTMENT DETAILS
Patient: <full name>
Phone: <phone>
Address: <full address>

🔬 LAB INFORMATION
Lab: <Lab Name>
Tests: <Test list>
Samples: <Sample types>
Nurse: <Nurse>
Fasting: <Yes/No>

🚗 TRANSPORTATION
Method: <Driver Name / Self-transport method>

📝 NOTES
<free-text notes>

Duration: <X min>
Appointment ID: <id>
5.4 Sync Rules
Create/update/delete events on save.

Watch each staff calendar via webhook; reflect external changes in DB.

Drivers receive minimal description; others receive full.

6. Daily Staff E-mail
At 06:00 Asia/Dubai:

text
Subject: Your Schedule for DD/MM/YYYY

10:00–11:00  Doctor Visit  Ahmed  Marina  Driver: Ahmed
14:00–14:45  Lab Test      Maryam Downtown Driver: — (Taxi)

Total: 2 appointments
Uses staff local time (Asia/Dubai).

7. Calendar UI (Admin)
FullCalendar component, day/week/month/agenda views

15-minute grid, drag-and-drop, resize to change duration

Color by appointment type

Filters: staff, type, date range

Copy appointment via context-menu → modal

8. Copy Appointment Flow
Admin clicks Copy.

Modal opens pre-filled; new date is mandatory.

Admin edits any field.

On save: new DB row + new Google events; original untouched.

9. Local → Cloud Migration
npx supabase init → npx supabase start (Docker)

Dev with local keys in .env.local.

When ready:
a. npx supabase link --project-ref <cloud-ref>
b. npx supabase db push
c. Optional: dump/import data with supabase db dump | psql.

RLS is omitted – single admin uses app; database is not exposed to staff.

10. Non-functional Requirements
category	target
Initial page load	<2 s
Calendar render (month, 200 events)	<1 s
Google sync latency	<5 s
Uptime	99.5%
Browser support	Last 2 versions of Chrome / Edge / Safari

