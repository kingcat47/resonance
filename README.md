# React Template

내가 쓸려고 만든 템플릿임.

## 🚀 사용 방법

```bash
# 1. 템플릿으로 프로젝트 생성
npx degit kingcat47/React_default-template .

# 2. 패키지 설치
npm install

# 3. .env 설정
cp .env.example .env

# 4. Git 초기화 및 원격 저장소 연결
git init
git remote add origin repo_url
git add .
git commit -m "Initial commit from template"
git push -u origin main
```

## 📦 포함된 기능

- ⚡ Vite + React 19 + TypeScript
- 🎨 SCSS Modules (variables.scss 전역 자동 주입)
- 🧩 재사용 가능한 UI 컴포넌트
- 🗂️ RootLayout + Outlet 기반 라우터 구조
- 📁 체계적인 폴더 구조
- 🔧 ESLint 설정

## 🗂️ 라우터 구조

Header가 필요한 일반 페이지는 `children` 안에, 로그인처럼 Header 없는 페이지는 바깥에 추가.

```tsx
// src/router.tsx
const Router = createBrowserRouter([
  {
    element: <RootLayout />,   // Header 포함
    children: [
      { path: "/", element: <Home /> },
      { path: "/about", element: <About /> },  // 페이지 추가
    ],
  },
  {
    path: "/auth/login",       // Header 없는 페이지
    element: <Login />,
  },
]);
```

## 🛠️ 컴포넌트

| 컴포넌트 | 설명 |
|---|---|
| `Button` | size(large/medium), variant(primary/secondary/tertiary), pending 스피너 |
| `Input` | label, size, variant, error 메시지, 좌우 아이콘 |
| `Checkbox` | controlled/uncontrolled, indeterminate, label/description/error |
| `Typo` | Display / Headline / BodyLarge / Body / Subtext / Caption |
| `HStack` / `VStack` | flex 레이아웃, align/justify/gap prop |
| `Spacing` | 수직/수평 여백 컴포넌트 |
| `Header` | 로고 + 네비게이션 + 로그인 버튼 |
| `MainLayout` | 최대 너비 1200px 컨텐츠 래퍼 |
