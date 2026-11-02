param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$MavenArgs
)

$ErrorActionPreference = 'Stop'

$mavenVersion = "3.9.9"
$m2Dir = "$env:USERPROFILE\.m2"
$mavenDir = "$m2Dir\apache-maven-$mavenVersion"
$mvnCmd = "$mavenDir\bin\mvn.cmd"

if (-not (Test-Path -Path $mvnCmd)) {
    Write-Host "Maven wrapper: Maven $mavenVersion not found locally. Downloading..." -ForegroundColor Cyan
    $zipUrl = "https://archive.apache.org/dist/maven/maven-3/$mavenVersion/binaries/apache-maven-$mavenVersion-bin.zip"
    $zipPath = "$env:TEMP\apache-maven-$mavenVersion-bin.zip"
    
    if (-not (Test-Path -Path $m2Dir)) {
        New-Item -ItemType Directory -Path $m2Dir -Force | Out-Null
    }
    
    Write-Host "Downloading $zipUrl..." -ForegroundColor Gray
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
    
    Write-Host "Extracting to $m2Dir..." -ForegroundColor Cyan
    Expand-Archive -Path $zipPath -DestinationPath $m2Dir -Force
    Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue
    Write-Host "Maven ready at $mavenDir." -ForegroundColor Green
}

if (-not $env:JAVA_HOME) {
    if (Test-Path "C:\Program Files\Java\jdk-21") {
        $env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
    }
}

& "$mvnCmd" @MavenArgs

