$audioDir = Join-Path $PSScriptRoot "..\assets\audio"
$outputFile = Join-Path $audioDir "playlist.json"
$extensions = @(".mp3")

function Encode-AudioPath {
    param([string]$FileName)
    return "assets/audio/" + [System.Uri]::EscapeDataString($FileName)
}

if (-not (Test-Path $audioDir)) {
    Write-Error "找不到目录: $audioDir"
    exit 1
}

$tracks = Get-ChildItem -Path $audioDir -File |
    Where-Object { $extensions -contains $_.Extension.ToLower() } |
    Sort-Object Name |
    ForEach-Object {
        [ordered]@{
            title = $_.BaseName.Trim()
            src   = Encode-AudioPath -FileName $_.Name
        }
    }

$json = ($tracks | ConvertTo-Json -Depth 3)
if (-not $json) {
    $json = "[]"
}

Set-Content -Path $outputFile -Value $json -Encoding UTF8
Write-Host "已生成 $($tracks.Count) 首歌曲 -> $outputFile"