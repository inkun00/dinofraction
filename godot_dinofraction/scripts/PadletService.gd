extends Node

const CLIENT_SAVE_PATH: String = "user://padlet_leaderboard.json"
const PRODUCTION_API_URL: String = "https://dinofraction-one.vercel.app/api/leaderboard"

var user_id: String = ""

func _ready() -> void:
	user_id = _load_or_create_client_id()

func _create_http_request() -> HTTPRequest:
	var http = HTTPRequest.new()
	http.accept_gzip = false
	add_child(http)
	return http

func _get_leaderboard_api_url() -> String:
	if OS.has_feature("web"):
		return str(JavaScriptBridge.eval("window.location.origin")) + "/api/leaderboard"
	return PRODUCTION_API_URL

func _load_or_create_client_id() -> String:
	if FileAccess.file_exists(CLIENT_SAVE_PATH):
		var saved = FileAccess.open(CLIENT_SAVE_PATH, FileAccess.READ)
		if saved:
			var json = JSON.new()
			if json.parse(saved.get_as_text()) == OK and json.data is Dictionary:
				var existing = str(json.data.get("user_id", ""))
				saved.close()
				if existing.length() >= 8:
					return existing
			else:
				saved.close()

	var generated = Crypto.new().generate_random_bytes(16).hex_encode()
	var output = FileAccess.open(CLIENT_SAVE_PATH, FileAccess.WRITE)
	if output:
		output.store_string(JSON.stringify({"user_id": generated}))
		output.close()
	return generated

func fetch_leaderboard(tab_type: String, callback: Callable) -> void:
	var http = _create_http_request()
	var body = {"action": "query", "tabType": tab_type, "userId": user_id}
	http.request_completed.connect(func(_result: int, response_code: int, _headers: PackedStringArray, response_body: PackedByteArray):
		http.queue_free()
		if response_code == 200:
			var json = JSON.new()
			if json.parse(response_body.get_string_from_utf8()) == OK and json.data is Array:
				callback.call(true, json.data)
				return
		print("[PadletService] Query failed with code: ", response_code)
		callback.call(false, [])
	)
	var error = http.request(
		_get_leaderboard_api_url(),
		["Content-Type: application/json"],
		HTTPClient.METHOD_POST,
		JSON.stringify(body)
	)
	if error != OK:
		http.queue_free()
		callback.call(false, [])

func sync_user_profile(
	nickname: String,
	school: String,
	score: int,
	total_xp: int,
	season_games: int,
	callback: Callable = Callable()
) -> void:
	var safe_nickname = nickname.strip_edges().substr(0, 12)
	var safe_school = school.strip_edges().substr(0, 30)
	if safe_nickname == "":
		safe_nickname = "용감한 공룡"
	if safe_school == "":
		safe_school = "소속 미설정"

	var http = _create_http_request()
	var body = {
		"action": "sync",
		"userId": user_id,
		"nickname": safe_nickname,
		"school": safe_school,
		"score": max(0, score),
		"totalXp": max(0, total_xp),
		"seasonGames": max(0, season_games)
	}
	http.request_completed.connect(func(_result: int, response_code: int, _headers: PackedStringArray, _response_body: PackedByteArray):
		http.queue_free()
		var success = response_code == 200 or response_code == 201
		if success:
			print("[PadletService] Recorded leaderboard snapshot. Score: ", score, " | XP: ", total_xp)
		else:
			print("[PadletService] Sync failed with code: ", response_code)
		if callback.is_valid():
			callback.call(success)
	)
	var error = http.request(
		_get_leaderboard_api_url(),
		["Content-Type: application/json"],
		HTTPClient.METHOD_POST,
		JSON.stringify(body)
	)
	if error != OK:
		http.queue_free()
		if callback.is_valid():
			callback.call(false)
