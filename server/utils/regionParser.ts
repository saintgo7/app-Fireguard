/**
 * 한국 주소에서 지역 정보를 추출하는 유틸리티
 * Korean address region extraction utility
 */

export interface RegionInfo {
  sido: string; // 시/도 (Province/Metropolitan City)
  sigungu: string; // 시·군·구 (City/County/District)
}

// 한국의 시/도 목록
const SIDO_LIST = [
  '서울특별시', '부산광역시', '대구광역시', '인천광역시', 
  '광주광역시', '대전광역시', '울산광역시', '세종특별자치시',
  '경기도', '강원도', '충청북도', '충청남도', 
  '전라북도', '전라남도', '경상북도', '경상남도', '제주특별자치도'
];

// 시/도 별칭 매핑 (축약형)
const SIDO_ALIASES: Record<string, string> = {
  '서울': '서울특별시',
  '부산': '부산광역시',
  '대구': '대구광역시',
  '인천': '인천광역시',
  '광주': '광주광역시',
  '대전': '대전광역시',
  '울산': '울산광역시',
  '세종': '세종특별자치시',
  '경기': '경기도',
  '강원': '강원도',
  '충북': '충청북도',
  '충남': '충청남도',
  '전북': '전라북도',
  '전남': '전라남도',
  '경북': '경상북도',
  '경남': '경상남도',
  '제주': '제주특별자치도'
};

/**
 * 주소에서 시/도를 추출
 */
function extractSido(address: string): string {
  // 정확한 시/도명으로 먼저 검색
  for (const sido of SIDO_LIST) {
    if (address.includes(sido)) {
      return sido;
    }
  }
  
  // 축약형으로 검색
  for (const [alias, fullName] of Object.entries(SIDO_ALIASES)) {
    if (address.includes(alias)) {
      return fullName;
    }
  }
  
  return '기타';
}

/**
 * 주소에서 시·군·구를 추출
 */
function extractSigungu(address: string): string {
  // 구 단위 추출 (서울, 부산, 대구, 인천, 광주, 대전, 울산)
  const guMatch = address.match(/([가-힣]+구)(?:\s|$)/);
  if (guMatch) {
    return guMatch[1];
  }
  
  // 시 단위 추출 (경기도 등의 시)
  const siMatch = address.match(/([가-힣]+시)(?:\s|$)/);
  if (siMatch) {
    return siMatch[1];
  }
  
  // 군 단위 추출
  const gunMatch = address.match(/([가-힣]+군)(?:\s|$)/);
  if (gunMatch) {
    return gunMatch[1];
  }
  
  return '기타';
}

/**
 * 한국 주소에서 지역 정보 추출
 * @param address 주소 문자열
 * @returns 시/도와 시·군·구 정보
 */
export function parseRegion(address: string): RegionInfo {
  if (!address || typeof address !== 'string') {
    return { sido: '기타', sigungu: '기타' };
  }
  
  const cleanAddress = address.trim();
  
  const sido = extractSido(cleanAddress);
  const sigungu = extractSigungu(cleanAddress);
  
  return { sido, sigungu };
}

/**
 * 지역별 통계를 위한 지역 그룹핑
 * @param regions 지역 정보 배열
 * @returns 지역별 개수 통계
 */
export function aggregateRegions(regions: RegionInfo[]): Array<RegionInfo & { count: number }> {
  const regionMap = new Map<string, number>();
  
  regions.forEach(region => {
    const key = `${region.sido}|${region.sigungu}`;
    regionMap.set(key, (regionMap.get(key) || 0) + 1);
  });
  
  return Array.from(regionMap.entries()).map(([key, count]) => {
    const [sido, sigungu] = key.split('|');
    return { sido, sigungu, count };
  }).sort((a, b) => b.count - a.count); // 개수 순으로 정렬
}

/**
 * 주소 정규화 (중복 제거를 위한)
 * @param name 건물명
 * @param address 주소
 * @returns 정규화된 키
 */
export function normalizeAddressKey(name: string, address: string): string {
  const cleanName = name.trim().toLowerCase();
  const cleanAddress = address.trim().toLowerCase();
  return `${cleanName}|${cleanAddress}`;
}