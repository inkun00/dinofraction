extends Node

signal score_changed(new_score: int)
signal lives_changed(new_lives: int)
signal time_changed(new_time: int)
signal evolution_changed(new_stage: String)
signal combo_changed(combo: int)
signal buff_activated(buff_name: String, duration: float)
@warning_ignore("unused_signal")
signal screen_shake_requested(intensity: float, duration: float)
@warning_ignore("unused_signal")
signal dino_unlocked(dino_id: String)
@warning_ignore("unused_signal")
signal biome_changed(biome_idx: int)
signal game_over()

enum Evolution {
	EGG,
	BABY,
	MEDIUM,
	ADULT,
	BOSS,
	GOD
}

var score: int = 0
var lives: int = 5
var time_left: float = 300.0
var current_evolution: Evolution = Evolution.EGG
var evolution_name: String = "EGG"
var is_game_running: bool = false
var xp: int = 0
var level: int = 1
var combo: int = 0
var scroll_x: float = 0.0

var jump_boost_count: int = 0
var speed_boost_timer: float = 0.0

var correct_count: int = 0
var wrong_count: int = 0
var wrong_problems: Array = []

func _process(delta: float) -> void:
	if is_game_running:
		if speed_boost_timer > 0.0:
			speed_boost_timer -= delta

func request_screen_shake(intensity: float, duration: float = 0.25) -> void:
	screen_shake_requested.emit(intensity, duration)

func get_jump_multiplier() -> float:
	return 1.0 + min(0.8, jump_boost_count * 0.20)

func is_speed_boosted() -> bool:
	return speed_boost_timer > 0.0

func get_current_stage_speed() -> float:
	if not is_game_running:
		return 50.0
	var time_elapsed = max(0.0, 300.0 - time_left)
	# 후반부로 갈수록 아주 조금씩 자연스럽게 빨라지는 미세 가속 곡선 (95.0 px/s -> 후반부 약 132.0 px/s)
	var time_speed = time_elapsed * 0.11 # 5분 동안 총 약 33 px/s 완만하게 증가
	var score_speed = min(12.0, score * 0.008) # 점수 비례 미세 가속
	return clamp(95.0 + time_speed + score_speed, 95.0, 138.0)

func get_difficulty_bubble_height_offset() -> float:
	if not is_game_running:
		return 0.0
	var time_elapsed = 300.0 - time_left
	var time_h = time_elapsed * 0.22 # Gradually ascends higher
	var score_h = score * 0.18 # Also ascends with higher score
	return clamp(time_h + score_h, 0.0, 68.0)

func apply_random_mystery_buff() -> Dictionary:
	var buffs = ["HEART", "JUMP", "SPEED", "SCORE"]
	var chosen = buffs[randi() % buffs.size()]
	var res = {"type": chosen, "text": "", "color": Color.WHITE}
	
	match chosen:
		"HEART":
			lives = min(5, lives + 1)
			lives_changed.emit(lives)
			res["text"] = "+1 Heart! "
			res["color"] = Color(1.0, 0.3, 0.5)
			buff_activated.emit("HEART", 0.0)
		"JUMP":
			jump_boost_count += 1
			var mult_str = "%.1f"% get_jump_multiplier()
			res["text"] = "Jump Boost! (x"+ mult_str + ")"
			res["color"] = Color(0.3, 1.0, 0.4)
			buff_activated.emit("JUMP", -1.0)
		"SPEED":
			speed_boost_timer = 12.0
			res["text"] = "Speed Boost! "
			res["color"] = Color(1.0, 0.9, 0.2)
			buff_activated.emit("SPEED", 12.0)
		"SCORE":
			var bonus_pts = 100
			add_score(bonus_pts)
			res["text"] = "Bonus Gold! (+%d Pts)"% bonus_pts
			res["color"] = Color(1.0, 0.85, 0.2)
			buff_activated.emit("SCORE", 0.0)
			
	return res

func get_evolution_bubble_offset() -> float:
	match current_evolution:
		Evolution.EGG:
			return 0.0
		Evolution.BABY:
			return 10.0
		Evolution.MEDIUM:
			return 20.0
		Evolution.ADULT:
			return 32.0
		Evolution.BOSS:
			return 45.0
		Evolution.GOD:
			return 58.0
	return 0.0

func start_new_game() -> void:
	score = 0
	lives = 5
	time_left = 300.0
	var sel = UserProfile.selected_dino if (UserProfile and UserProfile.selected_dino != "") else "dino_01"
	evolution_name = sel
	is_game_running = true
	correct_count = 0
	wrong_count = 0
	combo = 0
	jump_boost_count = 0
	speed_boost_timer = 0.0
	wrong_problems.clear()
	
	score_changed.emit(score)
	lives_changed.emit(lives)
	time_changed.emit(int(time_left))
	evolution_changed.emit(evolution_name)
	combo_changed.emit(combo)

func add_score(amount: int) -> void:
	if not is_game_running:
		return
	score += amount
	xp += int(amount / 5.0)
	level = int(sqrt(xp / 10.0)) + 1
	score_changed.emit(score)
	
	# Realtime Dino Unlocks!
	if UserProfile:
		var newly_unlocked = UserProfile.update_realtime_score(score)
		for new_dino in newly_unlocked:
			dino_unlocked.emit(new_dino)
			
	check_evolution()

func get_combo_bonus_info(current_combo: int) -> Dictionary:
	if current_combo < 2:
		return {"bonus": 0, "tier_name": "", "tier_color": Color.WHITE, "tier_level": 0}
	
	var bonus_pts: int = 0
	var tier_name: String = ""
	var tier_color: Color = Color.WHITE
	var tier_lvl: int = 1
	
	if current_combo < 5: # 2 ~ 4 Combo: 기초 콤보 (50% 축소: x2.5)
		bonus_pts = int(current_combo * 2.5)
		tier_name = "COMBO x%d"% current_combo
		tier_color = Color(1.0, 0.95, 0.4) # Bright Yellow
		tier_lvl = 1
	elif current_combo < 8: # 5 ~ 7 Combo: 그레이트 콤보 (50% 축소: +12 기본 + x6)
		bonus_pts = 12 + (current_combo * 6)
		tier_name = "GREAT COMBO x%d!"% current_combo
		tier_color = Color(1.0, 0.6, 0.15) # Fiery Orange
		tier_lvl = 2
	elif current_combo < 11: # 8 ~ 10 Combo: 메가 콤보 (50% 축소: +40 기본 + x11)
		bonus_pts = 40 + (current_combo * 11)
		tier_name = "MEGA COMBO x%d!!"% current_combo
		tier_color = Color(0.3, 0.88, 1.0) # Electric Cyan
		tier_lvl = 3
	elif current_combo < 15: # 11 ~ 14 Combo: 울트라 콤보 (50% 축소: +90 기본 + x19)
		bonus_pts = 90 + (current_combo * 19)
		tier_name = "ULTRA COMBO x%d!!!"% current_combo
		tier_color = Color(0.9, 0.4, 1.0) # Violet Radiance
		tier_lvl = 4
	else: # 15+ Combo: 신화급 갓라이크 콤보 (50% 축소: +175 기본 + x32)
		bonus_pts = 175 + (current_combo * 32)
		tier_name = "GODLIKE COMBO x%d!!!!"% current_combo
		tier_color = Color(1.0, 0.25, 0.5) # Radiant Crimson/Gold
		tier_lvl = 5
		
	return {
		"bonus": bonus_pts,
		"tier_name": tier_name,
		"tier_color": tier_color,
		"tier_level": tier_lvl
	}

func add_correct(problem_data: Dictionary) -> void:
	correct_count += 1
	combo += 1
	combo_changed.emit(combo)
	
	var p_type = problem_data.get("problem_type", "진분수+진분수")
	if UserProfile:
		UserProfile.record_problem_answer(p_type, true)
	
	var diff = problem_data.get("difficulty", 1)
	var base_pts = 10
	match diff:
		1: base_pts = 10
		2: base_pts = 15
		3: base_pts = 20
		4: base_pts = 30
		
	# Progressive Tiered Combo Bonus: 연속 콤보가 커질수록 보너스 급간 대폭 상승!
	var c_info = get_combo_bonus_info(combo)
	var total_pts = base_pts + c_info.bonus
		
	add_score(total_pts)

func add_wrong(problem_data: Dictionary) -> void:
	wrong_count += 1
	combo = 0
	combo_changed.emit(combo)
	
	var p_type = problem_data.get("problem_type", "진분수+진분수")
	if UserProfile:
		UserProfile.record_problem_answer(p_type, false)
		
	wrong_problems.append(problem_data)
	lives = max(0, lives - 1)
	lives_changed.emit(lives)
	if lives <= 0:
		trigger_game_over()

func check_evolution() -> void:
	# If player specifically equipped a dinosaur from collection, keep their choice!
	if UserProfile and UserProfile.selected_dino != ""and UserProfile.selected_dino != "AUTO":
		return
		
	var prev = current_evolution
	if score >= 3000:
		current_evolution = Evolution.GOD
		evolution_name = "dino_30"
	elif score >= 1500:
		current_evolution = Evolution.BOSS
		evolution_name = "dino_29"
	elif score >= 700:
		current_evolution = Evolution.ADULT
		evolution_name = "dino_04"
	elif score >= 300:
		current_evolution = Evolution.MEDIUM
		evolution_name = "dino_03"
	elif score >= 100:
		current_evolution = Evolution.BABY
		evolution_name = "dino_02"
	else:
		current_evolution = Evolution.EGG
		evolution_name = "dino_01"
		
	if prev != current_evolution:
		evolution_changed.emit(evolution_name)

func trigger_game_over() -> void:
	if not is_game_running:
		return
	is_game_running = false
	UserProfile.record_game_result(score, correct_count, wrong_count, wrong_problems)
	game_over.emit()