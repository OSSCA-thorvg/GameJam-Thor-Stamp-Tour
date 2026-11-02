import { db } from './client';
import { gameResults, quizzes, spots, stamps } from './schema';

const SPOTS = [
  {
    name: '경복궁',
    description: '조선 왕조의 법궁. 광화문과 경회루가 있는 서울의 대표 궁궐.',
    lat: 37.5796,
    lng: 126.977,
    radiusM: 300,
  },
  {
    name: 'N서울타워',
    description: '남산 정상의 전망 타워. 서울 전경과 사랑의 자물쇠로 유명.',
    lat: 37.5512,
    lng: 126.9882,
    radiusM: 200,
  },
  {
    name: '북촌한옥마을',
    description: '경복궁과 창덕궁 사이의 전통 한옥 밀집 지역.',
    lat: 37.5826,
    lng: 126.9831,
    radiusM: 250,
  },
  {
    name: '광장시장',
    description: '빈대떡과 마약김밥으로 유명한 종로구의 전통 시장.',
    lat: 37.5701,
    lng: 126.9996,
    radiusM: 150,
  },
  {
    name: '덕수궁',
    description: '돌담길과 석조전으로 유명한 정동의 궁궐.',
    lat: 37.5658,
    lng: 126.9752,
    radiusM: 200,
  },
  {
    name: '여의도 한강공원',
    description: '봄 벚꽃 축제와 야경 명소. 한강을 따라 펼쳐진 시민 공원.',
    lat: 37.5284,
    lng: 126.9326,
    radiusM: 400,
  },
  {
    name: '테스트 지점 (내 위치)',
    description: '개발 테스트용 스탬프 지점. 실제 GPS 검증 테스트에 사용.',
    lat: 37.52092741431193,
    lng: 126.91232297252705,
    radiusM: 150,
  },
] as const;

type QuizSeed = { spot: string | null; question: string; choices: string[]; answerIndex: number };

const QUIZZES: QuizSeed[] = [
  { spot: '경복궁', question: '경복궁이 처음 지어진 해는?', choices: ['1392년', '1395년', '1443년', '1592년'], answerIndex: 1 },
  { spot: '경복궁', question: '경복궁의 정문 이름은?', choices: ['돈화문', '대한문', '광화문', '흥인지문'], answerIndex: 2 },
  { spot: '경복궁', question: '경복궁 안의 연못 위에 세워진 누각은?', choices: ['경회루', '향원정', '부용정', '주합루'], answerIndex: 0 },
  { spot: '경복궁', question: '경복궁을 창건한 조선의 왕은?', choices: ['태종', '세종', '태조', '정조'], answerIndex: 2 },
  { spot: 'N서울타워', question: 'N서울타워가 위치한 산은?', choices: ['북한산', '남산', '인왕산', '관악산'], answerIndex: 1 },
  { spot: 'N서울타워', question: 'N서울타워에서 연인들이 걸어두는 것으로 유명한 것은?', choices: ['소원 리본', '사랑의 자물쇠', '풍등', '엽서'], answerIndex: 1 },
  { spot: '북촌한옥마을', question: '북촌한옥마을은 어느 두 궁궐 사이에 있을까?', choices: ['경복궁과 창덕궁', '덕수궁과 경희궁', '창경궁과 종묘', '경복궁과 덕수궁'], answerIndex: 0 },
  { spot: '북촌한옥마을', question: "'북촌'이라는 이름의 유래는?", choices: ['북한산 아래 마을', '청계천과 종로의 북쪽 마을', '북대문 옆 마을', '북악산 정상 마을'], answerIndex: 1 },
  { spot: '광장시장', question: '광장시장의 대표 음식은?', choices: ['빈대떡', '춘천닭갈비', '부산어묵', '전주비빔밥'], answerIndex: 0 },
  { spot: '광장시장', question: '광장시장이 위치한 서울의 자치구는?', choices: ['중구', '종로구', '마포구', '용산구'], answerIndex: 1 },
  { spot: '덕수궁', question: '덕수궁의 정문 이름은?', choices: ['광화문', '돈화문', '대한문', '홍화문'], answerIndex: 2 },
  { spot: '덕수궁', question: '덕수궁 안에 있는 서양식 석조 건물의 이름은?', choices: ['석조전', '명정전', '인정전', '근정전'], answerIndex: 0 },
  { spot: '여의도 한강공원', question: '여의도 봄꽃 축제의 대표 꽃은?', choices: ['튤립', '벚꽃', '장미', '유채꽃'], answerIndex: 1 },
  { spot: '여의도 한강공원', question: '여의도에 있는 대한민국 입법부 건물은?', choices: ['정부서울청사', '대법원', '국회의사당', '헌법재판소'], answerIndex: 2 },
  { spot: null, question: '서울의 조선시대 이름은?', choices: ['한양', '평양', '개경', '웅진'], answerIndex: 0 },
  { spot: null, question: '조선의 수도를 한양으로 정한 인물은?', choices: ['왕건', '이성계', '이순신', '세종대왕'], answerIndex: 1 },
  { spot: null, question: '숭례문의 다른 이름은?', choices: ['동대문', '서대문', '남대문', '북대문'], answerIndex: 2 },
  { spot: null, question: '유네스코 세계문화유산으로 등재된 서울의 궁궐은?', choices: ['경복궁', '덕수궁', '창덕궁', '경희궁'], answerIndex: 2 },
  { spot: null, question: '서울을 가로질러 흐르는 강은?', choices: ['낙동강', '금강', '영산강', '한강'], answerIndex: 3 },
  { spot: null, question: '지하철 경복궁역이 있는 노선은?', choices: ['1호선', '2호선', '3호선', '4호선'], answerIndex: 2 },
];

async function main() {
  console.log('기존 데이터 삭제...');
  await db.delete(gameResults);
  await db.delete(stamps);
  await db.delete(quizzes);
  await db.delete(spots);

  console.log(`관광지 ${SPOTS.length}곳 입력...`);
  const inserted = await db.insert(spots).values([...SPOTS]).returning();
  const spotIdByName = new Map(inserted.map((s) => [s.name, s.id]));

  console.log(`퀴즈 ${QUIZZES.length}문항 입력...`);
  await db.insert(quizzes).values(
    QUIZZES.map((q) => ({
      spotId: q.spot ? (spotIdByName.get(q.spot) ?? null) : null,
      question: q.question,
      choices: q.choices,
      answerIndex: q.answerIndex,
    })),
  );

  console.log('시드 완료.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
