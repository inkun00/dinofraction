extends Node2D

@export var problem_scene: PackedScene = preload("res://scenes/ProblemBubble.tscn")
@export var mystery_box_scene: PackedScene = preload("res://scenes/MysteryBox.tscn")
@export var obstacle_scene: PackedScene = preload("res://scenes/Obstacle.tscn")

static var instance = null

@onready var camera: Camera2D = $Camera2D
@onready var player: Node2D = $Player
@onready var hud: CanvasLayer = $HUD
@onready var spawn_timer: Timer = $SpawnTimer

var mystery_timer: Timer
var obstacle_timer: Timer

var shake_intensity: float = 0.0
var shake_timer: float = 0.0
var camera_default_pos: Vector2 = Vector2(640, 360)

func _ready() -> void:
	instance = self
	GameState.screen_shake_requested.connect(shake_screen)
	mystery_timer = Timer.new()
	mystery_timer.one_shot = true
	mystery_timer.timeout.connect(_on_mystery_timer_timeout)
	add_child(mystery_timer)
	
	obstacle_timer = Timer.new()
	obstacle_timer.one_shot = true
	obstacle_timer.timeout.connect(_on_obstacle_timer_timeout)
	add_child(obstacle_timer)
	
	hud.restart_pressed.connect(_on_restart_pressed)
	spawn_timer.timeout.connect(_on_spawn_timer_timeout)

func start_game() -> void:
	# Clear any remaining problems, boxes, or obstacles
	for child in get_children():
		if child.has_method("setup") or child.name.begins_with("MysteryBox") or child.name.begins_with("Obstacle"):
			child.queue_free()
			
	GameState.start_new_game()
	player.position = Vector2(280, 540)
	if player is CharacterBody2D:
		player.velocity = Vector2.ZERO
	spawn_timer.start(3.0)
	mystery_timer.start(randf_range(6.0, 10.0))
	obstacle_timer.start(8.0)

func _process(delta: float) -> void:
	if GameState.is_game_running:
		GameState.time_left = max(0.0, GameState.time_left - delta)
		GameState.time_changed.emit(int(GameState.time_left))
		if GameState.time_left <= 0:
			GameState.trigger_game_over()
			
	# Camera Screen Shake Physics
	if shake_timer > 0.0:
		shake_timer -= delta
		var damping = clamp(shake_timer / 0.22, 0.0, 1.0)
		var offset = Vector2(
			randf_range(-shake_intensity, shake_intensity) * damping,
			randf_range(-shake_intensity * 0.4, 0.0) * damping
		)
		camera.position = camera_default_pos + offset
	else:
		camera.position = camera_default_pos

func shake_screen(intensity: float, duration: float = 0.25) -> void:
	shake_intensity = intensity
	shake_timer = duration

func _on_spawn_timer_timeout() -> void:
	if not GameState.is_game_running:
		return
		
	var problem = problem_scene.instantiate()
	var data = FractionMath.generate_problem(GameState.score)
	var bubble_speed = 95.0 + min(60.0, GameState.score * 0.05)
	problem.setup(data, bubble_speed)
	problem.position = Vector2(1380, 540)
	add_child(problem)
	
	var next_time = randf_range(7.5, 10.5)
	spawn_timer.start(next_time)

func _on_mystery_timer_timeout() -> void:
	if not GameState.is_game_running:
		return
		
	if randf() <= 0.75:
		var box = mystery_box_scene.instantiate()
		box.position = Vector2(1400, 500)
		add_child(box)
		
	var next_box_time = randf_range(10.0, 16.0)
	mystery_timer.start(next_box_time)

func _on_obstacle_timer_timeout() -> void:
	if not GameState.is_game_running:
		return
		
	var time_elapsed = 300.0 - GameState.time_left
	# 3분(180초) 이상 경과 시 장애물 생성 활성화!
	if time_elapsed >= 180.0:
		var obs = obstacle_scene.instantiate()
		obs.setup()
		obs.position = Vector2(1420, 540)
		add_child(obs)
		
	var next_obs_time = randf_range(6.5, 10.5)
	obstacle_timer.start(next_obs_time)

func _on_restart_pressed() -> void:
	start_game()