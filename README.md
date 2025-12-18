# 🏆 Ideal World Cup (이상형 월드컵)
<br/>

## 📌 프로젝트 기획 배경

* **트렌드 분석 :** 대중들은 MBTI 테스트와 같이 **가볍게 참여하고 결과를 공유**하는 콘텐츠에 높은 반응을 보인다는 점에 착안했습니다.
* **핵심 목표 :** 단순한 토이 프로젝트를 넘어, **'참여와 공유'가 자연스럽게 연결되는 선순환 구조**의 실사용자 기반 웹 서비스를 구축하고자 시작했습니다.
* **콘텐츠 선정 :** 이러한 목표를 가장 잘 구현할 수 있는 콘텐츠로, 다양한 주제의 토너먼트 게임을 즐기는 **이상형 월드컵**을 채택했습니다.
* **확산 설계 :** 사용자가 게임 결과를 공유할 수 있도록 구현하여, **하나의 참여가 새로운 유입으로 이어지는 바이럴(Viral) 마케팅 구조**를 기획했습니다.

**▶️ 본 프로젝트는 사용자 중심의 가치를 실현하고자 출발했으며, 현재 핵심 로직 구현을 마무리하는 단계에 있습니다.**

<br/><br/>

## 🖼️ 주요 기능 시연

|  | 서비스 화면 |
| :--- | :--- |
| **생성** | ![월드컵 생성 과정](assets/create.gif) |
| **게임** | ![사용자 월드컵 참여 시연](assets/worldcup.gif) |
| **결과** | ![결과 확인 시연](assets/result.gif) |

<br/><br/>

# ✨ 핵심 기술 스택

### 💻 프론트엔드

| 분류 | 기술 스택 |
| :--- | :--- |
| **언어** | <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white"/> <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white"/> |
| **프레임워크** | <img src="https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black"/> <img src="https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white"/> |
| **스타일링/UI** | <img src="https://img.shields.io/badge/Tailwind CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white"/> <img src="https://img.shields.io/badge/shadcn%2Fui-000000?style=flat&logo=vercel&logoColor=white"/> |

### ⚙️ 백엔드 및 DB

| 분류 | 기술 스택 |
| :--- | :--- |
| **런타임 / 프레임워크** | <img src="https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white"/> <img src="https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white"/> |
| **API / DB** | <img src="https://img.shields.io/badge/RESTful API-0052CC?style=flat&logo=apache&logoColor=white"/> <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white"/> |

<br/><br/>
<br/><br/>

# 🛠️ API 명세서

### 🔐 Admin API (관리자 세션 관리)
관리자 API는 `admin_session` HttpOnly 쿠키를 통해 권한을 확인합니다.

| 기능 | Method | Endpoint | 설명 | 상세 내용 및 주요 에러 코드 |
| :--- | :---: | :--- | :--- | :--- |
| **admin 로그인** | `POST` | `/admin/login` | Supabase 인증 | •  `accessToken` 검증 후 화이트리스트 이메일 확인, 세션 쿠키 발급<br/>• `400`(토큰 누락) `401`(invalid 토큰) `403`(권한 없음) |
| **게임 생성** | `POST` | `/admin/worldcup` | 신규 게임 등록 |  • `title` 필수, `images` 32장 업로드 필수 <br/>• `400`(필수 데이터 부족) `500`(DB 생성 실패) |

### 🌍 Public API (사용자 공개 기능)
사용자 API에는 서비스 안정성을 위해 **Rate Limit**이 적용되어 있습니다.

| 기능 | Method | Endpoint | 설명 | 상세 내용 및 주요 에러 코드 |
| :--- | :---: | :--- | :--- | :--- |
| **결과 저장** | `POST` | `/public/worldcup/:id/result` | 우승 결과 데이터 기록 | •  `winnerImageId`, `winnerName` 필수, Rate Limit 적용<br/>• `400`(ID 오류) `429`(요청 제한) `500`(저장 실패) |
| **결과 조회** | `GET` | `/public/worldcup/:id/result` | 최근 우승 정보 조회 | •  `created_at` 기준 최신 1개 조회 및 이미지 URL 조인<br/>• `400`(ID 오류) `404`(결과 없음) `500`(조회 실패)  |
| **댓글 조회** | `GET` | `/public/worldcup/:id/comments` | 전체 댓글 최신순 조회 | •  `created_at DESC` 정렬, 우승자 정보 포함<br/>• `400`(ID 오류) `404`(게임 없음) `500`(조회 실패)  |
| **댓글 작성** | `POST` | `/public/worldcup/:id/comments` | 익명 댓글 작성 | • 최대 150자 입력 가능, Length Limit 적용<br/>• `400`(검증 실패) `429`(요청 제한) `500`(저장 실패)  |

### 🚦 Rate Limit (요청 제한)
| API 구분 | 1분 제한 | 1시간 제한 | 1일 제한 | 초과 시 응답 |
| :--- | :---: | :---: | :---: | :--- |
| **결과 저장** | 4회 | 60회 | 300회 | `429 Too Many Requests` |
| **댓글 작성** | 4회 | 100회 | 300회 | `429 Too Many Requests` |

<br/><br/>
