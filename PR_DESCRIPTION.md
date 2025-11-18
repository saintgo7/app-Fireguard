# Migrate to SQLite and add seed data for local development

## Summary
이 PR은 FireGuard 애플리케이션을 로컬 개발 환경에서 쉽게 실행할 수 있도록 데이터베이스를 PostgreSQL에서 SQLite로 마이그레이션하고, 테스트용 시드 데이터를 추가합니다.

## Changes

### 1. Database Migration (PostgreSQL → SQLite)
- **Neon PostgreSQL을 better-sqlite3로 교체**
  - 외부 데이터베이스 서비스 불필요
  - 로컬 파일 기반 (`fireguard.db`)
  - 설정 간소화

- **Database Schema 업데이트**
  - `pgTable` → `sqliteTable` 변환
  - `varchar`, `timestamp`, `jsonb` → SQLite 타입 변환
  - UUID 생성: `crypto.randomUUID()` 사용
  - 타임스탬프: INTEGER 모드로 저장

- **Session Store 변경**
  - PostgreSQL session store → MemoryStore
  - 프로덕션 환경에서는 `better-sqlite3-session-store` 권장

### 2. TypeScript Error Fixes
- **9개의 타입 에러 수정**
  - `@types/better-sqlite3` 설치
  - SQLite의 `changes` 속성 사용 (PostgreSQL의 `rowCount` 대체)
  - 중복 메서드명 수정 (`detectConflicts` → `hasTimeConflicts`)
  - Null/undefined 타입 처리 개선
  - InsertInspection 스키마 수정

### 3. Seed Data Script
- **테스트 데이터 자동 생성 스크립트**
  - 3명의 테스트 사용자 (admin, manager, inspector)
  - 5개 샘플 건물 (서울, 부산, 경기)
  - 34개 소방 장비
  - 21개 점검 기록
  - 41개 점검 항목
  - 5개 규정 준수 규칙

- **실행 방법**: `npm run db:seed`

### 4. Configuration Updates
- `.gitignore` 업데이트 (SQLite DB 파일, .env 제외)
- `drizzle.config.ts` SQLite 설정
- Migration 파일 생성

## Test Plan
✅ TypeScript 컴파일 에러 없음 (`npm run check`)
✅ 서버 정상 실행 (`npm run dev`)
✅ API 엔드포인트 정상 작동
  - `/api/buildings` - 5개 건물 반환
  - `/api/dashboard/stats` - 통계 정상 조회
  - `/api/equipment` - 34개 장비 반환
✅ 시드 데이터 정상 생성

## Test Accounts
로그인하여 테스트할 수 있습니다:

| Username | Password | Role | 권한 |
|----------|----------|------|------|
| admin | admin1234 | Admin | 모든 기능 접근 |
| manager | manager1234 | Manager | 점검원 관리, Excel 가져오기 |
| inspector | inspector1234 | Inspector | 점검 수행 |

## Breaking Changes
⚠️ **데이터베이스 변경**
- PostgreSQL → SQLite 마이그레이션
- 기존 PostgreSQL 데이터는 마이그레이션되지 않음
- 프로덕션 배포 시 고려사항:
  - `SESSION_SECRET` 환경 변수 필수
  - 세션 스토어를 Redis 또는 `better-sqlite3-session-store`로 변경 권장

## Files Changed
- `.gitignore` - DB 파일 및 .env 제외 규칙 추가
- `drizzle.config.ts` - SQLite 설정
- `server/db.ts` - better-sqlite3 연결
- `server/storage.ts` - MemoryStore 사용, rowCount → changes
- `shared/schema.ts` - SQLite 스키마 변환
- `package.json` - better-sqlite3 의존성, db:seed 스크립트 추가
- `scripts/seed.ts` - 새로운 시드 데이터 생성 스크립트
- `migrations/` - Drizzle 마이그레이션 파일

## Commits
- `10ef2dc` - Migrate database from PostgreSQL to SQLite for local development
- `b27e2a7` - Fix TypeScript errors for SQLite compatibility
- `77f98f9` - Add database seed script for test data

## Screenshots
서버 실행 및 시드 데이터 생성:
```
🌱 시드 데이터 생성 시작...
✓ 관리자: admin (비밀번호: admin1234)
✓ 매니저: manager (비밀번호: manager1234)
✓ 점검자: inspector (비밀번호: inspector1234)
✓ 5개 건물 생성 완료
✓ 34개 장비 생성 완료
✓ 21개 점검 생성 완료
✓ 41개 점검 항목 생성 완료
✓ 5개 규정 생성 완료
```

## Next Steps
- [ ] 프로덕션 배포 시 세션 스토어 업그레이드
- [ ] 환경 변수 설정 (SESSION_SECRET)
- [ ] SQLite 백업 전략 수립
- [ ] 성능 테스트 (대량 데이터)

---

**Ready for review and testing!** 🚀

Local development is now much simpler:
```bash
npm install
npm run db:seed
npm run dev
```

Then visit http://localhost:5000 and login with test accounts.
