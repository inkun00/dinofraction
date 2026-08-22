extends CharacterBody2D

const GRAVITY: float = 2100.0
const JUMP_VELOCITY: float = -820.0
const MOVE_SPEED: float = 350.0

# Every sheet is measured independently.  Do not replace this table with one
# global run/attack frame count: several dinosaurs use wider source poses and a
# different number of frames after their individual sheets are packed.
const DINO_ANIMATION_LAYOUTS = {
	"dino_01": {"run_frames": 8, "attack_frames": 6},
	"dino_02": {"run_frames": 8, "attack_frames": 6},
	"dino_03": {"run_frames": 8, "attack_frames": 6},
	"dino_04": {"run_frames": 8, "attack_frames": 6},
	"dino_05": {"run_frames": 8, "attack_frames": 6},
	"dino_06": {"run_frames": 8, "attack_frames": 6},
	"dino_07": {"run_frames": 8, "attack_frames": 6},
	"dino_08": {"run_frames": 8, "attack_frames": 5},
	"dino_09": {"run_frames": 8, "attack_frames": 6},
	"dino_10": {"run_frames": 8, "attack_frames": 6},
	"dino_11": {"run_frames": 8, "attack_frames": 5},
	"dino_12": {"run_frames": 8, "attack_frames": 6},
	"dino_13": {"run_frames": 8, "attack_frames": 6},
	"dino_14": {"run_frames": 6, "attack_frames": 5},
	"dino_15": {"run_frames": 5, "attack_frames": 5},
	"dino_16": {"run_frames": 8, "attack_frames": 6},
	"dino_17": {"run_frames": 6, "attack_frames": 5},
	"dino_18": {"run_frames": 8, "attack_frames": 6},
	"dino_19": {"run_frames": 8, "attack_frames": 6},
	"dino_20": {"run_frames": 8, "attack_frames": 6},
	"dino_21": {"run_frames": 8, "attack_frames": 6},
	"dino_22": {"run_frames": 8, "attack_frames": 6},
	"dino_23": {"run_frames": 8, "attack_frames": 6},
	"dino_24": {"run_frames": 5, "attack_frames": 5},
	"dino_25": {"run_frames": 8, "attack_frames": 6},
	"dino_26": {"run_frames": 8, "attack_frames": 6},
	"dino_27": {"run_frames": 8, "attack_frames": 6},
	"dino_28": {"run_frames": 6, "attack_frames": 5},
	"dino_29": {"run_frames": 8, "attack_frames": 6},
	"dino_30": {"run_frames": 8, "attack_frames": 6},
}

@onready var sprite: Sprite2D = $Sprite2D
@onready var collision_shape: CollisionShape2D = $CollisionShape2D
@onready var dust_particles: CPUParticles2D = $DustParticles

var current_stage: String = "dino_02"
var anim_timer: float = 0.0
var current_frame: int = 0
var total_frames: int = 8
var frame_speed: float = 0.08

var is_jumping: bool = false
var jump_y: float = 580.0
var y_velocity: float = 0.0

var is_attacking: bool = false
var attack_timer: float = 0.0
var attack_duration: float = 0.35
var attack_cooldown: float = 0.0

var textures = {}

func _init() -> void:
	# 1. Base Dino 01 (Egg)
	var egg_layout = DINO_ANIMATION_LAYOUTS["dino_01"]
	textures["dino_01"] = {
		"run": load("res://assets/sprites/dinos/dino_01_run.png"),
		"jump": load("res://assets/sprites/dinos/dino_01_jump.png"),
		"attack": load("res://assets/sprites/dinos/dino_01_attack.png"),
		"frames": egg_layout["run_frames"],
		"attack_frames": egg_layout["attack_frames"],
		"scale": Vector2(GameState.DINO_BASE_SCALE, GameState.DINO_BASE_SCALE),
		"mass": 0.6,
		"jump_power": -820.0
	}
	# Backward compatibility
	textures["EGG"] = textures["dino_01"]
	
	# 2. Dinos 02 to 30
	for i in range(2, 31):
		var id_str = "dino_%02d"% i
		var run_path = "res://assets/sprites/dinos/%s_run.png"% id_str
		var jump_path = "res://assets/sprites/dinos/%s_jump.png"% id_str
		var attack_path = "res://assets/sprites/dinos/%s_attack.png"% id_str
		var anim_layout = DINO_ANIMATION_LAYOUTS[id_str]
		
		var scale_factor = GameState.DINO_BASE_SCALE + (float(i - 2) * GameState.DINO_SCALE_STEP)
		var mass_val = 1.0 + (float(i - 2) * 0.45)
		var j_power = -840.0 - (float(i - 2) * 6.0)
		
		textures[id_str] = {
			"run": load(run_path),
			"jump": load(jump_path),
			"attack": load(attack_path),
			"frames": anim_layout["run_frames"],
			"attack_frames": anim_layout["attack_frames"],
			"scale": Vector2(scale_factor, scale_factor),
			"mass": mass_val,
			"jump_power": j_power
		}
		
	# Backward compatibility mappings
	textures["BABY"] = textures["dino_02"]
	textures["MEDIUM"] = textures["dino_03"]
	textures["ADULT"] = textures["dino_04"]
	textures["BOSS"] = textures["dino_29"]
	textures["GOD"] = textures["dino_30"]

func _ready() -> void:
	GameState.evolution_changed.connect(_on_evolution_changed)
	set_evolution(UserProfile.selected_dino if UserProfile else "dino_02")
	position.x = 280.0

func get_stage_mass() -> float:
	if textures.has(current_stage):
		return textures[current_stage].get("mass", 1.2)
	return 1.2

func get_attack_direction() -> float:
	return -1.0 if sprite.flip_h else 1.0

func _physics_process(delta: float) -> void:
	# Cooldown and timer management
	if attack_cooldown > 0.0:
		attack_cooldown -= delta
	if is_attacking:
		attack_timer -= delta
		if attack_timer <= 0.0:
			is_attacking = false
			current_frame = 0
			anim_timer = 0.0
			
	# Attack Input Trigger (Ctrl key or Shift key or Attack Action)
	if not is_attacking and attack_cooldown <= 0.0:
		if Input.is_physical_key_pressed(KEY_CTRL) or Input.is_key_pressed(KEY_CTRL) or Input.is_action_just_pressed("attack") or Input.is_physical_key_pressed(KEY_SHIFT):
			start_attack()

	# 1. Horizontal Movement (A/D, Left/Right Arrow) with Speed Boost
	var move_dir: float = 0.0
	if Input.is_action_pressed("move_left") or Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		move_dir -= 1.0
	if Input.is_action_pressed("move_right") or Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		move_dir += 1.0
		
	var speed_mult: float = 1.45 if GameState.is_speed_boosted() else 1.0
	position.x += move_dir * MOVE_SPEED * speed_mult * delta
	position.x = clamp(position.x, 80.0, 1200.0)
	
	if move_dir < 0:
		sprite.flip_h = true
	elif move_dir > 0:
		sprite.flip_h = false

	# 2. Dynamic Ground Height Tracking & Foot Contact Alignment
	var scroll_x = GameState.scroll_x
	var ground_y = GroundTracker.get_height_at_world_x(global_position.x, scroll_x)
	var slope_angle = GroundTracker.get_slope_angle(global_position.x, scroll_x)
	
	var cfg = textures.get(current_stage, textures["dino_02"])
	var cur_scale = cfg.get("scale", Vector2(GameState.DINO_BASE_SCALE, GameState.DINO_BASE_SCALE))
	var foot_offset = (GameState.DINO_FOOT_ALIGNMENT_HEIGHT * cur_scale.y) - 35.0
	var target_ground_y = ground_y - foot_offset
	
	if is_jumping:
		y_velocity += GRAVITY * delta
		jump_y += y_velocity * delta
		position.y = jump_y
		dust_particles.emitting = false
		rotation = lerp_angle(rotation, -0.12 if not sprite.flip_h else 0.12, 10.0 * delta)
		
		# Land on ground curve with physics impact
		if jump_y >= target_ground_y:
			var impact_speed = abs(y_velocity)
			is_jumping = false
			position.y = target_ground_y
			y_velocity = 0.0
			play_land_effect(impact_speed)
	else:
		# Follow ground curve smoothly and naturally without trembling or floating
		position.y = lerp(position.y, target_ground_y, min(1.0, 18.0 * delta))
		var target_rot = slope_angle * 0.55
		if sprite.flip_h:
			target_rot = -target_rot
		rotation = lerp_angle(rotation, target_rot, 8.0 * delta)
		dust_particles.emitting = true
		
		# Jump Trigger with Permanent Jump Boost
		if Input.is_action_just_pressed("jump"):
			is_jumping = true
			var jump_power = cfg.get("jump_power", -850.0)
			jump_power *= GameState.get_jump_multiplier()
				
			y_velocity = jump_power
			jump_y = position.y
			AudioManager.play_sfx("jump")
			play_jump_effect()

	update_animation(delta)

func start_attack() -> void:
	is_attacking = true
	attack_timer = attack_duration
	attack_cooldown = 0.42
	current_frame = 0
	anim_timer = 0.0
	var cfg = textures.get(current_stage, textures["dino_02"])
	sprite.texture = cfg.get("attack", cfg["run"])
	sprite.hframes = cfg.get("attack_frames", 6)
	sprite.frame = 0
	AudioManager.play_sfx("attack")
	play_attack_effect()

func play_attack_effect() -> void:
	# Forward attack dash burst
	var dash_dir = -1.0 if sprite.flip_h else 1.0
	position.x = clamp(position.x + dash_dir * 25.0, 80.0, 1200.0)
	
	# Attack screen micro shake
	GameState.screen_shake_requested.emit(4.5, 0.14)
	
	# Spawn Dynamic Shockwave Visual Effect (특히 공격 모션이 없거나 간접적인 공룡들에게 시각적 충격파 발생)
	_spawn_attack_shockwave(dash_dir)
	
	# Check and smash any nearby obstacle in front
	var parent_node = get_parent()
	if parent_node:
		for child in parent_node.get_children():
			if child.has_method("receive_attack"):
				var dist_x = child.global_position.x - global_position.x
				var dist_y = abs(child.global_position.y - global_position.y)
				if dist_x * dash_dir >= -20.0 and dist_x * dash_dir < 150.0 and dist_y < 105.0:
					child.receive_attack(global_position, get_stage_mass(), dash_dir)
				continue
			if child.has_method("destroy_obstacle") and child.get("is_broken") == false:
				var dist_x = child.global_position.x - global_position.x
				var dist_y = abs(child.global_position.y - global_position.y)
				if abs(dist_x) < 130.0 and dist_y < 85.0:
					child.destroy_obstacle()

func _spawn_attack_shockwave(dash_dir: float) -> void:
	var parent_node = get_parent()
	if not parent_node:
		return
		
	var wave = Sprite2D.new()
	wave.z_index = z_index + 1
	
	var is_egg = (current_stage == "dino_01"or current_stage == "EGG")
	if is_egg:
		var egg_tex = load("res://assets/sprites/effects/egg_pulse.png")
		if egg_tex:
			wave.texture = egg_tex
		wave.global_position = global_position + Vector2(0.0, -25.0)
		wave.scale = Vector2(0.3, 0.3)
		wave.modulate = Color(1.0, 0.9, 0.3, 0.95)
		parent_node.add_child(wave)
		
		var tw = wave.create_tween()
		tw.set_parallel(true)
		tw.tween_property(wave, "scale", Vector2(1.6, 1.6), 0.28).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tw.tween_property(wave, "modulate:a", 0.0, 0.28).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
		tw.chain().tween_callback(wave.queue_free)
	else:
		var shock_tex = load("res://assets/sprites/effects/shockwave.png")
		if shock_tex:
			wave.texture = shock_tex
		wave.global_position = global_position + Vector2(dash_dir * 55.0, -32.0)
		wave.flip_h = (dash_dir < 0.0)
		wave.scale = Vector2(0.35, 0.35)
		wave.modulate = Color(0.4, 0.9, 1.0, 0.95)
		parent_node.add_child(wave)
		
		var tw = wave.create_tween()
		tw.set_parallel(true)
		var target_x = wave.global_position.x + (dash_dir * 60.0)
		tw.tween_property(wave, "global_position:x", target_x, 0.26).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tw.tween_property(wave, "scale", Vector2(1.4, 1.25), 0.26).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tw.tween_property(wave, "modulate:a", 0.0, 0.26).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
		tw.chain().tween_callback(wave.queue_free)

func update_animation(delta: float) -> void:
	var cfg = textures.get(current_stage, textures["dino_02"])
	
	if is_attacking:
		sprite.texture = cfg.get("attack", cfg["run"])
		var att_frames = cfg.get("attack_frames", 6)
		sprite.hframes = att_frames
		sprite.scale = cfg["scale"] * Vector2(1.12, 1.06)
		
		anim_timer += delta
		var att_frame_speed = attack_duration / float(att_frames)
		if anim_timer >= att_frame_speed:
			anim_timer = 0.0
			current_frame = min(current_frame + 1, att_frames - 1)
			sprite.frame = current_frame
	elif is_jumping:
		sprite.texture = cfg["jump"]
		sprite.hframes = 1
		sprite.frame = 0
		sprite.scale = cfg["scale"] * 1.05
	else:
		sprite.texture = cfg["run"]
		sprite.hframes = cfg["frames"]
		sprite.scale = cfg["scale"]
		
		anim_timer += delta
		if anim_timer >= frame_speed:
			anim_timer = 0.0
			current_frame = (current_frame + 1) % cfg["frames"]
			sprite.frame = current_frame

func _on_evolution_changed(new_stage: String) -> void:
	set_evolution(new_stage)
	play_evolution_effect()

func set_evolution(stage_name: String) -> void:
	current_stage = stage_name
	if not textures.has(current_stage):
		current_stage = "dino_02"
	var cfg = textures[current_stage]
	total_frames = cfg["frames"]
	current_frame = 0
	sprite.texture = cfg["run"]
	sprite.hframes = total_frames
	sprite.frame = 0
	sprite.scale = cfg["scale"]

func play_jump_effect() -> void:
	var tween = create_tween()
	tween.tween_property(sprite, "scale:y", sprite.scale.y * 1.22, 0.08)
	var default_scale = textures[current_stage]["scale"]
	tween.tween_property(sprite, "scale:y", default_scale.y, 0.14)

func play_land_effect(impact_speed: float) -> void:
	var mass = get_stage_mass()
	# Physics Impact Force: I = m * v
	var impact = (mass * impact_speed) / 750.0
	
	# 1. Screen Shake based on mass & fall velocity (reduced by 1/2 for comfortable gameplay)
	var shake_amount = clamp(impact * 1.3, 0.6, 12.0)
	var shake_duration = clamp(0.12 + (impact * 0.02), 0.12, 0.25)
	GameState.screen_shake_requested.emit(shake_amount, shake_duration)
		
	# 2. Dynamic Squash & Stretch Animation based on Mass
	var squash_y = clamp(0.88 - (mass * 0.035), 0.52, 0.88)
	var stretch_x = clamp(1.0 + ((1.0 - squash_y) * 0.8), 1.05, 1.45)
	
	var default_scale = textures[current_stage]["scale"]
	var tween = create_tween()
	tween.tween_property(sprite, "scale", Vector2(default_scale.x * stretch_x, default_scale.y * squash_y), 0.06)
	tween.tween_property(sprite, "scale", default_scale, 0.14)

func play_evolution_effect() -> void:
	var tween = create_tween()
	tween.tween_property(sprite, "modulate", Color(2.5, 2.5, 1.5, 1.0), 0.3)
	tween.tween_property(sprite, "scale", sprite.scale * 1.35, 0.3)
	tween.tween_property(sprite, "modulate", Color(1, 1, 1, 1), 0.4)
	tween.tween_property(sprite, "scale", textures[current_stage]["scale"], 0.4)
