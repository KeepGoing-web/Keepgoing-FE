function extractUncheckedTasks(note) {
  const content = String(note?.content || '')
  const lines = content.split(/\r?\n/)
  const tasks = []

  lines.forEach((line, index) => {
    const match = line.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.+)$/)
    if (!match) return

    const checked = match[1].toLowerCase() === 'x'
    const text = match[2].trim()
    if (checked || !text) return

    tasks.push({
      id: `${note.id}:${index}:${text}`,
      text,
      noteId: note.id,
      noteTitle: note.title,
      categoryName: note.category?.name || null,
      updatedAt: note.updatedAt || note.createdAt || '',
    })
  })

  return tasks
}

export function deriveDashboardTodoGroups(notes = [], { maxGroups = 3, maxTasksPerGroup = 2 } = {}) {
  const groupsWithTasks = notes
    .map((note) => ({
      note,
      tasks: extractUncheckedTasks(note),
    }))
    .filter((group) => group.tasks.length > 0)
    .sort((left, right) => new Date(right.note.updatedAt || right.note.createdAt || 0) - new Date(left.note.updatedAt || left.note.createdAt || 0))

  return {
    groups: groupsWithTasks.slice(0, maxGroups).map((group) => ({
      noteId: group.note.id,
      noteTitle: group.note.title,
      categoryName: group.note.category?.name || null,
      updatedAt: group.note.updatedAt || group.note.createdAt || '',
      tasks: group.tasks.slice(0, maxTasksPerGroup),
    })),
    totalOpenTasks: groupsWithTasks.reduce((count, group) => count + group.tasks.length, 0),
  }
}
