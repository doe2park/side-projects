# 도쿄 저장 지도

구글맵에 저장한 도쿄 장소(Google Takeout)를 한 장의 지도로 보는 페이지.

**열기:** https://doe2park.github.io/side-projects/tokyo-map/

## 기능
- 분류(식당·카페·술집·쇼핑 등)와 음식 종류로 거르기. 여러 개 동시에 고를 수 있음
- 동네(하라주쿠·시부야·긴자 등 14곳)로 거르기
- 근처 추천: 지도 화면, 동네, 내 위치 기준으로 도쿄 시간대에 맞춰 추천
- 저장 버튼으로 가고 싶은 곳을 모아 보는 저장 탭, 다녀옴 표시, 날짜별 코스 (이 기기에만 남음)
- 장소마다 구글맵·길찾기 링크

## 파일
- `index.html` — 실제 페이지 (빌드 결과, 직접 고치지 않음)
- `src/template.html` — 페이지 본문 (HTML·CSS·JS)
- `src/places.json` — 장소 데이터. `c` 분류, `s` 종류, `t` 세부 종류, `d` 구, `h` 동네
- `src/basemap.json` — 바탕 지도(구 경계·강·공원)
- `src/hoods.py` — 좌표로 동네(`h`)를 정하는 스크립트

## 다시 만들기
```bash
python3 tokyo-map/build.py
```
