# Godot Web Export Directory

이 폴더(`public/godot/`)는 Godot 에디터에서 Web(HTML5)으로 내보내기(Export)할 목적지 폴더입니다.

### Godot 내보내기 및 전송량 최적화 방법

1. Godot 에디터에서 `godot_dinofraction` 프로젝트를 엽니다.
2. 원본 글꼴을 교체했다면 저장소 루트에서 `npm run godot:subset-font`를
   먼저 실행합니다. 이 명령은 한글 이름에 필요한 모든 현대 한글 글리프를
   보존하면서 사용하지 않는 한자 및 다른 문자권 글리프와 힌팅 정보를
   제거합니다.
3. 상단 메뉴 `프로젝트 (Project)` → `내보내기 (Export...)`에서 `Web`을
   선택합니다.
4. 내보내기 경로를 `.../public/godot/index.html`로 지정하고 Release 모드로
   내보냅니다.
5. 저장소 루트에서 `npm run godot:version-web`을 반드시 실행합니다. 이
   명령은 `wasm`, `pck`, 오디오 워크릿에 내용 기반 버전명을 붙이고
   `index.html`을 함께 갱신합니다. 따라서 변경된 게임 파일은 새 URL을
   사용하고, 기존 파일은 브라우저에 1년간 안전하게 캐시할 수 있습니다.
6. `npm run build`로 최종 검증합니다.

배포 후 `https://your-domain.vercel.app/godot/index.html`로 접속하면 웹 브라우저에서 Godot 게임이 바로 실행됩니다!

`public/godot/index.wasm` 또는 `index.pck`가 그대로 남아 있는 상태로
배포하지 마세요. 두 파일은 `index-<12자리 해시>.wasm/pck` 형태여야 하며,
Vercel은 이 버전 파일에만 `max-age=31536000, immutable`을 적용합니다.
