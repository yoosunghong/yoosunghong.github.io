import { personalInfo } from '../../data/personal'
import { projects } from '../../data/projects'
import { publications } from '../../data/publications'
import { experience } from '../../data/experience'
import { skills, credentials } from '../../data/skills'
import profile from '../../assets/profile2.jpg'

export default function HomePage({ lang, navigate }) {
    const detailLink = (path, label) => {
        const href = `${lang === 'ko' ? '/ko' : ''}${path}`
        return <a href={href} onClick={(event) => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            event.preventDefault()
            navigate(href)
        }}>{label}</a>
    }
    return (
        <main className="academic-home" lang={lang}>
            <section className="academic-intro" aria-labelledby="profile-name">
                <div>
                    <h1 id="profile-name">{personalInfo.name[lang]}</h1>
                    <p className="academic-role">{lang === 'ko' ? '게임 AI 연구 · 엔지니어링' : 'Game AI Research & Engineering'}</p>
                    <p>{lang === 'ko'
                        ? '게임 플레이 경험을 향상시키는 AI 시스템을 연구하고 개발합니다. 강화학습과 대규모 언어 모델을 게임 엔진에 연결하여 NPC의 의사결정, 협력 행동, 인터랙티브 시뮬레이션을 탐구합니다.'
                        : 'I research and build AI systems for games. My work connects reinforcement learning and large language models with game engines, exploring NPC decision-making, cooperative behavior, and interactive simulation.'}</p>
                    <div className="academic-contact">
                        <a href={`mailto:${personalInfo.email}`}>Email</a><span>/</span>
                        <a href={personalInfo.blog} target="_blank" rel="noopener noreferrer">Notion</a><span>/</span>
                        <a href={personalInfo.github} target="_blank" rel="noopener noreferrer">GitHub</a><span>/</span>
                        <a href={personalInfo.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
                    </div>
                </div>
                <img className="academic-portrait" src={profile} alt={personalInfo.name[lang]} />
            </section>
            <section id="news" aria-labelledby="news-heading">
                <h2 id="news-heading">{lang === 'ko' ? '최근 소식' : 'News'}</h2>
                <ul className="academic-news">
                    <li><span className="academic-meta">2026.07</span><div>{lang === 'ko' ? 'P3CO, Inc.에서 AI Researcher, Game AI로 일을 시작했습니다.' : 'Joined P3CO, Inc. as an AI Researcher, Game AI.'}</div></li>
                    <li><span className="academic-meta">2026.07</span><div>{detailLink('/publications/learned-coordination-conventions', 'Learned Coordination Conventions in Cooperative MARL')}{lang === 'ko' ? ' — ICML 2026 NExT-Game 워크숍 포스터 승인.' : ' — accepted as a poster at the ICML 2026 NExT-Game Workshop.'}</div></li>
                    <li><span className="academic-meta">2026.07</span><div>{lang === 'ko' ? 'OPIc Intermediate Mid 2 (IM2) 취득.' : 'Earned OPIc Intermediate Mid 2 (IM2).'}</div></li>
                    <li><span className="academic-meta">2026.06</span><div><a href="https://github.com/GPUOpen-LibrariesAndSDKs/Schola/pull/2" target="_blank" rel="noopener noreferrer">AMD Schola</a>{lang === 'ko' ? ' — RLlib-Schola 동기화 문제 수정 PR이 공식 저장소에 머지되었습니다.' : ' — my PR fixing RLlib-Schola synchronization was merged into the official repository.'}</div></li>
                    <li><span className="academic-meta">2026.06</span><div><a href="/images/experience/Coursera%205TAEFIIDLBRK.pdf" target="_blank" rel="noopener noreferrer">Deep Learning Specialization</a>{lang === 'ko' ? ' — DeepLearning.AI의 5개 코스 수료.' : ' — completed all five DeepLearning.AI courses.'}</div></li>
                    <li><span className="academic-meta">2026.05</span><div>{detailLink('/publications/pcsp', 'One Policy, Infinite NPCs (PCSP)')}{lang === 'ko' ? ' — arXiv 등재.' : ' — available on arXiv.'} <a href="https://arxiv.org/abs/2605.23652" target="_blank" rel="noopener noreferrer">arXiv ↗</a></div></li>
                    <li><span className="academic-meta">2026.01</span><div><a href="/images/experience/aws.png" target="_blank" rel="noopener noreferrer">AWS Certified Solutions Architect – Associate</a>{lang === 'ko' ? ' 취득.' : ' certification earned.'}</div></li>
                </ul>
            </section>
            <section id="research" aria-labelledby="research-heading">
                <h2 id="research-heading">{lang === 'ko' ? '연구' : 'Research'}</h2>
                <div className="academic-list">
                    {publications.map((paper) => (
                        <article className="academic-entry academic-media-entry" key={paper.id}>
                            {detailLink(`/publications/${paper.id}`, <img className="academic-preview academic-paper-preview" src={paper.image} alt={paper.title} loading="lazy" />)}
                            <div>
                            <h3>{detailLink(`/publications/${paper.id}`, paper.title)}</h3>
                            <p className="academic-authors">{paper.authors}</p>
                            <p className="academic-meta">{paper.venue} · {paper.date}{paper.status ? ` · ${paper.status[lang]}` : ''}</p>
                            <p>{paper.description[lang]}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
            <section id="projects" aria-labelledby="projects-heading">
                <h2 id="projects-heading">{lang === 'ko' ? '프로젝트' : 'Projects'}</h2>
                <div className="academic-list">
                    {projects.map((project) => (
                        <article className="academic-entry academic-media-entry" key={project.slug}>
                            {detailLink(`/projects/${project.slug}`, <img className="academic-preview academic-project-preview" src={project.gif || project.image} alt={project.title[lang]} loading="lazy" />)}
                            <div>
                            <h3>{detailLink(`/projects/${project.slug}`, project.title[lang])}</h3>
                            <p className="academic-meta">{project.period}</p>
                            <p>{project.description[lang]}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
            <section id="skills" aria-labelledby="skills-heading">
                <h2 id="skills-heading">{lang === 'ko' ? '기술 스택' : 'Skills'}</h2>
                <dl className="academic-skills">
                    {skills.map(({ category, items }) => <div key={category}><dt>{category}</dt><dd>{items.map(({ name }) => name).join(' · ')}</dd></div>)}
                </dl>
            </section>
            <section id="experience" aria-labelledby="experience-heading">
                <h2 id="experience-heading">{lang === 'ko' ? '경력' : 'Experience'}</h2>
                <div className="academic-list">
                {experience.map((item) => (
                    <article className="academic-entry" key={item.id}>
                        <div className="academic-experience-heading"><h3>{item.company[lang]}</h3><span className="academic-meta">{item.period}</span></div>
                        <p>{item.role[lang]}</p>
                        <p className="academic-meta">{item.description[lang]}</p>
                    </article>
                ))}
                </div>
            </section>
            {credentials.filter(({ title }) => ['Certifications', 'Awards', 'Patents', 'Languages', 'Technical Contributions'].includes(title.en)).map(({ title, items }) => (
                <section id={title.en.toLowerCase().replaceAll(' ', '-')} key={title.en} aria-labelledby={`${title.en.replaceAll(' ', '-')}-heading`}>
                    <h2 id={`${title.en.replaceAll(' ', '-')}-heading`}>{title.en === 'Technical Contributions' ? (lang === 'ko' ? '오픈소스 기여' : 'Open Source Contributions') : title.en === 'Languages' && lang === 'en' ? 'Language Proficiency' : title[lang]}</h2>
                    <div className="academic-list">
                        {items.map(({ name, date, details, proofImage, link }) => (
                            <article className="academic-entry" key={name.en}>
                                <div className="academic-experience-heading">
                                    <h3>{proofImage || link ? <a href={proofImage || link} target="_blank" rel="noopener noreferrer">{name[lang]}</a> : name[lang]}</h3>
                                    {date && <span className="academic-meta">{date}</span>}
                                </div>
                                {details[lang].map((detail) => <p className="academic-meta" key={detail}>{detail}</p>)}
                            </article>
                        ))}
                    </div>
                </section>
            ))}
        </main>
    )
}
