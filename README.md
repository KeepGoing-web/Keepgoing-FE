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
- 개인 PC 전용 로컬 값이 필요하면 gitignore 된 `.env.development.local` 을 추가해 덮어씁니다.
- 운영 배포는 저장소 파일 대신 **Vercel Project Settings → Environment Variables** 에서 설정합니다. 기본적으로 `VITE_API_BASE_URL` 과 `VITE_USE_MOCK_API=false` 를 넣으면 됩니다.
- `.env.production.example` 은 운영값 참고용 템플릿이며, 로컬에서 운영 빌드를 검증할 때만 복사해 `.env.production` 으로 사용합니다.
- 운영용 `.env.production` 파일은 저장소에 커밋하지 않습니다.

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