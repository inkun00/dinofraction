class_name FractionMath
extends RefCounted

const POSSIBLE_DENOMINATORS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15]

static func normalize_fraction(whole: int, num: int, den: int) -> Dictionary:
	if den == 0:
		den = 1
	var total_num = (whole * den) + num
	var new_whole = int(total_num / float(den))
	var new_num = total_num % den
	if new_num == 0:
		return {"whole": new_whole, "num": 0, "den": 1}
	return {"whole": new_whole, "num": new_num, "den": den}

static func fraction_to_string(f: Dictionary) -> String:
	var w = f.get("whole", 0)
	var n = f.get("num", 0)
	var d = f.get("den", 1)
	if n == 0:
		return str(w)
	if w == 0:
		return "%d/%d" % [n, d]
	return "%d %d/%d" % [w, n, d]

static func get_difficulty(score: int) -> int:
	if score < 50:
		return 1
	elif score < 100:
		return 2
	elif score < 150:
		return 3
	return 4

static func generate_problem(score: int) -> Dictionary:
	var diff = get_difficulty(score)
	var den = POSSIBLE_DENOMINATORS[randi() % POSSIBLE_DENOMINATORS.size()]
	var problem_type = ""
	var parts = []
	var answer = {}
	
	if diff == 1:
		# 진분수 + 진분수 (합 1 이하) or 진분수 - 진분수
		if randf() > 0.5:
			problem_type = "진분수+진분수"
			var n1 = randi_range(1, den - 2)
			var n2 = randi_range(1, den - 1 - n1)
			parts = [{"type": "frac", "val": {"whole": 0, "num": n1, "den": den}}, {"type": "op", "val": "+"}, {"type": "frac", "val": {"whole": 0, "num": n2, "den": den}}]
			answer = {"whole": 0, "num": n1 + n2, "den": den}
		else:
			problem_type = "진분수-진분수"
			var n1 = randi_range(2, den - 1)
			var n2 = randi_range(1, n1 - 1)
			parts = [{"type": "frac", "val": {"whole": 0, "num": n1, "den": den}}, {"type": "op", "val": "-"}, {"type": "frac", "val": {"whole": 0, "num": n2, "den": den}}]
			answer = {"whole": 0, "num": n1 - n2, "den": den}
	elif diff == 2:
		# 진분수 + 진분수 (합 1 초과)
		problem_type = "진분수+진분수_합1초과"
		var n1 = randi_range(int(den / 2.0), den - 1)
		var n2 = randi_range(den - n1 + 1, den - 1)
		parts = [{"type": "frac", "val": {"whole": 0, "num": n1, "den": den}}, {"type": "op", "val": "+"}, {"type": "frac", "val": {"whole": 0, "num": n2, "den": den}}]
		answer = normalize_fraction(0, n1 + n2, den)
	elif diff == 3:
		# 1 - 진분수 or 자연수 - 진분수
		var w = randi_range(1, 3)
		var n = randi_range(1, den - 1)
		parts = [{"type": "op", "val": str(w)}, {"type": "op", "val": "-"}, {"type": "frac", "val": {"whole": 0, "num": n, "den": den}}]
		answer = normalize_fraction(w - 1, den - n, den)
		problem_type = "자연수-진분수"
	else:
		# 대분수 덧셈 / 뺄셈 (받아내림 포함)
		var w1 = randi_range(2, 4)
		var w2 = randi_range(1, w1 - 1)
		var n1 = randi_range(1, den - 1)
		var n2 = randi_range(1, den - 1)
		if randf() > 0.5:
			problem_type = "대분수+대분수"
			parts = [{"type": "frac", "val": {"whole": w1, "num": n1, "den": den}}, {"type": "op", "val": "+"}, {"type": "frac", "val": {"whole": w2, "num": n2, "den": den}}]
			answer = normalize_fraction(w1 + w2, n1 + n2, den)
		else:
			problem_type = "대분수-대분수"
			parts = [{"type": "frac", "val": {"whole": w1, "num": n1, "den": den}}, {"type": "op", "val": "-"}, {"type": "frac", "val": {"whole": w2, "num": n2, "den": den}}]
			var total_n1 = w1 * den + n1
			var total_n2 = w2 * den + n2
			var diff_n = total_n1 - total_n2
			answer = normalize_fraction(0, diff_n, den)

	answer = normalize_fraction(answer.get("whole", 0), answer.get("num", 0), answer.get("den", 1))

	# Format problem string
	var problem_str = ""
	for p in parts:
		if p["type"] == "op":
			problem_str += " " + p["val"] + " "
		else:
			problem_str += fraction_to_string(p["val"])

	# Create answer choices (1 correct, 2 wrong)
	var choices = [{"val": answer, "str": fraction_to_string(answer), "is_correct": true}]
	var attempts = 0
	while choices.size() < 3 and attempts < 30:
		attempts += 1
		var offset_w = randi_range(-1, 1)
		var offset_n = randi_range(1, den)
		var wrong_w = max(0, answer.whole + offset_w)
		var wrong_n = (answer.num + offset_n) % (den * 2)
		var wrong_norm = normalize_fraction(wrong_w, wrong_n, answer.den)
		var wrong_str = fraction_to_string(wrong_norm)
		var duplicate = false
		for c in choices:
			if c["str"] == wrong_str:
				duplicate = true
				break
		if not duplicate:
			choices.append({"val": wrong_norm, "str": wrong_str, "is_correct": false})

	choices.shuffle()

	return {
		"problem_type": problem_type,
		"problem_str": problem_str,
		"parts": parts,
		"answer": answer,
		"choices": choices,
		"difficulty": diff
	}
