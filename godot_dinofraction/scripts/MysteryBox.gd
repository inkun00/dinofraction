extends Area2D

var speed: float = 145.0
var is_collected: bool = false
var float_timer: float = 0.0

@onready var sprite: Sprite2D = $Sprite2D
@onready var particles: CPUParticles2D = $CPUParticles2D

func _ready() -> void:
	body_entered.connect(_on_body_entered)
	speed = 140.0 + min(90.0, GameState.score * 0.1)

func _physics_process(delta: float) -> void:
	if is_collected:
		return
		
	var scroll_speed = GameState.get_current_stage_speed()
	var current_move_speed = scroll_speed + 70.0
	position.x -= current_move_speed * delta
	float_timer += delta
	
	# Smooth ground following with bobbing animation
	var evo_offset = GameState.get_evolution_bubble_offset()
	var ground_y = GroundTracker.get_height_at_world_x(global_position.x, GameState.scroll_x) - evo_offset - 125.0
	var target_y = ground_y + sin(float_timer * 4.5) * 12.0
	position.y = lerp(position.y, target_y, 10.0 * delta)
	
	# Gentle hover wobble
	sprite.rotation = sin(float_timer * 3.5) * 0.1
	
	if position.x < -300:
		queue_free()

func _on_body_entered(body: Node2D) -> void:
	if is_collected or body.name != "Player":
		return
		
	is_collected = true
	AudioManager.play_sfx("mystery")
	var buff_res = GameState.apply_random_mystery_buff()
	
	# Particle explosion
	particles.emitting = true
	
	# Pop effect
	var tween = create_tween()
	tween.tween_property(sprite, "scale", sprite.scale * 1.6, 0.12)
	tween.tween_property(sprite, "modulate:a", 0.0, 0.12)
	
	spawn_buff_floating_text(buff_res.get("text", "Mystery Buff!"), global_position, buff_res.get("color", Color.YELLOW))
	
	tween.tween_callback(func():
		await get_tree().create_timer(0.6).timeout
		queue_free()
	)

func spawn_buff_floating_text(text: String, pos: Vector2, color: Color) -> void:
	var label = Label.new()
	label.text = text
	label.modulate = color
	label.global_position = pos + Vector2(-60, -40)
	label.add_theme_font_size_override("font_size", 34)
	label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.95))
	label.add_theme_constant_override("outline_size", 5)
	label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.9))
	label.add_theme_constant_override("shadow_offset_y", 3)
	get_tree().root.add_child(label)
	
	var tween = label.create_tween()
	tween.tween_property(label, "position:y", label.position.y - 70, 0.8)
	tween.parallel().tween_property(label, "scale", Vector2(1.3, 1.3), 0.25)
	tween.parallel().tween_property(label, "modulate:a", 0.0, 0.8)
	tween.tween_callback(label.queue_free)
