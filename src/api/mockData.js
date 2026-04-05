export const MOCK_CATEGORIES = []

export const MOCK_TAGS = [
  { id: 'tag_1', name: 'React', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'tag_2', name: 'Node', createdAt: '2024-01-02T00:00:00Z' },
  { id: 'tag_3', name: 'Vite', createdAt: '2024-01-03T00:00:00Z' },
  { id: 'tag_4', name: 'RAG', createdAt: '2024-01-04T00:00:00Z' },
  { id: 'tag_5', name: 'Prompt', createdAt: '2024-01-05T00:00:00Z' },
]

export const MOCK_NOTES = [
  {
    id: '1',
    title: 'React 18 핵심 개념 정리',
    content: `# React 18 핵심 개념 정리

## 왜 React 18인가?

React 18은 **Concurrent Rendering**을 공식 도입하며 UI 응답성을 근본적으로 개선했습니다. 기존의 동기적 렌더링 방식에서 벗어나, 렌더링 작업을 중단·재개·우선순위 조정할 수 있게 되었습니다.

## 주요 새 기능

### 1. Automatic Batching

React 17까지는 이벤트 핸들러 내부에서만 state 업데이트를 묶어 처리했지만, React 18부터는 \`setTimeout\`, \`Promise\`, 네이티브 이벤트 핸들러 안에서도 자동으로 배치 처리합니다.

\`\`\`jsx
// React 18 — 세 번의 setState가 한 번의 리렌더링으로 처리됨
setTimeout(() => {
  setCount(c => c + 1)
  setFlag(f => !f)
  setName('Alice')  // 리렌더링 1회
}, 1000)
\`\`\`

### 2. Transitions

렌더링에 **긴급도**(urgency)를 부여할 수 있습니다.

\`\`\`jsx
import { startTransition } from 'react'

startTransition(() => {
  // 긴급하지 않은 업데이트 — 사용자 입력에 밀릴 수 있음
  setSearchResults(heavyFilter(input))
})
\`\`\`

### 3. Suspense 개선

서버 사이드 렌더링(SSR)과 Suspense가 통합되어, 스트리밍 HTML과 선택적 hydration이 가능해졌습니다.

## Hook 치트시트

| Hook | 용도 |
|------|------|
| \`useState\` | 로컬 상태 관리 |
| \`useEffect\` | 사이드 이펙트 처리 |
| \`useCallback\` | 함수 메모이제이션 |
| \`useMemo\` | 값 메모이제이션 |
| \`useTransition\` | 전환 상태 추적 |
| \`useDeferredValue\` | 값 지연 처리 |

## 마이그레이션 체크리스트

- [ ] \`ReactDOM.render\` → \`createRoot\`로 교체
- [ ] \`ReactDOM.hydrate\` → \`hydrateRoot\`로 교체
- [ ] Strict Mode 이중 실행 동작 확인
- [ ] 서드파티 라이브러리 호환성 검토

> 💡 **팁:** \`createRoot\`로 전환하지 않으면 React 18의 Concurrent 기능이 활성화되지 않습니다. 마이그레이션은 단계적으로 진행할 수 있습니다.

---

[React 공식 업그레이드 가이드](https://react.dev/blog/2022/03/08/react-18-upgrade-guide) 참고`,
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
    visibility: 'PUBLIC',
    aiCollectable: true,
    categoryId: 'cat_1',
    tagIds: ['tag_1', 'tag_3'],
  },
  {
    id: '2',
    title: 'RAG 파이프라인 설계 — 실전 아키텍처',
    content: `# RAG 파이프라인 설계

## RAG란?

**Retrieval-Augmented Generation**(RAG)은 LLM의 응답을 외부 지식 베이스로 보강하는 패턴입니다. 환각(hallucination)을 줄이고 최신 정보를 반영할 수 있습니다.

## 전체 파이프라인

\`\`\`
사용자 질문
    ↓
[Query Embedding]   ← 임베딩 모델 (e.g. text-embedding-3-small)
    ↓
[Vector Search]     ← 벡터 DB (Pinecone / Weaviate / pgvector)
    ↓
[Context Assembly]  ← 상위 K개 청크 조합
    ↓
[LLM Generation]    ← GPT-4 / Claude / Gemini
    ↓
최종 응답
\`\`\`

## 핵심 설계 결정

### 청킹 전략

문서를 어떻게 나누느냐가 검색 품질을 좌우합니다.

| 전략 | 특징 | 적합한 경우 |
|------|------|-------------|
| 고정 크기 | 구현 간단 | 균일한 구조의 문서 |
| 문장 단위 | 의미 보존 | 대화형 콘텐츠 |
| 재귀적 분할 | 계층 구조 유지 | 기술 문서, 코드 |
| 의미 기반 | 최고 품질 | 복잡한 도메인 |

### 리랭킹(Re-ranking)

초기 벡터 검색 결과를 Cross-encoder로 재정렬하면 정밀도가 크게 향상됩니다.

\`\`\`python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
pairs = [(query, doc) for doc in candidates]
scores = reranker.predict(pairs)
ranked = sorted(zip(candidates, scores), key=lambda x: x[1], reverse=True)
\`\`\`

## 평가 지표

- **Faithfulness** — 응답이 컨텍스트에 근거하는가
- **Answer Relevancy** — 질문에 얼마나 적합한가
- **Context Precision** — 검색된 청크의 관련성

> 실제 운영에서는 RAGAS 같은 자동 평가 프레임워크를 CI/CD에 통합해 회귀를 방지하세요.

---

*이 노트는 AI 수집 허용 상태로, RAG 시스템이 참조할 수 있습니다.*`,
    createdAt: '2024-01-05T10:00:00Z',
    updatedAt: '2024-01-06T10:00:00Z',
    visibility: 'AI_COLLECTABLE',
    aiCollectable: true,
    categoryId: 'cat_3',
    tagIds: ['tag_4', 'tag_5'],
  },
  {
    id: '3',
    title: '백엔드 성능 최적화 — Node.js & DB 튜닝',
    content: `# 백엔드 성능 최적화

## 병목 찾기

최적화 전 반드시 **프로파일링**을 먼저 합니다. 직감보다 데이터를 믿으세요.

\`\`\`bash
# Node.js 내장 프로파일러
node --prof app.js
node --prof-process isolate-*.log > profile.txt
\`\`\`

## DB 인덱스 전략

### 느린 쿼리 탐지

\`\`\`sql
-- PostgreSQL slow query log
ALTER SYSTEM SET log_min_duration_statement = '200ms';
SELECT reload_conf();

-- 실행 계획 분석
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM posts WHERE user_id = 1 ORDER BY created_at DESC LIMIT 20;
\`\`\`

### 복합 인덱스 설계

\`\`\`sql
-- 자주 함께 사용되는 컬럼을 복합 인덱스로
CREATE INDEX CONCURRENTLY idx_posts_user_created
  ON posts (user_id, created_at DESC)
  WHERE deleted_at IS NULL;
\`\`\`

## N+1 문제 해결

~~개별 쿼리 반복~~ → **JOIN 또는 DataLoader** 패턴 사용

\`\`\`js
// 나쁜 예 — N+1
const posts = await Post.findAll()
for (const post of posts) {
  post.author = await User.findByPk(post.userId)  // N번 쿼리
}

// 좋은 예 — include
const posts = await Post.findAll({
  include: [{ model: User, as: 'author' }]
})
\`\`\`

## 성능 개선 체크리스트

- [x] 슬로우 쿼리 로그 설정
- [x] 핵심 컬럼 인덱스 추가
- [x] N+1 쿼리 제거
- [ ] Redis 캐싱 레이어 추가
- [ ] 커넥션 풀 크기 조정
- [ ] CDN 정적 자산 분리

> **주의:** 인덱스는 읽기를 빠르게 하지만 쓰기를 느리게 합니다. 쓰기가 많은 테이블에는 신중하게 적용하세요.`,
    createdAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-02-02T10:00:00Z',
    visibility: 'PRIVATE',
    aiCollectable: false,
    categoryId: 'cat_2',
    tagIds: ['tag_2'],
  },
]

export const MOCK_USERS = [
  { id: 'u1', username: 'hong', name: '홍길동', bio: '풀스택 개발자 | 배움을 멈추지 않는 사람', techStack: ['Java', 'Spring Boot', 'React', 'Docker'], noteCount: 2 },
  { id: 'u2', username: 'kim', name: '김철수', bio: '프론트엔드 엔지니어 @ 스타트업', techStack: ['React', 'TypeScript', 'Next.js', 'Tailwind'], noteCount: 8 },
  { id: 'u3', username: 'lee', name: '이영희', bio: 'AI/ML 리서처 · LLM과 RAG에 관심', techStack: ['Python', 'PyTorch', 'LangChain', 'FastAPI'], noteCount: 5 },
  { id: 'u4', username: 'park', name: '박지민', bio: '백엔드 개발자 · 분산 시스템', techStack: ['Go', 'Kubernetes', 'gRPC', 'PostgreSQL'], noteCount: 12 },
  { id: 'u5', username: 'choi', name: '최수현', bio: 'DevOps 엔지니어 · 자동화 덕후', techStack: ['Terraform', 'AWS', 'GitHub Actions', 'Docker'], noteCount: 3 },
  { id: 'u6', username: 'jung', name: '정민호', bio: '데이터 엔지니어 · 파이프라인 설계', techStack: ['Spark', 'Airflow', 'Kafka', 'Python'], noteCount: 7 },
]

const APPS_STORAGE_KEY = 'mock_applications'

export function findMockCategory(categoryId) {
  return MOCK_CATEGORIES.find((category) => category.id === categoryId) || null
}

export function findMockTags(tagIds = []) {
  return tagIds
    .map((tagId) => MOCK_TAGS.find((tag) => tag.id === tagId))
    .filter(Boolean)
}

export function enrichMockNote(post) {
  return {
    ...post,
    category: findMockCategory(post.categoryId || post.category?.id),
    tags: Array.isArray(post.tags) ? post.tags : findMockTags(post.tagIds),
  }
}

export function getPersistedApplications() {
  try {
    const raw = localStorage.getItem(APPS_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function persistApplications(applications) {
  localStorage.setItem(APPS_STORAGE_KEY, JSON.stringify(applications))
}

export function mockParseJobUrl(url) {
  try {
    const parsedUrl = new URL(url)
    const host = parsedUrl.hostname
    let source = 'OTHER'

    if (host.includes('saramin')) source = 'SARAMIN'
    if (host.includes('wanted')) source = 'WANTED'
    if (host.includes('jobkorea')) source = 'JOBKOREA'

    const path = parsedUrl.pathname.replace(/\/+/, ' ').trim()
    const guess = decodeURIComponent(path).split(' ').filter(Boolean)
    const titleGuess = guess.at(-1) || '채용 공고'
    const companyGuess = parsedUrl.searchParams.get('company') || host.split('.')[0]

    return {
      source,
      title: titleGuess.replace(/[-_]/g, ' '),
      company: (companyGuess || 'Company').replace(/[-_]/g, ' '),
    }
  } catch {
    return { source: 'OTHER', title: '채용 공고', company: 'Company' }
  }
}
