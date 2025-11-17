# 프로젝트 기획서 — Ideal World Cup (이상형 월드컵 서비스)

## 🎯 Goal
운영자와 익명의 사용자들이 다양한 주제의 “이상형 월드컵(토너먼트 구조)”을 만들고 참여할 수 있는 웹 서비스 구축.

---

## 💬 Tech Stack & Structure

### Frontend
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **API Communication**: RESTful API (fetch/axios)
- **Image Upload**: Supabase Storage
- **Deployment**: Vercel

### Backend
- **Framework**: Express.js (Node.js)
- **Language**: TypeScript
- **Database**: Supabase(PostgreSQL)
- **API Style**: RESTful
- **Deployment**: Render or Railway
- **Shared Types**: `/shared` 폴더에 프론트·백 공용 타입 정의

### CI/CD
- **GitHub Actions**
  - main 브랜치 push 시 자동 테스트 & Lint
  - Docker 빌드 및 배포 자동화 (Render or Railway /Vercel 연결)

### Containerization
- **Docker Compose**
  - frontend / backend / db(Postgres) 세 컨테이너 실행
  - 환경 변수는 `.env` 파일로 관리

---

## ⚙️ Setup 순서

> 참고 사항: 안정적인 세팅 순서

1. **프론트엔드 설정**  
   - `npx create-next-app@latest frontend --ts --eslint --app --src-dir false --import-alias "@/*"`
   - `npm i zustand @supabase/supabase-js`
   - axios 설치
   
2. **백엔드 설정**  
   - `npx express-generator backend --no-view` 후 TypeScript 적용  
   - API 기본 구조 (`routes`, `controllers`, `models`)
   
3. **shared 폴더 생성**  
   - `types.ts`, `zodSchemas.ts` 등 공용 타입 정의

4. **Docker 환경 세팅**  
   - `Dockerfile`, `docker-compose.yml` 작성  
   - 로컬에서 frontend/backend/db 통합 실행 확인

5. **Supabase 연결**  
   - Supabase 프로젝트 생성  
   - .env에 `SUPABASE_URL`, `SUPABASE_KEY` 추가  
   - 초기 테이블 생성 (아래 참고)

6. **GitHub Actions 구성**  
   - `.github/workflows/deploy.yml` 추가  
   - main push → 자동 빌드 및 배포 트리거

7. **배포 연결**  
   - 프론트: Vercel 연결  
   - 백엔드: Render/Railway Docker로 배포  
   - Supabase는 클라우드 DB로 자동 연결됨

---

## 💬 Core Features (Step by Step)

1. **월드컵 생성**
   - 운영자가 /hidden-admin에서 로그인하면 -> 루트페이지로 리다이렉트
   - 로그인 후, 헤더 옆에 생성된 "새 월드컵 생성하기" 버튼 (로그인 전에는 안 보임)
   - "새 월드컵 생성하기" 버튼 누르면, 게시물 올릴 수 있는 페이지 띄워짐
   - 그 페이지에 "제목, 설명, 이미지(최소 32개 업로드)" 등록.
     이 때, 이미지는 내 컴퓨터에서 찾아서 첨부하는 형식으로 구현.
     용량 최적화 webp 변환 생각해보기.
   - 그리고 생성 버튼 누르면, 제목, 설명, 이미지들이 Supabase에 저장
   - “32개 이상 이미지가 있어야 등록 가능”

2. **월드컵 진행 로직**
   - src/app/page.tsx에 게시물 인기순or최신순으로 페이지네이션으로 구현
   - 비로그인 사용자도 참여 가능.
   - 기본 32강 → 16강 → 8강 → 4강 → 결승 → 우승
   - 각 라운드마다 랜덤하게 1:1 비교 → 선택된 항목만 다음 라운드로 이동  
   - 최종 우승자(이미지 ID, 이름) 저장

3. **결과 & 댓글 기능**
   - 로그인 없이 익명 댓글 작성 가능 (닉네임 입력 optional)
   - 각 월드컵의 우승 결과 페이지에 댓글 표시  
   - 댓글 테이블에서 해당 tournament_id 기준으로 fetch

4. **공유 기능**
   - 우승 결과 페이지에서 “카카오톡 공유하기” 버튼 (Kakao SDK 연동)
   - 선택한 결과 이미지 + 제목 + 링크 공유

---

## 💬 Database Design (Supabase PostgreSQL)

### 1️⃣ tournaments
| Column      | Type      | Description         |
| ----------- | --------- | ------------------- |
| id          | uuid      | PK 기본키            |
| title       | text      | 월드컵 제목          |
| description | text      | 간단 설명 (nullable) |
| created_at  | timestamp | 생성 시각            |

### 2️⃣ images
| Column        | Type      | Description |
| ------------- | --------- | ----------- |
| id            | uuid      | PK 기본키    |
| tournament_id | uuid      | FK          |
| image_url     | text      | 이미지 경로  |
| name          | text      | 후보 이름    |
| created_at    | timestamp | 업로드 시각  |


### 3️⃣ results
| Column          | Type      | Description |
| --------------- | --------- | ----------- |
| id              | uuid      | PK 기본키    |
| tournament_id   | uuid      | FK          |
| winner_image_id | uuid      | FK          |
| winner_name     | text      | 우승 이름    |
| created_at      | timestamp | 결과 시각    |

### 4️⃣ comments
| Column        | Type      | Description |
| ------------- | --------- | ----------- |
| id            | uuid      | PK 기본키    |
| tournament_id | uuid      | FK          |
| nickname      | text      | 익명 닉네임  |
| content       | text      | 댓글 내용    |
| created_at    | timestamp | 작성 시각    |

---

## 💬 Tournament Logic Summary
| 단계 | 남은 후보 수 | 필요한 이미지 수 | 비교 횟수 |
|------|-------------|-----------------|----------|
| 32강 | 32          | ✅ 32개 필요    | 16회     |
| 16강 | 16          | 자동 선정        | 8회      |
| 8강  | 8           | 자동 선정        | 4회      |
| 4강  | 4           | 자동 선정        | 2회      |
| 결승 | 2           | 자동 선정        | 1회      |
| ✅ 최종 필요 이미지 개수 | **32장** |

---

## 💬 Implementation Notes

- 상태 관리는 **Zustand**로 현재 라운드, 남은 후보, 선택된 이미지 관리  
- 게임 종료 시 우승자 데이터 백엔드에 POST 
- 결과 저장 API: `POST / api/result`
- 댓글 저장 API: `POST / api/comments`
- 댓글 작성은 Supabase REST API 직접 호출 (Auth 미사용)
- 프론트는 Vercel, 백엔드는 Render or Railway에 배포 (환경변수는 각각 설정)
- Docker로 로컬 테스트 (`docker-compose up`)

---

## 💬 Example Folder Structure

root/
├── frontend/ # Next.js + TS + Tailwind + ShadcnUI + Zustand
├── backend/ # Express + TS + Supabase 연결
├── shared/ # 공용 타입 정의
├── docker-compose.yml
├── .github/workflows/deploy.yml
└── README.md

---

## 프론트엔드 트리구조

frontend/features/worldcup
    api/

    components/



frontend/src/app
    (admin)/
        hidden-admin/
            page.tsx        // 로그인 폼 구현
        worldcup/create/
            page.tsx        // 이상형월드컵 게시물 만들기

    (public)/
        worldcup/[id]/      // 게시물 id
            page.tsx        // 클릭 시 보이는 게임 페이지
            result/
                page.tsx    // 결과 페이지: 최종 우승 페이지 + 댓글
        page.tsx            // 루트페이지

    components/             // 컴포넌트
        dark-toggle.tsx
        Footer.tsx
        Header.tsx
        theme-provider.tsx

    globals.css             // 전역css
    layout.tsx              // 공통 레이아웃 (헤더푸터)

---

