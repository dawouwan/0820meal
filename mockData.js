// API 조회가 실패했을 때 UI가 그래도 동작함을 보여주기 위한 예시 데이터.
// nearbyApi.js의 정규화 결과와 동일한 형태(name/category/roadAddress/tel/sidoCode/sigunguCode)로 맞춰뒀다.
// category는 이미 categoryMap.js의 표시 카테고리로 정규화된 값이다.

export const MOCK_RESTAURANTS = [
  { id: 'mock-1', name: '온달집', category: '한식', roadAddress: '서울 마포구 월드컵로 12', tel: '02-000-1111', sidoCode: '11', sigunguCode: '11440' },
  { id: 'mock-2', name: '홍대국밥', category: '한식', roadAddress: '서울 마포구 양화로 45', tel: '02-000-1112', sidoCode: '11', sigunguCode: '11440' },
  { id: 'mock-3', name: '연남分식', category: '한식', roadAddress: '서울 마포구 성미산로 8', tel: '', sidoCode: '11', sigunguCode: '11440' },
  { id: 'mock-4', name: '오마카세 스시야', category: '일식', roadAddress: '서울 마포구 와우산로 21', tel: '02-000-1113', sidoCode: '11', sigunguCode: '11440' },
  { id: 'mock-5', name: '망원 이자카야', category: '일식', roadAddress: '서울 마포구 망원로 3', tel: '02-000-1114', sidoCode: '11', sigunguCode: '11440' },
  { id: 'mock-6', name: '마포 브런치', category: '양식', roadAddress: '서울 마포구 신촌로 14', tel: '02-000-1115', sidoCode: '11', sigunguCode: '11440' },
  { id: 'mock-7', name: '상수 로스터리', category: '카페·디저트', roadAddress: '서울 마포구 독막로 9', tel: '', sidoCode: '11', sigunguCode: '11440' },
  { id: 'mock-8', name: '합정 베이커리', category: '카페·디저트', roadAddress: '서울 마포구 양화로 100', tel: '02-000-1116', sidoCode: '11', sigunguCode: '11440' },

  { id: 'mock-9', name: '강남 한우마을', category: '한식', roadAddress: '서울 강남구 테헤란로 152', tel: '02-000-2221', sidoCode: '11', sigunguCode: '11680' },
  { id: 'mock-10', name: '역삼 중화반점', category: '중식', roadAddress: '서울 강남구 역삼로 30', tel: '02-000-2222', sidoCode: '11', sigunguCode: '11680' },
  { id: 'mock-11', name: '청담 파스타', category: '양식', roadAddress: '서울 강남구 압구정로 60', tel: '', sidoCode: '11', sigunguCode: '11680' },
  { id: 'mock-12', name: '삼성 스시오마카세', category: '일식', roadAddress: '서울 강남구 삼성로 512', tel: '02-000-2223', sidoCode: '11', sigunguCode: '11680' },
  { id: 'mock-13', name: '강남 스페셜티커피', category: '카페·디저트', roadAddress: '서울 강남구 강남대로 396', tel: '02-000-2224', sidoCode: '11', sigunguCode: '11680' },
  { id: 'mock-14', name: '역삼 포차', category: '기타', roadAddress: '서울 강남구 언주로 30', tel: '', sidoCode: '11', sigunguCode: '11680' },

  { id: 'mock-15', name: '해운대 참치', category: '일식', roadAddress: '부산 해운대구 구남로 20', tel: '051-000-3331', sidoCode: '26', sigunguCode: '26350' },
  { id: 'mock-16', name: '해리단길 파스타', category: '양식', roadAddress: '부산 해운대구 달맞이길 5', tel: '051-000-3332', sidoCode: '26', sigunguCode: '26350' },
  { id: 'mock-17', name: '해운대 돼지국밥', category: '한식', roadAddress: '부산 해운대구 우동 중심', tel: '051-000-3333', sidoCode: '26', sigunguCode: '26350' },
  { id: 'mock-18', name: '동백섬 카페', category: '카페·디저트', roadAddress: '부산 해운대구 동백로 52', tel: '', sidoCode: '26', sigunguCode: '26350' },

  { id: 'mock-19', name: '전주 비빔밥집', category: '한식', roadAddress: '전북특별자치도 전주시 완산구 어은길 7', tel: '063-000-4441', sidoCode: '52', sigunguCode: '52111' },
  { id: 'mock-20', name: '한옥마을 떡카페', category: '카페·디저트', roadAddress: '전북특별자치도 전주시 완산구 태조로 10', tel: '063-000-4442', sidoCode: '52', sigunguCode: '52111' },
];
