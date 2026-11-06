# KEYCHATS 첨부파일 미리보기·취소 + 빈 말풍선 제거

기준: `Nalzzo-ALEPH26/SKT_ALEPH_KEYCHATS` / main / `5643ccabb61c330178bc23703d8d4d1e35368004`.

## 변경 범위

- `keychats/src/components/conversation-message-pane.tsx` (기존 파일 수정: 새 미리보기 컴포넌트 연결)
- `keychats/src/components/message-item.tsx` (기존 파일 수정: 텍스트가 없는 이미지·파일 전용 메시지의 빈 말풍선 제거)
- `keychats/src/components/selected-attachments-preview.tsx` (신규: 이미지 썸네일·큰 화면 미리보기·파일별 취소·모두 취소)
- `keychats/tests/components/image-only-message.test.tsx` (신규 테스트)
- `keychats/tests/components/selected-attachments-preview.test.tsx` (신규 테스트)

이번 ZIP에는 **원본 전체 615줄짜리 conversation-message-pane.tsx를 포함하지 않고** 해당 파일에 적용할 정확한 변경 패치를 동봉했습니다. 기존 구성원들의 변경을 잘못 덮어쓰는 위험을 줄이기 위함입니다. 나머지 파일은 바로 적용할 수 있는 완전한 파일입니다.

## Windows에서 적용 (권장)

1. ZIP 압축을 해제합니다.
2. KEYCHATS 저장소를 로컬에 준비합니다. 이미 로컬 저장소가 있으면 최신 `main`을 받아옵니다.
3. PowerShell에서 다음 명령을 실행합니다 (경로는 본인 PC에 맞게 변경):

```powershell
cd C:\경로\SKT_ALEPH_KEYCHATS
& "C:\다운로드\KEYCHATS_첨부미리보기_취소_빈말풍선수정\apply.ps1" -RepositoryRoot (Get-Location).Path
cd keychats
npm test
npm run build
```

PowerShell 실행 정책이 막으면 다음과 같이 실행할 수도 있습니다:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\다운로드\KEYCHATS_첨부미리보기_취소_빈말풍선수정\apply.ps1" -RepositoryRoot "C:\경로\SKT_ALEPH_KEYCHATS"
```

**원본 두 파일이 기준 버전과 달라졌으면 적용 스크립트는 변경하지 않고 중단합니다.** GitHub 공동 작업자의 변경을 보호하기 위한 기능입니다.

## 수동 적용

Git 저장소 루트에서 `git apply --check "패치파일경로"` 이후 `git apply "패치파일경로"`로 `conversation-message-pane.tsx`를 수정하고, `payload/keychats/`의 나머지 파일 4개를 실제 `keychats/` 경로에 복사하면 됩니다. 패치를 적용하기 전에 `message-item.tsx` 최신 변경 여부를 꼭 확인하세요.

## 유의사항

- Supabase SQL / RLS / API 변경 없음.
- 이미지 첨부만 하는 경우 비어 있는 텍스트 말풍선을 표시하지 않음. 텍스트+이미지, 삭제된 메시지는 기존 동작 유지.
- 이미지 미리보기 주소는 `URL.createObjectURL`로 로컬에만 생성하며 제거·언마운트 시 `revokeObjectURL`로 해제.
- 10MB 제한, 첨부 타입 검증, 파일 업로드 시점, 메시지 수정·삭제·실시간 동기화 로직 변경 없음.
- 전체 KEYCHATS 테스트 및 CI는 현재 환경에서 실제 실행하지 못했으므로, 적용 후 반드시 확인하세요.
