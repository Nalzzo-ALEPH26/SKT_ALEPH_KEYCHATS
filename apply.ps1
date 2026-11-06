param(
  [string]$RepositoryRoot = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path $RepositoryRoot).Path
$bundle = Split-Path -Parent $MyInvocation.MyCommand.Path
$pane = Join-Path $root 'keychats/src/components/conversation-message-pane.tsx'
$item = Join-Path $root 'keychats/src/components/message-item.tsx'
$patch = Join-Path $bundle 'KEYCHATS_첨부미리보기_수정.patch'

function GitBlobSha([string]$file) {
  $normalized = [IO.File]::ReadAllText($file).Replace("`r`n", "`n")
  $content = [Text.Encoding]::UTF8.GetBytes($normalized)
  $header = [Text.Encoding]::ASCII.GetBytes("blob $($content.Length)`0")
  $bytes = New-Object byte[] ($header.Length + $content.Length)
  [Array]::Copy($header, 0, $bytes, 0, $header.Length)
  [Array]::Copy($content, 0, $bytes, $header.Length, $content.Length)
  $sha1 = [Security.Cryptography.SHA1]::Create()
  try {
    return ([BitConverter]::ToString($sha1.ComputeHash($bytes)) -replace '-', '').ToLowerInvariant()
  } finally {
    $sha1.Dispose()
  }
}

if (!(Test-Path $pane) -or !(Test-Path $item)) {
  throw 'KEYCHATS 저장소의 최상위 폴더에서 실행해야 합니다. -RepositoryRoot 인자를 확인하세요.'
}

$expectedPane = '116cd2b850d4136d9c2fff7e23df4f1c9ca9403c'
$expectedItem = '41fd49fff84970256bc658b03e8c386e9e439b70'
if ((GitBlobSha $pane) -ne $expectedPane -or (GitBlobSha $item) -ne $expectedItem) {
  throw '원본 파일이 제작 기준(main 5643cca)과 다릅니다. 다른 사람의 수정이 있을 수 있으므로 덮어쓰지 않았습니다.'
}

Push-Location $root
try {
  & git apply --check $patch
  if ($LASTEXITCODE -ne 0) { throw '패치 사전 검사 실패. 수정된 파일은 없습니다.' }
  & git apply $patch
  if ($LASTEXITCODE -ne 0) { throw '패치 적용 실패' }
} finally {
  Pop-Location
}

$payload = Join-Path $bundle 'payload'
$files = @(
  'keychats/src/components/message-item.tsx',
  'keychats/src/components/selected-attachments-preview.tsx',
  'keychats/tests/components/image-only-message.test.tsx',
  'keychats/tests/components/selected-attachments-preview.test.tsx'
)
foreach ($file in $files) {
  $destination = Join-Path $root $file
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
  Copy-Item -LiteralPath (Join-Path $payload $file) -Destination $destination -Force
}

Write-Host '적용 완료: 기존 2개 파일 수정 + 새 미리보기 컴포넌트 1개 + 테스트 2개.' -ForegroundColor Green
Write-Host '이제 keychats 폴더에서 npm test / npm run build를 확인하고 GitHub main에 업로드하세요.'
