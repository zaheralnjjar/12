// One line-icon set for every bottom bar.
const PATHS: Record<string, string> = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  reports: 'M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6',
  people: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.5-6 8-6s8 2 8 6',
  messages: 'M4 5h16v11H9l-5 4z',
  forms: 'M8 4h8v3H8zM6 5H5v16h14V5h-1M9 12h6M9 16h6',
  plus: 'M12 5v14M5 12h14',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM5 21c0-3.5 3-6 7-6s7 2.5 7 6',
  chart: 'M5 20V10M12 20V4M19 20v-7',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-1-3-2 .5-1.5-1.5.5-2-3-1-1 2h-2l-1-2-3 1 .5 2L6 8.500 4 8l-1 3 2 1v2l-2 1 1 3 2-.5L7.500 19l-.5 2 3 1 1-2h2l1 2 3-1-.5-2 1.500-1.500 2 .5 1-3-2-1z',
  pending: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
}

export type NavIconName = keyof typeof PATHS

export function NavIcon({ name }: { name: NavIconName }) {
  return (
    <svg className="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}
