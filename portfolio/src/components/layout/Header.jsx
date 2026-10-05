import { Sun, Moon } from 'lucide-react'

export default function Header({ isDark, lang, onToggleTheme, onToggleLanguage }) {
    return (
        <header className="display-controls" aria-label={lang === 'ko' ? '화면 설정' : 'Display settings'}>
            <button type="button" onClick={onToggleLanguage} aria-label={lang === 'ko' ? 'Switch to English' : '한국어로 전환'}>{lang === 'ko' ? 'EN' : '한'}</button>
            <button type="button" onClick={onToggleTheme} aria-label={lang === 'ko' ? (isDark ? '라이트 모드로 전환' : '다크 모드로 전환') : (isDark ? 'Switch to light mode' : 'Switch to dark mode')} aria-pressed={isDark}>
                {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
        </header>
    )
}
