extends Control

@onready var title_label: Label = $Panel/VBox/Header/TitleLabel
@onready var tab_score_btn: Button = $Panel/VBox/TabBox/TabScoreBtn
@onready var tab_xp_btn: Button = $Panel/VBox/TabBox/TabXpBtn
@onready var tab_school_btn: Button = $Panel/VBox/TabBox/TabSchoolBtn
@onready var list_container: VBoxContainer = $Panel/VBox/Scroll/ListContainer
@onready var my_rank_label: Label = $Panel/VBox/Footer/MyRankLabel
@onready var close_btn: Button = $Panel/CloseBtn
@onready var bottom_close_btn: Button = $Panel/VBox/Footer/BottomCloseBtn

var current_tab: String = "score"# "score", "xp", "school"
var is_loading_cloud: bool = false
var cloud_request_serial: int = 0

func _ready() -> void:
	tab_score_btn.pressed.connect(func(): _switch_tab("score"))
	tab_xp_btn.pressed.connect(func(): _switch_tab("xp"))
	tab_school_btn.pressed.connect(func(): _switch_tab("school"))
	close_btn.pressed.connect(hide)
	bottom_close_btn.pressed.connect(hide)
	hide()

func open_leaderboard() -> void:
	_switch_tab("score")
	show()

func _switch_tab(tab_name: String) -> void:
	current_tab = tab_name
	cloud_request_serial += 1
	var request_serial = cloud_request_serial
	
	# Update tab button visuals
	tab_score_btn.modulate = Color(1.0, 1.0, 0.4, 1.0) if tab_name == "score"else Color(0.7, 0.7, 0.7, 1.0)
	tab_xp_btn.modulate = Color(0.4, 0.9, 1.0, 1.0) if tab_name == "xp"else Color(0.7, 0.7, 0.7, 1.0)
	tab_school_btn.modulate = Color(0.5, 1.0, 0.5, 1.0) if tab_name == "school"else Color(0.7, 0.7, 0.7, 1.0)
	
	_render_cloud_status("온라인 명예의 전당을 불러오는 중...")
	_fetch_cloud_leaderboard(tab_name, request_serial)

func _fetch_cloud_leaderboard(requested_tab: String, request_serial: int) -> void:
	if not Engine.has_singleton("FirebaseService") and not get_node_or_null("/root/FirebaseService"):
		if request_serial == cloud_request_serial:
			_render_cloud_status("온라인 명예의 전당에 연결할 수 없습니다.\n잠시 후 다시 열어 주세요.")
		return
		
	var fb = get_node_or_null("/root/FirebaseService")
	if fb:
		is_loading_cloud = true
		# Flush this device's completed season record first. This guarantees that
		# opening the leaderboard immediately after game over cannot race the
		# asynchronous Firestore write.
		if UserProfile and int(UserProfile.season_total_games) > 0:
			fb.sync_user_profile(
				str(UserProfile.username),
				str(UserProfile.school),
				int(UserProfile.season_high_score),
				int(UserProfile.get_leaderboard_season_xp()),
				func(_sync_success: bool):
					_request_cloud_records(fb, requested_tab, request_serial)
			)
		else:
			_request_cloud_records(fb, requested_tab, request_serial)

func _request_cloud_records(fb: Node, requested_tab: String, request_serial: int) -> void:
	fb.fetch_leaderboard(requested_tab, func(success: bool, cloud_records: Array):
			# Ignore an older response after the user moved to another tab or
			# reopened the leaderboard. It must never overwrite the current list.
			if request_serial != cloud_request_serial or requested_tab != current_tab:
				return
			is_loading_cloud = false
			if success:
				# An empty Firestore result is still the authoritative online result.
				_populate_ui(cloud_records)
			else:
				_render_cloud_status("온라인 순위를 불러오지 못했습니다.\n인터넷 연결을 확인한 뒤 다시 열어 주세요.")
	)

func _render_cloud_status(message: String) -> void:
	for child in list_container.get_children():
		child.queue_free()
	match current_tab:
		"score": title_label.text = "개인 최고 점수 랭킹 TOP 10"
		"xp": title_label.text = "개인 누적 경험치(XP) 랭킹 TOP 10"
		_: title_label.text = "학교 대항전 총경험치 랭킹 TOP 10"
	my_rank_label.text = message.replace("\n", " ")
	_create_empty_notice(message)

func _populate_ui(records: Array) -> void:
	for child in list_container.get_children():
		child.queue_free()
		
	var my_name: String = "용감한 공룡"
	var my_score: int = 0
	var my_school: String = "공룡초등학교"
	
	if UserProfile:
		if "username"in UserProfile and UserProfile.username != "":
			my_name = str(UserProfile.username)
		if "season_high_score"in UserProfile:
			my_score = int(UserProfile.season_high_score)
		if "school"in UserProfile and UserProfile.school != "":
			my_school = str(UserProfile.school)
			
	var disp_my_name: String = my_name.substr(0, 6) if my_name.length() > 6 else my_name
	var disp_my_school: String = my_school.substr(0, 8) if my_school.length() > 8 else my_school
	var my_xp = UserProfile.get_leaderboard_season_xp() if UserProfile and UserProfile.has_method("get_leaderboard_season_xp") else my_score * 12
	
	if current_tab == "score":
		title_label.text = "개인 최고 점수 랭킹 TOP 10"
		var display_list = records.duplicate(true)
				
		var top10 = display_list.slice(0, min(10, display_list.size()))
		var my_current_rank = 0
		for idx in range(display_list.size()):
			if display_list[idx].get("is_me", false):
				my_current_rank = idx + 1
				break
		if my_score == 0:
			my_rank_label.text = "내 기록: %s (%s) | 점수: %d Pts | 랭킹 등록 대기중"% [disp_my_name, disp_my_school, my_score]
		elif my_current_rank > 0:
			my_rank_label.text = "내 기록: %s (%s) | 점수: %d Pts | 현재 %d위!"% [disp_my_name, disp_my_school, my_score, my_current_rank]
		else:
			my_rank_label.text = "내 기록: %s (%s) | 점수: %d Pts | 온라인 등록 완료 · TOP 10 도전중"% [disp_my_name, disp_my_school, my_score]

		if top10.is_empty():
			_create_empty_notice("아직 등록된 랭킹 기록이 없습니다.\n게임을 플레이하여 첫 번째 명예의 전당 주인공이 되어보세요! ")
		else:
			for idx in range(top10.size()):
				var item = top10[idx]
				var r_rank = item.get("rank", idx + 1)
				var r_name = str(item.get("name", item.get("nickname", "용감한 공룡")))
				var r_school = str(item.get("school", item.get("schoolName", "소속 미설정")))
				var r_val = str(item.get("val", item.get("score", 0))) + "Pts"
				_create_entry_row(r_rank, r_name, r_school, r_val, item.get("is_me", false))

	elif current_tab == "xp":
		title_label.text = "개인 누적 경험치(XP) 랭킹 TOP 10"
		var display_list = records.duplicate(true)
				
		var top10 = display_list.slice(0, min(10, display_list.size()))
		var my_current_rank = 0
		for idx in range(display_list.size()):
			if display_list[idx].get("is_me", false):
				my_current_rank = idx + 1
				break
		if my_xp == 0:
			my_rank_label.text = "내 기록: %s (%s) | 누적 XP: %d XP | 랭킹 등록 대기중"% [disp_my_name, disp_my_school, my_xp]
		elif my_current_rank > 0:
			my_rank_label.text = "내 기록: %s (%s) | 누적 XP: %d XP | 현재 %d위"% [disp_my_name, disp_my_school, my_xp, my_current_rank]
		else:
			my_rank_label.text = "내 기록: %s (%s) | 누적 XP: %d XP | 온라인 등록 완료 · TOP 10 도전중"% [disp_my_name, disp_my_school, my_xp]

		if top10.is_empty():
			_create_empty_notice("아직 등록된 경험치 랭킹이 없습니다.\n문제를 풀고 경험치를 모아보세요! ")
		else:
			for idx in range(top10.size()):
				var item = top10[idx]
				var r_rank = item.get("rank", idx + 1)
				var r_name = str(item.get("name", item.get("nickname", "용감한 공룡")))
				var r_school = str(item.get("school", item.get("schoolName", "소속 미설정")))
				var r_val = str(item.get("val", item.get("totalXp", 0))) + "XP"
				_create_entry_row(r_rank, r_name, r_school, r_val, item.get("is_me", false))

	else: # school
		title_label.text = "학교 대항전 총경험치 랭킹 TOP 10"
		my_rank_label.text = "우리 학교: %s | 학교 대항전에 참여하여 점수를 올려보세요!"% disp_my_school
		if records.is_empty():
			_create_empty_notice("아직 등록된 학교 대항전 기록이 없습니다.\n학교 이름을 등록하고 1위 학교로 만들어보세요! ")
		else:
			for idx in range(records.size()):
				var item = records[idx]
				var r_rank = item.get("rank", idx + 1)
				var r_school = str(item.get("school", item.get("name", "공룡초등학교")))
				var r_members = str(item.get("members", ""))
				var r_val = str(item.get("val", item.get("totalXp", 0))) + "XP"
				var is_my_sch = (my_school != "소속 미설정"and r_school.contains(my_school))
				_create_school_row(r_rank, r_school, r_members, r_val, is_my_sch)

func _create_empty_notice(msg: String) -> void:
	var lbl = Label.new()
	lbl.text = "\n\n"+ msg + "\n\n"
	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	lbl.add_theme_font_size_override("font_size", 16)
	lbl.add_theme_color_override("font_color", Color(0.7, 0.8, 0.9, 0.8))
	list_container.add_child(lbl)

func _create_entry_row(rank: int, player_name: String, school_name: String, val_str: String, is_me: bool) -> void:
	var panel = PanelContainer.new()
	panel.custom_minimum_size = Vector2(0, 36)
	
	var sb = StyleBoxFlat.new()
	sb.corner_radius_top_left = 6
	sb.corner_radius_top_right = 6
	sb.corner_radius_bottom_left = 6
	sb.corner_radius_bottom_right = 6
	
	if is_me:
		sb.bg_color = Color(0.1, 0.45, 0.25, 0.85)
		sb.border_width_left = 2
		sb.border_width_right = 2
		sb.border_width_top = 2
		sb.border_width_bottom = 2
		sb.border_color = Color(0.4, 1.0, 0.5, 1.0)
	elif rank == 1:
		sb.bg_color = Color(0.45, 0.35, 0.05, 0.75)
	elif rank == 2:
		sb.bg_color = Color(0.3, 0.35, 0.4, 0.75)
	elif rank == 3:
		sb.bg_color = Color(0.4, 0.25, 0.15, 0.75)
	else:
		sb.bg_color = Color(0.12, 0.15, 0.2, 0.6)
		
	panel.add_theme_stylebox_override("panel", sb)
	
	var hbox = HBoxContainer.new()
	hbox.add_theme_constant_override("separation", 12)
	panel.add_child(hbox)
	
	var rank_icon = "1위"if rank == 1 else ("2위"if rank == 2 else ("3위"if rank == 3 else "%d위"% rank))
	var rank_lbl = Label.new()
	rank_lbl.custom_minimum_size = Vector2(60, 0)
	rank_lbl.text = ""+ rank_icon
	rank_lbl.add_theme_font_size_override("font_size", 16)
	rank_lbl.add_theme_color_override("font_color", Color(1, 0.9, 0.3) if rank <= 3 else Color(0.9, 0.9, 0.9))
	hbox.add_child(rank_lbl)
	
	var display_name = player_name
	if is_me:
		var raw_name = player_name.replace("(나)", "")
		if raw_name.length() > 6:
			raw_name = raw_name.substr(0, 6)
		display_name = raw_name + "(나)"
	else:
		if display_name.length() > 6:
			display_name = display_name.substr(0, 6)
			
	var name_lbl = Label.new()
	name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_lbl.text = display_name
	name_lbl.add_theme_font_size_override("font_size", 16)
	name_lbl.add_theme_color_override("font_color", Color(0.4, 1.0, 0.6) if is_me else Color(1, 1, 1))
	hbox.add_child(name_lbl)
	
	var disp_school = school_name.substr(0, 8) if school_name.length() > 8 else school_name
	var sch_lbl = Label.new()
	sch_lbl.custom_minimum_size = Vector2(180, 0)
	sch_lbl.text = disp_school
	sch_lbl.add_theme_font_size_override("font_size", 15)
	sch_lbl.add_theme_color_override("font_color", Color(0.75, 0.85, 0.95))
	hbox.add_child(sch_lbl)
	
	var val_lbl = Label.new()
	val_lbl.custom_minimum_size = Vector2(140, 0)
	val_lbl.text = val_str + ""
	val_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	val_lbl.add_theme_font_size_override("font_size", 16)
	val_lbl.add_theme_color_override("font_color", Color(1, 0.85, 0.2))
	hbox.add_child(val_lbl)
	
	list_container.add_child(panel)

func _create_school_row(rank: int, school_name: String, members: String, val_str: String, is_my_sch: bool) -> void:
	var panel = PanelContainer.new()
	panel.custom_minimum_size = Vector2(0, 36)
	
	var sb = StyleBoxFlat.new()
	sb.corner_radius_top_left = 6
	sb.corner_radius_top_right = 6
	sb.corner_radius_bottom_left = 6
	sb.corner_radius_bottom_right = 6
	
	if is_my_sch:
		sb.bg_color = Color(0.1, 0.45, 0.25, 0.85)
		sb.border_width_left = 2
		sb.border_width_right = 2
		sb.border_width_top = 2
		sb.border_width_bottom = 2
		sb.border_color = Color(0.4, 1.0, 0.5, 1.0)
	elif rank == 1:
		sb.bg_color = Color(0.45, 0.35, 0.05, 0.75)
	elif rank == 2:
		sb.bg_color = Color(0.3, 0.35, 0.4, 0.75)
	elif rank == 3:
		sb.bg_color = Color(0.4, 0.25, 0.15, 0.75)
	else:
		sb.bg_color = Color(0.12, 0.15, 0.2, 0.6)
		
	panel.add_theme_stylebox_override("panel", sb)
	
	var hbox = HBoxContainer.new()
	hbox.add_theme_constant_override("separation", 12)
	panel.add_child(hbox)
	
	var rank_icon = "1위"if rank == 1 else ("2위"if rank == 2 else ("3위"if rank == 3 else "%d위"% rank))
	var rank_lbl = Label.new()
	rank_lbl.custom_minimum_size = Vector2(60, 0)
	rank_lbl.text = ""+ rank_icon
	rank_lbl.add_theme_font_size_override("font_size", 16)
	rank_lbl.add_theme_color_override("font_color", Color(1, 0.9, 0.3) if rank <= 3 else Color(0.9, 0.9, 0.9))
	hbox.add_child(rank_lbl)
	
	var disp_school = school_name.substr(0, 8) if school_name.length() > 8 else school_name
	var sch_lbl = Label.new()
	sch_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sch_lbl.text = disp_school + ("(우리 학교)"if is_my_sch else "")
	sch_lbl.add_theme_font_size_override("font_size", 16)
	sch_lbl.add_theme_color_override("font_color", Color(0.4, 1.0, 0.6) if is_my_sch else Color(1, 1, 1))
	hbox.add_child(sch_lbl)
	
	var mem_lbl = Label.new()
	mem_lbl.custom_minimum_size = Vector2(140, 0)
	mem_lbl.text = members
	mem_lbl.add_theme_font_size_override("font_size", 14)
	mem_lbl.add_theme_color_override("font_color", Color(0.7, 0.8, 0.9))
	hbox.add_child(mem_lbl)
	
	var val_lbl = Label.new()
	val_lbl.custom_minimum_size = Vector2(140, 0)
	val_lbl.text = val_str + ""
	val_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	val_lbl.add_theme_font_size_override("font_size", 16)
	val_lbl.add_theme_color_override("font_color", Color(1, 0.85, 0.2))
	hbox.add_child(val_lbl)
	
	list_container.add_child(panel)
