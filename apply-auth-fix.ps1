# Apply authorization fixes to purchase request detail page

# 1. Add useSession import
(Get-Content "app/(app)/purchase-requests/[id]/page.tsx") -replace `
  'import \{ useParams, useRouter \} from "next/navigation";', `
  'import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";' | Set-Content "app/(app)/purchase-requests/[id]/page.tsx"

# 2. Add session variable after requestId
$content = Get-Content "app/(app)/purchase-requests/[id]/page.tsx" -Raw
$content = $content -replace `
  '(const requestId = params\.id as string;)', `
  '$1

  const { data: session } = useSession();'
Set-Content "app/(app)/purchase-requests/[id]/page.tsx" -Value $content

# 3. Add canApprove check after pendingStep
$content = Get-Content "app/(app)/purchase-requests/[id]/page.tsx" -Raw
$content = $content -replace `
  '(\}, \[requestDetails\]\);)\s+(useEffect)', `
  '$1

  // Check if current user is authorized to approve
  const canApprove = useMemo(() => {
    if (!session?.user || !pendingStep) return false;
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    // User can approve if they are the assigned approver OR an Admin
    return pendingStep.approverId === userId || userRole === "Admin";
  }, [session, pendingStep]);

  $2'
Set-Content "app/(app)/purchase-requests/[id]/page.tsx" -Value $content

# 4. Update approval section condition
(Get-Content "app/(app)/purchase-requests/[id]/page.tsx") -replace `
  '\{pendingStep && \(', `
  '{pendingStep && canApprove && (' | Set-Content "app/(app)/purchase-requests/[id]/page.tsx"

# 5. Remove hardcoded actorId
$content = Get-Content "app/(app)/purchase-requests/[id]/page.tsx" -Raw
$content = $content -replace `
  'const handleApprovalAction = async \(newStatus: "Approved" \| "Rejected"\) => \{\s+if \(!pendingStep\) return;\s+const actorId = process\.env\.NEXT_PUBLIC_TEST_APPROVER_ID \|\| "user_approver_001";', `
  'const handleApprovalAction = async (newStatus: "Approved" | "Rejected") => {
    if (!pendingStep) return;'
$content = $content -replace `
  'comment: comment,\s+actorId: actorId,', `
  'comment: comment,'
Set-Content "app/(app)/purchase-requests/[id]/page.tsx" -Value $content

Write-Host "Authorization fixes applied successfully!" -ForegroundColor Green
