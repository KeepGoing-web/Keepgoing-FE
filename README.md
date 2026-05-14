# Keepgoing-FE

노트 & 포트폴리오 관리 서비스 프론트엔드

## 주요 기능

- 로그인/인증
- 노트 노트 작성 및 관리 (공개/비공개/AI 수집 가능)
- RAG 시스템을 통한 노트 기반 질의
- 노트 기반 이력서/자기소개서 생성

## 기술 스택

- React 18
- JavaScript
- React Router
- Vite

## 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build
```

## 환경 변수

- 로컬 개발 기본값은 `.env.development` 에 둡니다. Vite 개발 서버는 여기서 `VITE_DEV_API_TARGET` 을 읽어 `/api`, `/oauth2`, `/login/oauth2` 프록시 대상으로 사용합니다.
- 기본 로컬 OAuth/API 프록시 대상은 `http://localhost:8080` 입니다.
- 개인 PC 전용 로컬 값이 필요하면 gitignore 된 `.env.development.local` 을 추가해 덮어씁니다.
- 운영 배포는 저장소 파일 대신 **Vercel Project Settings → Environment Variables** 에서 설정합니다. 기본적으로 `VITE_API_BASE_URL` 과 `VITE_USE_MOCK_API=false` 를 넣으면 됩니다.
- `.env.production.example` 은 운영값 참고용 템플릿이며, 로컬에서 운영 빌드를 검증할 때만 복사해 `.env.production` 으로 사용합니다.
- 운영용 `.env.production` 파일은 저장소에 커밋하지 않습니다.

## 운영 로그인 장애 점검

운영에서 로그인 화면이 보이지 않으면 먼저 실제 운영 URL이 Keepgoing 앱을 제공하는지 확인합니다.

```bash
# 기본값: https://keepgoingapp.vercel.app/login
npm run check:prod-login

# 다른 운영 도메인을 확인해야 하는 경우
PROD_BASE_URL=https://your-production-domain.example.com npm run check:prod-login
```

체크가 실패하면 코드 라우팅보다 배포/도메인 설정 문제일 가능성이 높습니다.

- `DEPLOYMENT_NOT_FOUND`: GitHub repository homepage 또는 공유 중인 운영 URL이 현재 Vercel 프로젝트/프로덕션 alias를 가리키지 않습니다. Vercel Project Settings → Domains에서 공개 도메인을 현재 프로젝트에 다시 연결하고, GitHub repository homepage도 같은 URL로 맞춥니다.
- `401` 또는 Vercel 로그인으로 이동: Vercel Deployment Protection이 운영 배포를 막고 있습니다. 공개 서비스라면 Production 도메인에는 Vercel Authentication/Password Protection을 해제하거나, 실제 사용자에게 노출할 별도 공개 Production alias를 지정합니다.
- 앱 셸은 뜨지만 Google OAuth가 열리지 않음: 운영 `VITE_API_BASE_URL` 이 실제 백엔드 `/api` origin으로 설정되어 있는지 확인합니다. 누락되면 OAuth URL이 프론트 도메인의 `/oauth2/authorization/google` 로 계산되어 SPA fallback에 잡힐 수 있습니다.

## 프로젝트 구조

```
src/
├── components/      # 공통 컴포넌트
│   ├── Layout.jsx   # 레이아웃 (헤더, 네비게이션)
│   └── ProtectedRoute.jsx  # 인증 보호 라우트
├── contexts/        # Context API
│   └── AuthContext.jsx  # 인증 컨텍스트
├── pages/          # 페이지 컴포넌트
│   ├── LoginPage.jsx
│   ├── BlogListPage.jsx
│   ├── BlogDetailPage.jsx
│   ├── BlogWritePage.jsx
│   ├── RAGQueryPage.jsx
│   └── ResumePage.jsx
└── App.jsx         # 메인 앱 컴포넌트
```

## API 스펙

프론트엔드 코드를 기반으로 작성된 API 스펙 문서는 [API_SPEC.md](./API_SPEC.md)를 참고하세요.

## API 연동

현재는 Mock 데이터를 사용하고 있으며, 백엔드 API 스펙이 준비되면 다음 파일들에서 API 호출을 구현하면 됩니다:

- `src/contexts/AuthContext.jsx` - 로그인 API
- `src/pages/BlogListPage.jsx` - 노트 목록 API
- `src/pages/BlogDetailPage.jsx` - 노트 상세 API
- `src/pages/BlogWritePage.jsx` - 노트 작성/수정 API
- `src/pages/RAGQueryPage.jsx` - RAG 질의 API
- `src/pages/ResumePage.jsx` - 이력서/자기소개서 생성 API
