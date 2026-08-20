# Godot Web Export Directory

이 폴더(`public/godot/`)는 Godot 에디터에서 Web(HTML5)으로 내보내기(Export)할 목적지 폴더입니다.

### 🎮 Godot 내보내기 방법:
1. Godot 에디터에서 `godot_dinofraction` 프로젝트를 엽니다.
2. 상단 메뉴 `프로젝트 (Project)` -> `내보내기 (Export...)` 클릭
3. `추가 (Add...)` -> `Web` 선택
4. 내보내기 경로(Export Path)를 `.../public/godot/index.html`로 지정
5. 하단의 `프로젝트 내보내기 (Export Project)` 클릭 (디버그 해제 후 Release 모드 권장)
6. 내보내기가 완료되면 `index.html`, `index.js`, `index.wasm`, `index.pck` 파일이 이 폴더에 생성됩니다.

배포 후 `https://your-domain.vercel.app/godot/index.html`로 접속하면 웹 브라우저에서 Godot 게임이 바로 실행됩니다!
