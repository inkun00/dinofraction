extends Node

# Firebase Configuration
const API_KEY: String = "AIzaSyBtSox7Fg_pMG7b24BhxFaa9gt0qZ2iNcQ"
const PROJECT_ID: String = "dinorun-math-c599c"
const AUTH_SAVE_PATH: String = "user://firebase_auth.json"
const LEADERBOARD_COLLECTION: String = "leaderboard_season_20260822"
const LEADERBOARD_SEASON_ID: String = "season_20260822"

const AUTH_SIGNUP_URL: String = "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key="+ API_KEY
const AUTH_REFRESH_URL: String = "https://securetoken.googleapis.com/v1/token?key="+ API_KEY
const FIRESTORE_BASE_URL: String = "https://firestore.googleapis.com/v1/projects/"+ PROJECT_ID + "/databases/(default)/documents"
const FIRESTORE_QUERY_URL: String = "https://firestore.googleapis.com/v1/projects/"+ PROJECT_ID + "/databases/(default)/documents:runQuery"

# Auth State
var user_id: String = ""
var id_token: String = ""
var refresh_token: String = ""
var is_authenticated: bool = false
var is_authenticating: bool = false
var token_expires_at: int = 0

signal auth_completed(success: bool)

func _ready() -> void:
	load_cached_auth()
	if refresh_token != "":
		refresh_auth_token()
	else:
		authenticate_anonymously()

func load_cached_auth() -> void:
	if FileAccess.file_exists(AUTH_SAVE_PATH):
		var f = FileAccess.open(AUTH_SAVE_PATH, FileAccess.READ)
		if f:
			var json = JSON.new()
			if json.parse(f.get_as_text()) == OK:
				var d = json.data
				user_id = d.get("user_id", "")
				id_token = d.get("id_token", "")
				refresh_token = d.get("refresh_token", "")
				token_expires_at = int(d.get("token_expires_at", 0))
			f.close()

func save_cached_auth() -> void:
	var data = {
		"user_id": user_id,
		"id_token": id_token,
		"refresh_token": refresh_token,
		"token_expires_at": token_expires_at
	}
	var f = FileAccess.open(AUTH_SAVE_PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(data, "\t"))
		f.close()

# ---------------------------------------------------------
# 1. Firebase Authentication
# ---------------------------------------------------------
func _ensure_authenticated() -> bool:
	var now = int(Time.get_unix_time_from_system())
	if is_authenticated and id_token != "" and user_id != "" and token_expires_at > now:
		return true

	if not is_authenticating:
		if refresh_token != "":
			refresh_auth_token()
		else:
			authenticate_anonymously()

	var success = await auth_completed
	return bool(success)

func authenticate_anonymously() -> void:
	if is_authenticating:
		return
	is_authenticating = true

	var http = HTTPRequest.new()
	add_child(http)

	var headers = ["Content-Type: application/json"]
	var body = JSON.stringify({"returnSecureToken": true})

	http.request_completed.connect(func(_result: int, response_code: int, _headers: PackedStringArray, response_body: PackedByteArray):
		is_authenticating = false
		if response_code == 200:
			var json = JSON.new()
			if json.parse(response_body.get_string_from_utf8()) == OK:
				var res = json.data
				user_id = res.get("localId", "")
				id_token = res.get("idToken", "")
				refresh_token = res.get("refreshToken", "")
				token_expires_at = int(Time.get_unix_time_from_system()) + int(res.get("expiresIn", "3600")) - 60
				is_authenticated = true
				save_cached_auth()
				print("[FirebaseService] Authenticated as UID: ", user_id)
				http.queue_free()
				auth_completed.emit(true)
				return
		print("[FirebaseService] Auth failed with code: ", response_code)
		http.queue_free()
		auth_completed.emit(false)
	)

	var err = http.request(AUTH_SIGNUP_URL, headers, HTTPClient.METHOD_POST, body)
	if err != OK:
		is_authenticating = false
		http.queue_free()
		auth_completed.emit(false)

func refresh_auth_token() -> void:
	if is_authenticating:
		return
	if refresh_token == "":
		authenticate_anonymously()
		return

	is_authenticating = true
	var http = HTTPRequest.new()
	add_child(http)
	var headers = ["Content-Type: application/x-www-form-urlencoded"]
	var body = "grant_type=refresh_token&refresh_token=" + refresh_token.uri_encode()

	http.request_completed.connect(func(_result: int, response_code: int, _headers: PackedStringArray, response_body: PackedByteArray):
		is_authenticating = false
		http.queue_free()
		if response_code == 200:
			var json = JSON.new()
			if json.parse(response_body.get_string_from_utf8()) == OK:
				var res = json.data
				user_id = res.get("user_id", user_id)
				id_token = res.get("id_token", "")
				refresh_token = res.get("refresh_token", refresh_token)
				token_expires_at = int(Time.get_unix_time_from_system()) + int(res.get("expires_in", "3600")) - 60
				is_authenticated = id_token != "" and user_id != ""
				if is_authenticated:
					save_cached_auth()
					auth_completed.emit(true)
					return

		# A stale refresh token should not permanently block online rankings.
		id_token = ""
		refresh_token = ""
		user_id = ""
		is_authenticated = false
		token_expires_at = 0
		authenticate_anonymously()
	)

	var err = http.request(AUTH_REFRESH_URL, headers, HTTPClient.METHOD_POST, body)
	if err != OK:
		is_authenticating = false
		http.queue_free()
		id_token = ""
		refresh_token = ""
		user_id = ""
		is_authenticated = false
		token_expires_at = 0
		authenticate_anonymously()

# ---------------------------------------------------------
# 2. Fetch Leaderboard from Firestore (Live Query)
# ---------------------------------------------------------
func fetch_leaderboard(tab_type: String, callback: Callable) -> void:
	var auth_ok = await _ensure_authenticated()
	if not auth_ok:
		callback.call(false, [])
		return

	var http = HTTPRequest.new()
	add_child(http)
	
	var order_field = "score"if tab_type == "score"else "totalXp"
	var query_limit = 10 if (tab_type == "score"or tab_type == "xp") else 200
	
	var query_body = {
		"structuredQuery": {
			"from": [{"collectionId": LEADERBOARD_COLLECTION}],
			"orderBy": [{"field": {"fieldPath": order_field}, "direction": "DESCENDING"}],
			"limit": query_limit
		}
	}
	
	var headers = [
		"Content-Type: application/json",
		"Authorization: Bearer "+ id_token
	]
	
	http.request_completed.connect(func(_result: int, response_code: int, _headers: PackedStringArray, response_body: PackedByteArray):
		http.queue_free()
		if response_code == 200:
			var json = JSON.new()
			if json.parse(response_body.get_string_from_utf8()) == OK:
				var raw_data = json.data
				if raw_data is Array:
					var processed = _parse_firestore_results(raw_data, tab_type)
					callback.call(true, processed)
					return
		elif response_code == 401:
			is_authenticated = false
			token_expires_at = 0
			
		print("[FirebaseService] Query failed with code: ", response_code)
		callback.call(false, [])
	)
	
	var json_str = JSON.stringify(query_body)
	var err = http.request(FIRESTORE_QUERY_URL, headers, HTTPClient.METHOD_POST, json_str)
	if err != OK:
		http.queue_free()
		callback.call(false, [])

func _parse_firestore_results(raw_array: Array, tab_type: String) -> Array:
	var results: Array = []
	
	if tab_type == "school":
		var school_map: Dictionary = {}
		var school_members: Dictionary = {}
		
		for item in raw_array:
			if not item is Dictionary or not item.has("document"):
				continue
			var doc = item["document"]
			var fields = doc.get("fields", {})
			var sch = _get_field_string(fields, "school", "미입력")
			var xp = _get_field_int(fields, "totalXp", 0)
			
			if sch != "미입력"and sch != "소속 미설정"and sch.strip_edges() != "":
				sch = sch.strip_edges()
				school_map[sch] = school_map.get(sch, 0) + xp
				school_members[sch] = school_members.get(sch, 0) + 1
				
		var sorted_schools: Array = []
		for sch_name in school_map.keys():
			sorted_schools.append({
				"school": sch_name,
				"val": school_map[sch_name],
				"members": "%d명 참여"% school_members[sch_name]
			})
			
		sorted_schools.sort_custom(func(a, b): return a["val"] > b["val"])
		for i in range(min(10, sorted_schools.size())):
			sorted_schools[i]["rank"] = i + 1
			results.append(sorted_schools[i])
		return results

	# For "score"and "xp"
	var rank_idx = 1
	for item in raw_array:
		if not item is Dictionary or not item.has("document"):
			continue
		var doc = item["document"]
		var fields = doc.get("fields", {})
		var nick = _get_field_string(fields, "nickname", "용감한 공룡")
		var sch = _get_field_string(fields, "school", "공룡초등학교")
		var score = _get_field_int(fields, "score", 0)
		var total_xp = _get_field_int(fields, "totalXp", 0)
		var doc_name = str(doc.get("name", ""))
		var entry_user_id = doc_name.get_file()
		
		var entry = {
			"rank": rank_idx,
			"name": nick,
			"school": sch,
			"val": score if tab_type == "score"else total_xp,
			"dino": "공룡 러너",
			"is_me": entry_user_id == user_id
		}
		results.append(entry)
		rank_idx += 1
		if rank_idx > 10:
			break
			
	return results

func _get_field_string(fields: Dictionary, key: String, default_val: String) -> String:
	if fields.has(key) and fields[key].has("stringValue"):
		return fields[key]["stringValue"]
	return default_val

func _get_field_int(fields: Dictionary, key: String, default_val: int) -> int:
	if fields.has(key):
		if fields[key].has("integerValue"):
			return int(fields[key]["integerValue"])
		elif fields[key].has("doubleValue"):
			return int(fields[key]["doubleValue"])
	return default_val

# ---------------------------------------------------------
# 3. Sync User Profile & High Score to Firestore (PATCH)
# ---------------------------------------------------------
func sync_user_profile(nickname: String, school: String, score: int, total_xp: int, callback: Callable = Callable()) -> void:
	var auth_ok = await _ensure_authenticated()
	if not auth_ok or user_id == "":
		if callback.is_valid():
			callback.call(false)
		return
			
	var http = HTTPRequest.new()
	add_child(http)
	
	var safe_nickname = nickname.strip_edges().substr(0, 12)
	var safe_school = school.strip_edges().substr(0, 30)
	if safe_nickname == "":
		safe_nickname = "용감한 공룡"
	if safe_school == "":
		safe_school = "소속 미설정"

	var doc_url = FIRESTORE_BASE_URL + "/" + LEADERBOARD_COLLECTION + "/" + user_id + "?updateMask.fieldPaths=nickname&updateMask.fieldPaths=school&updateMask.fieldPaths=score&updateMask.fieldPaths=totalXp&updateMask.fieldPaths=seasonId"
	var doc_body = {
		"fields": {
			"nickname": {"stringValue": safe_nickname},
			"school": {"stringValue": safe_school},
			"score": {"integerValue": str(score)},
			"totalXp": {"integerValue": str(total_xp)},
			"seasonId": {"stringValue": LEADERBOARD_SEASON_ID}
		}
	}
	
	var headers = [
		"Content-Type: application/json",
		"Authorization: Bearer "+ id_token
	]
	
	http.request_completed.connect(func(_result: int, response_code: int, _headers: PackedStringArray, _response_body: PackedByteArray):
		http.queue_free()
		if response_code == 200:
			print("[FirebaseService] Synced current-season leaderboard. Score: ", score, " | XP: ", total_xp)
			if callback.is_valid():
				callback.call(true)
		else:
			print("[FirebaseService] Sync failed with response: ", response_code)
			if response_code == 401:
				is_authenticated = false
				token_expires_at = 0
			if callback.is_valid():
				callback.call(false)
	)
	
	var err = http.request(doc_url, headers, HTTPClient.METHOD_PATCH, JSON.stringify(doc_body))
	if err != OK:
		http.queue_free()
		if callback.is_valid():
			callback.call(false)
