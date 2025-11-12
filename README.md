# Keepgoing-FE

블로그 & 포트폴리오 관리 서비스 프론트엔드

## 주요 기능

- 로그인/인증
- 블로그 포스트 작성 및 관리 (공개/비공개/AI 수집 가능)
- RAG 시스템을 통한 포스트 기반 질의
- 포스트 기반 이력서/자기소개서 생성

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
- `src/pages/BlogListPage.jsx` - 블로그 목록 API
- `src/pages/BlogDetailPage.jsx` - 블로그 상세 API
- `src/pages/BlogWritePage.jsx` - 블로그 작성/수정 API
- `src/pages/RAGQueryPage.jsx` - RAG 질의 API
- `src/pages/ResumePage.jsx` - 이력서/자기소개서 생성 API