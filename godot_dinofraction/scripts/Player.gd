extends CharacterBody2D

const GRAVITY: float = 2100.0
const JUMP_VELOCITY: float = -820.0
const MOVE_SPEED: float = 350.0

@onready var sprite: Sprite2D = $Sprite2D
@onready var collision_shape: CollisionShape2D = $CollisionShape2D
@onready var dust_particles: CPUParticles2D = $DustParticles

var current_stage: String = "dino_01"
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
var rarity_tier: int = 0
var rarity_index: int = 1
var rarity_color: Color = Color.WHITE
var rarity_time: float = 0.0
var rarity_aura: Sprite2D
var rarity_particles: CPUParticles2D
var rarity_glow_sprite: Sprite2D
var rarity_motes: Array[Sprite2D] = []

const RARITY_COLORS: Array[Color] = [
	Color(1.0, 0.92, 0.55),
	Color(0.35, 1.0, 0.58),
	Color(0.25, 0.88, 1.0),
	Color(0.72, 0.42, 1.0),
	Color(1.0, 0.45, 0.25),
	Color(1.0, 0.32, 0.78),
	Color(1.0, 0.88, 0.28),
]

func _init() -> void:
	# 1. Base Dino 01 (Egg)
	textures["dino_01"] = {
		"run": load("res://assets/sprites/dinos/dino_01_run.png"),
		"jump": load("res://assets/sprites/dinos/dino_01_jump.png"),
		"attack": load("res://assets/sprites/dinos/dino_01_attack.png"),
		"frames": 8,
		"attack_frames": 6,
		"scale": Vector2(0.92, 0.92),
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
		
		# Each harder-to-earn dinosaur is only slightly larger than the last.
		var scale_factor = 0.95 + (float(i - 2) * 0.009)
		var mass_val = 1.0 + (float(i - 2) * 0.45)
		var j_power = -840.0 - (float(i - 2) * 6.0)
		
		textures[id_str] = {
			"run": load(run_path),
			"jump": load(jump_path),
			"attack": load(attack_path),
			"frames": 8,
			"attack_frames": 6,
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
	_setup_rarity_effect_nodes()
	set_evolution(UserProfile.selected_dino if UserProfile else "dino_01")
	position.x = 280.0

func get_stage_mass() -> float:
	if textures.has(current_stage):
		return textures[current_stage].get("mass", 1.2)
	return 1.2

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
	
	var cfg = textures.get(current_stage, textures["dino_01"])
	var cur_scale = cfg.get("scale", Vector2(0.95, 0.95))
	var foot_offset = (56.0 * cur_scale.y) - 35.0
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
			play_jump_effect()

	update_animation(delta)
	_update_rarity_effects(delta)

func start_attack() -> void:
	is_attacking = true
	attack_timer = attack_duration
	attack_cooldown = 0.42
	current_frame = 0
	anim_timer = 0.0
	var cfg = textures.get(current_stage, textures["dino_01"])
	sprite.texture = cfg.get("attack", cfg["run"])
	sprite.hframes = cfg.get("attack_frames", 6)
	sprite.frame = 0
	play_attack_effect()

func play_attack_effect() -> void:
	# Forward attack dash burst
	var dash_dir = -1.0 if sprite.flip_h else 1.0
	var dash_distance = 22.0 + (float(rarity_index - 1) * 0.65)
	position.x = clamp(position.x + dash_dir * dash_distance, 80.0, 1200.0)
	
	# Rarer dinosaurs land progressively more spectacular attacks.
	GameState.screen_shake_requested.emit(3.8 + rarity_tier * 1.1, 0.12 + rarity_tier * 0.018)
	
	# Layered shockwaves, rings, star bursts, and energy slashes accumulate by rarity.
	_spawn_attack_shockwave(dash_dir)
	if rarity_tier >= 2:
		_spawn_attack_ring(dash_dir)
		_spawn_attack_star_burst(dash_dir)
	if rarity_tier >= 3:
		_spawn_attack_slashes(dash_dir)
	
	# Check and smash any nearby obstacle in front
	var parent_node = get_parent()
	if parent_node:
		for child in parent_node.get_children():
			if child.has_method("destroy_obstacle") and child.get("is_broken") == false:
				var dist_x = child.global_position.x - global_position.x
				var dist_y = abs(child.global_position.y - global_position.y)
				if abs(dist_x) < 130.0 and dist_y < 85.0:
					child.destroy_obstacle()

func _spawn_attack_shockwave(dash_dir: float) -> void:
	var parent_node = get_parent()
	if not parent_node:
		return
	
	var is_egg = (current_stage == "dino_01"or current_stage == "EGG")
	if is_egg:
		var wave = Sprite2D.new()
		wave.z_index = z_index + 1
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
		return

	var shock_tex = load("res://assets/sprites/effects/shockwave.png")
	if not shock_tex:
		return
	var echo_count = 1 + int(rarity_tier / 2)
	for echo_index in range(echo_count):
		var wave = Sprite2D.new()
		wave.z_index = z_index + 1
		wave.texture = shock_tex
		wave.global_position = global_position + Vector2(dash_dir * (48.0 + echo_index * 13.0), -32.0)
		wave.flip_h = (dash_dir < 0.0)
		wave.scale = Vector2(0.28, 0.28)
		wave.modulate = Color(rarity_color.r, rarity_color.g, rarity_color.b, 0.92 - echo_index * 0.12)
		parent_node.add_child(wave)

		var duration = 0.24 + echo_index * 0.035
		var delay = echo_index * 0.045
		var tw = wave.create_tween()
		tw.set_parallel(true)
		var target_x = wave.global_position.x + (dash_dir * (58.0 + rarity_tier * 8.0))
		tw.tween_property(wave, "global_position:x", target_x, duration).set_delay(delay).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tw.tween_property(wave, "scale", Vector2(1.15 + rarity_tier * 0.12, 1.0 + rarity_tier * 0.09), duration).set_delay(delay).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tw.tween_property(wave, "modulate:a", 0.0, duration).set_delay(delay).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
		tw.chain().tween_callback(wave.queue_free)

func _spawn_attack_ring(dash_dir: float) -> void:
	var parent_node = get_parent()
	if not parent_node:
		return
	var ring = Line2D.new()
	ring.z_index = z_index + 2
	ring.width = 2.5 + rarity_tier * 0.7
	ring.default_color = Color(rarity_color.r, rarity_color.g, rarity_color.b, 0.9)
	for point_index in range(25):
		var angle = TAU * float(point_index) / 24.0
		ring.add_point(Vector2(cos(angle) * 42.0, sin(angle) * 26.0))
	ring.global_position = global_position + Vector2(dash_dir * 36.0, -35.0)
	ring.scale = Vector2(0.25, 0.25)
	parent_node.add_child(ring)

	var tw = ring.create_tween()
	tw.set_parallel(true)
	tw.tween_property(ring, "scale", Vector2(1.15 + rarity_tier * 0.12, 1.15 + rarity_tier * 0.12), 0.32).set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	tw.tween_property(ring, "rotation", dash_dir * 0.35, 0.32)
	tw.tween_property(ring, "modulate:a", 0.0, 0.32).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tw.chain().tween_callback(ring.queue_free)

func _spawn_attack_star_burst(dash_dir: float) -> void:
	var parent_node = get_parent()
	if not parent_node:
		return
	var burst = CPUParticles2D.new()
	burst.z_index = z_index + 3
	burst.global_position = global_position + Vector2(dash_dir * 45.0, -38.0)
	burst.one_shot = true
	burst.explosiveness = 1.0
	burst.amount = 5 + rarity_tier * 4
	burst.lifetime = 0.38 + rarity_tier * 0.035
	burst.texture = load("res://assets/sprites/particle_star.png")
	burst.direction = Vector2(dash_dir, -0.1)
	burst.spread = 95.0
	burst.initial_velocity_min = 55.0 + rarity_tier * 10.0
	burst.initial_velocity_max = 105.0 + rarity_tier * 16.0
	burst.gravity = Vector2(0.0, 45.0)
	burst.scale_amount_min = 0.12
	burst.scale_amount_max = 0.3 + rarity_tier * 0.035
	burst.color = rarity_color
	parent_node.add_child(burst)
	burst.emitting = true
	var cleanup = burst.create_tween()
	cleanup.tween_interval(burst.lifetime + 0.15)
	cleanup.tween_callback(burst.queue_free)

func _spawn_attack_slashes(dash_dir: float) -> void:
	var parent_node = get_parent()
	if not parent_node:
		return
	var slash_count = min(5, rarity_tier - 1)
	for slash_index in range(slash_count):
		var slash = Line2D.new()
		slash.z_index = z_index + 2
		slash.width = 3.0 + rarity_tier * 0.55
		slash.default_color = Color(rarity_color.r, rarity_color.g, rarity_color.b, 0.82)
		var vertical_offset = (float(slash_index) - float(slash_count - 1) * 0.5) * 13.0
		slash.add_point(Vector2(-dash_dir * 18.0, 16.0 + vertical_offset))
		slash.add_point(Vector2(dash_dir * (50.0 + rarity_tier * 5.0), -18.0 + vertical_offset))
		slash.global_position = global_position + Vector2(dash_dir * 34.0, -42.0)
		parent_node.add_child(slash)

		var tw = slash.create_tween()
		tw.set_parallel(true)
		tw.tween_property(slash, "global_position:x", slash.global_position.x + dash_dir * 72.0, 0.2).set_delay(slash_index * 0.025).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tw.tween_property(slash, "modulate:a", 0.0, 0.2).set_delay(slash_index * 0.025)
		tw.chain().tween_callback(slash.queue_free)

func update_animation(delta: float) -> void:
	var cfg = textures.get(current_stage, textures["dino_01"])
	
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
		current_stage = "dino_01"
	var cfg = textures[current_stage]
	total_frames = cfg["frames"]
	current_frame = 0
	sprite.texture = cfg["run"]
	sprite.hframes = total_frames
	sprite.frame = 0
	sprite.scale = cfg["scale"]
	_apply_rarity_profile()

func _get_dino_index(stage_name: String) -> int:
	if stage_name == "EGG":
		return 1
	if stage_name.begins_with("dino_"):
		return clamp(int(stage_name.trim_prefix("dino_")), 1, 30)
	return 1

func _get_rarity_tier(dino_index: int) -> int:
	if dino_index <= 1:
		return 0
	if dino_index <= 6:
		return 1
	if dino_index <= 12:
		return 2
	if dino_index <= 18:
		return 3
	if dino_index <= 24:
		return 4
	if dino_index <= 28:
		return 5
	return 6

func _setup_rarity_effect_nodes() -> void:
	var additive_material = CanvasItemMaterial.new()
	additive_material.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD

	rarity_aura = Sprite2D.new()
	rarity_aura.texture = load("res://assets/sprites/effects/egg_pulse.png")
	rarity_aura.position = sprite.position + Vector2(0.0, 2.0)
	rarity_aura.z_index = sprite.z_index - 2
	rarity_aura.material = additive_material
	rarity_aura.visible = false
	add_child(rarity_aura)

	rarity_glow_sprite = Sprite2D.new()
	rarity_glow_sprite.position = sprite.position
	rarity_glow_sprite.z_index = sprite.z_index - 1
	rarity_glow_sprite.material = additive_material
	rarity_glow_sprite.visible = false
	add_child(rarity_glow_sprite)

	rarity_particles = CPUParticles2D.new()
	rarity_particles.position = sprite.position
	rarity_particles.z_index = sprite.z_index + 1
	rarity_particles.texture = load("res://assets/sprites/particle_star.png")
	rarity_particles.amount = 6
	rarity_particles.lifetime = 1.1
	rarity_particles.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	rarity_particles.emission_rect_extents = Vector2(34.0, 44.0)
	rarity_particles.direction = Vector2(0.0, -1.0)
	rarity_particles.spread = 180.0
	rarity_particles.initial_velocity_min = 8.0
	rarity_particles.initial_velocity_max = 22.0
	rarity_particles.gravity = Vector2(0.0, -12.0)
	rarity_particles.scale_amount_min = 0.08
	rarity_particles.scale_amount_max = 0.2
	rarity_particles.emitting = false
	add_child(rarity_particles)

	for mote_index in range(4):
		var mote = Sprite2D.new()
		mote.texture = load("res://assets/sprites/particle_star.png")
		mote.z_index = sprite.z_index + 2
		mote.material = additive_material
		mote.visible = false
		mote.scale = Vector2.ONE * (0.12 + mote_index * 0.025)
		add_child(mote)
		rarity_motes.append(mote)

func _apply_rarity_profile() -> void:
	rarity_index = _get_dino_index(current_stage)
	rarity_tier = _get_rarity_tier(rarity_index)
	var individual_accent = Color.from_hsv(fmod(float(rarity_index) * 0.087, 1.0), 0.68, 1.0)
	rarity_color = RARITY_COLORS[rarity_tier].lerp(individual_accent, 0.28)
	if not rarity_aura:
		return

	rarity_aura.visible = rarity_tier >= 3
	rarity_aura.scale = Vector2.ONE * (0.62 + rarity_index * 0.012)
	rarity_aura.modulate = Color(rarity_color.r, rarity_color.g, rarity_color.b, 0.14)
	rarity_particles.emitting = rarity_tier >= 2
	rarity_particles.amount = 3 + rarity_tier * 3
	rarity_particles.color = rarity_color
	rarity_particles.scale_amount_max = 0.13 + rarity_tier * 0.035
	rarity_glow_sprite.visible = rarity_tier >= 4
	for mote_index in range(rarity_motes.size()):
		rarity_motes[mote_index].visible = mote_index < max(0, rarity_tier - 2)
		rarity_motes[mote_index].modulate = Color(rarity_color.r, rarity_color.g, rarity_color.b, 0.85)

func _update_rarity_effects(delta: float) -> void:
	if not rarity_aura:
		return
	rarity_time += delta
	if rarity_aura.visible:
		rarity_aura.rotation += delta * (0.12 + rarity_tier * 0.035)
		rarity_aura.modulate.a = 0.1 + rarity_tier * 0.018 + sin(rarity_time * (2.1 + rarity_tier * 0.12)) * 0.045

	if rarity_glow_sprite.visible:
		rarity_glow_sprite.texture = sprite.texture
		rarity_glow_sprite.hframes = sprite.hframes
		rarity_glow_sprite.frame = sprite.frame
		rarity_glow_sprite.flip_h = sprite.flip_h
		rarity_glow_sprite.scale = sprite.scale * (1.045 + rarity_tier * 0.006)
		rarity_glow_sprite.modulate = Color(rarity_color.r, rarity_color.g, rarity_color.b, 0.1 + sin(rarity_time * 4.0) * 0.035)

	var visible_motes = max(0, rarity_tier - 2)
	for mote_index in range(rarity_motes.size()):
		var mote = rarity_motes[mote_index]
		if mote_index >= visible_motes:
			continue
		var angle = rarity_time * (0.9 + rarity_tier * 0.08) + TAU * float(mote_index) / float(max(1, visible_motes))
		var radius_x = 42.0 + rarity_tier * 4.5
		var radius_y = 30.0 + rarity_tier * 2.5
		mote.position = sprite.position + Vector2(cos(angle) * radius_x, sin(angle) * radius_y)
		mote.rotation = -angle * 1.4
		mote.modulate.a = 0.55 + sin(rarity_time * 5.0 + mote_index) * 0.25

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
