document.addEventListener('DOMContentLoaded', () => {
    const content = document.querySelector('.content');
    const tocList = document.getElementById('toc-list');
    
    // .content 요소나 toc-list가 없으면 실행 중단
    if (!content || !tocList) return;

    // 문서 내 h1, h2, h3 헤딩 태그 모두 찾기
    const headings = content.querySelectorAll('h1, h2, h3');
    if (headings.length === 0) return;

    // 1. 목차 요소 자동 생성
    headings.forEach((heading, index) => {
        // 헤딩에 고유 ID가 없다면 생성 (스크롤 이동을 위해 필수)
        if (!heading.id) {
            heading.id = `heading-${index}`;
        }

        const level = heading.tagName.toLowerCase().replace('h', ''); // '1', '2', '3'
        
        const li = document.createElement('li');
        li.className = `toc-item`;

        const a = document.createElement('a');
        a.href = `#${heading.id}`;
        a.className = `toc-link toc-level-${level}`;
        
        const indicator = document.createElement('span');
        indicator.className = 'toc-indicator';

        const text = document.createElement('span');
        text.className = 'toc-text';
        text.textContent = heading.textContent;

        a.appendChild(indicator);
        a.appendChild(text);
        li.appendChild(a);
        tocList.appendChild(li);

        // 부드러운 스크롤 (Smooth Scroll) 이벤트 추가
        a.addEventListener('click', (e) => {
            e.preventDefault();
            heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
            history.pushState(null, null, `#${heading.id}`); // URL 해시 업데이트
        });
    });

    // 2. Intersection Observer로 스크롤 위치 추적하기
    const observerOptions = {
        root: null,
        // 화면의 상단 20% 지점에 헤딩이 닿을 때 활성화되도록 마진 설정
        rootMargin: '0px 0px -80% 0px', 
        threshold: 0
    };

    const observerCallback = (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // 기존 활성화된 스타일 모두 제거
                document.querySelectorAll('.toc-link').forEach(link => {
                    link.classList.remove('active');
                });
                
                // 현재 화면에 들어온 헤딩의 목차 항목 활성화
                const activeLink = document.querySelector(`.toc-link[href="#${entry.target.id}"]`);
                if (activeLink) {
                    activeLink.classList.add('active');
                    
                    // 목차 바 내부에서도 활성화된 항목이 보이게 자동 스크롤
                    activeLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    headings.forEach(heading => observer.observe(heading));
});