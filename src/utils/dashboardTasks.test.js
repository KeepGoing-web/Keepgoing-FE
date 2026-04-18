import { describe, expect, it } from 'vitest'
import { deriveDashboardTodoGroups } from './dashboardTasks'

describe('deriveDashboardTodoGroups', () => {
  it('extracts unchecked checklist items and groups them by note recency', () => {
    const notes = [
      {
        id: 'note-1',
        title: '첫 번째 노트',
        content: ['# title', '- [ ] 첫 할 일', '- [x] 끝난 일', '- [ ] 둘째 할 일'].join('\n'),
        updatedAt: '2026-04-10T10:00:00Z',
        visibility: 'PUBLIC',
        aiCollectable: true,
      },
      {
        id: 'note-2',
        title: '두 번째 노트',
        content: ['메모', '- [ ] 새 TODO'].join('\n'),
        updatedAt: '2026-04-11T10:00:00Z',
        visibility: 'PRIVATE',
        aiCollectable: false,
      },
    ]

    const result = deriveDashboardTodoGroups(notes)

    expect(result.totalOpenTasks).toBe(3)
    expect(result.groups).toHaveLength(2)
    expect(result.groups[0].noteId).toBe('note-2')
    expect(result.groups[0].tasks[0].text).toBe('새 TODO')
    expect(result.groups[1].tasks.map((task) => task.text)).toEqual(['첫 할 일', '둘째 할 일'])
  })

  it('ignores non-task bullets and keeps ids stable for the same content', () => {
    const notes = [{
      id: 'note-3',
      title: '안정성',
      content: ['- 그냥 목록', '- [ ] 작업 A', '- [ ] 작업 B'].join('\n'),
      updatedAt: '2026-04-12T10:00:00Z',
    }]

    const first = deriveDashboardTodoGroups(notes)
    const second = deriveDashboardTodoGroups(notes)

    expect(first.totalOpenTasks).toBe(2)
    expect(first.groups[0].tasks.map((task) => task.id)).toEqual(second.groups[0].tasks.map((task) => task.id))
  })
})
