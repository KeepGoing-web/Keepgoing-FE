import { buildNoteListParams } from './noteListState'

describe('buildNoteListParams', () => {
  it('maps active filters into API params', () => {
    expect(
      buildNoteListParams({
        page: 2,
        size: 20,
        query: 'react',
        categoryId: 'cat_1',
        selectedTagIds: ['tag_1', 'tag_2'],
        sort: 'createdAt',
        order: 'desc',
        visibility: 'PUBLIC',
        aiOnly: 'true',
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      }),
    ).toEqual({
      page: 2,
      size: 20,
      q: 'react',
      categoryId: 'cat_1',
      tagId: 'tag_1,tag_2',
      sort: 'createdAt',
      order: 'desc',
      visibility: 'PUBLIC',
      aiCollectable: 'true',
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31',
    })
  })

  it('drops empty or uncategorized filter values', () => {
    expect(
      buildNoteListParams({
        page: 1,
        size: 10,
        query: '',
        categoryId: '__uncategorized__',
        selectedTagIds: [],
        sort: 'title',
        order: 'asc',
        visibility: '',
        aiOnly: '',
        dateFrom: '',
        dateTo: '',
      }),
    ).toEqual({
      page: 1,
      size: 10,
      q: '',
      categoryId: undefined,
      uncategorized: true,
      tagId: undefined,
      sort: 'title',
      order: 'asc',
      visibility: undefined,
      aiCollectable: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    })
  })
})
