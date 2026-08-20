extends Area2D

var speed: float = 260.0
var problem_data: Dictionary = {}
var is_handled: bool = false
var float_time: float = 0.0

@onready var problem_card: Node2D = $ProblemCard
@onready var choices_node: Node2D = $Choices
@onready var choice1: Area2D = $Choices/Choice1
@onready var choice2: Area2D = $Choices/Choice2
@onready var choice3: Area2D = $Choices/Choice3
@onready var formula_container: HBoxContainer = $ProblemCard/FormulaContainer
@onready var sparkle_particles: CPUParticles2D = $SparkleParticles

func setup(data: Dictionary, move_speed: float = 260.0) -> void:
	problem_data = data
	speed = move_speed

func _ready() -> void:
	float_time = randf_range(0.0, 5.0)
	if problem_data.is_empty():
		problem_data = FractionMath.generate_problem(GameState.score)
	
	render_problem_formula()
	render_choices()

func render_problem_formula() -> void:
	if not formula_container:
		return
		
	# Clear any previous children
	for child in formula_container.get_children():
		child.queue_free()
		
	var parts = problem_data.get("parts", [])
	var brown_color = Color(0.2, 0.1, 0.05, 1.0)
	
	for p in parts:
		if p["type"] == "op":
			var op_node = FractionView.create_operator(p["val"], 24, brown_color)
			formula_container.add_child(op_node)
		elif p["type"] == "frac":
			var f = p["val"]
			var frac_node = FractionView.create_fraction(f.get("whole", 0), f.get("num", 0), f.get("den", 1), 22, brown_color)
			formula_container.add_child(frac_node)
			
	# Add "= ?"at the end
	var eq_node = FractionView.create_operator("= ?", 24, brown_color)
	formula_container.add_child(eq_node)

func render_choices() -> void:
	var choices = problem_data.get("choices", [])
	var choice_nodes = [get_node_or_null("Choices/Choice1"), get_node_or_null("Choices/Choice2"), get_node_or_null("Choices/Choice3")]
	
	for i in range(min(choices.size(), choice_nodes.size())):
		var node = choice_nodes[i]
		if node:
			var c = choices[i]
			node.set_meta("is_correct", c.get("is_correct", false))
			
			# Container for fraction
			var container = node.get_node_or_null("FractionContainer")
			if container:
				for ch in container.get_children():
					ch.queue_free()
				var f = c.get("val", {})
				var f_view = FractionView.create_fraction(f.get("whole", 0), f.get("num", 0), f.get("den", 1), 18, Color.WHITE, true)
				container.add_child(f_view)
				
			node.body_entered.connect(_on_choice_body_entered.bind(node))

func _physics_process(delta: float) -> void:
	# 화면 스크롤 속도보다 확실히 빠르게 천천히 좌측으로 비행하는 속도
	var scroll_speed = GameState.get_current_stage_speed()
	var current_move_speed = scroll_speed + 85.0 # 스크롤 속도보다 +85px/s 더 빠르게 이동하여 플레이어 쪽으로 다가옴
	position.x -= current_move_speed * delta
	
	# Gentle magical floating animation for bubbles and board
	float_time += delta * 2.2
	if problem_card:
		problem_card.position.y = -245.0 + sin(float_time * 0.8) * 4.0
	if choice1:
		choice1.position.y = sin(float_time * 1.5) * 5.0
	if choice2:
		choice2.position.y = sin(float_time * 1.5 + 1.2) * 5.0
	if choice3:
		choice3.position.y = sin(float_time * 1.5 + 2.4) * 5.0
	
	# Smoothly follow ground curve with evolution offset and ascending difficulty height offset!
	var evo_offset = GameState.get_evolution_bubble_offset()
	var diff_h = GameState.get_difficulty_bubble_height_offset()
	var ground_y = GroundTracker.get_height_at_world_x(global_position.x, GameState.scroll_x) - evo_offset - diff_h
	position.y = lerp(position.y, ground_y, 8.0 * delta)
	
	if position.x < -400:
		if not is_handled:
			is_handled = true
			GameState.add_wrong(problem_data)
		queue_free()

func _on_choice_body_entered(body: Node2D, choice_area: Area2D) -> void:
	if is_handled or body.name != "Player":
		return
	
	is_handled = true
	var is_correct = choice_area.get_meta("is_correct", false)
	
	if is_correct:
		sparkle_particles.global_position = choice_area.global_position
		sparkle_particles.emitting = true
		
		var tween = create_tween()
		tween.tween_property(choice_area, "scale", Vector2(1.5, 1.5), 0.12)
		tween.tween_property(choice_area, "modulate", Color(0.3, 2.0, 0.5, 1.0), 0.12)
		tween.tween_callback(func():
			var prev_combo = GameState.combo
			var c_info = GameState.get_combo_bonus_info(prev_combo + 1)
			var diff = problem_data.get("difficulty", 1)
			var base_pts = 10
			match diff:
				1: base_pts = 10
				2: base_pts = 15
				3: base_pts = 20
				4: base_pts = 30
			var total_pts = base_pts + c_info.bonus
			
			GameState.add_correct(problem_data)
			
			var disp_text = "+%d Pts! "% total_pts
			if c_info.bonus > 0:
				disp_text = "+%d Pts! (콤보 +%d) "% [total_pts, c_info.bonus]
			spawn_floating_text(disp_text, choice_area.global_position, c_info.tier_color if c_info.bonus > 0 else Color.GREEN)
			queue_free()
		)
	else:
		var tween = create_tween()
		tween.tween_property(choice_area, "position:x", choice_area.position.x + 12, 0.04)
		tween.tween_property(choice_area, "position:x", choice_area.position.x - 12, 0.04)
		tween.tween_property(choice_area, "modulate", Color(2.0, 0.2, 0.2, 1.0), 0.12)
		tween.tween_callback(func():
			GameState.add_wrong(problem_data)
			spawn_floating_text("Miss! ", choice_area.global_position, Color(1, 0.3, 0.3))
			queue_free()
		)

func spawn_floating_text(text: String, pos: Vector2, color: Color) -> void:
	var label = Label.new()
	label.text = text
	label.modulate = color
	label.global_position = pos + Vector2(-40, -50)
	label.add_theme_font_size_override("font_size", 30)
	label.add_theme_color_override("font_shadow_color", Color(0,0,0,0.8))
	label.add_theme_constant_override("shadow_offset_y", 3)
	get_tree().root.add_child(label)
	var tween = label.create_tween()
	tween.tween_property(label, "position:y", label.position.y - 50, 0.7)
	tween.parallel().tween_property(label, "scale", Vector2(1.2, 1.2), 0.2)
	tween.parallel().tween_property(label, "modulate:a", 0.0, 0.7)
	tween.tween_callback(label.queue_free)