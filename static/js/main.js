// 파일 경로: static/js/main.js

// 1. 테마 토글 로직
const themeToggleSticky = document.getElementById("theme-toggle-sticky");
if (themeToggleSticky) {
    themeToggleSticky.addEventListener("click", () => {
        const html = document.querySelector("html");
        const currentTheme = html.dataset.theme || (localStorage.getItem("pref-theme") || (window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light"));
        const newTheme = currentTheme === "dark" ? "light" : "dark";

        html.dataset.theme = newTheme;
        if (newTheme === 'dark') {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }
        localStorage.setItem("pref-theme", newTheme);
    });
}

// 2. 이미지 모달 작동 로직
document.addEventListener("DOMContentLoaded", function() {
    const modal = document.getElementById("modal-overlay");
    const modalImg = document.getElementById("modal-img");
    
    // shortcode 파일(img.html 등)에서 설정한 modal-trigger 클래스를 가진 모든 이미지 선택
    const triggers = document.querySelectorAll('.modal-trigger');
    
    if(triggers.length > 0 && modal && modalImg) {
        triggers.forEach(img => {
            img.addEventListener('click', function() {
                modal.classList.add('active');           // custom.css의 .active 스타일 활성화
                modalImg.src = this.src;                 // 클릭한 이미지 소스 복사
                document.body.style.overflow = 'hidden';   // 스크롤 방지
            });
        });

        // 모달 영역 클릭 시 닫기 (이미지 본체 제외)
        modal.addEventListener('click', function(e) {
            if (e.target !== modalImg) {
                modal.classList.remove('active');
                document.body.style.overflow = 'auto';     // 스크롤 복구
            }
        });
    }
});