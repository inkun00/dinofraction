extends Control

signal all_cleared()
signal go_home_requested()

@onready var page_label: Label = $Panel/VBox/PageLabel
@onready var formula_box: HBoxContainer = $Panel/VBox/FormulaContainer
@onready var feedback_label: Label = $Panel/VBox/FeedbackLabel
@onready var hint_label: RichTextLabel = $Panel/VBox/HintBox/HintLabel
@onready var home_btn: Button = $Panel/HomeBtn

# Inputs
@onready var input_whole: LineEdit = $Panel/VBox/InputContainer/InputWhole
@onready var input_num: LineEdit = $Panel/VBox/InputContainer/FractionStack/InputNum
@onready var input_den: LineEdit = $Panel/VBox/InputContainer/FractionStack/InputDen
@onready var submit_btn: Button = $Panel/VBox/InputContainer/SubmitBtn

var review_list: Array = []
var is_busy: bool = false

func _ready() -> void:
	home_btn.pressed.connect(_on_home_pressed)
	submit_btn.pressed.connect(_on_submit)
	
	input_whole.text_submitted.connect(func(_t): input_num.grab_focus())
	input_num.text_submitted.connect(func(_t): input_den.grab_focus())
	input_den.text_submitted.connect(func(_t): _on_submit())
	
	# Only allow numbers
	for le in [input_whole, input_num, input_den]:
		le.text_changed.connect(func(new_text: String):
			var filtered = ""
			for c in new_text:
				if c in "0123456789":
					filtered += c
			if filtered != new_text:
				le.text = filtered
				le.caret_column = filtered.length()
		)
		
	hide()

func open_review(problems: Array = []) -> void:
	if problems.is_empty():
		review_list = UserProfile.pending_wrong_problems
		if review_list.is_empty():
			review_list = UserProfile.wrong_history
	else:
		review_list = problems
		
	is_busy = false
	if review_list.is_empty():
		show_empty()
	else:
		show()
		load_current_problem()

func show_empty() -> void:
	show()
	page_label.text = "0 / 0"
	for c in formula_box.get_children(): c.queue_free()
	$Panel/VBox/InputContainer.visible = false
	feedback_label.text = "✨ 틀린 오답 문제가 없습니다! 완벽합니다! ✨"
	feedback_label.modulate = Color.GREEN
	hint_label.text = "[center][color=#00E5FF]모든 오답을 정복했습니다. 바로 모험을 시작할 수 있습니다![/color][/center]"

func load_current_problem() -> void:
	if review_list.is_empty():
		feedback_label.text = "🎉 모든 오답 정복 완료! 다음 게임을 시작할 수 있습니다!"
		feedback_label.modulate = Color.GREEN
		hint_label.text = "[center][color=#FFD700]모든 분수 오답을 완벽하게 해결했습니다![/color][/center]"
		for c in formula_box.get_children(): c.queue_free()
		$Panel/VBox/InputContainer.visible = false
		page_label.text = "0 / 0"
		
		var t = create_tween()
		t.tween_interval(0.8)
		t.tween_callback(func():
			hide()
			all_cleared.emit()
		)
		return
		
	$Panel/VBox/InputContainer.visible = true
	var prob = review_list[0]
	page_label.text = "남은 오답: %d개" % review_list.size()
	feedback_label.text = "자연수, 분자, 분모를 직접 입력하고 [정답 제출]을 누르세요!"
	feedback_label.modulate = Color.WHITE
	
	# Clear inputs
	input_whole.text = ""
	input_num.text = ""
	input_den.text = ""
	input_num.grab_focus()
	
	# 1. Render Formula
	for c in formula_box.get_children(): c.queue_free()
	var parts = prob.get("parts", [])
	for p in parts:
		if p["type"] == "op":
			formula_box.add_child(FractionView.create_operator(p["val"], 28, Color(0.9, 0.9, 0.9)))
		elif p["type"] == "frac":
			var f = p["val"]
			formula_box.add_child(FractionView.create_fraction(f.get("whole",0), f.get("num",0), f.get("den",1), 26, Color(1, 0.9, 0.4)))
	formula_box.add_child(FractionView.create_operator("= ?", 28, Color(0.4, 0.9, 1.0)))
	
	# 2. Hint Display
	hint_label.text = "[color=#FFD700]💡 입력 팁:[/color] 진분수(예: 3/4), 가분수(예: 7/4), 대분수(예: 1과 3/4) 모두 정답으로 인정됩니다!"

func _on_submit() -> void:
	if is_busy or review_list.is_empty():
		return
		
	var prob = review_list[0]
	var ans = prob.get("answer", {})
	
	var user_w_str = input_whole.text.strip_edges()
	var user_n_str = input_num.text.strip_edges()
	var user_d_str = input_den.text.strip_edges()
	
	var user_w = int(user_w_str) if user_w_str != "" else 0
	var user_n = int(user_n_str) if user_n_str != "" else 0
	var user_d = int(user_d_str) if user_d_str != "" else 1
	
	# Validation: If both fraction parts are empty, check if user entered whole only
	if user_n_str == "" and user_d_str == "" and user_w_str != "":
		user_n = 0
		user_d = 1
	elif user_d <= 0:
		feedback_label.text = "⚠️ 분모는 0보다 큰 자연수여야 합니다!"
		feedback_label.modulate = Color(1.0, 0.8, 0.2)
		input_den.grab_focus()
		return
		
	# Math equivalence check (supports proper, improper, mixed, and unreduced fractions)
	var user_total_num = user_w * user_d + user_n
	var user_total_den = user_d
	
	var ans_w = ans.get("whole", 0)
	var ans_n = ans.get("num", 0)
	var ans_d = ans.get("den", 1)
	var ans_total_num = ans_w * ans_d + ans_n
	var ans_total_den = ans_d
	
	var is_correct = (user_total_num * ans_total_den == ans_total_num * user_total_den)
	
	if is_correct:
		is_busy = true
		feedback_label.text = "✨ 정답입니다! 완벽하게 해결했습니다! ✨"
		feedback_label.modulate = Color.GREEN
		UserProfile.solve_wrong_problem(prob)
		
		var tween = create_tween()
		tween.tween_interval(0.6)
		tween.tween_callback(func():
			is_busy = false
			load_current_problem()
		)
	else:
		feedback_label.text = "❌ 오답입니다! 분자와 분모를 다시 계산해보세요."
		feedback_label.modulate = Color(1.0, 0.4, 0.4)
		var tween = create_tween()
		tween.tween_property(self, "position:x", position.x + 10.0, 0.05)
		tween.tween_property(self, "position:x", position.x - 10.0, 0.05)
		tween.tween_property(self, "position:x", position.x, 0.05)

func _on_home_pressed() -> void:
	hide()
	go_home_requested.emit()
