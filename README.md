# RadioKorea Job Board Scraper & Visualizer

본 프로젝트는 라디오코리아 구인 게시판의 데이터를 수집하여 직관적인 UI로 시각화하는 학습 및 연구 목적의 도구입니다.

## ⚠️ Disclaimer (면책 조항)
**본 코드는 오직 학습 및 연구 목적으로 작성되었으며, 실제 사용 시 발생하는 모든 책임은 사용자에게 있습니다.** 
서버 부하를 최소화하기 위해 지연 시간을 포함하고 있으며, 사이트의 이용 약관 및 운영 정책을 준수하시기 바랍니다.

## 🛡️ 프로젝트 가이드라인 준수 사항
- **예의 바른 크롤링**: `delay` 유틸리티를 사용하여 각 페이지 요청 사이에 500ms~1000ms의 지연 시간을 두어 서버에 무리를 주지 않습니다.
- **데이터 보안**: 스크래핑된 실제 데이터는 저장하지 않으며, 메모리 내에서만 처리되어 클라이언트에 전달됩니다.
- **오픈 소스**: 본 코드는 로직 공유를 목적으로 하며, 수집된 데이터를 상업적으로 활용하는 것을 금지합니다.

## 🚀 시작하기

### Backend (API Server)
```bash
cd backend
npm install
node server.js
```

### Frontend (Next.js Dashboard)
```bash
cd client-next
npm install
npm run dev
```

---
© 2026 RadioKorea Scraper Study.
