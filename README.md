# Tasks — 노션 기반 모바일 PWA

노션 데이터베이스를 모바일 브라우저에서 빠르게 다루는 1인용 할일/일정 관리 PWA.
3개 뷰(리스트 / 타임라인 / 월간)와 패스코드 인증, iOS Scriptable 위젯 포함.

> 자세한 기획·데이터 모델은 [`docs/PRD.md`](./docs/PRD.md) 참고.

## 기술 스택

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript 5 strict**
- **Tailwind CSS v4**
- **Notion API** (`@notionhq/client`)
- **iron-session** (passcode 인증)
- **Zustand** (클라이언트 상태)
- **Framer Motion** (스와이프 인터랙션)

## 사전 준비

### 1. 노션 인테그레이션 만들기

1. <https://www.notion.so/my-integrations> 에서 **New integration** 생성
2. Internal type, Read/Update/Insert content 권한 체크
3. **Internal Integration Secret** 토큰 복사 (`ntn_...` 또는 `secret_...`)

### 2. 노션 TASK DB 만들기

다음 속성을 가진 데이터베이스를 만들거나 기존 DB에 매핑한다.

| 속성명 | 노션 타입 | 옵션값 |
|---|---|---|
| `태스크` | title | — |
| `태스크 기간` | date (with time) | — |
| `상태` | status | `예정`, `진행중`, `보류`, `완료`, `취소` |
| `유형` | select | `일정`, `할일` |
| `프로젝트명` | multi_select | (자유) |
| `설명` | text | — |

> 속성명을 바꾸고 싶으면 [`src/lib/notion-mappers.ts`](./src/lib/notion-mappers.ts)에서 키만 수정.

### 3. DB에 인테그레이션 연결

DB 페이지 → 우상단 ⋯ → **Connections** → 1번에서 만든 인테그레이션 추가.

DB ID는 페이지 URL에서 추출: `https://www.notion.so/<workspace>/<DB_ID>?v=...` — `?v=` 앞 32자.

## 로컬 실행

```bash
pnpm install
cp .env.example .env.local
# .env.local 열어서 값 채우기

pnpm dev
# → http://localhost:3000
```

`.env.local` 필수 값:

```
NOTION_TOKEN=ntn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_TASKS_DB_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SESSION_SECRET=<openssl rand -hex 32 결과 (32자 이상)>
PASSCODE=<6자리 영숫자>
```

`PASSCODE`가 비어 있으면 인증이 비활성화된다. 공유 배포 시에는 반드시 설정.

## Vercel 배포

1. 이 저장소를 GitHub에 올리고 [Vercel](https://vercel.com/new)에 연결
2. **Environment Variables**에 위 4개(`NOTION_TOKEN`, `NOTION_TASKS_DB_ID`, `SESSION_SECRET`, `PASSCODE`) 등록
3. Deploy

## iOS Scriptable 위젯

[`widgets/scriptable-tasks.js`](./widgets/scriptable-tasks.js) — iPhone 잠금화면/홈화면에서 다음 7일 할일/일정 표시.

1. App Store에서 **Scriptable** 설치
2. 새 스크립트 만들고 파일 내용 붙여넣기
3. 상단의 `NOTION_TOKEN` / `DB_ID` / `APP_URL` 3개 값 채우기
4. 홈/잠금화면에 위젯 추가 → 스크립트 선택

## 디렉터리

```
src/
  app/              Next.js App Router (page, api, login, manifest)
  components/       카드, 모달, 타임라인 블록
  lib/              notion-client, mappers, session, lanes, utils
  store/            zustand 스토어
  types/            Task / TaskInput
widgets/            iOS Scriptable 스크립트
docs/PRD.md         기획·데이터 모델 문서
```

## 라이선스

MIT
