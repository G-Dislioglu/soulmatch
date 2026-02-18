Set-Location "c:\Users\guerc\OneDrive\Desktop\soulmatch\soulmatch"
$result = git add -A 2>&1
Write-Output "ADD: $result"
$result2 = git commit -m "PR-10 + URL hygiene: accuracy meta, CTA UX, probe hardening, canonical Render URL" 2>&1
Write-Output "COMMIT: $result2"
$result3 = git push 2>&1
Write-Output "PUSH: $result3"
$hash = git log --oneline -1 2>&1
Write-Output "HEAD: $hash"
