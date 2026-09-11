import { useEffect, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'
import { ArrowLeft, Github, Youtube } from 'lucide-react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import ImageLightbox from '../ui/ImageLightbox'

const createHeadingId = (text, index) => {
    const slug = text
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '')

    return slug ? `project-section-${slug}-${index + 1}` : `project-section-${index + 1}`
}

const normalizeHeading = (text) => text
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')

const shouldHideProject1Heading = (heading, allHeadings, project) => {
    if (project?.slug !== 'dynamic-eqs') return false

    const text = normalizeHeading(heading.textContent || '')
    const tagName = heading.tagName.toLowerCase()
    const previousHeadings = allHeadings.slice(0, allHeadings.indexOf(heading))
    const currentSection = [...previousHeadings]
        .reverse()
        .find((item) => ['h2', 'h3'].includes(item.tagName.toLowerCase()))
    const currentSectionText = normalizeHeading(currentSection?.textContent || '')

    const hiddenExact = new Set([
        'strike',
        'vanguard',
        'support',
        '팀보상믹싱teamrewardmixingmappocooperativesignal',
        'teamrewardmixingmappocooperativesignal',
        'ue5python보상파이프라인rewardpipeline',
        'ue5pythonrewardpipeline',
        '실험설계',
        'experimentaldesign',
        '종합',
        'summary',
    ])

    if (hiddenExact.has(text)) return true
    if (text.startsWith('1단계') || text.startsWith('step1')) return true
    if (text.startsWith('2단계') || text.startsWith('step2')) return true

    const isSubheading = tagName === 'h4'
    const isKeyFeatures = currentSectionText.includes('주요기능') || currentSectionText.includes('keyfeatures')
    const isProblemSolving = currentSectionText.includes('기술적난제') || currentSectionText.includes('problemsolving')

    if (isSubheading && isKeyFeatures) {
        return !text.startsWith('1dynamiceqs')
            && !text.startsWith('2mappo')
            && !text.startsWith('3aws')
    }

    if (isSubheading && isProblemSolving) {
        return !text.startsWith('problem1')
            && !text.startsWith('problem2')
            && !text.startsWith('problem3')
    }

    return false
}

const getTocHeadings = (root, project) => {
    const allHeadings = Array.from(root?.querySelectorAll('h2, h3, h4') || [])
        .filter((heading) => heading.textContent.trim().length > 0)

    return allHeadings.filter((heading) => !shouldHideProject1Heading(heading, allHeadings, project))
}

const getAnchorOffset = () => {
    const header = document.querySelector('header[role="banner"]')
    return (header?.offsetHeight || 56) + 20
}

const removeMathDelimiters = (element) => {
    const previous = element.previousSibling
    const next = element.nextSibling

    if (previous?.nodeType === Node.TEXT_NODE) {
        previous.textContent = previous.textContent.replace(/\$\s*$/, '')
    }

    if (next?.nodeType === Node.TEXT_NODE) {
        next.textContent = next.textContent.replace(/^\s*\$/, '')
    }
}

const renderProjectMath = (root) => {
    root?.querySelectorAll('.project-math, .project-inline-math').forEach((element) => {
        if (element.querySelector(':scope > .katex, :scope > .katex-display')) return

        const tex = element.textContent.replace(/[\u200B-\u200D\uFEFF]/g, '').trim()
        if (!tex) return

        removeMathDelimiters(element)
        katex.render(tex, element, {
            displayMode: element.classList.contains('project-math'),
            throwOnError: false,
        })
    })
}

const escapeHtml = (value) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const wrapCodeToken = (type, value) => `<span class="project-code-token project-code-token-${type}">${escapeHtml(value)}</span>`

const codeKeywordSets = {
    python: new Set([
        'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def',
        'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if',
        'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise',
        'return', 'try', 'while', 'with', 'yield',
    ]),
    cLike: new Set([
        'abstract', 'auto', 'bool', 'break', 'case', 'catch', 'class', 'const',
        'constexpr', 'continue', 'default', 'do', 'double', 'else', 'enum', 'explicit',
        'false', 'final', 'float', 'for', 'foreach', 'if', 'in', 'inline', 'int',
        'internal', 'namespace', 'new', 'noexcept', 'null', 'nullptr', 'override',
        'private', 'protected', 'public', 'readonly', 'ref', 'return', 'static',
        'string', 'struct', 'switch', 'template', 'this', 'throw', 'true', 'try',
        'typedef', 'typename', 'uint', 'ulong', 'using', 'var', 'virtual', 'void',
        'while', 'yield',
    ]),
}

const codeLiteralSet = new Set(['true', 'false', 'null', 'nullptr', 'None', 'True', 'False'])

const detectCodeLanguage = (codeElement) => {
    const languageClass = Array.from(codeElement.classList)
        .find((className) => className.startsWith('language-'))

    if (!languageClass) return 'plain'

    const language = languageClass.replace('language-', '').toLowerCase()
    if (language === 'py') return 'python'
    if (language === 'cs' || language === 'csharp') return 'csharp'
    if (language === 'cpp' || language === 'cxx' || language === 'cc' || language === 'c++') return 'cpp'

    return language
}

const isIdentifierStart = (char) => /[A-Za-z_]/.test(char)
const isIdentifierPart = (char) => /[A-Za-z0-9_]/.test(char)

const getIdentifierTokenType = (word, source, endIndex, language) => {
    const keywordSet = language === 'python' ? codeKeywordSets.python : codeKeywordSets.cLike
    const nextChar = source.slice(endIndex).match(/^\s*(.)/)?.[1]

    if (codeLiteralSet.has(word)) return 'literal'
    if (keywordSet.has(word)) return 'keyword'
    if (/^[A-Z][A-Za-z0-9_]*$/.test(word) || /(SO|Flags|Node|Data|Controller|Manager|Tensor)$/.test(word)) return 'type'
    if (nextChar === '(') return 'function'

    return 'identifier'
}

const highlightCode = (source, language) => {
    let index = 0
    let html = ''

    while (index < source.length) {
        const char = source[index]
        const next = source[index + 1]
        const lineStart = source.lastIndexOf('\n', index - 1) + 1
        const beforeOnLine = source.slice(lineStart, index)

        if (/\s/.test(char)) {
            html += escapeHtml(char)
            index += 1
            continue
        }

        if (language === 'python' && char === '#') {
            const end = source.indexOf('\n', index)
            const token = source.slice(index, end === -1 ? source.length : end)
            html += wrapCodeToken('comment', token)
            index += token.length
            continue
        }

        if (language !== 'python' && char === '#' && beforeOnLine.trim() === '') {
            const end = source.indexOf('\n', index)
            const token = source.slice(index, end === -1 ? source.length : end)
            html += wrapCodeToken('directive', token)
            index += token.length
            continue
        }

        if (language !== 'python' && char === '/' && next === '/') {
            const end = source.indexOf('\n', index)
            const token = source.slice(index, end === -1 ? source.length : end)
            html += wrapCodeToken('comment', token)
            index += token.length
            continue
        }

        if (language !== 'python' && char === '/' && next === '*') {
            const end = source.indexOf('*/', index + 2)
            const token = source.slice(index, end === -1 ? source.length : end + 2)
            html += wrapCodeToken('comment', token)
            index += token.length
            continue
        }

        if (char === '"' || char === "'") {
            const quote = char
            let end = index + 1

            while (end < source.length) {
                if (source[end] === '\\') {
                    end += 2
                    continue
                }

                if (source[end] === quote) {
                    end += 1
                    break
                }

                end += 1
            }

            const token = source.slice(index, end)
            html += wrapCodeToken('string', token)
            index = end
            continue
        }

        const numberMatch = source.slice(index).match(/^(?:0x[\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)(?:[fFuUlL]+)?/)
        if (numberMatch) {
            html += wrapCodeToken('number', numberMatch[0])
            index += numberMatch[0].length
            continue
        }

        if (isIdentifierStart(char)) {
            let end = index + 1
            while (end < source.length && isIdentifierPart(source[end])) end += 1

            const word = source.slice(index, end)
            html += wrapCodeToken(getIdentifierTokenType(word, source, end, language), word)
            index = end
            continue
        }

        if (/[-+*/%=!<>&|?:.~^]+/.test(char)) {
            const operatorMatch = source.slice(index).match(/^[-+*/%=!<>&|?:.~^]+/)
            html += wrapCodeToken('operator', operatorMatch[0])
            index += operatorMatch[0].length
            continue
        }

        html += escapeHtml(char)
        index += 1
    }

    return html
}

const replaceElementTag = (element, tagName) => {
    const replacement = document.createElement(tagName)

    Array.from(element.attributes).forEach((attribute) => {
        replacement.setAttribute(attribute.name, attribute.value)
    })

    while (element.firstChild) {
        replacement.appendChild(element.firstChild)
    }

    element.replaceWith(replacement)
    return replacement
}

const normalizeLegacyProjectContent = (fragment) => {
    const hasLegacySectionHeadings = fragment.querySelector('h2')

    if (hasLegacySectionHeadings) {
        const headingMap = {
            H4: 'h5',
            H3: 'h4',
            H2: 'h3',
        }

        fragment.querySelectorAll('h4, h3, h2').forEach((heading) => {
            replaceElementTag(heading, headingMap[heading.tagName])
        })
    }

    fragment.querySelectorAll('hr').forEach((divider) => {
        divider.classList.add('project-divider')
    })

    fragment.querySelectorAll('table').forEach((table) => {
        if (table.closest('.project-table-wrap')) return

        const wrapper = document.createElement('div')
        wrapper.className = 'project-table-wrap'
        table.replaceWith(wrapper)
        wrapper.appendChild(table)
    })

    fragment.querySelectorAll('.custom-code-container').forEach((container) => {
        const pre = container.querySelector('pre')
        if (!pre) return

        const figure = document.createElement('figure')
        figure.className = 'project-code-block'

        const label = container.querySelector('.code-label')?.textContent?.trim()
        if (label) {
            const caption = document.createElement('figcaption')
            caption.textContent = label
            figure.appendChild(caption)
        }

        figure.appendChild(pre)
        container.replaceWith(figure)
    })

    fragment.querySelectorAll('.highlight').forEach((highlight) => {
        const pre = highlight.querySelector(':scope > pre')
        if (!pre || highlight.closest('.project-code-block')) return

        const figure = document.createElement('figure')
        figure.className = 'project-code-block'
        figure.appendChild(pre)
        highlight.replaceWith(figure)
    })

    // Marked renders ordinary fenced Markdown as a bare <pre><code> pair.
    // Normalize those blocks too so they receive the same themed container and
    // syntax-token styling as legacy Hugo/custom code blocks.
    fragment.querySelectorAll('pre').forEach((pre) => {
        if (pre.closest('.project-code-block')) return

        const figure = document.createElement('figure')
        figure.className = 'project-code-block'
        pre.replaceWith(figure)
        figure.appendChild(pre)
    })
}

const highlightProjectContent = (content) => {
    if (!content || typeof document === 'undefined') return content

    const template = document.createElement('template')
    template.innerHTML = marked.parse(content, { gfm: true })

    normalizeLegacyProjectContent(template.content)

    template.content.querySelectorAll('.project-code-block code').forEach((codeElement) => {
        const source = codeElement.textContent
        if (!source) return

        codeElement.innerHTML = highlightCode(source, detectCodeLanguage(codeElement))
    })

    renderProjectMath(template.content)

    return template.innerHTML
}

function ProjectDetail({ project, lang, navigate }) {
    const contentRef = useRef(null)
    const detailSectionRef = useRef(null)
    const tocRef = useRef(null)
    const scrollCorrectionTimersRef = useRef([])
    const [tocItems, setTocItems] = useState([])
    const [activeId, setActiveId] = useState('')
    const [lightboxImage, setLightboxImage] = useState(null)
    const highlightedProjectContent = useMemo(
        () => highlightProjectContent(project?.content?.[lang]),
        [project, lang],
    )

    useEffect(() => {
        const root = contentRef.current
        if (!project || !root) return

        const usedIds = new Set()
        const headings = getTocHeadings(root, project)

        const nextItems = headings.map((heading, index) => {
            let id = heading.id || createHeadingId(heading.textContent, index)
            let suffix = 2

            while (usedIds.has(id)) {
                id = `${id}-${suffix}`
                suffix += 1
            }

            heading.id = id
            heading.dataset.tocId = id
            usedIds.add(id)

            const headingLevel = Number(heading.tagName.replace('H', ''))

            return {
                id,
                index,
                text: heading.textContent.trim(),
                level: headingLevel >= 4 ? 2 : 1,
            }
        })

        setTocItems(nextItems)
        setActiveId(nextItems[0]?.id || '')

        if (nextItems.length === 0) return

        const updateActiveHeading = () => {
            const currentHeadings = getTocHeadings(root, project)
            const activationOffset = getAnchorOffset() + 28
            const current = nextItems.reduce((active, item) => {
                const heading = currentHeadings[item.index]
                if (!heading) return active
                return heading.getBoundingClientRect().top <= activationOffset ? item.id : active
            }, nextItems[0].id)

            setActiveId(current)
        }

        updateActiveHeading()
        window.addEventListener('scroll', updateActiveHeading, { passive: true })
        window.addEventListener('resize', updateActiveHeading)

        return () => {
            window.removeEventListener('scroll', updateActiveHeading)
            window.removeEventListener('resize', updateActiveHeading)
        }
    }, [project, lang])

    useEffect(() => {
        const root = contentRef.current
        if (!project || !root) return undefined

        const frameId = window.requestAnimationFrame(() => {
            renderProjectMath(root)
        })
        return () => window.cancelAnimationFrame(frameId)
    }, [project, lang, tocItems.length])

    useEffect(() => {
        const section = detailSectionRef.current
        const toc = tocRef.current
        if (!section || !toc || tocItems.length === 0) return

        let currentY = section.offsetTop + 96
        let frameId = 0

        const animateToc = () => {
            const sectionTop = section.offsetTop
            const sectionBottom = sectionTop + section.offsetHeight
            const tocHeight = toc.offsetHeight
            const viewportTarget = window.scrollY + window.innerHeight * 0.2
            const minY = sectionTop + 96
            const maxY = Math.max(minY, sectionBottom - tocHeight - 96)
            const targetY = Math.min(Math.max(viewportTarget, minY), maxY)

            currentY += (targetY - currentY) * 0.14
            toc.style.transform = `translate3d(0, ${currentY}px, 0)`
            frameId = window.requestAnimationFrame(animateToc)
        }

        toc.style.transform = `translate3d(0, ${currentY}px, 0)`
        frameId = window.requestAnimationFrame(animateToc)

        return () => window.cancelAnimationFrame(frameId)
    }, [tocItems.length, project, lang])

    useEffect(() => () => {
        scrollCorrectionTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
        scrollCorrectionTimersRef.current = []
    }, [])

    const clearScrollCorrectionTimers = () => {
        scrollCorrectionTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
        scrollCorrectionTimersRef.current = []
    }

    const getHeadingScrollTop = (heading) => {
        if (!heading) return 0
        const rect = heading.getBoundingClientRect()
        const scrollTop = window.scrollY || document.documentElement.scrollTop
        const top = rect.top + scrollTop
        return Math.max(0, top - getAnchorOffset())
    }

    const scrollToHeadingElement = (heading) => {
        clearScrollCorrectionTimers()

        const initialTargetTop = getHeadingScrollTop(heading)
        window.scrollTo({ top: initialTargetTop, behavior: 'smooth' })

        let lastTargetTop = initialTargetTop
        const headingId = heading.id

        const correctionDelays = [450, 900, 1400]
        scrollCorrectionTimersRef.current = correctionDelays.map((delay, index) => window.setTimeout(() => {
            const currentHeading = document.getElementById(headingId) || heading
            if (!currentHeading || !document.body.contains(currentHeading)) return

            const currentTargetTop = getHeadingScrollTop(currentHeading)
            // Safety check: if target top is very close to 0 but it's not the first TOC item, it's a layout/DOM issue.
            // Do not correct (scroll to top) in this case.
            if (currentTargetTop < 10 && headingId !== tocItems[0]?.id) return

            const distanceFromTarget = currentHeading.getBoundingClientRect().top - getAnchorOffset()
            if (Math.abs(distanceFromTarget) <= 4) return

            const hasTargetShifted = Math.abs(currentTargetTop - lastTargetTop) > 2
            const isLastTimer = index === correctionDelays.length - 1

            if (hasTargetShifted || isLastTimer) {
                lastTargetTop = currentTargetTop
                window.scrollTo({
                    top: currentTargetTop,
                    behavior: isLastTimer ? 'auto' : 'smooth',
                })
            }
        }, delay))
    }

    const scrollToHeading = (event, id) => {
        event.preventDefault()
        const item = tocItems.find((tocItem) => tocItem.id === id)
        const heading = item ? getTocHeadings(contentRef.current, project)[item.index] : null
        if (!heading) return

        scrollToHeadingElement(heading)
        window.history.replaceState({}, '', `${window.location.pathname}#${id}`)
        setActiveId(id)
    }

    const openProjectImage = (event) => {
        const image = event.target.closest?.('img')
        if (!image || !event.currentTarget.contains(image)) return

        setLightboxImage({
            src: image.currentSrc || image.src,
            alt: image.alt || project.title[lang],
            originalSize: /\.gif(?:$|\?)/i.test(image.currentSrc || image.src),
        })
    }

    if (!project) {
        return (
            <main className="section-padding page-offset">
                <div className="container-max">
                    <button className="back-button" onClick={() => navigate(lang === 'ko' ? '/ko' : '/')}>
                        <ArrowLeft size={16} />
                        {lang === 'ko' ? '홈으로 돌아가기' : 'Back Home'}
                    </button>
                    <h1 className="page-title">{lang === 'ko' ? '프로젝트를 찾을 수 없습니다.' : 'Project not found.'}</h1>
                </div>
            </main>
        )
    }

    return (
        <main className="project-detail-page page-offset">
            <section
                className="project-detail-hero"
                style={{ backgroundImage: `linear-gradient(rgba(8,10,14,0.62), rgba(8,10,14,0.82)), url(${project.gif || project.image})` }}
            >
                <div className="container-max">
                    <button className="back-button light" onClick={() => navigate(lang === 'ko' ? '/ko#projects' : '/#projects')}>
                        <ArrowLeft size={16} />
                        {lang === 'ko' ? '프로젝트 목록' : 'Projects'}
                    </button>

                    <p className="page-eyebrow">Project Detail</p>
                    <h1 className="project-detail-title">{project.title[lang]}</h1>
                    <p className="project-detail-copy">{project.description[lang]}</p>

                    <div className="project-meta-grid">
                        <div>
                            <span>{lang === 'ko' ? '기간' : 'Period'}</span>
                            <strong>{project.period}</strong>
                        </div>
                        <div>
                            <span>{lang === 'ko' ? '팀' : 'Team'}</span>
                            <strong>{project.team[lang]}</strong>
                        </div>
                        <div>
                            <span>{lang === 'ko' ? '역할' : 'Role'}</span>
                            <strong>{project.role[lang]}</strong>
                        </div>
                    </div>

                    {(project.github || project.youtube) && (
                        <div className="project-external-links" aria-label={lang === 'ko' ? '프로젝트 외부 링크' : 'Project links'}>
                            {project.github && (
                                <a
                                    href={project.github}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="GitHub"
                                    title="GitHub"
                                >
                                    <Github size={19} aria-hidden="true" />
                                </a>
                            )}
                            {project.youtube && (
                                <a
                                    href={project.youtube}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="YouTube"
                                    title="YouTube"
                                >
                                    <Youtube size={20} aria-hidden="true" />
                                </a>
                            )}
                        </div>
                    )}

                    <div className="project-keyword-row" aria-label="Project keywords">
                        {project.tags.map((tag) => (
                            <span key={tag}>{tag}</span>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section-padding" ref={detailSectionRef}>
                <div className="container-max project-detail-layout" ref={contentRef}>
                    <div className="project-detail-main" onClick={openProjectImage}>
                        <div className="detail-media">
                            <img src={project.detailImage || project.gif || project.image} alt={project.title[lang]} />
                        </div>

                        <h2 className="section-title small">{lang === 'ko' ? '핵심 작업' : 'Key Work'}</h2>
                        <ul className="feature-list">
                            {project.highlights[lang].map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>

                        {highlightedProjectContent && (
                            <article
                                className="project-content"
                                dangerouslySetInnerHTML={{ __html: highlightedProjectContent }}
                            />
                        )}
                    </div>
                </div>
            </section>

            {tocItems.length > 0 && (
                <aside ref={tocRef} className="project-toc-sidebar" aria-label={lang === 'ko' ? '목차' : 'Table of contents'}>
                    <nav className="project-toc-wrapper">
                        <ul className="project-toc-list">
                            {tocItems.map((item) => (
                                <li key={item.id} className="project-toc-item">
                                    <a
                                        href={`#${item.id}`}
                                        className={`project-toc-link project-toc-level-${Math.min(item.level, 5)}${activeId === item.id ? ' active' : ''}`}
                                        onClick={(event) => scrollToHeading(event, item.id)}
                                    >
                                        <span className="project-toc-indicator" />
                                        <span className="project-toc-text">{item.text}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </aside>
            )}
            <ImageLightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />
        </main>
    )
}

export default ProjectDetail
