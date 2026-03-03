# Site Maintenance Guide

This guide covers how to add new content and modify styles for this Hugo + PaperMod GitHub Pages site.

---

## Table of Contents

1. [Project Structure Overview](#1-project-structure-overview)
2. [Adding Content](#2-adding-content)
   - [Blog Posts](#21-blog-posts)
   - [Projects](#22-projects)
   - [Bilingual Content](#23-bilingual-content)
3. [Modifying Styles](#3-modifying-styles)
   - [CSS Custom Properties (Variables)](#31-css-custom-properties-variables)
   - [Typography](#32-typography)
   - [Colors and Dark Mode](#33-colors-and-dark-mode)
   - [Layout and Spacing](#34-layout-and-spacing)
   - [Animations](#35-animations)
4. [Modifying Layouts](#4-modifying-layouts)
   - [Homepage](#41-homepage)
   - [Project Pages](#42-project-pages)
   - [Head and Footer Partials](#43-head-and-footer-partials)
5. [Site Configuration](#5-site-configuration)
6. [Local Development](#6-local-development)
7. [Deployment](#7-deployment)

---

## 1. Project Structure Overview

```
yoosung-h/
├── content/                  # All site content
│   ├── posts/                # Blog posts
│   └── projects/             # Project showcase
│       ├── _index.md         # Projects list page (EN)
│       ├── _index.ko.md      # Projects list page (KR)
│       ├── project-1.md      # Individual project (EN)
│       └── project-1.ko.md   # Individual project (KR)
├── layouts/                  # Custom templates (override theme)
│   ├── index.html            # Homepage
│   ├── partials/
│   │   ├── head_custom.html  # Fonts, Tailwind, CSS bundling
│   │   └── extend_footer.html# Theme/language toggle bar
│   └── projects/
│       ├── list.html         # Projects index template
│       └── single.html       # Single project template
├── assets/css/extended/
│   ├── 00-base.css           # Fonts, variables, global layout/animation
│   ├── 10-home.css           # 홈 프로필/내비게이션
│   ├── 20-project.css        # 프로젝트 레이아웃/탭 내비게이션
│   ├── 30-sticky-bar.css     # 우측 상단 스티키바
│   ├── 40-back-button.css    # 프로젝트 페이지 Back 버튼
│   ├── 50-archive.css        # 아카이브 & Notion 버튼
│   ├── 60-experience.css     # Experience 페이지
│   ├── 70-modal.css          # 이미지 모달
│   ├── 80-project-links.css  # 프로젝트 링크 영역
│   ├── 90-writing-list.css   # 글 목록 페이지
│   └── 91-journal.css        # Journal 목록 페이지
├── themes/PaperMod/          # Theme (git submodule, do not edit)
├── archetypes/default.md     # Template for new content
└── hugo.toml                 # Main configuration
```

**Key rule:** Never edit files inside `themes/PaperMod/`. Override them by placing files with the same path under `layouts/` or `assets/`.

---

## 2. Adding Content

### 2.1 Blog Posts

Blog posts live in `content/posts/`. Each post is a Markdown file.

**Create a new post:**

```bash
hugo new posts/my-post-title.md
```

Or create the file manually at `content/posts/my-post-title.md`:

```markdown
---
title: "My Post Title"
date: 2026-02-20
draft: false
tags: ["tag1", "tag2"]
categories: ["Category"]
description: "A short summary shown in previews."
---

Your content here. Standard Markdown applies.

## Section Heading

Paragraph text, **bold**, *italic*, `inline code`.

```go
// Code block with syntax highlighting
func main() {
    fmt.Println("Hello")
}
```

```

**Front matter fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Post title |
| `date` | Yes | Publication date (YYYY-MM-DD) |
| `draft` | Yes | Set `false` to publish |
| `description` | No | Preview text |
| `tags` | No | List of tags |
| `categories` | No | List of categories |
| `weight` | No | Controls sort order (lower = higher) |

Posts with `draft: true` are not built into the production site.

---

### 2.2 Projects

Projects live in `content/projects/`. Each project is a Markdown file.

**Create a new project file** at `content/projects/my-project.md`:

```markdown
---
title: "My Project Title"
description: "Short description shown on the projects list."
weight: 4
---

## Overview

Describe the project here.

## Technologies Used

- Unreal Engine 5
- C++
- Your tech here

## Key Features

Details about what the project does and your role.
```

**Front matter fields for projects:**

| Field | Purpose |
|-------|---------|
| `title` | Project name |
| `description` | Summary shown on the list page |
| `weight` | Sort order on the list page (1 = first) |

To change the order projects appear on the list page, adjust the `weight` values. Lower weight renders first.

---

### 2.3 Bilingual Content

This site supports English and Korean. For any content file, create a parallel `.ko.md` version.

**Example:**

```
content/projects/my-project.md       ← English version
content/projects/my-project.ko.md    ← Korean version
```

The Korean file uses the same front matter structure but with Korean text:

```markdown
---
title: "프로젝트 제목"
description: "짧은 설명."
weight: 4
---

## 개요

프로젝트 내용을 여기에 작성합니다.
```

If a Korean version is not provided, Hugo falls back to the English version.

For the projects **list page** (`_index.md` / `_index.ko.md`), update the front matter title/description there if needed.

---

## 3. Modifying Styles

All custom styles are split across multiple files under **`assets/css/extended/`**, which are bundled together and loaded on top of PaperMod's base styles.

### 3.1 CSS Custom Properties (Variables)

In `00-base.css`, CSS variables defined in `:root` act as design tokens used across all other files. Change values here to propagate updates everywhere.

```css
:root {
  --font-serif: 'Times New Roman', 'Playfair Display', Georgia, serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-sans: 'Inter', system-ui, sans-serif;

  --color-primary: #334155;    /* Main text / accent */
  --color-secondary: #64748b;  /* Muted text */
  --color-bg: #f8fafc;         /* Page background */
  --color-surface: #ffffff;    /* Card / surface background */
  --color-border: #e2e8f0;     /* Borders */
}
```

Edit these variables to change the entire color scheme or font stack at once.

---

### 3.2 Typography

**Change the heading font size** (homepage title):

```css
/* In custom.css */
.home-title {
  font-size: 3.5rem;  /* Adjust this value */
}
```

**Change the navigation button font size:**

```css
.nav-btn {
  font-size: 1.8rem;  /* Adjust this value */
}
```

**Change body text font:**

Update `--font-sans` in `:root` (see section 3.1).

**Load a different Google Font:**

In `layouts/partials/head_custom.html`, find the `<link>` tag loading Google Fonts and update the font name in the URL:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
```

Replace `Inter` or `Playfair+Display` with your chosen font, then update the matching CSS variable.

---

### 3.3 Colors and Dark Mode

The site uses separate variable sets for light and dark modes.

**Light mode colors** are defined in `:root { }`.

**Dark mode colors** are defined in `[data-theme="dark"] { }` or `.dark { }`:

```css
[data-theme="dark"] {
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-primary: #e2e8f0;
  --color-secondary: #94a3b8;
  --color-border: #334155;
}
```

Change these values to adjust dark mode appearance independently from light mode.

---

### 3.4 Layout and Spacing

**Adjust the homepage profile section padding:**

```css
.profile-section {
  padding: 4rem 2rem;  /* top/bottom left/right */
}
```

**Adjust the sticky control bar position:**

The sticky bar (theme/language toggles) is positioned in `layouts/partials/extend_footer.html`. Its CSS is in `custom.css`:

```css
.sticky-bar {
  position: fixed;
  top: 1rem;
  right: 1rem;
}
```

**Change the mobile breakpoint:**

The default responsive breakpoint is `768px`. Search for `@media` in `custom.css` to find and adjust media queries:

```css
@media (max-width: 768px) {
  .nav-buttons {
    flex-direction: column;
  }
}
```

---

### 3.5 Animations

**Adjust entrance animation speed:**

```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

.animated {
  animation: fadeInUp 0.6s ease forwards;  /* Change 0.6s */
}
```

**Add a staggered delay to an element:**

```css
.nav-btn:nth-child(2) { animation-delay: 0.1s; }
.nav-btn:nth-child(3) { animation-delay: 0.2s; }
```

**Disable all animations** (e.g., for accessibility):

```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

---

## 4. Modifying Layouts

Layouts use Hugo's Go templating language. Files in `layouts/` override the equivalent theme files.

### 4.1 Homepage

File: `layouts/index.html`

This is the full homepage template. Key sections:

- **Profile image / name block** — The large centered title area
- **Navigation buttons** — Links to Projects, Archive, Journal, Experience
- **Social icons** — GitHub, LinkedIn links

**To add a navigation button**, find the nav buttons section and add a new `<a>` tag:

```html
<a href="/your-section/" class="nav-btn">Your Label</a>
```

**To change the homepage subtitle or description**, find the text directly in `layouts/index.html` and edit it.

---

### 4.2 Project Pages

- `layouts/projects/list.html` — The `/projects/` index page listing all projects
- `layouts/projects/single.html` — Individual project pages

**To change what metadata is shown on individual project pages**, edit `layouts/projects/single.html`. Project front matter fields (title, description, etc.) are available as `{{ .Params.fieldName }}`.

---

### 4.3 Head and Footer Partials

**`layouts/partials/head_custom.html`** — Injected into `<head>`. Use this to:
- Add new fonts (add a `<link>` tag)
- Add external scripts or CSS libraries
- Modify Tailwind configuration (the inline `tailwind.config` object)

**`layouts/partials/extend_footer.html`** — Injected before `</body>`. Contains:
- The sticky theme/language toggle bar HTML
- The JavaScript that handles theme switching and language toggling
- `localStorage` persistence for user preferences

To add a new toggle or control to the sticky bar, add it in `extend_footer.html` and style it in `custom.css`.

---

## 5. Site Configuration

Main config file: `hugo.toml`

**Common things to change:**

| Setting | Location in hugo.toml | Description |
|---------|----------------------|-------------|
| Site title | `[languages.en] title` | Browser tab and header title |
| Author name | `[params] author` | Used in meta tags |
| Site description | `[params] description` | SEO description |
| Social links | `[[params.socialIcons]]` | GitHub, LinkedIn, etc. |
| Navigation menu | `[[languages.en.menus.main]]` | Top nav links |
| Profile image | `[params] profileMode.imageUrl` | Homepage photo |

**Add a social icon:**

```toml
[[params.socialIcons]]
  name = "twitter"
  url  = "https://twitter.com/yourhandle"
```

PaperMod supports icons from [Simple Icons](https://simpleicons.org/). Use the lowercase icon name.

**Add a nav menu item:**

```toml
[[languages.en.menus.main]]
  name       = "Resume"
  url        = "/resume/"
  weight     = 50
```

Lower `weight` = appears earlier in the menu.

---

## 6. Local Development

**Prerequisites:** Hugo Extended v0.146.0+

**Start the dev server:**

```bash
hugo server -D
```

- `-D` includes draft posts
- Site is available at `http://localhost:1313`
- Changes to content and CSS hot-reload automatically

**Build the site locally:**

```bash
hugo
```

Output is written to `public/` (excluded from git).

**Update the PaperMod theme submodule:**

```bash
git submodule update --remote --merge
```

---

## 7. Deployment

Deployment is fully automated via GitHub Actions (`.github/workflows/hugo.yaml`).

**To publish changes:**

1. Commit your changes to the `main` branch
2. Push to GitHub:
   ```bash
   git add .
   git commit -m "describe your change"
   git push
   ```
3. GitHub Actions builds the site and deploys to GitHub Pages automatically
4. The live site at `yoosung.dev` updates within ~1–2 minutes

**To publish a draft post**, change `draft: false` in the post's front matter before committing.

---

## Quick Reference

| Task | Action |
|------|--------|
| New blog post | Create `content/posts/filename.md` with front matter |
| New project | Create `content/projects/filename.md` with front matter |
| Add Korean version | Create `content/.../filename.ko.md` |
| Change colors | Edit CSS variables in `assets/css/extended/custom.css` |
| Change fonts | Update `--font-*` variables and Google Fonts link |
| Change homepage text | Edit `layouts/index.html` |
| Add nav link | Add entry to `layouts/index.html` nav section and `hugo.toml` menus |
| Add social icon | Add `[[params.socialIcons]]` entry in `hugo.toml` |
| Preview locally | Run `hugo server -D` |
| Deploy | Push to `main` branch |
