import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "../shared/schema";
import { randomBytes, scrypt as scryptCallback } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scryptCallback);

// SQLite 데이터베이스 연결
const sqlite = new Database('fireguard.db');
const db = drizzle(sqlite, { schema });

// 비밀번호 해싱 함수
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  console.log("🌱 시드 데이터 생성 시작...\n");

  try {
    // 1. 관리자 계정 생성
    console.log("👤 관리자 계정 생성 중...");
    const adminPassword = await hashPassword("admin1234");
    const [admin] = await db.insert(schema.users).values({
      username: "admin",
      password: adminPassword,
      name: "시스템 관리자",
      email: "admin@fireguard.com",
      role: "admin",
      certificationNumber: "ADMIN-2024-001"
    }).returning();
    console.log(`   ✓ 관리자: ${admin.username} (비밀번호: admin1234)`);

    // 2. 매니저 계정 생성
    console.log("\n👤 매니저 계정 생성 중...");
    const managerPassword = await hashPassword("manager1234");
    const [manager] = await db.insert(schema.users).values({
      username: "manager",
      password: managerPassword,
      name: "김관리",
      email: "manager@fireguard.com",
      role: "manager",
      certificationNumber: "MGR-2024-001"
    }).returning();
    console.log(`   ✓ 매니저: ${manager.username} (비밀번호: manager1234)`);

    // 3. 점검자 계정 생성
    console.log("\n👤 점검자 계정 생성 중...");
    const inspectorPassword = await hashPassword("inspector1234");
    const [inspector] = await db.insert(schema.users).values({
      username: "inspector",
      password: inspectorPassword,
      name: "이점검",
      email: "inspector@fireguard.com",
      role: "inspector",
      certificationNumber: "INSP-2024-001"
    }).returning();
    console.log(`   ✓ 점검자: ${inspector.username} (비밀번호: inspector1234)`);

    // 4. 샘플 건물 데이터 생성
    console.log("\n🏢 샘플 건물 데이터 생성 중...");
    const buildings = await db.insert(schema.buildings).values([
      {
        name: "강남타워",
        address: "서울특별시 강남구 테헤란로 123",
        type: "commercial",
        floors: 15,
        contactPerson: "박담당",
        contactPhone: "02-1234-5678"
      },
      {
        name: "서초오피스텔",
        address: "서울특별시 서초구 서초대로 456",
        type: "residential",
        floors: 20,
        contactPerson: "최담당",
        contactPhone: "02-2345-6789"
      },
      {
        name: "송파공장",
        address: "서울특별시 송파구 올림픽로 789",
        type: "industrial",
        floors: 5,
        contactPerson: "정담당",
        contactPhone: "02-3456-7890"
      },
      {
        name: "판교스타트업빌딩",
        address: "경기도 성남시 분당구 판교역로 100",
        type: "commercial",
        floors: 12,
        contactPerson: "강담당",
        contactPhone: "031-1234-5678"
      },
      {
        name: "부산센터시티",
        address: "부산광역시 해운대구 센텀중앙로 200",
        type: "commercial",
        floors: 25,
        contactPerson: "윤담당",
        contactPhone: "051-1234-5678"
      }
    ]).returning();
    console.log(`   ✓ ${buildings.length}개 건물 생성 완료`);

    // 5. 샘플 장비 데이터 생성
    console.log("\n🔧 샘플 장비 데이터 생성 중...");
    const equipmentData = [];
    const equipmentTypes = ['extinguisher', 'sprinkler', 'smoke_detector', 'alarm', 'emergency_exit'];

    buildings.forEach((building, idx) => {
      // 각 건물마다 5-10개의 장비 생성
      const equipmentCount = 5 + Math.floor(Math.random() * 6);
      for (let i = 0; i < equipmentCount; i++) {
        const type = equipmentTypes[Math.floor(Math.random() * equipmentTypes.length)];
        equipmentData.push({
          buildingId: building.id,
          type,
          location: `${Math.floor(Math.random() * building.floors) + 1}층 ${['북', '남', '동', '서'][Math.floor(Math.random() * 4)]}측`,
          serialNumber: `EQ-${building.id.substring(0, 8)}-${String(i + 1).padStart(3, '0')}`,
          installationDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
          lastInspectionDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
          status: 'active'
        });
      }
    });

    const equipment = await db.insert(schema.equipment).values(equipmentData).returning();
    console.log(`   ✓ ${equipment.length}개 장비 생성 완료`);

    // 6. 샘플 점검 데이터 생성
    console.log("\n📋 샘플 점검 데이터 생성 중...");
    const inspectionData = [];
    const inspectionTypes = ['routine', 'emergency', 'annual'];
    const statuses = ['scheduled', 'in_progress', 'completed'];

    buildings.forEach((building) => {
      // 각 건물마다 3-5개의 점검 생성
      const inspectionCount = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < inspectionCount; i++) {
        const scheduledDate = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000);
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        inspectionData.push({
          buildingId: building.id,
          inspectorId: inspector.id,
          type: inspectionTypes[Math.floor(Math.random() * inspectionTypes.length)],
          scheduledDate,
          completedDate: status === 'completed' ? new Date(scheduledDate.getTime() + 2 * 60 * 60 * 1000) : null,
          status,
          notes: `${building.name} ${i + 1}차 점검`
        });
      }
    });

    const inspections = await db.insert(schema.inspections).values(inspectionData).returning();
    console.log(`   ✓ ${inspections.length}개 점검 생성 완료`);

    // 7. 샘플 점검 항목 데이터 생성
    console.log("\n✅ 샘플 점검 항목 생성 중...");
    const inspectionItemsData = [];

    for (const inspection of inspections.slice(0, 10)) { // 최근 10개 점검만
      // 해당 건물의 장비 가져오기
      const buildingEquipment = equipment.filter(eq => eq.buildingId === inspection.buildingId);

      // 일부 장비에 대해 점검 항목 생성 (3-5개)
      const itemCount = Math.min(3 + Math.floor(Math.random() * 3), buildingEquipment.length);
      for (let i = 0; i < itemCount; i++) {
        const eq = buildingEquipment[i];
        inspectionItemsData.push({
          inspectionId: inspection.id,
          equipmentId: eq.id,
          status: ['pass', 'fail', 'needs_attention'][Math.floor(Math.random() * 3)],
          notes: `${eq.type} 점검 완료`,
          photos: []
        });
      }
    }

    const inspectionItems = await db.insert(schema.inspectionItems).values(inspectionItemsData).returning();
    console.log(`   ✓ ${inspectionItems.length}개 점검 항목 생성 완료`);

    // 8. 샘플 규정 준수 규칙 생성
    console.log("\n📜 규정 준수 규칙 생성 중...");
    const complianceRules = await db.insert(schema.complianceRules).values([
      {
        code: "FIRE-001",
        description: "소화기 정기 점검 (6개월마다)",
        frequency: 180,
        equipmentType: "extinguisher",
        isActive: true
      },
      {
        code: "FIRE-002",
        description: "스프링클러 시스템 점검 (3개월마다)",
        frequency: 90,
        equipmentType: "sprinkler",
        isActive: true
      },
      {
        code: "FIRE-003",
        description: "화재 감지기 점검 (1개월마다)",
        frequency: 30,
        equipmentType: "smoke_detector",
        isActive: true
      },
      {
        code: "FIRE-004",
        description: "화재 경보 시스템 점검 (3개월마다)",
        frequency: 90,
        equipmentType: "alarm",
        isActive: true
      },
      {
        code: "FIRE-005",
        description: "비상구 및 유도등 점검 (1개월마다)",
        frequency: 30,
        equipmentType: "emergency_exit",
        isActive: true
      }
    ]).returning();
    console.log(`   ✓ ${complianceRules.length}개 규정 생성 완료`);

    // 통계 출력
    console.log("\n" + "=".repeat(50));
    console.log("✨ 시드 데이터 생성 완료!");
    console.log("=".repeat(50));
    console.log(`
📊 생성된 데이터 요약:
   • 사용자: 3명 (admin, manager, inspector)
   • 건물: ${buildings.length}개
   • 장비: ${equipment.length}개
   • 점검: ${inspections.length}개
   • 점검 항목: ${inspectionItems.length}개
   • 규정: ${complianceRules.length}개

🔐 로그인 정보:
   • 관리자: admin / admin1234
   • 매니저: manager / manager1234
   • 점검자: inspector / inspector1234

🌐 서버 접속: http://localhost:5000
    `);

  } catch (error) {
    console.error("\n❌ 시드 데이터 생성 실패:", error);
    throw error;
  } finally {
    sqlite.close();
  }
}

// 실행
seed()
  .then(() => {
    console.log("✅ 시드 스크립트 실행 완료");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 시드 스크립트 실행 실패:", error);
    process.exit(1);
  });
