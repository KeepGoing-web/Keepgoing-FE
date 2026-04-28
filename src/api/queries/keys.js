export const queryKeys = {
  notes: {
    all: ['notes'],
    lists: () => ['notes', 'list'],
    list: (params) => ['notes', 'list', params ?? {}],
    details: () => ['notes', 'detail'],
    detail: (id) => ['notes', 'detail', String(id)],
  },
  categories: {
    all: ['categories'],
    list: () => ['categories', 'list'],
  },
  activities: {
    all: ['activities'],
    range: (range) => [
      'activities',
      'range',
      { from: String(range?.from ?? ''), to: String(range?.to ?? '') },
    ],
  },
}
