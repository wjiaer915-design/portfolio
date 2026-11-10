$ErrorActionPreference = "Stop"

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$temporaryRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$deployDirectory = [System.IO.Path]::GetFullPath((Join-Path $temporaryRoot "jackson-portfolio-pages-deploy"))
$expectedDirectory = $temporaryRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar + "jackson-portfolio-pages-deploy"

if ($deployDirectory -ne $expectedDirectory) {
    throw "Refusing to prepare an unexpected deployment directory: $deployDirectory"
}

if (Test-Path -LiteralPath $deployDirectory) {
    Remove-Item -LiteralPath $deployDirectory -Recurse -Force
}

New-Item -ItemType Directory -Path $deployDirectory | Out-Null

Get-ChildItem -LiteralPath $projectRoot -File -Filter "*.html" | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $deployDirectory
}

Copy-Item -LiteralPath (Join-Path $projectRoot "_headers") -Destination $deployDirectory
Copy-Item -LiteralPath (Join-Path $projectRoot "favicon.ico") -Destination $deployDirectory
Copy-Item -LiteralPath (Join-Path $projectRoot "assets") -Destination $deployDirectory -Recurse

$wrangler = Join-Path $projectRoot "node_modules\.bin\wrangler.cmd"
if (-not (Test-Path -LiteralPath $wrangler)) {
    throw "Wrangler is not installed. Run npm install first."
}

$commitHash = (& git -C $projectRoot rev-parse HEAD).Trim()
$commitMessage = (& git -C $projectRoot log -1 --pretty=%s).Trim()

try {
    Push-Location $deployDirectory
    try {
        & $wrangler pages deploy . `
            --project-name portfolio `
            --branch main `
            --commit-hash $commitHash `
            --commit-message $commitMessage

        $deployExitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }

    if ($deployExitCode -ne 0) {
        throw "Cloudflare Pages deployment failed with exit code $deployExitCode."
    }
}
finally {
    if (Test-Path -LiteralPath $deployDirectory) {
        Remove-Item -LiteralPath $deployDirectory -Recurse -Force
    }
}
