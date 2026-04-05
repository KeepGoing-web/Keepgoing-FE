export const DEFAULT_NOTE_LIST_PAGE_META = {
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
}

export function buildNoteListParams({
  page,
  size,
  query,
  categoryId,
  selectedTagIds,
  sort,
  order,
  visibility,
  aiOnly,
  dateFrom,
  dateTo,
}) {
  return {
    page,
    size,
    q: query,
    categoryId: categoryId && categoryId !== '__uncategorized__' ? categoryId : undefined,
    uncategorized: categoryId === '__uncategorized__' ? true : undefined,
    tagId: selectedTagIds.length > 0 ? selectedTagIds.join(',') : undefined,
    sort,
    order,
    visibility: visibility || undefined,
    aiCollectable: aiOnly || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }
}
