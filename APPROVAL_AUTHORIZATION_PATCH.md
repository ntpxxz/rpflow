## Instructions to Hide Approval Section for Requesters

Make the following changes to: `app/(app)/purchase-requests/[id]/page.tsx`

### 1. Add useSession import (line 5)
Change:
```tsx
import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
```

To:
```tsx
import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
```

### 2. Add session and authorization check (after line 62)
After this line:
```tsx
const requestId = params.id as string;
```

Add:
```tsx
const { data: session } = useSession();
```

### 3. Add canApprove check (after the pendingStep useMemo, around line 75)
After:
```tsx
const pendingStep = useMemo(() => {
  return requestDetails?.approvalSteps.find(
    (step) => step.status?.toLowerCase() === "pending"
  );
}, [requestDetails]);
```

Add:
```tsx
// Check if current user is authorized to approve
const canApprove = useMemo(() => {
  if (!session?.user || !pendingStep) return false;
  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;
  // User can approve if they are the assigned approver OR an Admin
  return pendingStep.approverId === userId || userRole === "Admin";
}, [session, pendingStep]);
```

### 4. Update the approval section condition (around line 393)
Change:
```tsx
{pendingStep && (
```

To:
```tsx
{pendingStep && canApprove && (
```

### 5. Also remove the hardcoded actorId (around line 107-120)
Change:
```tsx
const handleApprovalAction = async (newStatus: "Approved" | "Rejected") => {
  if (!pendingStep) return;
  const actorId = process.env.NEXT_PUBLIC_TEST_APPROVER_ID || "user_approver_001";

  setIsSubmitting(true);
  try {
    const res = await fetch("/api/approval-steps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        approvalStepId: pendingStep.id,
        newStatus: newStatus,
        comment: comment,
        actorId: actorId,
      }),
    });
```

To:
```tsx
const handleApprovalAction = async (newStatus: "Approved" | "Rejected") => {
  if (!pendingStep) return;

  setIsSubmitting(true);
  try {
    const res = await fetch("/api/approval-steps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        approvalStepId: pendingStep.id,
        newStatus: newStatus,
        comment: comment,
      }),
    });
```

## What This Does

- **Adds session management**: Uses NextAuth's `useSession` hook to get the current logged-in user
- **Adds authorization check**: Creates a `canApprove` variable that checks if:
  - The user is the assigned approver for the pending step, OR
  - The user has the "Admin" role
- **Hides approval buttons**: Only shows the "Approval Required" section if both conditions are met:
  - There is a pending approval step
  - The current user is authorized to approve it
- **Removes hardcoded actorId**: The API now uses the session user ID from the backend

This ensures that users with the "Requester" role (or any unauthorized users) will not see the approval buttons, even if there's a pending approval step.
