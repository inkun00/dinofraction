extends Node

const SAVE_PATH: String = "user://user_profile.json"
const LEADERBOARD_SEASON_ID: String = "season_20260822"

var username: String = "용감한 공룡"
var school: String = "공룡초등학교"
var high_score: int = 0
var total_games: int = 0
var total_correct: int = 0
var total_wrong: int = 0
var unlocked_dinos: Array[String] = ["dino_01", "dino_02"]
var selected_dino: String = "dino_01"
var wrong_history: Array = []
var pending_wrong_problems: Array = []
var leaderboard_season_id: String = LEADERBOARD_SEASON_ID
var season_high_score: int = 0
var season_total_games: int = 0
var season_total_correct: int = 0

const DINO_UNLOCK_SCORES = {
	"dino_01": 0, # 신비의 공룡알 (기본)
	"dino_02": 0, # 에메랄드 벨로시 (기본)
	"dino_03": 50, # 사파이어 트리케라 (첫 도전 달성!)
	"dino_04": 120, # 루비 티라노 (제왕의 포효)
	"dino_05": 200, # 에메랄드 이구아노 (엄지발톱 수호자)
	"dino_06": 300, # 토파즈 스테고
	"dino_07": 450, # 볼케이노 딜로포
	"dino_08": 600, # 글래시어 스테고케라
	"dino_09": 800, # 포이즌 벨로시
	"dino_10": 1000, # 썬더 켄트로 (가시 방패의 전사)
	"dino_11": 1250, # 옵시디언 카르노
	"dino_12": 1550, # 템페스트 파키케
	"dino_13": 1900, # 크리스탈 브라키오 (거신의 위용)
	"dino_14": 2300, # 어비스 알로 (심연의 사냥꾼)
	"dino_15": 2750, # 트와일라잇 코리토 (투구 볏의 멜로디)
	"dino_16": 3250, # 블레이드 테리지노 (거대 낫 발톱)
	"dino_17": 3800, # 크림슨 케라토 (화염 뿔 포식자)
	"dino_18": 4400, # 스파이크 스티라코 (가시 왕관의 돌격수)
	"dino_19": 5050, # 나이트 헌터 데이노 (암습의 갈고리 발톱)
	"dino_20": 5750, # 아쿠아 세일 스피노 (수륙양용 거대 제왕)
	"dino_21": 6500, # 헬멧 크레스트 람베오 (투구 볏 연주자)
	"dino_22": 7300, # 마더 가디언 마이아 (착한 어미 공룡)
	"dino_23": 8150, # 선셋 깃털 오비랍 (화려한 깃털 볏)
	"dino_24": 9050, # 골든 스프린터 갈리 (질풍의 대질주)
	"dino_25": 10000, # 쁘띠 프릴 프로토 (사막의 수호자)
	"dino_26": 11000, # 스파이크 아머 사우로 (철갑 가시 요새)
	"dino_27": 12050, # 메이스 해머 에우오 (철퇴 꼬리 전사)
	"dino_28": 13150, # 자이언트 브레스 아파토 (대지의 거신)
	"dino_29": 14300, # 크로노스 시공룡 (시간의 지배자)
	"dino_30": 15500 # 솔라 제네시스 신룡 (궁극의 15,500점 태양 신룡!)
}

var correct_by_type: Dictionary = {}
var wrong_by_type: Dictionary = {}

func _ready() -> void:
	load_data()

func save_data() -> void:
	var data = {
		"username": username,
		"school": school,
		"high_score": high_score,
		"total_games": total_games,
		"total_correct": total_correct,
		"total_wrong": total_wrong,
		"unlocked_dinos": unlocked_dinos,
		"selected_dino": selected_dino,
		"wrong_history": wrong_history.slice(-40),
		"pending_wrong_problems": pending_wrong_problems,
		"correct_by_type": correct_by_type,
		"wrong_by_type": wrong_by_type,
		"leaderboard_season_id": leaderboard_season_id,
		"season_high_score": season_high_score,
		"season_total_games": season_total_games,
		"season_total_correct": season_total_correct
	}
	var f = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(data, "\t"))
		f.close()
	sync_to_cloud()

func sync_to_cloud() -> void:
	if season_total_games <= 0:
		return
	var fb = get_node_or_null("/root/FirebaseService")
	if fb:
		fb.sync_user_profile(username, school, season_high_score, get_leaderboard_season_xp())

func load_data() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var f = FileAccess.open(SAVE_PATH, FileAccess.READ)
	if f:
		var txt = f.get_as_text()
		f.close()
		var json = JSON.new()
		if json.parse(txt) == OK:
			var d = json.data
			username = d.get("username", "용감한 공룡")
			school = d.get("school", "공룡초등학교")
			high_score = d.get("high_score", 0)
			total_games = d.get("total_games", 0)
			total_correct = d.get("total_correct", 0)
			total_wrong = d.get("total_wrong", 0)
			unlocked_dinos = Array(d.get("unlocked_dinos", ["dino_01", "dino_02"]), TYPE_STRING, &"", null)
			selected_dino = d.get("selected_dino", "dino_01")
			wrong_history = d.get("wrong_history", [])
			pending_wrong_problems = d.get("pending_wrong_problems", [])
			correct_by_type = d.get("correct_by_type", {})
			wrong_by_type = d.get("wrong_by_type", {})
			var saved_season_id = str(d.get("leaderboard_season_id", ""))
			if saved_season_id == LEADERBOARD_SEASON_ID:
				leaderboard_season_id = saved_season_id
				season_high_score = int(d.get("season_high_score", 0))
				season_total_games = int(d.get("season_total_games", 0))
				season_total_correct = int(d.get("season_total_correct", 0))
			else:
				# Preserve lifetime progress while starting the online leaderboard fresh.
				leaderboard_season_id = LEADERBOARD_SEASON_ID
				season_high_score = 0
				season_total_games = 0
				season_total_correct = 0
			check_all_unlocks()

func record_problem_answer(p_type: String, is_correct: bool) -> void:
	if is_correct:
		correct_by_type[p_type] = int(correct_by_type.get(p_type, 0)) + 1
	else:
		wrong_by_type[p_type] = int(wrong_by_type.get(p_type, 0)) + 1
	save_data()

func get_domain_stats() -> Array:
	var categories = [
		{"name": "진분수의 덧셈", "types": ["진분수+진분수", "진분수+진분수_합1초과"], "icon": "", "desc": "진분수끼리의 덧셈과 대분수 변환"},
		{"name": "진분수의 뺄셈", "types": ["진분수-진분수"], "icon": "", "desc": "분모가 같은 진분수끼리의 뺄셈"},
		{"name": "자연수 - 분수의 뺄셈", "types": ["1-진분수", "자연수-진분수", "자연수-대분수"], "icon": "", "desc": "자연수를 분수로 변환하여 뺄셈"},
		{"name": "대분수의 덧셈", "types": ["대분수+대분수"], "icon": "", "desc": "자연수는 자연수끼리, 분수는 분수끼리 덧셈"},
		{"name": "대분수의 뺄셈 (받아내림)", "types": ["대분수-대분수", "대분수-대분수(받아내림)"], "icon": "", "desc": "자연수에서 1을 빌려오는 받아내림 뺄셈"}
	]
	var res = []
	for cat in categories:
		var c_cnt = 0
		var w_cnt = 0
		for t in cat["types"]:
			c_cnt += int(correct_by_type.get(t, 0))
			w_cnt += int(wrong_by_type.get(t, 0))
		var total = c_cnt + w_cnt
		var acc = 0.0
		if total > 0:
			acc = (float(c_cnt) / float(total)) * 100.0
		res.append({
			"name": cat["name"],
			"desc": cat["desc"],
			"icon": cat["icon"],
			"correct": c_cnt,
			"wrong": w_cnt,
			"total": total,
			"accuracy": acc
		})
	return res

func get_weakest_domain() -> Dictionary:
	var stats = get_domain_stats()
	var min_acc = 101.0
	var weakest = {}
	for s in stats:
		if s["total"] > 0 and s["accuracy"] < min_acc:
			min_acc = s["accuracy"]
			weakest = s
	return weakest

func record_game_result(score: int, correct: int, wrong: int, wrong_list: Array) -> void:
	total_games += 1
	total_correct += correct
	total_wrong += wrong
	season_total_games += 1
	season_total_correct += correct
	if score > high_score:
		high_score = score
	if score > season_high_score:
		season_high_score = score
		
	check_all_unlocks()
		
	for w in wrong_list:
		wrong_history.append(w)
		pending_wrong_problems.append(w)
		
	save_data()

func remove_pending_wrong_at(idx: int) -> void:
	if idx >= 0 and idx < pending_wrong_problems.size():
		var removed = pending_wrong_problems[idx]
		pending_wrong_problems.remove_at(idx)
		# Also remove from wrong_history if exists
		var h_idx = wrong_history.find(removed)
		if h_idx != -1:
			wrong_history.remove_at(h_idx)
		save_data()

func solve_wrong_problem(prob: Dictionary) -> void:
	var idx = pending_wrong_problems.find(prob)
	if idx != -1:
		pending_wrong_problems.remove_at(idx)
	var h_idx = wrong_history.find(prob)
	if h_idx != -1:
		wrong_history.remove_at(h_idx)
	save_data()

func clear_all_pending_wrongs() -> void:
	pending_wrong_problems.clear()
	wrong_history.clear()
	save_data()

func update_realtime_score(current_score: int) -> Array[String]:
	var newly_unlocked: Array[String] = []
	if current_score > high_score:
		high_score = current_score
		
	for d_id in DINO_UNLOCK_SCORES.keys():
		var req_score = DINO_UNLOCK_SCORES[d_id]
		if high_score >= req_score and not unlocked_dinos.has(d_id):
			unlocked_dinos.append(d_id)
			newly_unlocked.append(d_id)
			
	if newly_unlocked.size() > 0:
		save_data()
	return newly_unlocked

func check_all_unlocks() -> void:
	for d_id in DINO_UNLOCK_SCORES.keys():
		var req_score = DINO_UNLOCK_SCORES[d_id]
		if high_score >= req_score and not unlocked_dinos.has(d_id):
			unlocked_dinos.append(d_id)

func get_accuracy() -> float:
	var total = total_correct + total_wrong
	if total == 0:
		return 100.0
	return (float(total_correct) / float(total)) * 100.0

func get_leaderboard_season_xp() -> int:
	return season_high_score * 12 + season_total_correct * 10
