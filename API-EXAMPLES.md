# API Testing Examples

This file contains PowerShell commands to test the Cryptographic Data Vault API.

## Prerequisites

Make sure the server is running:

```powershell
npm start
```

---

## Example 1: Store and Retrieve Data

### Store encrypted data

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/store" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"data":{"username":"alice","email":"alice@example.com","role":"admin"}}'

Write-Host "Stored successfully!"
Write-Host "ID: $($response.id)"
Write-Host "Key Version: $($response.keyVersion)"
$id = $response.id
```

### Retrieve and decrypt data

```powershell
$retrieved = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/retrieve?id=$id"
Write-Host "`nRetrieved data:"
$retrieved.data | ConvertTo-Json
Write-Host "`nMetadata:"
$retrieved.metadata | ConvertTo-Json
```

---

## Example 2: Multiple Records

```powershell
# Store multiple records
$users = @(
    @{username="alice"; email="alice@example.com"; role="admin"},
    @{username="bob"; email="bob@example.com"; role="user"},
    @{username="charlie"; email="charlie@example.com"; role="moderator"}
)

$ids = @()
foreach ($user in $users) {
    $body = @{data=$user} | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/store" `
      -Method POST `
      -ContentType "application/json" `
      -Body $body
    $ids += $response.id
    Write-Host "Stored $($user.username) - ID: $($response.id)"
}

# Retrieve all records
Write-Host "`nRetrieving all records..."
foreach ($id in $ids) {
    $retrieved = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/retrieve?id=$id"
    Write-Host "$($retrieved.data.username): $($retrieved.data.email)"
}
```

---

## Example 3: View Vault Statistics

```powershell
$stats = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/stats"
Write-Host "Vault Statistics:"
$stats | ConvertTo-Json -Depth 5
```

---

## Example 4: Test Key Rotation

```powershell
# Store data before rotation
$beforeRotation = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/store" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"data":{"message":"Before rotation","timestamp":"'+(Get-Date -Format "o")+'"}}'

Write-Host "Stored before rotation:"
Write-Host "  ID: $($beforeRotation.id)"
Write-Host "  Key Version: $($beforeRotation.keyVersion)"

# Manually trigger rotation
Write-Host "`nTriggering key rotation..."
$rotationResult = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/rotate" -Method POST
Write-Host "  New current version: $($rotationResult.keyInfo.currentVersion)"
Write-Host "  Previous version: $($rotationResult.keyInfo.previousVersion)"

# Store data after rotation
$afterRotation = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/store" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"data":{"message":"After rotation","timestamp":"'+(Get-Date -Format "o")+'"}}'

Write-Host "`nStored after rotation:"
Write-Host "  ID: $($afterRotation.id)"
Write-Host "  Key Version: $($afterRotation.keyVersion)"

# Retrieve both (both should work - current and previous key)
Write-Host "`nRetrieving data encrypted with OLD key..."
$oldData = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/retrieve?id=$($beforeRotation.id)"
Write-Host "  ✓ Success! Message: $($oldData.data.message)"

Write-Host "`nRetrieving data encrypted with NEW key..."
$newData = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/retrieve?id=$($afterRotation.id)"
Write-Host "  ✓ Success! Message: $($newData.data.message)"

# Rotate again (now the first data should fail)
Write-Host "`nTriggering SECOND rotation..."
$rotationResult2 = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/rotate" -Method POST
Write-Host "  New current version: $($rotationResult2.keyInfo.currentVersion)"
Write-Host "  Previous version: $($rotationResult2.keyInfo.previousVersion)"

# Try to retrieve the first data (should fail)
Write-Host "`nAttempting to retrieve data from TWO rotations ago..."
try {
    $oldDataFail = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/retrieve?id=$($beforeRotation.id)"
    Write-Host "  ❌ UNEXPECTED: Should have failed!"
} catch {
    Write-Host "  ✓ Expected failure: Key version too old"
    Write-Host "  Error: $($_.Exception.Message)"
}
```

---

## Example 5: Complex Data Structures

```powershell
# Store complex nested data
$complexData = @{
    user = @{
        id = 12345
        profile = @{
            firstName = "Jane"
            lastName = "Doe"
            settings = @{
                theme = "dark"
                notifications = $true
                privacy = @{
                    shareEmail = $false
                    sharePhone = $false
                }
            }
        }
        metadata = @{
            created = (Get-Date -Format "o")
            lastLogin = (Get-Date -Format "o")
        }
    }
    sensitive = @{
        ssn = "123-45-6789"
        creditCard = @{
            number = "4532-1234-5678-9010"
            cvv = "123"
            expiry = "12/2025"
        }
    }
}

$body = @{data=$complexData} | ConvertTo-Json -Depth 10
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/store" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body

Write-Host "Stored complex data structure"
Write-Host "ID: $($response.id)"

# Retrieve and verify
$retrieved = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/retrieve?id=$($response.id)"
Write-Host "`nRetrieved complex data:"
$retrieved.data | ConvertTo-Json -Depth 10
```

---

## Example 6: Error Handling

### Test with invalid ID

```powershell
Write-Host "Testing with invalid ID..."
try {
    $result = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/retrieve?id=invalid-id-12345"
} catch {
    Write-Host "✓ Expected error: Record not found"
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "  Error message: $($errorDetails.error)"
}
```

### Test missing data field

```powershell
Write-Host "`nTesting with missing data field..."
try {
    $result = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/store" `
      -Method POST `
      -ContentType "application/json" `
      -Body '{}'
} catch {
    Write-Host "✓ Expected error: Missing required field"
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "  Error message: $($errorDetails.error)"
}
```

---

## Full Integration Test Script

Here's a complete script that tests all functionality:

```powershell
# Full Integration Test
Write-Host "=== Cryptographic Data Vault Integration Test ===" -ForegroundColor Cyan

# 1. Health check
Write-Host "`n[1/6] Health check..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "http://localhost:3000/health"
Write-Host "  ✓ Server is healthy" -ForegroundColor Green

# 2. Store data
Write-Host "`n[2/6] Storing encrypted data..." -ForegroundColor Yellow
$storeResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/store" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"data":{"secret":"confidential information","level":"top-secret"}}'
$testId = $storeResponse.id
Write-Host "  ✓ Data stored with ID: $testId" -ForegroundColor Green

# 3. Retrieve data
Write-Host "`n[3/6] Retrieving and decrypting data..." -ForegroundColor Yellow
$retrieveResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/retrieve?id=$testId"
Write-Host "  ✓ Data retrieved: $($retrieveResponse.data.secret)" -ForegroundColor Green

# 4. Get statistics
Write-Host "`n[4/6] Fetching vault statistics..." -ForegroundColor Yellow
$stats = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/stats"
Write-Host "  ✓ Current key version: $($stats.keyInfo.currentVersion)" -ForegroundColor Green
Write-Host "  ✓ Total records: $($stats.storeStats.totalRecords)" -ForegroundColor Green

# 5. Test key rotation
Write-Host "`n[5/6] Testing key rotation..." -ForegroundColor Yellow
$rotateResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/rotate" -Method POST
Write-Host "  ✓ Rotated to version: $($rotateResponse.keyInfo.currentVersion)" -ForegroundColor Green

# 6. Verify old data still accessible
Write-Host "`n[6/6] Verifying old data still accessible after rotation..." -ForegroundColor Yellow
$oldDataCheck = Invoke-RestMethod -Uri "http://localhost:3000/api/vault/retrieve?id=$testId"
Write-Host "  ✓ Old data still accessible: $($oldDataCheck.data.secret)" -ForegroundColor Green

Write-Host "`n=== All tests passed! ===" -ForegroundColor Cyan
```

Save this as `test-api.ps1` and run with:

```powershell
.\test-api.ps1
```

## Cleanup

To stop the server, press `Ctrl+C` in the terminal where it's running.

```

```
