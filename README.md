# KEYCHATS 💬

> 함께 대화하고, 의견을 나누고, 만든 것을 공유하는 팀 커뮤니케이션 공간

**KEYCHATS**는 **SKT ALEPH 과정에서 만든 사이드 프로젝트**입니다. 
팀원들이 웹 브라우저에서 채널 채팅과 개인 메시지를 주고받고, 공지사항과 커뮤니티를 통해 소통할 수 있도록 개발했습니다.

## 🔗 바로가기

- **서비스:** [KEYCHATS](https://keychats.vercel.app/chats)
- **GitHub:** [SKT_ALEPH_KEYCHATS](https://github.com/Nalzzo-ALEPH26/SKT_ALEPH_KEYCHATS)

팀 내부 사용을 위한 서비스로, 이용하려면 계정과 접근 승인이 필요합니다.

## ✨ 주요 기능

| 구분 | 내용 |
|---|---|
| 채널 채팅 | 주제별 채널에서 실시간 대화, 채널 생성 및 코드로 입장 |
| 개인 메시지 | 팀원 간 1:1 DM과 읽음 상태 확인 |
| 메시지 기능 | 답장, 반응, 고정, 파일 첨부 및 URL 미리보기 |
| 커뮤니티 | 공지사항과 게시판, 댓글 및 게시글·댓글 고정 |
| 알림 | 채널·DM별 브라우저 알림 설정과 읽지 않은 메시지 표시 |
| 사용자 설정 | 프로필 이미지와 화면 테마 설정 |
| 관리자 기능 | 가입 요청과 사용자 관리 |

## 🛠 기술 구성

| 영역 | 기술 |
|---|---|
| 웹 프레임워크 | Next.js App Router |
| 화면 개발 | React, TypeScript, Tailwind CSS |
| 데이터베이스 | Supabase PostgreSQL |
| 인증·실시간·파일 저장 | Supabase Auth, Realtime, Storage |
| 배포 | Vercel |
| 테스트 | Vitest, Playwright, Supabase DB 테스트 |
| 코드 관리·검증 | GitHub, GitHub Actions |

## 📁 저장소 구성

| 경로 | 역할 |
|---|---|
| `keychats/` | 애플리케이션 루트 |
| `keychats/src/app/` | 페이지, 서버 액션 및 API |
| `keychats/src/components/` | 채팅·커뮤니티 등 화면 컴포넌트 |
| `keychats/src/lib/` | 인증, Supabase 연동 및 공통 로직 |
| `keychats/public/` | 정적 이미지와 아이콘 |
| `keychats/supabase/migrations/` | 데이터베이스 스키마 및 권한 변경 이력 |
| `keychats/supabase/tests/` | 데이터베이스 테스트 |
| `keychats/tests/` | 단위·컴포넌트·브라우저 테스트 |
| `keychats/docs/` | 설정 및 운영 안내 |
| `docs/` | 설계 및 구현 계획 |
| `.github/workflows/` | 자동 검증 워크플로 |
| `AGENTS.md` | 저장소 작업 규칙 |

## 🚀 로컬 실행

**Node.js 22**와 npm, 연결할 Supabase 프로젝트가 필요합니다.

### 1. 코드 내려받기 및 의존성 설치

```bash
git clone https://github.com/Nalzzo-ALEPH26/SKT_ALEPH_KEYCHATS.git
cd SKT_ALEPH_KEYCHATS/keychats
npm ci
```

### 2. 환경 변수 설정

`keychats/.env.example`을 참고해 같은 폴더에 `.env.local`을 만들고, 사용할 Supabase 환경 값을 입력합니다.

| 변수 | 용도 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 브라우저용 공개 키 |
| `SUPABASE_SECRET_KEY` | 서버 전용 Supabase 키 |
| `KEYCHATS_ADMIN_PASSWORD` | 관리자 초기 설정 스크립트 실행 시 사용할 비밀번호 |
| `KEYCHATS_ADMIN_DISPLAY_NAME` | 관리자 초기 설정 시 사용할 표시 이름 |

실제 환경 파일과 비밀 키는 GitHub에 올리지 않습니다. 서버 전용 키에는 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다.

### 3. 데이터베이스 준비

별도 개발용 Supabase 환경에 `keychats/supabase/migrations/`의 마이그레이션을 시간순으로 적용합니다. 기존 운영 환경에서는 이미 적용된 SQL을 반복 실행하지 않고 **새 마이그레이션만** 적용합니다.

운영 데이터 초기화나 기존 테이블 삭제 없이, 팀의 기존 Supabase 운영 절차를 따릅니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000/chats](http://localhost:3000/chats)에 접속합니다.

## ✅ 테스트

`keychats/` 폴더에서 실행합니다.

```bash
# 단위·컴포넌트 테스트
npm test

# 프로덕션 빌드
npm run build

# 브라우저 E2E 테스트
npm run test:e2e

# 로컬 Supabase DB 테스트
supabase test db
```

브라우저·DB 테스트에는 로컬 Supabase, 테스트 환경 변수 및 Chromium 등 해당 테스트가 요구하는 실행 환경이 필요합니다.

## 📦 배포 및 업데이트

기존 Vercel 프로젝트에서 이 저장소의 `main` 브랜치와 **Root Directory `keychats`**를 연결해 사용합니다.

1. DB 변경이 있다면 새 마이그레이션을 먼저 적용합니다.
2. 코드 변경 사항을 GitHub `main`에 반영합니다.
3. GitHub Actions의 테스트 결과와 Vercel의 배포 상태를 확인합니다.
4. 배포가 `Ready`가 되면 실제 사이트에서 기능을 확인합니다.

**GitHub 코드 업로드만으로 운영 Supabase의 SQL이 자동 실행되지는 않습니다.**

## 🤝 함께 개발하기

- 작업 전 최신 `main`과 [AGENTS.md](AGENTS.md)를 확인합니다.
- 기존 Vercel·Supabase 연결과 다른 팀원의 변경 사항을 유지합니다.
- DB 변경은 기존 마이그레이션을 수정하지 않고 새 파일로 추가합니다.
- 로그인 및 DB 접근 권한을 확인하고, 변경한 기능에 맞는 테스트를 실행합니다.

---

**SKT ALEPH 사이드 프로젝트 · KEYCHATS**
