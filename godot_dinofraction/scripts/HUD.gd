extends CanvasLayer

signal restart_pressed

@onready var top_bar: HBoxContainer = $TopBar
@onready var score_label: Label = $TopBar/ScoreBox/ScoreLabel
@onready var time_label: Label = $TopBar/TimeBox/TimeLabel
@onready var lives_label: Label = $TopBar/LivesBox/LivesHBox/LivesLabel
@onready var hearts_box: HBoxContainer = $TopBar/LivesBox/LivesHBox/HeartsBox
@onready var stage_label: Label = $TopBar/StageBox/StageLabel
@onready var combo_label: Label = $ComboLabel
@onready var home_btn: Button = $TopBar/HomeBtn

const HEART_FULL = preload("res://assets/ui/heart_full.png")
const HEART_EMPTY = preload("res://assets/ui/heart_empty.png")
const SAMBOARD_UPLOAD_URL: String = "https://samboard.vivasam.com/studentEntry/?brdId=brd-0RCJWNN7N34NC"

@onready var game_over_panel: PanelContainer = $GameOverPanel
@onready var final_score_label: Label = $GameOverPanel/VBox/FinalScoreLabel
@onready var stats_label: Label = $GameOverPanel/VBox/StatsLabel

# Modals & Title
@onready var title_menu = $TitleMenu
@onready var review_modal = $ReviewModal
@onready var dashboard_modal = $DashboardModal
@onready var leaderboard_modal = $LeaderboardModal
@onready var collection_modal = $DinoCollectionModal
@onready var account_modal = $AccountModal

# Game Over Extra Buttons
@onready var go_restart_btn: Button = $GameOverPanel/VBox/BtnBox/RestartButton
@onready var go_report_btn: Button = $GameOverPanel/VBox/BtnBox/GameOverReportBtn
@onready var go_review_btn: Button = $GameOverPanel/VBox/BtnBox/GameOverReviewBtn
@onready var go_dash_btn: Button = $GameOverPanel/VBox/BtnBox/GameOverDashBtn
@onready var go_leaderboard_btn: Button = $GameOverPanel/VBox/BtnBox/GameOverLeaderboardBtn
@onready var go_home_btn: Button = $GameOverPanel/VBox/BtnBox/GameOverHomeBtn

func _ready() -> void:
	GameState.score_changed.connect(_on_score_changed)
	GameState.lives_changed.connect(_on_lives_changed)
	GameState.time_changed.connect(_on_time_changed)
	GameState.evolution_changed.connect(_on_evolution_changed)
	GameState.combo_changed.connect(_on_combo_changed)
	GameState.dino_unlocked.connect(_on_dino_unlocked)
	GameState.game_over.connect(_on_game_over)
	
	combo_label.modulate.a = 0.0
	game_over_panel.visible = false
	top_bar.visible = false
	
	# Home / Menu Button
	home_btn.pressed.connect(_on_home_pressed)
	
	# Title Menu signals
	title_menu.start_game_pressed.connect(_on_request_start_game)
	title_menu.open_dashboard_pressed.connect(func(): dashboard_modal.open_dashboard())
	title_menu.open_leaderboard_pressed.connect(func(): leaderboard_modal.open_leaderboard())
	title_menu.open_review_pressed.connect(func(): review_modal.open_review())
	title_menu.open_collection_pressed.connect(func(): collection_modal.open_collection())
	title_menu.open_account_pressed.connect(func(): account_modal.open_account())
	title_menu.print_dashboard_report_pressed.connect(_on_dashboard_report_pressed)
	
	dashboard_modal.open_review_requested.connect(func(): review_modal.open_review())
	
	# Review Modal Signals
	review_modal.all_cleared.connect(_start_game_directly)
	review_modal.go_home_requested.connect(_on_home_pressed)
	
	# Game Over Buttons
	go_restart_btn.pressed.connect(_on_request_start_game)
	go_report_btn.pressed.connect(_on_report_pressed)
	go_review_btn.pressed.connect(func(): review_modal.open_review(GameState.wrong_problems))
	go_dash_btn.pressed.connect(func(): dashboard_modal.open_dashboard())
	go_leaderboard_btn.pressed.connect(func(): leaderboard_modal.open_leaderboard())
	go_home_btn.pressed.connect(_on_home_pressed)
	
	# Add hover animations for all Game Over & Top buttons
	var all_interactive_buttons = [home_btn, go_restart_btn, go_report_btn, go_review_btn, go_dash_btn, go_leaderboard_btn, go_home_btn]
	for btn in all_interactive_buttons:
		btn.pivot_offset = btn.custom_minimum_size / 2.0
		btn.mouse_entered.connect(func():
			var tween = create_tween()
			tween.tween_property(btn, "scale", Vector2(1.04, 1.04), 0.1)
		)
		btn.mouse_exited.connect(func():
			var tween = create_tween()
			tween.tween_property(btn, "scale", Vector2(1.0, 1.0), 0.1)
		)
	
	# Start with title screen
	title_menu.show_title()

func _on_request_start_game() -> void:
	game_over_panel.visible = false
	
	# Check if there are any unsolved wrong problems
	var wrongs = UserProfile.pending_wrong_problems if UserProfile else []
	if wrongs.is_empty() and UserProfile:
		wrongs = UserProfile.wrong_history
		
	if wrongs.size() > 0:
		title_menu.hide()
		review_modal.open_review(wrongs)
	else:
		_start_game_directly()

func _start_game_directly() -> void:
	top_bar.visible = true
	game_over_panel.visible = false
	title_menu.hide()
	review_modal.hide()
	_on_lives_changed(GameState.lives)
	restart_pressed.emit()

func _on_home_pressed() -> void:
	GameState.is_game_running = false
	game_over_panel.visible = false
	top_bar.visible = false
	review_modal.hide()
	title_menu.show_title()

func _on_score_changed(score: int) -> void:
	score_label.text = "점수: %d"% score
	var tween = score_label.create_tween()
	tween.tween_property(score_label, "scale", Vector2(1.2, 1.2), 0.08)
	tween.tween_property(score_label, "scale", Vector2(1.0, 1.0), 0.1)

func _on_lives_changed(lives: int) -> void:
	if hearts_box:
		var hearts = hearts_box.get_children()
		for i in range(hearts.size()):
			if hearts[i] is TextureRect:
				if i < lives:
					hearts[i].texture = HEART_FULL
					hearts[i].modulate = Color(1, 1, 1, 1)
				else:
					hearts[i].texture = HEART_EMPTY
					hearts[i].modulate = Color(0.65, 0.65, 0.65, 0.5)

func _on_time_changed(seconds: int) -> void:
	var mins = int(seconds / 60.0)
	var secs = seconds % 60
	time_label.text = "시간: %02d:%02d"% [mins, secs]

func _on_evolution_changed(stage_name: String) -> void:
	var names = {
		"dino_01": "신비의 공룡알",
		"dino_02": "에메랄드 벨로시",
		"dino_03": "사파이어 트리케라",
		"dino_04": "루비 티라노",
		"dino_05": "에메랄드 이구아노",
		"dino_06": "토파즈 스테고",
		"dino_07": "볼케이노 딜로포",
		"dino_08": "글래시어 스테고케라",
		"dino_09": "포이즌 벨로시",
		"dino_10": "썬더 켄트로",
		"dino_11": "옵시디언 카르노",
		"dino_12": "템페스트 파키케",
		"dino_13": "크리스탈 브라키오",
		"dino_14": "어비스 알로",
		"dino_15": "트와일라잇 코리토",
		"dino_16": "블레이드 테리지노",
		"dino_17": "크림슨 케라토",
		"dino_18": "스파이크 스티라코",
		"dino_19": "나이트 헌터 데이노",
		"dino_20": "아쿠아 세일 스피노",
		"dino_21": "헬멧 크레스트 람베오",
		"dino_22": "마더 가디언 마이아",
		"dino_23": "선셋 깃털 오비랍",
		"dino_24": "골든 스프린터 갈리",
		"dino_25": "쁘띠 프릴 프로토",
		"dino_26": "스파이크 아머 사우로",
		"dino_27": "메이스 해머 에우오",
		"dino_28": "자이언트 브레스 아파토",
		"dino_29": "크로노스 시공룡",
		"dino_30": "솔라 제네시스 신룡",
		"EGG": "신비의 공룡알",
		"BABY": "에메랄드 벨로시",
		"MEDIUM": "사파이어 트리케라",
		"ADULT": "루비 티라노",
		"BOSS": "크로노스 시공룡",
		"GOD": "솔라 제네시스 신룡"
	}
	stage_label.text = names.get(stage_name, stage_name)

func _on_combo_changed(current_combo: int) -> void:
	if current_combo >= 2:
		var c_info = GameState.get_combo_bonus_info(current_combo)
		combo_label.text = "%s\n(+%d 콤보 보너스!)"% [c_info["tier_name"], c_info["bonus"]]
		combo_label.add_theme_color_override("font_color", c_info["tier_color"])
		combo_label.modulate.a = 1.0
		
		var target_scale = 1.25 + (c_info["tier_level"] * 0.12)
		var tween = combo_label.create_tween()
		tween.tween_property(combo_label, "scale", Vector2(target_scale, target_scale), 0.12)
		tween.tween_property(combo_label, "scale", Vector2(1.0, 1.0), 0.16)
		tween.tween_property(combo_label, "modulate:a", 0.0, 1.25)
	else:
		combo_label.modulate.a = 0.0

func _on_game_over() -> void:
	final_score_label.text = "최종 점수: %d 점"% GameState.score
	var total = GameState.correct_count + GameState.wrong_count
	var acc = 0
	if total > 0:
		acc = int((float(GameState.correct_count) / total) * 100)
	stats_label.text = "정답: %d개 | 오답: %d개 | 정답률: %d%%"% [GameState.correct_count, GameState.wrong_count, acc]
	
	go_review_btn.visible = (GameState.wrong_problems.size() > 0)
	game_over_panel.visible = true

func _on_report_pressed() -> void:
	_open_learning_report(_build_learning_report_payload(), false)

func _on_dashboard_report_pressed() -> void:
	_open_learning_report(_build_dashboard_report_payload(), true)

func _open_learning_report(payload: Dictionary, open_upload_after_print: bool) -> void:
	if not OS.has_feature("web"):
		OS.alert("PDF 출력은 웹 브라우저에서 게임을 실행할 때 사용할 수 있습니다.", "PDF 출력 안내")
		return

	var report_bridge = JavaScriptBridge.get_interface("DinoLearningReport")
	if report_bridge == null:
		OS.alert("PDF 출력 모듈을 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.", "PDF 출력 오류")
		return

	if open_upload_after_print:
		report_bridge.printReportAndOpenUpload(JSON.stringify(payload), SAMBOARD_UPLOAD_URL)
	else:
		report_bridge.printReport(JSON.stringify(payload))

func _build_learning_report_payload() -> Dictionary:
	var highest_dino_id = _get_highest_grade_dino_id()
	return {
		"studentName": UserProfile.username if UserProfile else "용감한 공룡",
		"school": UserProfile.school if UserProfile else "",
		"score": GameState.score,
		"title": _get_score_title(GameState.score),
		"correctCount": GameState.correct_count,
		"wrongCount": GameState.wrong_count,
		"correctByType": GameState.correct_by_type.duplicate(true),
		"wrongByType": GameState.wrong_by_type.duplicate(true),
		"reportScope": "game",
		"totalGames": 1,
		"generatedAt": Time.get_datetime_string_from_system(false, true),
		"dinosaur": {
			"id": highest_dino_id,
			"name": _get_dino_name(highest_dino_id),
			"grade": _get_dino_grade(highest_dino_id),
			"imageDataUrl": _get_dino_data_url(highest_dino_id)
		}
	}

func _build_dashboard_report_payload() -> Dictionary:
	var highest_dino_id = _get_highest_grade_dino_id()
	var dashboard_score = UserProfile.high_score if UserProfile else 0
	return {
		"studentName": UserProfile.username if UserProfile else "용감한 공룡",
		"school": UserProfile.school if UserProfile else "",
		"score": dashboard_score,
		"title": _get_score_title(dashboard_score),
		"correctCount": UserProfile.total_correct if UserProfile else 0,
		"wrongCount": UserProfile.total_wrong if UserProfile else 0,
		"correctByType": UserProfile.correct_by_type.duplicate(true) if UserProfile else {},
		"wrongByType": UserProfile.wrong_by_type.duplicate(true) if UserProfile else {},
		"reportScope": "dashboard",
		"totalGames": UserProfile.total_games if UserProfile else 0,
		"generatedAt": Time.get_datetime_string_from_system(false, true),
		"dinosaur": {
			"id": highest_dino_id,
			"name": _get_dino_name(highest_dino_id),
			"grade": _get_dino_grade(highest_dino_id),
			"imageDataUrl": _get_dino_data_url(highest_dino_id)
		}
	}

func _get_highest_grade_dino_id() -> String:
	var highest_number = 1
	if UserProfile:
		for dino_id in UserProfile.unlocked_dinos:
			var dino_number = int(str(dino_id).trim_prefix("dino_"))
			if dino_number > highest_number:
				highest_number = dino_number
	return "dino_%02d" % highest_number

func _get_dino_name(dino_id: String) -> String:
	var names = {
		"dino_01": "신비의 공룡알", "dino_02": "에메랄드 벨로시", "dino_03": "사파이어 트리케라",
		"dino_04": "루비 티라노", "dino_05": "에메랄드 이구아노", "dino_06": "토파즈 스테고",
		"dino_07": "볼케이노 딜로포", "dino_08": "글래시어 스테고케라", "dino_09": "포이즌 벨로시",
		"dino_10": "썬더 켄트로", "dino_11": "옵시디언 카르노", "dino_12": "템페스트 파키케",
		"dino_13": "크리스탈 브라키오", "dino_14": "어비스 알로", "dino_15": "트와일라잇 코리토",
		"dino_16": "블레이드 테리지노", "dino_17": "크림슨 케라토", "dino_18": "스파이크 스티라코",
		"dino_19": "나이트 헌터 데이노", "dino_20": "아쿠아 세일 스피노", "dino_21": "헬멧 크레스트 람베오",
		"dino_22": "마더 가디언 마이아", "dino_23": "선셋 깃털 오비랍", "dino_24": "골든 스프린터 갈리",
		"dino_25": "쁘띠 프릴 프로토", "dino_26": "스파이크 아머 사우로", "dino_27": "메이스 해머 에우오",
		"dino_28": "자이언트 브레스 아파토", "dino_29": "크로노스 시공룡", "dino_30": "솔라 제네시스 신룡"
	}
	return names.get(dino_id, "신비의 공룡")

func _get_dino_grade(dino_id: String) -> String:
	var number = int(dino_id.trim_prefix("dino_"))
	if number >= 26:
		return "초월"
	if number >= 21:
		return "신화"
	if number >= 16:
		return "전설"
	if number >= 11:
		return "영웅"
	if number >= 6:
		return "희귀"
	return "일반"

func _get_score_title(final_score: int) -> String:
	if final_score >= 3000:
		return "태양의 분수 신룡"
	if final_score >= 1500:
		return "시간을 다루는 분수 대가"
	if final_score >= 700:
		return "루비 분수 정복자"
	if final_score >= 300:
		return "사파이어 분수 탐험가"
	if final_score >= 100:
		return "에메랄드 분수 사냥꾼"
	return "새싹 분수 탐험가"

func _get_dino_data_url(dino_id: String) -> String:
	var texture = load("res://assets/dinos/%s.png" % dino_id) as Texture2D
	if texture == null:
		return ""
	var image = texture.get_image()
	if image == null or image.is_empty():
		return ""
	return "data:image/png;base64," + Marshalls.raw_to_base64(image.save_png_to_buffer())

func _on_dino_unlocked(dino_id: String) -> void:
	var names_map = {
		"dino_01": "신비의 공룡알", "dino_02": "에메랄드 랩터", "dino_03": "사파이어 트리케라",
		"dino_04": "루비 티라노", "dino_05": "애머시스트 렉스", "dino_06": "토파즈 스테고",
		"dino_07": "볼케이노 렉스", "dino_08": "글래시어 안킬로", "dino_09": "포이즌 벨로시",
		"dino_10": "썬더 스피노", "dino_11": "옵시디언 카르노", "dino_12": "템페스트 알로",
		"dino_13": "크리스탈 브라키오", "dino_14": "어비스 모사", "dino_15": "트와일라잇 파라사우",
		"dino_16": "플래티넘 드래곤", "dino_17": "다크 플레임 드래곤", "dino_18": "네뷸라 코스믹룡",
		"dino_19": "크로노스 시공룡", "dino_20": "솔라 제네시스 신룡"
	}
	var dname = names_map.get(dino_id, dino_id)
	combo_label.text = "NEW UNLOCK!\n[%s]"% dname
	combo_label.modulate = Color(1.0, 0.9, 0.2, 1.0)
	var tween = combo_label.create_tween()
	tween.tween_property(combo_label, "scale", Vector2(1.5, 1.5), 0.15)
	tween.tween_property(combo_label, "scale", Vector2(1.1, 1.1), 0.2)
	tween.tween_interval(1.2)
	tween.tween_property(combo_label, "modulate:a", 0.0, 0.6)

func _on_restart_button_pressed() -> void:
	_on_request_start_game()
