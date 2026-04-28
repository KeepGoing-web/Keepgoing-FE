export function resolveFolderId(note) {
  return note?.folderId ?? note?.categoryId ?? note?.category?.id ?? null
}

export function attachCategoryMeta(posts, categories = []) {
  if (!Array.isArray(posts) || posts.length === 0) return posts
  const map = new Map(categories.map((c) => [String(c.id), c]))
  return posts.map((post) => {
    const folderId = resolveFolderId(post)
    const category = folderId != null ? map.get(String(folderId)) : null
    return {
      ...post,
      folderId,
      categoryId: folderId,
      category: category || post.category || null,
    }
  })
}
