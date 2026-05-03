# ============================================================================
# Mostrara — Full Production Deploy to Vercel
# ============================================================================
# This script sets ALL required environment variables and deploys.
# Run with: powershell -ExecutionPolicy Bypass -File .\deploy_vercel.ps1
# ============================================================================

# Function to load .env file
function Load-Env {
    param($path = ".env")
    $vars = @()
    if (Test-Path $path) {
        Get-Content $path | ForEach-Object {
            if ($_ -match '^\s*([\w.-]+)\s*=\s*(.*)?\s*$') {
                $name = $matches[1]
                $value = $matches[2].Trim()
                if ($value -match '^"(.*)"$') { $value = $matches[1] }
                $vars += ,@($name, $value)
            }
        }
    } else {
        Write-Error "Arquivo .env nao encontrado!"
        exit 1
    }
    return $vars
}

$vars = Load-Env


Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MOSTRARA - Deploy para Producao" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$total = $vars.Count
$current = 0

foreach ($pair in $vars) {
    $current++
    $name = $pair[0]
    $val = $pair[1]
    $pct = [math]::Round(($current / $total) * 100)
    Write-Host "[$pct%] Configurando $name..." -ForegroundColor Yellow

    # Set for production, preview, and development environments
    echo $val | npx vercel env add $name production --force --yes 2>$null
    echo $val | npx vercel env add $name preview --force --yes 2>$null
    echo $val | npx vercel env add $name development --force --yes 2>$null
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Todas as variaveis configuradas!" -ForegroundColor Green
Write-Host "  Iniciando deploy..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

npx vercel --prod --yes

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deploy concluido!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
