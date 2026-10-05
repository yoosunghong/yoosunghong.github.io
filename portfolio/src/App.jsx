import { useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from './hooks/useTheme'

import Header from './components/layout/Header'
import Footer from './components/layout/Footer'

import ProjectDetail from './components/pages/ProjectDetail'
import PublicationsPage from './components/pages/PublicationsPage'
import HomePage from './components/pages/HomePage'
import { getProjectBySlug } from './data/projects'
import { getPublicationById } from './data/publications'

const normalizePath = () => window.location.pathname.replace(/\/+$/, '') || '/'

function App() {
    const { isDark, toggle } = useTheme()
    const [path, setPath] = useState(normalizePath)
    const [lang, setLang] = useState(() => normalizePath().startsWith('/ko') ? 'ko' : 'en')
    const [showTopButton, setShowTopButton] = useState(false)

    useEffect(() => {
        document.documentElement.lang = lang
    }, [lang])

    const currentPathRef = useRef(path)

    useEffect(() => {
        currentPathRef.current = path
    }, [path])

    useEffect(() => {
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual'
        }
        const onPopState = () => {
            const nextPath = normalizePath()
            const prevPath = currentPathRef.current
            setPath(nextPath)
            setLang(nextPath.startsWith('/ko') ? 'ko' : 'en')
            if (nextPath !== prevPath) {
                window.scrollTo({ top: 0, behavior: 'instant' })
            }
        }
        window.addEventListener('popstate', onPopState)
        return () => window.removeEventListener('popstate', onPopState)
    }, [])

    useEffect(() => {
        const updateTopButton = () => {
            const { scrollTop, scrollHeight, clientHeight } = document.documentElement
            setShowTopButton(scrollTop + clientHeight >= scrollHeight - 24)
        }

        updateTopButton()
        window.addEventListener('scroll', updateTopButton, { passive: true })
        window.addEventListener('resize', updateTopButton)
        return () => {
            window.removeEventListener('scroll', updateTopButton)
            window.removeEventListener('resize', updateTopButton)
        }
    }, [path])

    const navigate = (to) => {
        const target = new URL(to, window.location.origin)
        const targetPath = target.pathname.replace(/\/+$/, '') || '/'
        const nextPath = targetPath === '/' && lang === 'ko' ? '/ko' : targetPath
        const nextUrl = `${nextPath}${target.hash}`

        window.history.pushState({}, '', nextUrl)
        setPath(nextPath)
        setLang(nextPath.startsWith('/ko') ? 'ko' : 'en')

        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                if (target.hash) {
                    document.getElementById(decodeURIComponent(target.hash.slice(1)))
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    return
                }

                window.scrollTo({ top: 0, behavior: 'smooth' })
            })
        })
    }

    const toggleLanguage = () => {
        const nextLang = lang === 'ko' ? 'en' : 'ko'
        setLang(nextLang)

        const withoutKo = path.replace(/^\/ko(?=\/|$)/, '') || '/'
        const nextPath = nextLang === 'ko'
            ? withoutKo === '/' ? '/ko' : `/ko${withoutKo}`
            : withoutKo

        window.history.pushState({}, '', nextPath)
        setPath(normalizePath())
    }

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const route = useMemo(() => {
        const clean = path.replace(/^\/ko(?=\/|$)/, '') || '/'
        if (clean === '/publications') return { type: 'publications' }
        if (clean === '/news' || clean.startsWith('/news/')) return { type: 'disabled-news' }
        if (clean.startsWith('/publications/')) {
            return { type: 'publication', id: clean.split('/')[2] }
        }
        if (clean.startsWith('/projects/')) {
            return { type: 'project', slug: clean.split('/')[2] }
        }
        return { type: 'home' }
    }, [path])

    const renderMain = () => {
        if (route.type === 'publications') {
            return <PublicationsPage lang={lang} navigate={navigate} />
        }

        if (route.type === 'publication') {
            return (
                <PublicationsPage
                    lang={lang}
                    navigate={navigate}
                    selectedPaper={getPublicationById(route.id)}
                />
            )
        }

        if (route.type === 'disabled-news') {
            return <main className="academic-home"><h1>{lang === 'ko' ? 'AI 뉴스가 비활성화되었습니다' : 'AI News is disabled'}</h1><a href={lang === 'ko' ? '/ko' : '/'}>{lang === 'ko' ? '홈으로 돌아가기' : 'Back to home'}</a></main>
        }

        if (route.type === 'project') {
            return (
                <ProjectDetail
                    lang={lang}
                    project={getProjectBySlug(route.slug)}
                    navigate={navigate}
                />
            )
        }

        return (
            <HomePage lang={lang} navigate={navigate} />
        )
    }

    return (
        <div className="min-h-screen bg-transition" style={{ backgroundColor: 'var(--color-bg)' }}>
            <Header
                isDark={isDark}
                lang={lang}
                onToggleTheme={toggle}
                onToggleLanguage={toggleLanguage}
                navigate={navigate}
            />
            {renderMain()}
            <Footer lang={lang} />
            {showTopButton && (
                <button
                    type="button"
                    className="top-button"
                    onClick={scrollToTop}
                    aria-label={lang === 'ko' ? '페이지 최상단으로 이동' : 'Back to top'}
                >
                    Top
                </button>
            )}
        </div>
    )
}

export default App
