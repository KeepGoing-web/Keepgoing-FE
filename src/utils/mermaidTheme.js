import mermaid from 'mermaid'

let lastTheme = null

export function initMermaidWithTheme() {
  const theme = document.documentElement.getAttribute('data-theme')
  if (lastTheme === theme) return
  lastTheme = theme
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    flowchart: { htmlLabels: false },
    theme: theme === 'light' ? 'default' : 'dark',
    fontFamily: 'var(--font-sans)',
    themeVariables:
      theme === 'light'
        ? {
            primaryColor: '#d1fae5',
            primaryTextColor: '#1e293b',
            primaryBorderColor: '#0d9488',
            lineColor: '#64748b',
            secondaryColor: '#e2e8f0',
            tertiaryColor: '#f1f5f9',
            noteBkgColor: '#fef3c7',
            noteTextColor: '#1e293b',
            noteBorderColor: '#f59e0b',
          }
        : {
            primaryColor: '#1e3a3a',
            primaryTextColor: '#cdd6f4',
            primaryBorderColor: '#2dd4bf',
            lineColor: '#6c7086',
            secondaryColor: '#313244',
            tertiaryColor: '#1e1e2e',
            noteBkgColor: '#45475a',
            noteTextColor: '#cdd6f4',
            noteBorderColor: '#f9e2af',
          },
  })
}
