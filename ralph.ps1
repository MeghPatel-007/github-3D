[CmdletBinding()]
param(
    [ValidateRange(1, 100)]
    [int]$MaxIterations = 8,
    [switch]$Once,
    [string]$Model = 'openai/gpt-5.6-luna'
)

$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$promptPath = Join-Path $projectRoot '.agent/PROMPT.md'
$tasksPath = Join-Path $projectRoot '.agent/tasks.json'
$historyDirectory = Join-Path $projectRoot '.agent/history'

if (-not (Test-Path -LiteralPath $promptPath -PathType Leaf)) {
    throw "Required Ralph prompt not found: $promptPath"
}
if (-not (Test-Path -LiteralPath $tasksPath -PathType Leaf)) {
    throw "Required task ledger not found: $tasksPath"
}

$gitCommand = Get-Command git -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $gitCommand) {
    throw 'Git for Windows is required and must be available on PATH.'
}
& $gitCommand.Source -C $projectRoot rev-parse --show-toplevel *> $null
if ($LASTEXITCODE -ne 0) {
    throw 'ralph.ps1 must be run from inside a Git repository.'
}

$openCodeCommand = Get-Command opencode -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $openCodeCommand) {
    throw 'OpenCode CLI is required on Windows and must be available on PATH.'
}

New-Item -ItemType Directory -Path $historyDirectory -Force | Out-Null
$sessionId = Get-Date -Format 'yyyyMMdd-HHmmss'
$iterationCount = if ($Once) { 1 } else { $MaxIterations }
$projectPrompt = "PROJECT_ROOT=$projectRoot`r`n`r`n" + [IO.File]::ReadAllText($promptPath)
Set-Location -LiteralPath $projectRoot

for ($iteration = 1; $iteration -le $iterationCount; $iteration++) {
    $historyPath = Join-Path $historyDirectory "ITERATION-$sessionId-$iteration.txt"
    $startedAt = Get-Date
    Write-Host "Ralph local on Windows — iteration $iteration of $iterationCount" -ForegroundColor Cyan
    Write-Host "Project: $projectRoot"

    # Use OpenCode's human-readable output. JSON mode prints raw event objects,
    # which makes the live progress difficult to follow in the terminal.
    $agentArguments = @('run', '--model', $Model, $projectPrompt)
    & $openCodeCommand.Source @agentArguments 2>&1 | Tee-Object -FilePath $historyPath
    $agentExitCode = $LASTEXITCODE
    if ($agentExitCode -ne 0) {
        throw "OpenCode exited with code $agentExitCode. Output saved to $historyPath"
    }

    $output = [IO.File]::ReadAllText($historyPath)
    $duration = [math]::Round(((Get-Date) - $startedAt).TotalMinutes, 1)
    Write-Host "Iteration $iteration finished in $duration minute(s). Log: $historyPath"

    if ($output -match '<promise>COMPLETE</promise>') {
        Write-Host 'Ralph completed the requested task set.' -ForegroundColor Green
        exit 0
    }
    if ($output -match '(?s)<promise>BLOCKED:(.*?)</promise>') {
        $blockedReason = $Matches[1].Trim()
        Write-Host ('Ralph is blocked: {0}' -f $blockedReason) -ForegroundColor Yellow
        exit 2
    }
    if ($output -match '(?s)<promise>DECIDE:(.*?)</promise>') {
        $decisionQuestion = $Matches[1].Trim()
        Write-Host ('Ralph needs a decision: {0}' -f $decisionQuestion) -ForegroundColor Yellow
        exit 3
    }

    if ($iteration -lt $iterationCount) {
        Start-Sleep -Seconds 2
    }
}

Write-Host ('Ralph reached the {0} iteration limit. Review .agent/logs/LOG.md and the history files.' -f $iterationCount) -ForegroundColor Yellow
exit 1
