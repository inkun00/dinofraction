extends Control

signal all_cleared()

@onready var count_label: Label = $Panel/VBox/Header/CountLabel
@onready var formula_box: HBoxContainer = $Panel/VBox/FormulaBox
@onready var choices_box: HBoxContainer = $Panel/VBox/ChoicesBox
@onready var feedback_label: Label = $Panel/VBox/FeedbackLabel

var current_problem: Dictionary = {}
var is_busy: bool = false
const AUDIO_SILENCE_REASON: String = "wrong_answer_quiz_modal"

func _ready() -> void:
	visibility_changed.connect(_on_visibility_changed)
	hide()

func _exit_tree() -> void:
	AudioManager.set_silenced(AUDIO_SILENCE_REASON, false)

func _on_visibility_changed() -> void:
	AudioManager.set_silenced(AUDIO_SILENCE_REASON, visible)

func open_quiz() -> void:
	if UserProfile.pending_wrong_problems.is_empty():
		hide()
		all_cleared.emit()
		return
		
	is_busy = false
	show()
	load_current_problem()

func load_current_problem() -> void:
	if UserProfile.pending_wrong_problems.is_empty():
		feedback_label.text = "모든 오답 정복 완료! 신나는 모험을 시작합니다!"
		feedback_label.modulate = Color.GREEN
		var t = create_tween()
		t.tween_interval(0.8)
		t.tween_callback(func():
			hide()
			all_cleared.emit()
		)
		return
		
	var total_left = UserProfile.pending_wrong_problems.size()
	count_label.text = "남은 오답: %d개"% total_left
	feedback_label.text = "문제를 잘 읽고 올바른 정답 분수를 선택하세요!"
	feedback_label.modulate = Color.WHITE
	
	current_problem = UserProfile.pending_wrong_problems[0]
	
	# 1. Formula Rendering
	for c in formula_box.get_children(): c.queue_free()
	var parts = current_problem.get("parts", [])
	for p in parts:
		if p["type"] == "op":
			formula_box.add_child(FractionView.create_operator(p["val"], 26, Color(0.9, 0.9, 0.9)))
		elif p["type"] == "frac":
			var f = p["val"]
			formula_box.add_child(FractionView.create_fraction(f.get("whole",0), f.get("num",0), f.get("den",1), 24, Color(1, 0.9, 0.4)))
	formula_box.add_child(FractionView.create_operator("= ?", 26, Color(0.4, 0.9, 1.0)))
	
	# 2. Choices Rendering
	for c in choices_box.get_children(): c.queue_free()
	var choices = current_problem.get("choices", [])
	var ans = current_problem.get("answer", {})
	
	for i in range(choices.size()):
		var choice = choices[i]
		var btn = Button.new()
		btn.custom_minimum_size = Vector2(160, 75)
		
		var center = CenterContainer.new()
		center.set_anchors_preset(PRESET_FULL_RECT)
		center.mouse_filter = MOUSE_FILTER_IGNORE
		
		var frac_ui = FractionView.create_fraction(choice.get("whole",0), choice.get("num",0), choice.get("den",1), 22, Color.WHITE)
		frac_ui.mouse_filter = MOUSE_FILTER_IGNORE
		center.add_child(frac_ui)
		btn.add_child(center)
		
		btn.pressed.connect(func(): _on_choice_clicked(choice, ans))
		choices_box.add_child(btn)

func _on_choice_clicked(chosen: Dictionary, ans: Dictionary) -> void:
	if is_busy:
		return
		
	var is_correct = (chosen.get("whole",0) == ans.get("whole",0) and 
					  chosen.get("num",0) == ans.get("num",0) and 
					  chosen.get("den",1) == ans.get("den",1))
					
	if is_correct:
		is_busy = true
		feedback_label.text = "정답입니다! 완벽해요!"
		feedback_label.modulate = Color.GREEN
		UserProfile.remove_pending_wrong_at(0)
		
		var tween = create_tween()
		tween.tween_interval(0.6)
		tween.tween_callback(func():
			is_busy = false
			load_current_problem()
		)
	else:
		feedback_label.text = "오답입니다! 분모와 분자를 다시 계산해보세요."
		feedback_label.modulate = Color(1.0, 0.4, 0.4)
		var tween = create_tween()
		tween.tween_property(self, "position:x", position.x + 10.0, 0.05)
		tween.tween_property(self, "position:x", position.x - 10.0, 0.05)
		tween.tween_property(self, "position:x", position.x, 0.05)
