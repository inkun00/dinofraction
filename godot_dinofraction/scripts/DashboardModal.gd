extends Control

signal open_review_requested()

@onready var name_label: Label = $Panel/VBox/Header/NameLabel
@onready var high_score_label: Label = $Panel/VBox/SummaryRow/Card1/V/HighScoreVal
@onready var total_games_label: Label = $Panel/VBox/SummaryRow/Card2/V/TotalGamesVal
@onready var accuracy_label: Label = $Panel/VBox/SummaryRow/Card3/V/AccuracyVal
@onready var wrong_count_label: Label = $Panel/VBox/SummaryRow/Card4/V/WrongCountVal
@onready var domain_container: VBoxContainer = $Panel/VBox/Scroll/DomainContainer
@onready var ai_label: Label = $Panel/VBox/AIBanner/AILabel
@onready var review_btn: Button = $Panel/VBox/BtnBox/ReviewBtn
@onready var close_btn: Button = $Panel/CloseBtn

func _ready() -> void:
	review_btn.pressed.connect(_on_review_pressed)
	close_btn.pressed.connect(hide)
	hide()

func open_dashboard() -> void:
	name_label.text = "🦖 " + UserProfile.username + "님의 분수 학습 분석 및 역량 진단"
	high_score_label.text = str(UserProfile.high_score) + " Pts"
	total_games_label.text = str(UserProfile.total_games) + " 회"
	accuracy_label.text = "%.1f %%" % UserProfile.get_accuracy()
	wrong_count_label.text = str(UserProfile.wrong_history.size()) + " 개"
	
	_render_domain_stats()
	_render_ai_feedback()
	show()

func _render_domain_stats() -> void:
	for child in domain_container.get_children():
		child.queue_free()
		
	var domain_list = UserProfile.get_domain_stats()
	for d in domain_list:
		var row = PanelContainer.new()
		row.custom_minimum_size = Vector2(0, 42)
		
		var sb = StyleBoxFlat.new()
		sb.set_corner_radius_all(8)
		sb.bg_color = Color(0.12, 0.16, 0.22, 0.85)
		sb.border_width_left = 3
		
		var total = d["total"]
		var acc = d["accuracy"]
		
		var status_text = ""
		var status_color = Color.WHITE
		if total == 0:
			sb.border_color = Color(0.4, 0.4, 0.5)
			status_text = "⚪ 미풀이"
			status_color = Color(0.6, 0.6, 0.7)
		elif acc >= 85.0:
			sb.border_color = Color(0.2, 0.85, 0.4)
			status_text = "🌟 [강점] 우수"
			status_color = Color(0.3, 1.0, 0.5)
		elif acc >= 70.0:
			sb.border_color = Color(0.3, 0.7, 1.0)
			status_text = "👍 [보통] 양호"
			status_color = Color(0.4, 0.8, 1.0)
		else:
			sb.border_color = Color(1.0, 0.4, 0.3)
			status_text = "⚠️ [취약] 보충필요"
			status_color = Color(1.0, 0.4, 0.3)
			
		row.add_theme_stylebox_override("panel", sb)
		
		var hbox = HBoxContainer.new()
		hbox.add_theme_constant_override("separation", 12)
		row.add_child(hbox)
		
		# 1. Icon & Name
		var name_lbl = Label.new()
		name_lbl.custom_minimum_size = Vector2(230, 0)
		name_lbl.text = "  %s %s" % [d["icon"], d["name"]]
		name_lbl.add_theme_font_size_override("font_size", 14)
		name_lbl.add_theme_color_override("font_color", Color(0.95, 0.95, 0.95))
		hbox.add_child(name_lbl)
		
		# 2. Progress Bar
		var bar_panel = ProgressBar.new()
		bar_panel.custom_minimum_size = Vector2(180, 16)
		bar_panel.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		bar_panel.show_percentage = false
		bar_panel.min_value = 0.0
		bar_panel.max_value = 100.0
		bar_panel.value = acc if total > 0 else 0.0
		
		var bar_sb = StyleBoxFlat.new()
		bar_sb.set_corner_radius_all(4)
		if total == 0:
			bar_sb.bg_color = Color(0.25, 0.25, 0.3)
		elif acc >= 85.0:
			bar_sb.bg_color = Color(0.2, 0.8, 0.4)
		elif acc >= 70.0:
			bar_sb.bg_color = Color(0.3, 0.65, 0.95)
		else:
			bar_sb.bg_color = Color(0.9, 0.35, 0.25)
		bar_panel.add_theme_stylebox_override("fill", bar_sb)
		
		var bar_bg = StyleBoxFlat.new()
		bar_bg.set_corner_radius_all(4)
		bar_bg.bg_color = Color(0.08, 0.1, 0.14)
		bar_panel.add_theme_stylebox_override("background", bar_bg)
		hbox.add_child(bar_panel)
		
		# 3. Accuracy Number (e.g. 12/15, 80.0%)
		var stat_lbl = Label.new()
		stat_lbl.custom_minimum_size = Vector2(130, 0)
		if total == 0:
			stat_lbl.text = "0 / 0 문제 (0%)"
		else:
			stat_lbl.text = "%d / %d (%4.1f%%)" % [d["correct"], total, acc]
		stat_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		stat_lbl.add_theme_font_size_override("font_size", 13)
		stat_lbl.add_theme_color_override("font_color", Color(0.8, 0.9, 1.0))
		hbox.add_child(stat_lbl)
		
		# 4. Status Tag
		var tag_lbl = Label.new()
		tag_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		tag_lbl.text = status_text + " "
		tag_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		tag_lbl.add_theme_font_size_override("font_size", 13)
		tag_lbl.add_theme_color_override("font_color", status_color)
		hbox.add_child(tag_lbl)
		
		domain_container.add_child(row)

func _render_ai_feedback() -> void:
	var total_solved = UserProfile.total_correct + UserProfile.total_wrong
	if total_solved == 0:
		ai_label.text = "💡 공룡 AI 코치: 아직 푼 문제가 없습니다. 게임을 플레이하여 분수 계산 실력을 쌓아보세요!"
		return
		
	var weakest = UserProfile.get_weakest_domain()
	if weakest.is_empty() or weakest.get("total", 0) == 0:
		ai_label.text = "💡 공룡 AI 코치: 차근차근 문제를 풀며 분수의 감각을 키워나가고 있어요. 다음 게임에서도 멋진 점수를 기록해보세요!"
		return
		
	var w_name = weakest.get("name", "")
	var w_acc = weakest.get("accuracy", 100.0)
	
	if w_acc < 70.0:
		var advice = ""
		if w_name.contains("대분수의 뺄셈"):
			advice = "자연수에서 1을 빌려 가분수로 바꾸는 받아내림 원리를 오답노트에서 집중 복습해보세요!"
		elif w_name.contains("자연수"):
			advice = "자연수 1을 분모와 같은 분수(예: 3 = 2와 4/4)로 변환하는 과정을 다시 점검해보세요!"
		elif w_name.contains("진분수의 덧셈"):
			advice = "합이 1보다 커질 때 대분수로 알맞게 변환되었는지 차근차근 확인해보세요!"
		else:
			advice = "오답노트에 저장된 틀린 문제들을 다시 풀어보며 계산 실수를 줄여보세요!"
		ai_label.text = "💡 공룡 AI 코치 진단: 현재 '%s' 영역의 정답률(%.1f%%)이 취약합니다. %s 💪" % [w_name, w_acc, advice]
	elif w_acc < 85.0:
		ai_label.text = "💡 공룡 AI 코치 진단: '%s' 영역(%.1f%%)을 조금만 더 보완하면 전 영역 90%% 이상의 분수 마스터가 될 수 있어요! ⭐" % [w_name, w_acc]
	else:
		ai_label.text = "🎉 공룡 AI 코치 진단: 모든 분수 연산 영역에서 85% 이상의 최우수 정답률을 유지하고 있습니다! 진정한 분수 수호신! 👑"

func _on_review_pressed() -> void:
	hide()
	open_review_requested.emit()
