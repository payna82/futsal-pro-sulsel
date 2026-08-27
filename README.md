# Futsal Pro Sulsel

PORPROV SULSEL 2026 — FUTSAL MATCH MANAGEMENT SYSTEM

Build a production-oriented web application for the 2026 South Sulawesi Provincial Sports Week (PORPROV Sulsel 2026), specifically for the Futsal Men's and Women's competitions.

PRODUCT VISION

The application is a centralized competition and match-management platform.

It must support:

Tournament management

Men's and Women's futsal competitions

Kabupaten/Kota contingents

Teams

Players

Team officials

Venues

Match scheduling

Competition groups

Knockout stages

Match officials

Match lineups

Live match scoring

Goals

Cards

Fouls

Substitutions

Timeouts

Match clock

Match reports

Standings

Results

Statistics

Public live scoreboard

Audit logs

Role-based access control

The application must be designed as a serious sports competition management system, not as a simple scoreboard.

PRIMARY USERS

Create UX for these roles:

Super Admin

Tournament Admin

Competition Manager

Venue Manager

Match Commissioner

Referee

Timekeeper

Scorekeeper

Team Official

Media

Public Visitor

Each role must have a different level of access.

CORE APPLICATION AREAS

Create the following application areas:

Public

Home

Tournament information

Men's competition

Women's competition

Live matches

Match schedule

Results

Standings

Teams

Players

Top scorers

Match details

Venues

Admin

Dashboard

Tournament management

Competition management

Contingents

Teams

Players

Officials

Venues

Groups

Schedule

Matches

Match officials

Reports

Statistics

Users

Roles

Permissions

Audit logs

Match Center

Create a dedicated match-control interface.

Display:

Home team

Away team

Current score

Match period

Match clock

Match status

Starting lineup

Substitutes

Goals

Cards

Fouls

Substitutions

Timeouts

Match officials

Event timeline

MATCH STATE MACHINE

The UI must support these match states:

SCHEDULED
CHECK_IN
LINEUP
READY
LIVE
HALFTIME
LIVE
FULL_TIME
CONFIRMED
PUBLISHED

Do not allow arbitrary status transitions.

The backend will later enforce the state machine.

MATCH EVENTS

Design the interface around an event-based match model.

Supported events:

MATCH_START

PERIOD_START

GOAL

CARD

FOUL

SUBSTITUTION

TIMEOUT

PERIOD_END

HALFTIME

MATCH_END

MATCH_CORRECTION

Every match event should contain:

timestamp

match

period

team

player when applicable

event type

operator

metadata

created_at

The final backend implementation will use an immutable event/audit model.

SCOREBOARD

Create a highly visible live scoreboard.

Example:

HOME TEAM
3

AWAY TEAM
2

2ND HALF
18:34

The score must visually dominate the match interface.

ADMIN DASHBOARD

Display:

Matches today

Live matches

Completed matches

Upcoming matches

Teams registered

Players registered

Venues active

Pending confirmations

Use cards, tables, status badges and clear operational indicators.

DESIGN SYSTEM

Design language:

Professional sports competition platform

Modern

Clean

High readability

Mobile-first

Tablet-friendly

Desktop optimized

Strong visual hierarchy

Large score numbers

High contrast

Minimal unnecessary decoration

Use Tailwind CSS and shadcn/ui where appropriate.

Do not create a generic SaaS dashboard.

The visual identity should feel like an official sports competition system.

RESPONSIVE REQUIREMENTS

The Match Center must work especially well on:

Mobile phones

Tablets

Laptop

Large desktop screens

Scorekeepers and referees may operate the system from tablets or mobile devices.

DATA ARCHITECTURE

Prepare the frontend architecture for PostgreSQL/Supabase.

Expected core entities:

users
roles
permissions
tournaments
categories
contingents
teams
players
officials
venues
groups
matches
match_officials
match_lineups
match_events
standings
audit_logs

Do not hard-code tournament data into components.

Use typed models/interfaces.

IMPORTANT ENGINEERING RULES

Separate UI components from business logic.

Do not place business rules directly inside visual components.

Use reusable components.

Use TypeScript.

Use clear domain naming.

Prepare the application for PostgreSQL/Supabase.

Do not use mock data as the final architecture.

Mock data may be used temporarily only to demonstrate UI.

Do not implement insecure authorization in the frontend.

Backend authorization will be authoritative.

Never trust client-side score values.

Match events must eventually be validated by the backend.

All critical operations must be auditable.

DELIVERABLE

Build the initial application shell and complete UI/UX for the major modules.

Do not attempt to implement every backend business rule in one step.

First create:

Application layout

Navigation

Authentication screens

Admin dashboard

Tournament dashboard

Team management

Player management

Venue management

Schedule management

Match center

Live scoreboard

Standings

Public tournament pages

Responsive mobile layouts

Use realistic futsal competition terminology.

Use Indonesian language for the UI.

Use English for code identifiers.

Before implementing complex functionality, establish a clean component and route architecture that can later be connected to a real PostgreSQL/Supabase backend.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5f91dfb4-f6df-4d59-9787-1b540ab133f3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
