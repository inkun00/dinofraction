extends Area2D

const GRAVITY: float = 980.0
const KNOCKBACK_DRAG: float = 620.0
const FOOT_ALIGNMENT_HEIGHT: float = 56.0

const STAGE_CONFIGS = [
	{
		"name": "맹독 벨로시",
		"texture": preload("res://assets/sprites/dinos/dino_09_run.png"),
		"health": 1,
		"speed": 20.0,
		"scale": 0.78,
		"tint": Color(0.62, 0.95, 0.58),
	},
	{
		"name": "용암 카르노",
		"texture": preload("res://assets/sprites/dinos/dino_11_run.png"),
		"health": 2,
		"speed": 27.0,
		"scale": 0.86,
		"tint": Color(1.0, 0.5, 0.38),
	},
	{
		"name": "심연의 데이노",
		"texture": preload("res://assets/sprites/dinos/dino_19_run.png"),
		"health": 3,
		"speed": 34.0,
		"scale": 0.94,
		"tint": Color(0.72, 0.52, 1.0),
	},
	{
		"name": "빙결 철갑룡",
		"texture": preload("res://assets/sprites/dinos/dino_26_run.png"),
		"health": 4,
		"speed": 42.0,
		"scale": 1.04,
		"tint": Color(0.55, 0.86, 1.0),
	},
]

var stage_idx: int = 0
var max_health: int = 1
var health: int = 1
var walk_speed: float = 20.0
var visual_scale: float = 0.78
var knockback_velocity: float = 0.0
var vertical_offset: float = 0.0
var vertical_velocity: float = 0.0
var anim_frame: int = 0
var anim_timer: float = 0.0
var attack_hit_cooldown: float = 0.0
var touching_player: Node2D = null
var contact_damage_given: bool = false
var is_defeated: bool = false

@onready var sprite: Sprite2D = $Sprite2D
@onready var collision_shape: CollisionShape2D = $CollisionShape2D
@onready var health_fill: ColorRect = $HealthBar/Fill
@onready var health_bar: Node2D = $HealthBar
@onready var hit_particles: CPUParticles2D = $HitParticles

func setup(new_stage_idx: int) -> void:
	stage_idx = clampi(new_stage_idx, 0, 3)

func _ready() -> void:
	body_entered.connect(_on_body_entered)
	body_exited.connect(_on_body_exited)
	var cfg = STAGE_CONFIGS[stage_idx]
	max_health = cfg["health"]
	health = max_health
	walk_speed = cfg["speed"]
	visual_scale = cfg["scale"]
	sprite.texture = cfg["texture"]
	sprite.hframes = 8
	sprite.frame = 0
	sprite.scale = Vector2(visual_scale, visual_scale)
	sprite.flip_h = true
	sprite.self_modulate = cfg["tint"]
	health_bar.visible = max_health > 1
	_update_health_bar()

func _physics_process(delta: float) -> void:
	if attack_hit_cooldown > 0.0:
		attack_hit_cooldown -= delta

	var ground_y = GroundTracker.get_height_at_world_x(global_position.x, GameState.scroll_x)
	var foot_offset = FOOT_ALIGNMENT_HEIGHT * visual_scale - 35.0
	var target_ground_y = ground_y - foot_offset

	if vertical_offset < 0.0 or vertical_velocity < 0.0:
		vertical_velocity += GRAVITY * delta
		vertical_offset += vertical_velocity * delta
		if vertical_offset >= 0.0:
			vertical_offset = 0.0
			vertical_velocity = 0.0

	var base_velocity = 0.0 if is_defeated else -(GameState.get_current_stage_speed() + walk_speed)
	position.x += (base_velocity + knockback_velocity) * delta
	knockback_velocity = move_toward(knockback_velocity, 0.0, KNOCKBACK_DRAG * delta)
	position.y = lerp(position.y, target_ground_y + vertical_offset, minf(1.0, 14.0 * delta))

	if not is_defeated:
		_update_walk_animation(delta)
		_check_player_contact()
	if position.x < -320.0 or position.x > 1780.0:
		queue_free()

func _update_walk_animation(delta: float) -> void:
	anim_timer += delta
	if anim_timer >= 0.09:
		anim_timer = 0.0
		anim_frame = (anim_frame + 1) % 8
		sprite.frame = anim_frame

func _check_player_contact() -> void:
	if not is_instance_valid(touching_player):
		return
	if touching_player.get("is_attacking") == true:
		if attack_hit_cooldown <= 0.0:
			var direction = touching_player.get_attack_direction() if touching_player.has_method("get_attack_direction") else 1.0
			var mass = touching_player.get_stage_mass() if touching_player.has_method("get_stage_mass") else 1.0
			receive_attack(touching_player.global_position, mass, direction)
	elif not contact_damage_given:
		contact_damage_given = true
		if GameState.take_damage(1):
			AudioManager.play_sfx("hurt")
			touching_player.position.x = maxf(80.0, touching_player.position.x - 42.0)
			_flash_player(touching_player)

func _on_body_entered(body: Node2D) -> void:
	if is_defeated or body.name != "Player":
		return
	touching_player = body
	contact_damage_given = false
	_check_player_contact()

func _on_body_exited(body: Node2D) -> void:
	if body == touching_player:
		touching_player = null
		contact_damage_given = false

func receive_attack(_attacker_position: Vector2, attack_mass: float = 1.0, attack_direction: float = 1.0) -> void:
	if is_defeated or attack_hit_cooldown > 0.0:
		return
	attack_hit_cooldown = 0.34
	health -= 1
	var mass_force = clampf(attack_mass, 1.0, 14.0)
	knockback_velocity = attack_direction * (260.0 + mass_force * 13.0)
	vertical_velocity = -(135.0 + mass_force * 4.0)
	vertical_offset = -2.0
	hit_particles.direction = Vector2(attack_direction, -0.35)
	hit_particles.emitting = true
	AudioManager.play_sfx("monster_hit")
	GameState.request_screen_shake(3.5, 0.12)
	_update_health_bar()
	_play_hit_flash()
	if health <= 0:
		_defeat()

func _update_health_bar() -> void:
	if not health_fill:
		return
	health_fill.scale.x = clampf(float(health) / float(max_health), 0.0, 1.0)

func _play_hit_flash() -> void:
	var tween = create_tween()
	tween.tween_property(sprite, "modulate", Color(3.0, 3.0, 3.0, 1.0), 0.06)
	tween.tween_property(sprite, "modulate", Color.WHITE, 0.12)

func _flash_player(player: Node2D) -> void:
	var player_sprite = player.get_node_or_null("Sprite2D")
	if not player_sprite:
		return
	var tween = create_tween()
	for i in range(3):
		tween.tween_property(player_sprite, "modulate:a", 0.25, 0.08)
		tween.tween_property(player_sprite, "modulate:a", 1.0, 0.08)

func _defeat() -> void:
	is_defeated = true
	collision_shape.set_deferred("disabled", true)
	health_bar.visible = false
	hit_particles.amount = 22
	hit_particles.emitting = true
	AudioManager.play_sfx("monster_defeat")
	GameState.add_score(max_health * 20)
	_spawn_floating_text("격파! +%d" % (max_health * 20))

	var tween = create_tween()
	tween.set_parallel(true)
	tween.tween_property(sprite, "rotation", attack_sign() * 1.2, 0.42)
	tween.tween_property(sprite, "scale", sprite.scale * 0.35, 0.42)
	tween.tween_property(sprite, "modulate:a", 0.0, 0.42)
	tween.chain().tween_callback(queue_free)

func attack_sign() -> float:
	return 1.0 if knockback_velocity >= 0.0 else -1.0

func _spawn_floating_text(text: String) -> void:
	var label = Label.new()
	label.text = text
	label.modulate = Color(1.0, 0.85, 0.25)
	label.global_position = global_position + Vector2(-50.0, -105.0)
	label.add_theme_font_size_override("font_size", 27)
	label.add_theme_color_override("font_outline_color", Color.BLACK)
	label.add_theme_constant_override("outline_size", 5)
	get_tree().root.add_child(label)
	var tween = label.create_tween()
	tween.tween_property(label, "position:y", label.position.y - 55.0, 0.65)
	tween.parallel().tween_property(label, "modulate:a", 0.0, 0.65)
	tween.tween_callback(label.queue_free)
