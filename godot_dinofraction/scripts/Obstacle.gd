extends Area2D

signal obstacle_destroyed(obstacle_type: String)

enum Type { ROCK, WOOD, CRYSTAL }

var obstacle_type: Type = Type.ROCK
var speed: float = 110.0
var is_broken: bool = false
var anim_frame: int = 0
var anim_timer: float = 0.0
var total_break_frames: int = 6
var break_frame_duration: float = 0.06

@onready var sprite: Sprite2D = $Sprite2D
@onready var collision_shape: CollisionShape2D = $CollisionShape2D
@onready var debris_particles: CPUParticles2D = $DebrisParticles

var textures = {
	Type.ROCK: {
		"solid": preload("res://assets/sprites/obstacles/obstacle_rock.png"),
		"break": preload("res://assets/sprites/obstacles/obstacle_rock_break.png"),
		"name": "고대 바위",
		"color": Color(0.85, 0.8, 0.7)
	},
	Type.WOOD: {
		"solid": preload("res://assets/sprites/obstacles/obstacle_wood.png"),
		"break": preload("res://assets/sprites/obstacles/obstacle_wood_break.png"),
		"name": "원시 통나무",
		"color": Color(0.9, 0.65, 0.3)
	},
	Type.CRYSTAL: {
		"solid": preload("res://assets/sprites/obstacles/obstacle_crystal.png"),
		"break": preload("res://assets/sprites/obstacles/obstacle_crystal_break.png"),
		"name": "화산 수정석",
		"color": Color(0.9, 0.4, 1.0)
	}
}

func setup(type_idx: int = -1) -> void:
	if type_idx < 0:
		type_idx = randi() % 3
	obstacle_type = type_idx as Type

func _ready() -> void:
	body_entered.connect(_on_body_entered)
	apply_solid_texture()

func apply_solid_texture() -> void:
	var cfg = textures.get(obstacle_type, textures[Type.ROCK])
	sprite.texture = cfg["solid"]
	sprite.hframes = 1
	sprite.frame = 0

func _physics_process(delta: float) -> void:
	if is_broken:
		anim_timer += delta
		if anim_timer >= break_frame_duration:
			anim_timer = 0.0
			anim_frame += 1
			if anim_frame < total_break_frames:
				sprite.frame = anim_frame
			else:
				queue_free()
		return
		
	# Move left matching current game stage speed
	var current_move_speed = GameState.get_current_stage_speed()
	position.x -= current_move_speed * delta
	
	# Firmly ground obstacle onto the terrain height
	var ground_y = GroundTracker.get_height_at_world_x(global_position.x, GameState.scroll_x) - 42.0
	position.y = lerp(position.y, ground_y, 14.0 * delta)
	
	# Check continuous overlap with Player to block forward movement
	check_player_blocking()
	
	if position.x < -300:
		queue_free()

func check_player_blocking() -> void:
	if is_broken:
		return
		
	var bodies = get_overlapping_bodies()
	for b in bodies:
		if b.name == "Player":
			handle_player_collision(b)

func _on_body_entered(body: Node2D) -> void:
	if is_broken or body.name != "Player":
		return
	handle_player_collision(body)

func handle_player_collision(player: Node2D) -> void:
	if is_broken:
		return
		
	var is_player_attacking = player.get("is_attacking") == true
	
	if is_player_attacking:
		# Attack smashes and shatters the obstacle!
		destroy_obstacle()
	else:
		# Check if player jumped safely over the obstacle
		var player_y = player.global_position.y
		var obstacle_top_y = global_position.y - 35.0
		
		if player_y < obstacle_top_y:
			# Player is jumping cleanly over!
			return
		else:
			# Block player forward movement (solid obstacle pushback)
			if player.global_position.x >= global_position.x - 68.0 and player.global_position.x <= global_position.x + 60.0:
				player.global_position.x = global_position.x - 68.0
				GameState.screen_shake_requested.emit(2.5, 0.08)

func destroy_obstacle() -> void:
	if is_broken:
		return
		
	is_broken = true
	var cfg = textures.get(obstacle_type, textures[Type.ROCK])
	
	# Switch to break strip animation
	sprite.texture = cfg["break"]
	sprite.hframes = total_break_frames
	sprite.frame = 0
	anim_frame = 0
	anim_timer = 0.0
	
	# Debris burst particles & screen shake
	debris_particles.emitting = true
	GameState.screen_shake_requested.emit(6.5, 0.18)
	
	# Smash Bonus Points
	var smash_pts = 50
	GameState.add_score(smash_pts)
	spawn_floating_smash_text("💥 SMASH! +%d" % smash_pts, global_position, cfg["color"])
	obstacle_destroyed.emit(cfg["name"])

func spawn_floating_smash_text(text: String, pos: Vector2, color: Color) -> void:
	var label = Label.new()
	label.text = text
	label.modulate = color
	label.global_position = pos + Vector2(-55, -50)
	label.add_theme_font_size_override("font_size", 30)
	label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 1.0))
	label.add_theme_constant_override("outline_size", 5)
	get_tree().root.add_child(label)
	
	var tween = label.create_tween()
	tween.tween_property(label, "position:y", label.position.y - 65, 0.7)
	tween.parallel().tween_property(label, "scale", Vector2(1.3, 1.3), 0.15)
	tween.parallel().tween_property(label, "modulate:a", 0.0, 0.7)
	tween.tween_callback(label.queue_free)
