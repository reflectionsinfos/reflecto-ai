# Requirements Document

## 1. Authentication

- [x] **Login Page**: A page for users to authenticate.
  - [x] Dummy authentication with hardcoded users.
  - [x] Role-based redirection (Admin -> Dashboard, User -> Dashboard).
  - [ ] **Future**: Integrate Azure AD (SSO).

## 2. Dashboard & Card Creation

- [x] **Template Selection**: User can choose from predefined templates (Customer Centricity, Agility, etc.).
- [x] **Card Details Form**:
  - [x] Recipient Name Input.
  - [x] Kudos Message Selection (Pre-generated messages).
  - [x] Custom Message Input (Text area).
  - [x] Image Upload (Optional, validation for 5MB limit).
- [x] **Card Preview**: Ability to see the card before generating.
- [x] **Generation**:
  - [x] Create valid image file from inputs + template.
  - [x] Save to local storage for "persistence".

## 3. My Cards (History)

- [x] **List View**:
  - [x] Users see cards they created.
  - [x] Admins see all cards.
- [x] **Actions**:
  - [x] Download card image.
  - [x] Delete card.
- [x] **Search/Filter**: Filter by recipient or template.

## 4. Analytics (Admin Only)

- [x] **Dashboard**:
  - [x] Total Cards count.
  - [x] Active Users count.
  - [x] Template Popularity chart.
- [x] **Recent Activity**: Feed of recent card creations/downloads.

## 5. Technical Requirements

- [x] **Frontend**: Next.js 15, React, Tailwind CSS.
- [x] **Persistence**: Local data storage (Browser LocalStorage).
- [x] **Logging**: Simulation of logging (e.g., to Google Sheets or console).
- [ ] **Database**: Postgres (Future).
