# Copy Paste-Ready for Testing

Write-Host "=== CRYPTOGRAPHIC VAULT - INTERACTIVE TEST ===" -ForegroundColor Cyan

# Test 1: Store data

Write-Host "`n[Test 1] Storing encrypted data..." -ForegroundColor Yellow
$r1 = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/store" `
-Method POST -ContentType "application/json" `
-Body '{"data":{"secret":"my-password-123","level":"confidential"}}'
Write-Host " ✓ Stored with ID: $($r1.id)" -ForegroundColor Green

# Test 2: Retrieve data

Write-Host "`n[Test 2] Retrieving and decrypting..." -ForegroundColor Yellow
$d1 = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/retrieve?id=$($r1.id)"
Write-Host "  ✓ Retrieved secret: $($d1.data.secret)" -ForegroundColor Green

# Test 3: Key rotation

Write-Host "`n[Test 3] Testing key rotation..." -ForegroundColor Yellow
$rot = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/rotate" -Method POST
Write-Host "  ✓ Rotated from v$($rot.keyInfo.previousVersion) to v$($rot.keyInfo.currentVersion)" -ForegroundColor Green

# Test 4: Old data still works

Write-Host "`n[Test 4] Old data still accessible..." -ForegroundColor Yellow
$check = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/retrieve?id=$($r1.id)"
Write-Host "  ✓ Still works: $($check.data.secret)" -ForegroundColor Green

# Test 5: Store new data with new key

Write-Host "`n[Test 5] Storing with new key..." -ForegroundColor Yellow
$r2 = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/store" `
-Method POST -ContentType "application/json" `
-Body '{"data":{"message":"encrypted-with-v2"}}'
Write-Host " ✓ Stored with key v$($r2.keyVersion)" -ForegroundColor Green

# Test 6: Second rotation (expires first data)

Write-Host "`n[Test 6] Second rotation (expires old data)..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "http://localhost:3000/api/vault/rotate" -Method POST | Out-Null
try {
Invoke-RestMethod -Uri "http://localhost:3000/api/vault/retrieve?id=$($r1.id)" | Out-Null
Write-Host " ❌ Should have failed!" -ForegroundColor Red
} catch {
Write-Host " ✓ Old data correctly rejected!" -ForegroundColor Green
}

# Test 7: Statistics

Write-Host "`n[Test 7] Vault statistics..." -ForegroundColor Yellow
$stats = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/stats"
Write-Host "  Records: $($stats.storeStats.totalRecords)" -ForegroundColor Cyan
Write-Host " Current version: $($stats.keyInfo.currentVersion)" -ForegroundColor Cyan

Write-Host "`n=== ALL TESTS COMPLETED! ===" -ForegroundColor Cyan
