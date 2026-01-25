# Organizational Learning Alignment - Manager Approval Workflow

## Overview

The Learning Path feature now includes a **manager approval workflow** to ensure employee learning aligns with organizational priorities and strategic goals. This transforms learning from a personal initiative into a structured organizational development program.

## Key Principles

1. **Organizational Alignment**: Learning must support company/department objectives
2. **Manager Oversight**: Managers review and approve learning plans
3. **Collaborative Planning**: Employee proposes, manager guides
4. **Strategic Development**: Learning tied to business needs

## Workflow States

### 1. DRAFT

- **Who**: Employee
- **Action**: Creating/editing learning plan
- **Next**: Submit for approval

### 2. PENDING_APPROVAL

- **Who**: Manager
- **Action**: Reviewing submitted plan
- **Options**: Approve | Request Revision
- **Employee View**: "Awaiting Manager Approval" banner
- **Restrictions**: Cannot generate lessons

### 3. APPROVED

- **Who**: System
- **Trigger**: Manager approves plan
- **Employee View**: "Learning Plan Approved" banner (green)
- **Permissions**: Can generate and complete lessons
- **Tracking**: Approval date and approver recorded

### 4. REVISION_REQUESTED

- **Who**: Manager
- **Action**: Requested changes with feedback
- **Employee View**: "Revision Requested" banner (orange)
- **Manager Feedback**: Displayed prominently
- **Employee Action**: Revise and resubmit

## User Journey

### Employee Flow

#### Step 1: Create Learning Plan

```
Navigate to /dashboard/learning
↓
Fill onboarding form:
  - Current Projects
  - Tech Stack (React, Node.js, etc.)
  - Domain (FinTech, Healthcare, etc.)
  - Learning Goals (personal objectives)
  - Organizational Priorities (company focus areas)
  - Delivery Preference (Teams/Email)
↓
Click "Submit for Manager Approval"
↓
Status: PENDING_APPROVAL
```

#### Step 2: Await Approval

```
Dashboard shows: "⏳ Awaiting Manager Approval"
↓
Lesson generation button: DISABLED
↓
Notification sent to manager
```

#### Step 3A: Plan Approved

```
Manager approves
↓
Dashboard shows: "✅ Learning Plan Approved"
↓
Lesson generation button: ENABLED
↓
Employee can start learning journey
```

#### Step 3B: Revision Requested

```
Manager requests changes
↓
Dashboard shows: "📝 Revision Requested"
↓
Manager's feedback displayed
↓
Employee clicks "Revise Learning Plan"
↓
Edit form, resubmit
↓
Back to PENDING_APPROVAL
```

### Manager Flow (Future Phase)

#### Manager Dashboard

```
View pending learning plans from team
↓
For each plan, see:
  - Employee name & role
  - Proposed tech stack
  - Learning goals
  - Organizational priorities alignment
  - Current projects
↓
Actions:
  - Approve (with optional notes)
  - Request Revision (with required feedback)
  - View organizational priorities
```

#### Approval Criteria

Managers should consider:

- **Business Needs**: Does this support team/company goals?
- **Project Relevance**: Will these skills be used in current/upcoming projects?
- **Career Development**: Does this align with employee's growth path?
- **Resource Allocation**: Is the time investment justified?
- **Skill Gaps**: Does this address critical team skill gaps?

## Database Schema

### Updated `user_learning_profiles`

```typescript
{
  // ... existing fields ...

  // Organizational Alignment
  organizationalPriorities: string[],  // ["Cloud Migration", "AI/ML"]
  managerNotes: string,                // Manager's guidance

  // Approval Workflow
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REVISION_REQUESTED',
  submittedAt: timestamp,
  approvedBy: UUID,                    // Manager's user ID
  approvedAt: timestamp,
  revisionComments: string             // Manager's feedback
}
```

## API Endpoints

### Employee Endpoints

#### Submit Learning Plan

```http
POST /api/learning/profile
Authorization: Bearer {token}

{
  "techStack": ["React", "Node.js"],
  "learningGoals": "Master full-stack development",
  "organizationalPriorities": ["Microservices", "Cloud Native"],
  "status": "PENDING_APPROVAL",
  "submittedAt": "2026-01-25T10:00:00Z"
}

Response: 201 Created
{
  "id": "uuid",
  "status": "PENDING_APPROVAL",
  "message": "Learning plan submitted for manager approval"
}
```

#### Get Profile Status

```http
GET /api/learning/profile
Authorization: Bearer {token}

Response: 200 OK
{
  "status": "APPROVED",
  "approvedAt": "2026-01-26T14:30:00Z",
  "approvedBy": "manager-uuid",
  "managerNotes": "Great alignment with Q2 objectives!"
}
```

### Manager Endpoints (Phase 2)

#### Get Pending Approvals

```http
GET /api/learning/pending-approvals
Authorization: Bearer {manager-token}

Response: 200 OK
[
  {
    "employeeId": "uuid",
    "employeeName": "John Doe",
    "submittedAt": "2026-01-25T10:00:00Z",
    "techStack": ["React", "Docker"],
    "organizationalPriorities": ["Cloud Migration"]
  }
]
```

#### Approve Learning Plan

```http
POST /api/learning/approve/{profileId}
Authorization: Bearer {manager-token}

{
  "managerNotes": "Excellent alignment with team goals",
  "approvedAt": "2026-01-26T14:30:00Z"
}

Response: 200 OK
{
  "status": "APPROVED",
  "message": "Learning plan approved successfully"
}
```

#### Request Revision

```http
POST /api/learning/request-revision/{profileId}
Authorization: Bearer {manager-token}

{
  "revisionComments": "Please focus more on Kubernetes instead of Docker Swarm, as we're migrating to K8s in Q2."
}

Response: 200 OK
{
  "status": "REVISION_REQUESTED",
  "message": "Revision request sent to employee"
}
```

## Notifications

### Email Templates

#### To Employee: Submitted

```
Subject: Learning Plan Submitted for Approval

Hi {employeeName},

Your learning plan has been submitted to {managerName} for review.

Tech Stack: {techStack}
Organizational Priorities: {orgPriorities}

You'll be notified once your manager reviews your plan.

View Status: {dashboardLink}
```

#### To Manager: New Submission

```
Subject: Learning Plan Approval Required - {employeeName}

Hi {managerName},

{employeeName} has submitted a learning plan for your approval.

Tech Stack: {techStack}
Learning Goals: {goals}
Organizational Priorities: {orgPriorities}

Review Now: {approvalLink}
```

#### To Employee: Approved

```
Subject: Learning Plan Approved! 🎉

Hi {employeeName},

Great news! Your manager has approved your learning plan.

{managerNotes}

You can now start generating daily lessons.

Start Learning: {dashboardLink}
```

#### To Employee: Revision Requested

```
Subject: Learning Plan Revision Requested

Hi {employeeName},

Your manager has reviewed your learning plan and requested some changes.

Manager's Feedback:
{revisionComments}

Please revise and resubmit your plan.

Revise Plan: {dashboardLink}
```

## UI Components

### Status Banners

#### Pending Approval (Yellow)

```tsx
<div className="bg-yellow-50 border-yellow-200">
  ⏳ Awaiting Manager Approval Your learning plan is pending review...
</div>
```

#### Approved (Green)

```tsx
<div className="bg-green-50 border-green-200">
  ✅ Learning Plan Approved Start generating lessons! (Approved on {date})
</div>
```

#### Revision Requested (Orange)

```tsx
<div className="bg-orange-50 border-orange-200">
  📝 Revision Requested Manager's Feedback: {comments}
  [Revise Learning Plan Button]
</div>
```

## Benefits

### For Employees

✅ **Clear Expectations**: Know what skills the organization values
✅ **Career Alignment**: Learning tied to growth opportunities
✅ **Manager Support**: Guidance from leadership
✅ **Structured Development**: Formal learning plan

### For Managers

✅ **Team Development**: Ensure skills align with team needs
✅ **Resource Planning**: Know what skills team is acquiring
✅ **Strategic Alignment**: Connect learning to business goals
✅ **Talent Retention**: Show investment in employee growth

### For Organization

✅ **Skills Inventory**: Track what employees are learning
✅ **Strategic Workforce Development**: Build skills for future needs
✅ **ROI Tracking**: Measure learning investment impact
✅ **Compliance**: Formal approval process for learning time

## Future Enhancements

### Phase 2: Manager Dashboard

- Bulk approve/reject
- Team learning analytics
- Skill gap analysis
- Organizational priority templates

### Phase 3: Advanced Features

- **Auto-Approval Rules**: Pre-approved tech stacks
- **Learning Budgets**: Time/cost allocation per employee
- **Skill Marketplace**: Match learners with mentors
- **Career Pathing**: Suggested learning for promotion tracks

### Phase 4: Integration

- **HR Systems**: Sync with performance reviews
- **Project Management**: Link to project assignments
- **LMS Integration**: Connect to external learning platforms
- **Certification Tracking**: Formal credential management

## Success Metrics

### Approval Metrics

- **Approval Rate**: % of plans approved vs. rejected
- **Time to Approval**: Average days from submission to decision
- **Revision Rate**: % requiring revisions
- **Resubmission Time**: How quickly employees revise

### Alignment Metrics

- **Org Priority Match**: % of plans aligned with company goals
- **Skill Utilization**: % of learned skills used in projects
- **Manager Satisfaction**: NPS on approval process
- **Employee Satisfaction**: Feedback on guidance received

## Testing Checklist

### Employee Flow

- [ ] Submit learning plan
- [ ] See "Pending Approval" banner
- [ ] Lesson generation disabled
- [ ] Receive approval notification
- [ ] See "Approved" banner
- [ ] Lesson generation enabled

### Revision Flow

- [ ] Receive revision request
- [ ] See manager feedback
- [ ] Click "Revise Plan"
- [ ] Edit and resubmit
- [ ] Status returns to "Pending"

### Manager Flow (Phase 2)

- [ ] View pending approvals
- [ ] Review employee plan
- [ ] Approve with notes
- [ ] Request revision with feedback
- [ ] See approval history

---

**Status**: ✅ Employee Flow Complete | 🚧 Manager Dashboard (Phase 2)
**Impact**: Transforms learning into strategic organizational initiative
**Next**: Build manager approval dashboard
