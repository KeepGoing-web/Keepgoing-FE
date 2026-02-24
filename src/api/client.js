const BASE_URL = "http://localhost:8080/api";
const USE_MOCK = true;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, String(value));
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

// API 응답에서 data 추출 (백엔드 ApiResponse 래퍼 처리)
async function handleResponse(res) {
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const error = new Error(errorBody.error?.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.code = errorBody.error?.code;
    throw error;
  }
  const json = await res.json();
  // ApiResponse 래퍼에서 data 추출
  return json.data !== undefined ? json.data : json;
}

// ----- Auth API -----
export async function login(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

export async function signup(email, password, name) {
  const res = await fetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  return handleResponse(res);
}

export async function fetchBlogs(params = {}) {
  if (USE_MOCK) {
    const {
      page = 1,
      size = 10,
      q = "",
      categoryId,
      tagId,
      sort = "createdAt",
      order = "desc",
      visibility,
      aiCollectable,
      dateFrom,
      dateTo,
    } = params;
    const categories = MOCK_CATEGORIES;
    const tags = MOCK_TAGS;
    let items = MOCK_POSTS.map((p) => ({
      ...p,
      category: categories.find((c) => c.id === p.categoryId) || null,
      tags: p.tagIds
        .map((tid) => tags.find((t) => t.id === tid))
        .filter(Boolean),
    }));
    if (q) {
      const qLower = q.toLowerCase();
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(qLower) ||
          p.content.toLowerCase().includes(qLower),
      );
    }
    if (categoryId) {
      items = items.filter((p) => p.category && p.category.id === categoryId);
    }
    if (tagId) {
      const idSet = new Set(String(tagId).split(",").filter(Boolean));
      items = items.filter((p) => p.tags.some((t) => idSet.has(t.id)));
    }
    if (visibility) {
      items = items.filter((p) => p.visibility === visibility);
    }
    if (typeof aiCollectable !== "undefined") {
      const flag = aiCollectable === "true" || aiCollectable === true;
      items = items.filter((p) => !!p.aiCollectable === flag);
    }
    if (dateFrom) {
      const fromTs = new Date(dateFrom).getTime();
      items = items.filter((p) => new Date(p.createdAt).getTime() >= fromTs);
    }
    if (dateTo) {
      const toTs = new Date(dateTo).getTime();
      items = items.filter((p) => new Date(p.createdAt).getTime() <= toTs);
    }
    items.sort((a, b) => {
      let vA = a[sort];
      let vB = b[sort];
      if (sort === "createdAt" || sort === "updatedAt") {
        vA = new Date(vA).getTime();
        vB = new Date(vB).getTime();
      } else if (sort === "title") {
        vA = String(vA).toLowerCase();
        vB = String(vB).toLowerCase();
      }
      const comp = vA < vB ? -1 : vA > vB ? 1 : 0;
      return order === "asc" ? comp : -comp;
    });
    const start = (page - 1) * size;
    const paged = items.slice(start, start + Number(size));
    const total = items.length;
    const totalPages = Math.ceil(total / size) || 1;
    await delay(300);
    return {
      posts: paged,
      total,
      page,
      size,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
  // 백엔드 API는 /v1/posts/me (내 포스트 목록)
  const { page = 1, size = 10, sort = "createdAt", order = "desc" } = params;
  const query = buildQuery({
    page: page - 1, // 백엔드는 0-indexed
    size,
    sort: `${sort},${order}`,
  });
  const res = await fetch(`${BASE_URL}/posts/me${query}`, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse(res);
  // 백엔드 PagedResponse를 프론트엔드 형식으로 변환
  // postId -> id 변환
  const posts = (data.contents || []).map((post) => ({
    ...post,
    id: post.postId,
  }));
  return {
    posts,
    total: data.totalElements || 0,
    page: (data.page || 0) + 1, // 1-indexed로 변환
    size: data.size || size,
    totalPages: data.totalPages || 1,
    hasNext: !data.last,
    hasPrev: (data.page || 0) > 0,
  };
}

export async function fetchBlog(id) {
  if (USE_MOCK) {
    const base = MOCK_POSTS.find((p) => p.id === String(id));
    await delay(200);
    if (!base) {
      throw new Error("NOT_FOUND");
    }
    return {
      ...base,
      category: MOCK_CATEGORIES.find((c) => c.id === base.categoryId) || null,
      tags: base.tagIds
        .map((tid) => MOCK_TAGS.find((t) => t.id === tid))
        .filter(Boolean),
    };
  }
  const res = await fetch(`${BASE_URL}/posts/${id}`, {
    headers: getAuthHeaders(),
  });
  if (res.status === 404) {
    const error = new Error("NOT_FOUND");
    error.status = 404;
    throw error;
  }
  const data = await handleResponse(res);
  // postId -> id 변환
  return { ...data, id: data.postId };
}

export async function createBlog(payload) {
  if (USE_MOCK) {
    const id = String(MOCK_POSTS.length + 1);
    const now = new Date().toISOString();
    const item = {
      id,
      title: payload.title,
      content: payload.content,
      visibility: payload.visibility || "PUBLIC",
      aiCollectable: !!payload.aiCollectable,
      createdAt: now,
      updatedAt: now,
      categoryId: payload.categoryId || null,
      tagIds: Array.isArray(payload.tagIds) ? payload.tagIds : [],
    };
    MOCK_POSTS.unshift(item);
    await delay(200);
    return {
      ...item,
      category: MOCK_CATEGORIES.find((c) => c.id === item.categoryId) || null,
      tags: item.tagIds
        .map((tid) => MOCK_TAGS.find((t) => t.id === tid))
        .filter(Boolean),
    };
  }
  // 백엔드 PostCreateRequest 형식에 맞게 변환
  const backendPayload = {
    title: payload.title,
    content: payload.content,
    visibility: payload.visibility || "PRIVATE",
    aiCollectable: payload.aiCollectable ?? true,
  };
  const res = await fetch(`${BASE_URL}/posts`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(backendPayload),
  });
  const data = await handleResponse(res);
  // postId -> id 변환
  return { ...data, id: data.postId };
}

export async function updateBlog(id, payload) {
  if (USE_MOCK) {
    const idx = MOCK_POSTS.findIndex((p) => p.id === String(id));
    if (idx === -1) {
      throw new Error("NOT_FOUND");
    }
    const now = new Date().toISOString();
    const prev = MOCK_POSTS[idx];
    const next = {
      ...prev,
      title: payload.title ?? prev.title,
      content: payload.content ?? prev.content,
      visibility: payload.visibility ?? prev.visibility,
      aiCollectable:
        typeof payload.aiCollectable === "boolean"
          ? payload.aiCollectable
          : prev.aiCollectable,
      categoryId:
        payload.categoryId !== undefined ? payload.categoryId : prev.categoryId,
      tagIds: Array.isArray(payload.tagIds) ? payload.tagIds : prev.tagIds,
      updatedAt: now,
    };
    MOCK_POSTS[idx] = next;
    await delay(200);
    return {
      ...next,
      category: MOCK_CATEGORIES.find((c) => c.id === next.categoryId) || null,
      tags: next.tagIds
        .map((tid) => MOCK_TAGS.find((t) => t.id === tid))
        .filter(Boolean),
    };
  }
  // 백엔드 PostUpdateRequest 형식에 맞게 변환
  const backendPayload = {
    title: payload.title,
    content: payload.content,
    visibility: payload.visibility || "PRIVATE",
    aiCollectable: payload.aiCollectable ?? true,
  };
  const res = await fetch(`${BASE_URL}/posts/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(backendPayload),
  });
  if (res.status === 404) {
    const error = new Error("NOT_FOUND");
    error.status = 404;
    throw error;
  }
  const data = await handleResponse(res);
  // postId -> id 변환
  return { ...data, id: data.postId };
}

export async function deleteBlog(id) {
  if (USE_MOCK) {
    const idx = MOCK_POSTS.findIndex((p) => p.id === String(id));
    if (idx === -1) {
      throw new Error("NOT_FOUND");
    }
    MOCK_POSTS.splice(idx, 1);
    await delay(150);
    return true;
  }
  const res = await fetch(`${BASE_URL}/posts/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (res.status === 404) {
    const error = new Error("NOT_FOUND");
    error.status = 404;
    throw error;
  }
  if (!res.ok) {
    throw new Error("블로그 삭제 실패");
  }
  return true;
}

export async function fetchCategories(params = {}) {
  if (USE_MOCK) {
    const { q = "" } = params;
    let items = MOCK_CATEGORIES;
    if (q) {
      const ql = q.toLowerCase();
      items = items.filter((c) => c.name.toLowerCase().includes(ql));
    }
    await delay(120);
    return { categories: items, total: items.length };
  }
  const query = buildQuery(params);
  const res = await fetch(`${BASE_URL}/categories${query}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error("카테고리 목록 조회 실패");
  }
  return res.json();
}

export async function createCategory(name, parentId = null) {
  if (USE_MOCK) {
    const newCat = {
      id: `cat_${Date.now()}`,
      name,
      parentId,
      createdAt: new Date().toISOString(),
    };
    MOCK_CATEGORIES.push(newCat);
    await delay(100);
    return newCat;
  }
  const res = await fetch(`${BASE_URL}/categories`, {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ name, parentId }),
  });
  if (!res.ok) {
    throw new Error("카테고리 생성 실패");
  }
  return res.json();
}

export async function fetchTags(params = {}) {
  if (USE_MOCK) {
    const { q = "" } = params;
    let items = MOCK_TAGS;
    if (q) {
      const ql = q.toLowerCase();
      items = items.filter((t) => t.name.toLowerCase().includes(ql));
    }
    await delay(120);
    return { tags: items, total: items.length };
  }
  const query = buildQuery(params);
  const res = await fetch(`${BASE_URL}/tags${query}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error("태그 목록 조회 실패");
  }
  return res.json();
}

export async function createTag(name) {
  if (USE_MOCK) {
    const newTag = { id: `tag_${Date.now()}`, name };
    MOCK_TAGS.push(newTag);
    await delay(150);
    return newTag;
  }
  const res = await fetch(`${BASE_URL}/tags`, {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("태그 생성 실패");
  return res.json();
}

// ----- Applications (Job) -----
export async function fetchApplications() {
  if (USE_MOCK) {
    const items = getPersistedApplications();
    await delay(120);
    return { applications: items };
  }
  const res = await fetch(`${BASE_URL}/applications`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("지원 목록 조회 실패");
  return res.json();
}

export async function createApplicationFromUrl(url, notes = "") {
  if (USE_MOCK) {
    const id = `app_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const parsed = mockParseJobUrl(url);
    const next = {
      id,
      url,
      company: parsed.company,
      title: parsed.title,
      source: parsed.source,
      status: "APPLIED", // APPLIED, INTERVIEW, OFFER, REJECTED, WITHDRAWN
      notes,
      createdAt: now,
      updatedAt: now,
    };
    const arr = getPersistedApplications();
    arr.unshift(next);
    persistApplications(arr);
    await delay(200);
    return next;
  }
  const res = await fetch(`${BASE_URL}/applications`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ url, notes }),
  });
  if (!res.ok) throw new Error("지원 생성 실패");
  return res.json();
}

export async function updateApplication(id, updates) {
  if (USE_MOCK) {
    const arr = getPersistedApplications();
    const idx = arr.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error("NOT_FOUND");
    const now = new Date().toISOString();
    const next = { ...arr[idx], ...updates, updatedAt: now };
    arr[idx] = next;
    persistApplications(arr);
    await delay(150);
    return next;
  }
  const res = await fetch(`${BASE_URL}/applications/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("지원 업데이트 실패");
  return res.json();
}

export async function deleteApplication(id) {
  if (USE_MOCK) {
    const arr = getPersistedApplications();
    const idx = arr.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error("NOT_FOUND");
    arr.splice(idx, 1);
    persistApplications(arr);
    await delay(120);
    return true;
  }
  const res = await fetch(`${BASE_URL}/applications/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("지원 삭제 실패");
  return true;
}

// ----- Public API (no auth required) -----

export async function fetchPublicProfile(username) {
  if (USE_MOCK) {
    const mockProfile = {
      username,
      name: '홍길동',
      bio: '풀스택 개발자 | 배움을 멈추지 않는 사람',
      techStack: ['Java', 'Spring Boot', 'React', 'Docker', 'Kubernetes', 'PostgreSQL'],
      postCount: MOCK_POSTS.filter(
        (p) => p.visibility === 'PUBLIC' || p.visibility === 'AI_COLLECTABLE'
      ).length,
      joinedAt: '2024-01-01T00:00:00Z',
    };
    await delay(200);
    return mockProfile;
  }
  const res = await fetch(`${BASE_URL}/users/${username}/profile`);
  return handleResponse(res);
}

export async function fetchPublicPosts(username, params = {}) {
  if (USE_MOCK) {
    const { page = 1, size = 10, sort = 'createdAt', order = 'desc' } = params;
    let items = MOCK_POSTS
      .filter((p) => p.visibility === 'PUBLIC' || p.visibility === 'AI_COLLECTABLE')
      .map((p) => ({
        ...p,
        category: MOCK_CATEGORIES.find((c) => c.id === p.categoryId) || null,
        tags: p.tagIds.map((tid) => MOCK_TAGS.find((t) => t.id === tid)).filter(Boolean),
      }));

    items.sort((a, b) => {
      const vA = new Date(a[sort]).getTime();
      const vB = new Date(b[sort]).getTime();
      return order === 'asc' ? vA - vB : vB - vA;
    });

    const start = (page - 1) * size;
    const paged = items.slice(start, start + Number(size));
    const total = items.length;
    const totalPages = Math.ceil(total / size) || 1;
    await delay(300);
    return {
      posts: paged,
      total,
      page,
      size,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
  const query = buildQuery(params);
  const res = await fetch(`${BASE_URL}/users/${username}/posts${query}`);
  return handleResponse(res);
}

export async function fetchPublicPost(username, postId) {
  if (USE_MOCK) {
    const base = MOCK_POSTS.find((p) => p.id === String(postId));
    await delay(200);
    if (!base || (base.visibility !== 'PUBLIC' && base.visibility !== 'AI_COLLECTABLE')) {
      throw new Error('NOT_FOUND');
    }
    const allPublic = MOCK_POSTS
      .filter((p) => p.visibility === 'PUBLIC' || p.visibility === 'AI_COLLECTABLE')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const currentIdx = allPublic.findIndex((p) => p.id === base.id);
    return {
      ...base,
      category: MOCK_CATEGORIES.find((c) => c.id === base.categoryId) || null,
      tags: base.tagIds.map((tid) => MOCK_TAGS.find((t) => t.id === tid)).filter(Boolean),
      prevPost:
        currentIdx < allPublic.length - 1
          ? { id: allPublic[currentIdx + 1].id, title: allPublic[currentIdx + 1].title }
          : null,
      nextPost:
        currentIdx > 0
          ? { id: allPublic[currentIdx - 1].id, title: allPublic[currentIdx - 1].title }
          : null,
    };
  }
  const res = await fetch(`${BASE_URL}/users/${username}/posts/${postId}`);
  if (res.status === 404) {
    const error = new Error('NOT_FOUND');
    error.status = 404;
    throw error;
  }
  return handleResponse(res);
}

// ----- Explore (User Discovery) -----

export async function fetchUsers(params = {}) {
  if (USE_MOCK) {
    const { q = '', page = 1, size = 12 } = params;
    let items = [...MOCK_USERS];
    if (q) {
      const ql = q.toLowerCase();
      items = items.filter(
        (u) =>
          u.username.toLowerCase().includes(ql) ||
          u.name.toLowerCase().includes(ql) ||
          (u.bio || '').toLowerCase().includes(ql)
      );
    }
    const start = (page - 1) * size;
    const paged = items.slice(start, start + Number(size));
    const total = items.length;
    const totalPages = Math.ceil(total / size) || 1;
    await delay(250);
    return {
      users: paged,
      total,
      page,
      size,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
  const query = buildQuery(params);
  const res = await fetch(`${BASE_URL}/users${query}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

// ---- MOCK DATA ----
let MOCK_CATEGORIES = [
  { id: "cat_1", name: "Frontend", parentId: null, createdAt: "2024-01-01T00:00:00Z" },
  { id: "cat_2", name: "Backend", parentId: null, createdAt: "2024-01-02T00:00:00Z" },
  { id: "cat_3", name: "AI/ML", parentId: null, createdAt: "2024-01-03T00:00:00Z" },
];

const MOCK_TAGS = [
  { id: "tag_1", name: "React", createdAt: "2024-01-01T00:00:00Z" },
  { id: "tag_2", name: "Node", createdAt: "2024-01-02T00:00:00Z" },
  { id: "tag_3", name: "Vite", createdAt: "2024-01-03T00:00:00Z" },
  { id: "tag_4", name: "RAG", createdAt: "2024-01-04T00:00:00Z" },
  { id: "tag_5", name: "Prompt", createdAt: "2024-01-05T00:00:00Z" },
];

const MOCK_POSTS = [
  {
    id: "1",
    title: "React 18 핵심 개념 정리",
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
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2024-01-01T10:00:00Z",
    visibility: "PUBLIC",
    aiCollectable: true,
    categoryId: "cat_1",
    tagIds: ["tag_1", "tag_3"],
  },
  {
    id: "2",
    title: "RAG 파이프라인 설계 — 실전 아키텍처",
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

*이 포스트는 AI 수집 허용 상태로, RAG 시스템이 참조할 수 있습니다.*`,
    createdAt: "2024-01-05T10:00:00Z",
    updatedAt: "2024-01-06T10:00:00Z",
    visibility: "AI_COLLECTABLE",
    aiCollectable: true,
    categoryId: "cat_3",
    tagIds: ["tag_4", "tag_5"],
  },
  {
    id: "3",
    title: "백엔드 성능 최적화 — Node.js & DB 튜닝",
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
    createdAt: "2024-02-01T10:00:00Z",
    updatedAt: "2024-02-02T10:00:00Z",
    visibility: "PRIVATE",
    aiCollectable: false,
    categoryId: "cat_2",
    tagIds: ["tag_2"],
  },
];

const MOCK_USERS = [
  { id: 'u1', username: 'hong', name: '홍길동', bio: '풀스택 개발자 | 배움을 멈추지 않는 사람', techStack: ['Java', 'Spring Boot', 'React', 'Docker'], postCount: 2 },
  { id: 'u2', username: 'kim', name: '김철수', bio: '프론트엔드 엔지니어 @ 스타트업', techStack: ['React', 'TypeScript', 'Next.js', 'Tailwind'], postCount: 8 },
  { id: 'u3', username: 'lee', name: '이영희', bio: 'AI/ML 리서처 · LLM과 RAG에 관심', techStack: ['Python', 'PyTorch', 'LangChain', 'FastAPI'], postCount: 5 },
  { id: 'u4', username: 'park', name: '박지민', bio: '백엔드 개발자 · 분산 시스템', techStack: ['Go', 'Kubernetes', 'gRPC', 'PostgreSQL'], postCount: 12 },
  { id: 'u5', username: 'choi', name: '최수현', bio: 'DevOps 엔지니어 · 자동화 덕후', techStack: ['Terraform', 'AWS', 'GitHub Actions', 'Docker'], postCount: 3 },
  { id: 'u6', username: 'jung', name: '정민호', bio: '데이터 엔지니어 · 파이프라인 설계', techStack: ['Spark', 'Airflow', 'Kafka', 'Python'], postCount: 7 },
];

// ---- MOCK HELPERS (Applications) ----
const APPS_STORAGE_KEY = "mock_applications";
function getPersistedApplications() {
  try {
    const raw = localStorage.getItem(APPS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
function persistApplications(arr) {
  localStorage.setItem(APPS_STORAGE_KEY, JSON.stringify(arr));
}
function mockParseJobUrl(url) {
  // 매우 단순한 규칙 기반 파서 (사람인/원티드/잡코리아 등)
  try {
    const u = new URL(url);
    const host = u.hostname;
    let source = "OTHER";
    if (host.includes("saramin")) source = "SARAMIN";
    if (host.includes("wanted")) source = "WANTED";
    if (host.includes("jobkorea")) source = "JOBKOREA";
    // 제목/회사명은 실제 크롤 없이 URL 힌트로 생성
    const path = u.pathname.replace(/\/+/g, " ").trim();
    const guess = decodeURIComponent(path).split(" ").filter(Boolean);
    const titleGuess = guess.slice(-1)[0] || "채용 공고";
    const companyGuess = u.searchParams.get("company") || host.split(".")[0];
    return {
      source,
      title: titleGuess.replace(/[-_]/g, " "),
      company: (companyGuess || "Company").replace(/[-_]/g, " "),
    };
  } catch {
    return { source: "OTHER", title: "채용 공고", company: "Company" };
  }
}
